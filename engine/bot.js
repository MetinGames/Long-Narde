const DICE_OUTCOMES = Object.freeze([
    { dice: [1, 1], weight: 1 },
    { dice: [1, 2], weight: 2 },
    { dice: [1, 3], weight: 2 },
    { dice: [1, 4], weight: 2 },
    { dice: [1, 5], weight: 2 },
    { dice: [1, 6], weight: 2 },
    { dice: [2, 2], weight: 1 },
    { dice: [2, 3], weight: 2 },
    { dice: [2, 4], weight: 2 },
    { dice: [2, 5], weight: 2 },
    { dice: [2, 6], weight: 2 },
    { dice: [3, 3], weight: 1 },
    { dice: [3, 4], weight: 2 },
    { dice: [3, 5], weight: 2 },
    { dice: [3, 6], weight: 2 },
    { dice: [4, 4], weight: 1 },
    { dice: [4, 5], weight: 2 },
    { dice: [4, 6], weight: 2 },
    { dice: [5, 5], weight: 1 },
    { dice: [5, 6], weight: 2 },
    { dice: [6, 6], weight: 1 }
]);

const MASTER_V2_TIME_BUDGET_MS = 260;
const CHAMPION_TIME_BUDGET_MS = 900;
const CHAMPION_NODE_BUDGET = 12000;
const CHAMPION_ROOT_BEAM = 14;
const CHAMPION_REPLY_BEAM = 8;
const CHAMPION_COUNTER_BEAM = 6;
const LEGAL_MOVE_CACHE_LIMIT = 6000;
const TURN_PLAN_CACHE_LIMIT = 2500;

function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }

    return Date.now();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toDiceMoves(dicePair) {
    return dicePair[0] === dicePair[1]
        ? [dicePair[0], dicePair[0], dicePair[0], dicePair[0]]
        : [dicePair[0], dicePair[1]];
}

function weightedAverage(entries) {
    if (!entries || entries.length === 0) return 0;

    let totalWeight = 0;
    let totalScore = 0;

    for (const entry of entries) {
        totalWeight += entry.weight;
        totalScore += entry.score * entry.weight;
    }

    if (totalWeight <= 0) return 0;
    return totalScore / totalWeight;
}

function stableMoveKey(move) {
    return `${String(move.from).padStart(2, '0')}:${String(move.dice).padStart(2, '0')}:${String(move.target).padStart(2, '0')}`;
}

function stablePlanKey(moves) {
    return moves.map(stableMoveKey).join('|');
}

export class NardeBot {
    constructor(playerNumber = 2, difficulty = 'medium', random = Math.random) {
        this.playerNumber = playerNumber;
        this.difficulty = difficulty;
        this.random = random;

        this.plannedTurnMoves = [];
        this.plannedTurnStateKey = '';

        this.championSearchEpoch = 0;
        this.transpositionTable = new Map();
        this.bearOffValueCache = new Map();
        this.legalMoveCache = new Map();
        this.turnPlanCache = new Map();

        this.debugOptions = {
            enabled: false,
            profile: false,
            collectChampionTrace: false,
            championTraceSink: null
        };

        this.lastChampionDecisionTrace = null;
        this.profileStats = {
            enumerateCalls: 0,
            enumerateCacheHits: 0,
            legalMoveCalls: 0,
            legalMoveCacheHits: 0,
            replyCalls: 0,
            replyCacheHits: 0,
            masterPlanCalls: 0,
            championPlanCalls: 0,
            masterPlanMs: 0,
            championPlanMs: 0
        };
    }

    configureDebug(options = {}) {
        this.debugOptions = {
            ...this.debugOptions,
            ...options
        };
    }

    getDebugSnapshot() {
        return {
            profile: { ...this.profileStats },
            lastChampionDecisionTrace: this.lastChampionDecisionTrace
        };
    }

    resetDebugSnapshot() {
        this.lastChampionDecisionTrace = null;
        for (const key of Object.keys(this.profileStats)) {
            this.profileStats[key] = 0;
        }
    }

    _bumpStat(name, amount = 1) {
        if (!this.debugOptions.profile) return;
        this.profileStats[name] = (this.profileStats[name] || 0) + amount;
    }

    _maybeRecordChampionTrace(trace) {
        if (!this.debugOptions.enabled || !this.debugOptions.collectChampionTrace) {
            return;
        }

        this.lastChampionDecisionTrace = trace;
        if (typeof this.debugOptions.championTraceSink === 'function') {
            this.debugOptions.championTraceSink(trace);
        }
    }

    resetPlannedTurn() {
        this.plannedTurnMoves = [];
        this.plannedTurnStateKey = '';
        this.cancelChampionSearch();
        this.turnPlanCache.clear();
        this.legalMoveCache.clear();
    }

    cancelChampionSearch() {
        this.championSearchEpoch += 1;
    }

    async prepareChampionTurn(game, options = {}) {
        if (this.difficulty !== 'champion') return false;
        if (!this.isBotTurnPlayable(game)) return false;

        const currentStateKey = game.getSearchStateKey();
        if (
            this.plannedTurnStateKey === currentStateKey &&
            this.plannedTurnMoves.length > 0
        ) {
            return true;
        }

        const epoch = ++this.championSearchEpoch;
        const shouldCancel = options.shouldCancel || (() => false);
        const onThinkingStatus = options.onThinkingStatus || (() => {});

        onThinkingStatus(true);

        try {
            const result = await this.buildChampionPlanAsync(game, {
                timeBudgetMs: options.timeBudgetMs || CHAMPION_TIME_BUDGET_MS,
                nodeBudget: options.nodeBudget || CHAMPION_NODE_BUDGET,
                epoch,
                shouldCancel,
                sliceMs: options.sliceMs || 12
            });

            if (!result || epoch !== this.championSearchEpoch || shouldCancel()) {
                return false;
            }

            this.plannedTurnMoves = result.moves;
            this.plannedTurnStateKey = currentStateKey;
            return this.plannedTurnMoves.length > 0;
        } finally {
            onThinkingStatus(false);
        }
    }

    makeDecision(game) {
        if (this.difficulty === 'champion') {
            return this.makeChampionDecision(game);
        }

        if (this.difficulty === 'hard') {
            return this.makeMasterV2Decision(game);
        }

        return this.makeEasyOrMediumDecision(game);
    }

    makeEasyOrMediumDecision(game) {
        if (!this.isBotTurnPlayable(game)) {
            return null;
        }

        const legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];
            if (slot.player !== this.playerNumber || slot.count <= 0) {
                continue;
            }

            const legalFirstDice = [
                ...new Set(
                    game.getRuleCompliantDiceSequences(fromSlot)
                        .filter(sequence => sequence.length === 1)
                        .map(sequence => sequence[0])
                )
            ];

            for (const diceValue of legalFirstDice) {
                const result = game.simulateDiceSequence(fromSlot, [diceValue]);
                if (!result.valid) continue;

                let score = this.evaluateMove(
                    fromSlot,
                    result.targetSlot,
                    game,
                    result.borneOffCount > 0,
                    diceValue
                );

                legalMoves.push({
                    from: fromSlot,
                    dice: diceValue,
                    target: result.borneOffCount > 0 ? 25 : result.targetSlot,
                    score
                });
            }
        }

        if (legalMoves.length === 0) return null;
        legalMoves.sort((a, b) => b.score - a.score);
        return legalMoves[0];
    }

    makeMasterV2Decision(game) {
        if (!this.isBotTurnPlayable(game)) {
            this.resetPlannedTurn();
            return null;
        }

        const currentStateKey = game.getSearchStateKey();

        if (this.plannedTurnStateKey !== currentStateKey) {
            const plan = this.buildMasterV2Plan(game, {
                player: this.playerNumber,
                timeBudgetMs: MASTER_V2_TIME_BUDGET_MS
            });
            this.plannedTurnMoves = plan?.moves || [];
            this.plannedTurnStateKey = currentStateKey;
        }

        if (this.plannedTurnMoves.length === 0) {
            this.resetPlannedTurn();
            return null;
        }

        let nextMove = this.plannedTurnMoves[0];

        if (!this.isSingleMoveStillLegal(game, nextMove)) {
            const replan = this.buildMasterV2Plan(game, {
                player: this.playerNumber,
                timeBudgetMs: MASTER_V2_TIME_BUDGET_MS
            });

            this.plannedTurnMoves = replan?.moves || [];
            this.plannedTurnStateKey = currentStateKey;

            if (this.plannedTurnMoves.length === 0) {
                this.resetPlannedTurn();
                return null;
            }

            nextMove = this.plannedTurnMoves[0];
            if (!this.isSingleMoveStillLegal(game, nextMove)) {
                this.resetPlannedTurn();
                return null;
            }
        }

        this.plannedTurnMoves.shift();
        return nextMove;
    }

    makeChampionDecision(game) {
        if (!this.isBotTurnPlayable(game) || game.gameStatus !== 'PLAYING') {
            this.resetPlannedTurn();
            return null;
        }

        const currentStateKey = game.getSearchStateKey();

        if (this.plannedTurnStateKey !== currentStateKey || this.plannedTurnMoves.length === 0) {
            const plan = this.buildChampionPlanSync(game, {
                timeBudgetMs: CHAMPION_TIME_BUDGET_MS,
                nodeBudget: CHAMPION_NODE_BUDGET,
                epoch: ++this.championSearchEpoch,
                shouldCancel: () => false
            });
            this.plannedTurnMoves = plan?.moves || [];
            this.plannedTurnStateKey = currentStateKey;
            this._maybeRecordChampionTrace(plan?.debugTrace || null);
        }

        if (this.plannedTurnMoves.length === 0) {
            this.resetPlannedTurn();
            return null;
        }

        let nextMove = this.plannedTurnMoves[0];
        if (!this.isSingleMoveStillLegal(game, nextMove)) {
            const replanned = this.buildChampionPlanSync(game, {
                timeBudgetMs: CHAMPION_TIME_BUDGET_MS,
                nodeBudget: CHAMPION_NODE_BUDGET,
                epoch: ++this.championSearchEpoch,
                shouldCancel: () => false
            });
            this.plannedTurnMoves = replanned?.moves || [];
            this.plannedTurnStateKey = currentStateKey;
            this._maybeRecordChampionTrace(replanned?.debugTrace || null);

            if (this.plannedTurnMoves.length === 0) {
                this.resetPlannedTurn();
                return null;
            }

            nextMove = this.plannedTurnMoves[0];
            if (!this.isSingleMoveStillLegal(game, nextMove)) {
                this.resetPlannedTurn();
                return null;
            }
        }

        this.plannedTurnMoves.shift();
        return nextMove;
    }

    async buildChampionPlanAsync(game, options) {
        return this.buildChampionPlanCore(game, {
            ...options,
            allowYield: true
        });
    }

    buildChampionPlanSync(game, options) {
        this._bumpStat('championPlanCalls');
        const planningStartMs = nowMs();
        const player = this.playerNumber;
        const deadline = nowMs() + (options.timeBudgetMs || CHAMPION_TIME_BUDGET_MS);
        const nodeBudget = options.nodeBudget || CHAMPION_NODE_BUDGET;
        const rootSnapshot = this.captureGameState(game);
        let exploredNodes = 0;

        try {
            const rootPlans = this.enumerateFullTurnPlans(game, player);
            if (rootPlans.length === 0) return null;
            if ((rootPlans[0]?.usedDiceCount || 0) === 0) return null;

            const ranked = rootPlans
                .map(plan => {
                    const snapshot = this.captureGameState(game);
                    this.applyMoveSequence(game, plan.moves);
                    const quickEval = this.evaluatePositionForPlayer(game, player, {
                        phaseHint: this.detectGamePhase(game, player),
                        includeWinMarsEstimate: false
                    });
                    this.restoreGameState(game, snapshot);
                    return {
                        ...plan,
                        quickScore: quickEval.score,
                        quickPhase: quickEval.phase,
                        quickComponents: quickEval.components
                    };
                })
                .sort((a, b) => {
                    if (a.quickScore !== b.quickScore) return b.quickScore - a.quickScore;
                    return a.tieBreakKey.localeCompare(b.tieBreakKey);
                });

            let bestPlan = {
                moves: ranked[0].moves,
                score: ranked[0].quickScore,
                tieBreakKey: ranked[0].tieBreakKey
            };

            const rootBeam = ranked.slice(0, CHAMPION_ROOT_BEAM);
            const rootDiceSamples = this.getDeterministicDiceSample(game.getSearchStateKey(), 21);
            const responseDiceSamples = this.getDeterministicDiceSample(`${game.getSearchStateKey()}|counter`, 13);
            const evaluatedCandidates = [];
            let budgetExpired = false;

            const withDebugTrace = (selectedPlan) => ({
                ...selectedPlan,
                debugTrace: {
                    selectedPlan: {
                        tieBreakKey: selectedPlan.tieBreakKey,
                        moves: selectedPlan.moves,
                        score: selectedPlan.score
                    },
                    topCandidates: ranked.slice(0, 5).map((candidate, index) => ({
                        rank: index + 1,
                        tieBreakKey: candidate.tieBreakKey,
                        moves: candidate.moves,
                        quickScore: candidate.quickScore,
                        phase: candidate.quickPhase,
                        components: candidate.quickComponents,
                        eliminationReason: index < CHAMPION_ROOT_BEAM ? 'beam-retained' : 'beam-cut'
                    })),
                    evaluatedCandidateCount: evaluatedCandidates.length,
                    evaluatedCandidates,
                    budgetExpired,
                    exploredNodes,
                    nodeBudget,
                    timeBudgetMs: options.timeBudgetMs || CHAMPION_TIME_BUDGET_MS
                }
            });

            const checkpoint = () => {
                exploredNodes += 1;
                const expired = nowMs() >= deadline || exploredNodes >= nodeBudget;
                if (expired) budgetExpired = true;
                return expired;
            };

            for (let depth = 1; depth <= 3; depth++) {
                for (const plan of rootBeam) {
                    if (checkpoint()) return withDebugTrace(bestPlan);

                    const score = this.evaluateChampionRootPlanSync(game, plan, {
                        player,
                        depth,
                        rootDiceSamples,
                        responseDiceSamples,
                        shouldStop: checkpoint
                    });

                    evaluatedCandidates.push({
                        depth,
                        tieBreakKey: plan.tieBreakKey,
                        score
                    });

                    if (score > bestPlan.score) {
                        bestPlan = {
                            moves: plan.moves,
                            score,
                            tieBreakKey: plan.tieBreakKey
                        };
                    }
                }
            }

            return withDebugTrace(bestPlan);
        } finally {
            this._bumpStat('championPlanMs', nowMs() - planningStartMs);
            this.restoreGameState(game, rootSnapshot);
        }
    }

    async buildChampionPlanCore(game, {
        timeBudgetMs,
        nodeBudget,
        epoch,
        shouldCancel,
        sliceMs = 12,
        allowYield = false
    }) {
        const player = this.playerNumber;
        const startAt = nowMs();
        const deadline = startAt + timeBudgetMs;
        let lastYieldAt = startAt;
        let exploredNodes = 0;

        const checkpoint = async () => {
            exploredNodes += 1;
            const expired = nowMs() >= deadline || exploredNodes >= nodeBudget;
            const canceled = epoch !== this.championSearchEpoch || shouldCancel();
            if (canceled || expired) {
                return { stop: true, canceled };
            }

            if (allowYield && nowMs() - lastYieldAt >= sliceMs) {
                await new Promise(resolve => setTimeout(resolve, 0));
                lastYieldAt = nowMs();
                if (epoch !== this.championSearchEpoch || shouldCancel()) {
                    return { stop: true, canceled: true };
                }
            }

            return { stop: false, canceled: false };
        };

        const rootSnapshot = this.captureGameState(game);
        let bestCompletedPlan = null;

        try {
            const rootPlans = this.enumerateFullTurnPlans(game, player);
            if (rootPlans.length === 0) return null;

            const quickRanked = rootPlans
                .map(plan => {
                    const snapshot = this.captureGameState(game);
                    this.applyMoveSequence(game, plan.moves);
                    const quick = this.evaluatePositionForPlayer(game, player, {
                        phaseHint: this.detectGamePhase(game, player),
                        includeWinMarsEstimate: false
                    });
                    this.restoreGameState(game, snapshot);
                    return { ...plan, quickScore: quick.score };
                })
                .sort((a, b) => {
                    if (a.quickScore !== b.quickScore) return b.quickScore - a.quickScore;
                    return a.tieBreakKey.localeCompare(b.tieBreakKey);
                });

            bestCompletedPlan = {
                moves: quickRanked[0].moves,
                score: quickRanked[0].quickScore,
                tieBreakKey: quickRanked[0].tieBreakKey
            };

            const rootBeam = quickRanked.slice(0, CHAMPION_ROOT_BEAM);
            const rootDiceSamples = this.getDeterministicDiceSample(game.getSearchStateKey(), 21);
            const responseDiceSamples = this.getDeterministicDiceSample(`${game.getSearchStateKey()}|counter`, 13);

            for (let depth = 1; depth <= 3; depth++) {
                for (const plan of rootBeam) {
                    const probe = await checkpoint();
                    if (probe.stop) {
                        return probe.canceled ? bestCompletedPlan : bestCompletedPlan;
                    }

                    const score = await this.evaluateChampionRootPlan(game, plan, {
                        player,
                        depth,
                        rootDiceSamples,
                        responseDiceSamples,
                        checkpoint
                    });

                    if (!bestCompletedPlan || score > bestCompletedPlan.score) {
                        bestCompletedPlan = {
                            moves: plan.moves,
                            score,
                            tieBreakKey: plan.tieBreakKey
                        };
                    }
                }
            }

            return bestCompletedPlan;
        } finally {
            this.restoreGameState(game, rootSnapshot);
        }
    }

    async evaluateChampionRootPlan(game, plan, {
        player,
        depth,
        rootDiceSamples,
        responseDiceSamples,
        checkpoint
    }) {
        const opponent = player === 1 ? 2 : 1;
        const rootSnapshot = this.captureGameState(game);

        try {
            this.applyMoveSequence(game, plan.moves);

            const immediateEval = this.evaluatePositionForPlayer(game, player, {
                phaseHint: this.detectGamePhase(game, player),
                includeWinMarsEstimate: depth >= 2
            }).score;

            if (depth === 1) {
                return immediateEval;
            }

            const opponentResponses = [];
            for (const outcome of rootDiceSamples) {
                const probe = await checkpoint();
                if (probe.stop) break;

                const response = this.getBestReplyForDice(game, {
                    player: opponent,
                    dicePair: outcome.dice,
                    perspectivePlayer: player,
                    beam: CHAMPION_REPLY_BEAM,
                    includeWinMarsEstimate: depth >= 2,
                    transpositionPrefix: 'champion:opp'
                });

                let score = response.score;

                if (depth >= 3 && response.moves.length > 0) {
                    const afterOppSnapshot = this.captureGameState(game);
                    try {
                        this.playVirtualTurn(game, opponent, outcome.dice, response.moves);

                        const counterEntries = [];
                        for (const myOutcome of responseDiceSamples) {
                            const secondProbe = await checkpoint();
                            if (secondProbe.stop) break;

                            const counter = this.getBestReplyForDice(game, {
                                player,
                                dicePair: myOutcome.dice,
                                perspectivePlayer: player,
                                beam: CHAMPION_COUNTER_BEAM,
                                includeWinMarsEstimate: true,
                                transpositionPrefix: 'champion:counter'
                            });

                            counterEntries.push({
                                weight: myOutcome.weight,
                                score: counter.score
                            });
                        }

                        if (counterEntries.length > 0) {
                            score = 0.45 * score + 0.55 * weightedAverage(counterEntries);
                        }
                    } finally {
                        this.restoreGameState(game, afterOppSnapshot);
                    }
                }

                opponentResponses.push({
                    weight: outcome.weight,
                    score
                });
            }

            if (opponentResponses.length === 0) {
                return immediateEval;
            }

            const rolloutValue = weightedAverage(opponentResponses);
            return immediateEval * 0.28 + rolloutValue * 0.72;
        } finally {
            this.restoreGameState(game, rootSnapshot);
        }
    }

    evaluateChampionRootPlanSync(game, plan, {
        player,
        depth,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop
    }) {
        const opponent = player === 1 ? 2 : 1;
        const rootSnapshot = this.captureGameState(game);

        try {
            this.applyMoveSequence(game, plan.moves);

            const immediateEval = this.evaluatePositionForPlayer(game, player, {
                phaseHint: this.detectGamePhase(game, player),
                includeWinMarsEstimate: depth >= 2
            }).score;

            if (depth === 1) {
                return immediateEval;
            }

            const opponentResponses = [];

            for (const outcome of rootDiceSamples) {
                if (shouldStop()) break;

                const response = this.getBestReplyForDice(game, {
                    player: opponent,
                    dicePair: outcome.dice,
                    perspectivePlayer: player,
                    beam: CHAMPION_REPLY_BEAM,
                    includeWinMarsEstimate: depth >= 2,
                    transpositionPrefix: 'champion:opp'
                });

                let score = response.score;

                if (depth >= 3 && response.moves.length > 0) {
                    const afterOppSnapshot = this.captureGameState(game);
                    try {
                        this.playVirtualTurn(game, opponent, outcome.dice, response.moves);

                        const counterEntries = [];
                        for (const myOutcome of responseDiceSamples) {
                            if (shouldStop()) break;

                            const counter = this.getBestReplyForDice(game, {
                                player,
                                dicePair: myOutcome.dice,
                                perspectivePlayer: player,
                                beam: CHAMPION_COUNTER_BEAM,
                                includeWinMarsEstimate: true,
                                transpositionPrefix: 'champion:counter'
                            });

                            counterEntries.push({
                                weight: myOutcome.weight,
                                score: counter.score
                            });
                        }

                        if (counterEntries.length > 0) {
                            score = 0.45 * score + 0.55 * weightedAverage(counterEntries);
                        }
                    } finally {
                        this.restoreGameState(game, afterOppSnapshot);
                    }
                }

                opponentResponses.push({
                    weight: outcome.weight,
                    score
                });
            }

            if (opponentResponses.length === 0) {
                return immediateEval;
            }

            const rolloutValue = weightedAverage(opponentResponses);
            return immediateEval * 0.28 + rolloutValue * 0.72;
        } finally {
            this.restoreGameState(game, rootSnapshot);
        }
    }

    buildMasterV2Plan(game, { player, timeBudgetMs = MASTER_V2_TIME_BUDGET_MS }) {
        this._bumpStat('masterPlanCalls');
        const planningStartMs = nowMs();
        const rootSnapshot = this.captureGameState(game);
        const startAt = nowMs();
        const deadline = startAt + timeBudgetMs;

        try {
            const plans = this.enumerateFullTurnPlans(game, player);
            if (plans.length === 0) return null;
            if ((plans[0]?.usedDiceCount || 0) === 0) return null;

            let bestPlan = null;
            let bestScore = Number.NEGATIVE_INFINITY;
            let evaluatedPlans = 0;

            for (const plan of plans) {
                if (nowMs() > deadline && evaluatedPlans > 0) {
                    break;
                }

                const score = this.evaluateMasterV2Plan(game, plan, {
                    player,
                    deadlineMs: deadline
                });
                evaluatedPlans += 1;

                if (!Number.isFinite(score)) {
                    continue;
                }

                if (
                    !bestPlan ||
                    score > bestScore ||
                    (score === bestScore && plan.tieBreakKey.localeCompare(bestPlan.tieBreakKey) < 0)
                ) {
                    bestPlan = plan;
                    bestScore = score;
                }
            }

            if (!bestPlan) {
                return this.buildMasterV2FallbackPlan(game, plans, { player });
            }

            return {
                ...bestPlan,
                score: bestScore
            };
        } finally {
            this._bumpStat('masterPlanMs', nowMs() - planningStartMs);
            this.restoreGameState(game, rootSnapshot);
        }
    }

    evaluateMasterV2Plan(game, plan, { player, deadlineMs = Number.POSITIVE_INFINITY }) {
        const opponent = player === 1 ? 2 : 1;
        const rootSnapshot = this.captureGameState(game);

        try {
            this.applyMoveSequence(game, plan.moves);

            const phase = this.detectGamePhase(game, player);
            const immediate = this.evaluatePositionForPlayer(game, player, {
                phaseHint: phase,
                includeWinMarsEstimate: true
            }).score;

            const expectedOpponent = [];
            for (const outcome of DICE_OUTCOMES) {
                if (nowMs() > deadlineMs && expectedOpponent.length > 0) {
                    break;
                }

                const response = this.getBestReplyForDice(game, {
                    player: opponent,
                    dicePair: outcome.dice,
                    perspectivePlayer: player,
                    beam: Infinity,
                    includeWinMarsEstimate: false,
                    transpositionPrefix: 'master:opp',
                    deadlineMs
                });

                expectedOpponent.push({
                    weight: outcome.weight,
                    score: response.score
                });
            }

            const expectedScoreAfterReply = weightedAverage(expectedOpponent);
            return (immediate * 0.38) + (expectedScoreAfterReply * 0.62);
        } finally {
            this.restoreGameState(game, rootSnapshot);
        }
    }

    getBestReplyForDice(game, {
        player,
        dicePair,
        perspectivePlayer,
        beam,
        includeWinMarsEstimate,
        transpositionPrefix,
        deadlineMs = Number.POSITIVE_INFINITY
    }) {
        this._bumpStat('replyCalls');
        const snapshot = this.captureGameState(game);
        const stateSignature = `${transpositionPrefix}|${player}|${dicePair[0]}-${dicePair[1]}|${snapshot.stateKey}|${beam}|${includeWinMarsEstimate ? 1 : 0}`;

        if (this.transpositionTable.has(stateSignature)) {
            this._bumpStat('replyCacheHits');
            return this.transpositionTable.get(stateSignature);
        }

        try {
            this.prepareVirtualTurn(game, player, dicePair);

            const plans = this.enumerateFullTurnPlans(game, player);
            if (plans.length === 0) {
                const emptyEvaluation = this.evaluatePositionForPlayer(game, perspectivePlayer, {
                    includeWinMarsEstimate
                }).score;
                const result = {
                    moves: [],
                    score: emptyEvaluation
                };
                this.transpositionTable.set(stateSignature, result);
                return result;
            }

            let rankedPlans = plans;
            if (Number.isFinite(beam)) {
                rankedPlans = plans
                    .map(plan => {
                        const evalSnapshot = this.captureGameState(game);
                        this.applyMoveSequence(game, plan.moves);
                        const quick = this.evaluatePositionForPlayer(game, player, {
                            includeWinMarsEstimate: false
                        }).score;
                        this.restoreGameState(game, evalSnapshot);
                        return {
                            ...plan,
                            quick
                        };
                    })
                    .sort((a, b) => {
                        if (a.quick !== b.quick) return b.quick - a.quick;
                        return a.tieBreakKey.localeCompare(b.tieBreakKey);
                    })
                    .slice(0, beam);
            }

            let best = null;
            for (const plan of rankedPlans) {
                if (nowMs() > deadlineMs && best) {
                    break;
                }

                const evalSnapshot = this.captureGameState(game);
                this.applyMoveSequence(game, plan.moves);

                const score = this.evaluatePositionForPlayer(game, perspectivePlayer, {
                    includeWinMarsEstimate
                }).score;

                this.restoreGameState(game, evalSnapshot);

                if (
                    !best ||
                    score > best.score ||
                    (score === best.score && plan.tieBreakKey.localeCompare(best.tieBreakKey) < 0)
                ) {
                    best = {
                        moves: plan.moves,
                        score,
                        tieBreakKey: plan.tieBreakKey
                    };
                }
            }

            const result = {
                moves: best?.moves ?? [],
                score: Number.isFinite(best?.score)
                    ? best.score
                    : this.getFinitePerspectiveScore(game, perspectivePlayer, includeWinMarsEstimate)
            };

            this.transpositionTable.set(stateSignature, result);
            return result;
        } finally {
            this.restoreGameState(game, snapshot);
        }
    }

    buildMasterV2FallbackPlan(game, plans, { player }) {
        const fallback = plans[0];
        if (!fallback) return null;

        return {
            ...fallback,
            score: this.evaluateMasterFallbackScore(game, fallback, player)
        };
    }

    evaluateMasterFallbackScore(game, plan, player) {
        const snapshot = this.captureGameState(game);
        try {
            if (!this.applyMoveSequence(game, plan.moves)) {
                return this.getFinitePerspectiveScore(game, player, true);
            }

            const phaseHint = this.detectGamePhase(game, player);
            return this.getFinitePerspectiveScore(game, player, true, phaseHint);
        } finally {
            this.restoreGameState(game, snapshot);
        }
    }

    getFinitePerspectiveScore(game, player, includeWinMarsEstimate = true, phaseHint = null) {
        const evaluated = this.evaluatePositionForPlayer(game, player, {
            includeWinMarsEstimate,
            phaseHint
        }).score;

        return Number.isFinite(evaluated) ? evaluated : 0;
    }

    prepareVirtualTurn(game, player, dicePair) {
        game.currentPlayer = player;
        game.gameStatus = 'PLAYING';
        game.availableMoves = toDiceMoves(dicePair);
        game.dice.values = [...dicePair];
        game.headMovesThisTurn = 0;
        game.moveHistory = [];
    }

    playVirtualTurn(game, player, dicePair, plannedMoves) {
        this.prepareVirtualTurn(game, player, dicePair);
        this.applyMoveSequence(game, plannedMoves);
        game.confirmTurnEnd();
    }

    captureGameState(game) {
        return {
            moveState: game.createMoveStateSnapshot(),
            currentPlayer: game.currentPlayer,
            gameStatus: game.gameStatus,
            diceValues: [...game.dice.values],
            moveHistory: [...game.moveHistory],
            turnsCompleted: { ...game.turnsCompleted },
            endReason: game.endReason,
            timeoutStrikes: game.timeoutStrikes,
            stateKey: game.getSearchStateKey()
        };
    }

    restoreGameState(game, snapshot) {
        game.restoreMoveState(snapshot.moveState);
        game.currentPlayer = snapshot.currentPlayer;
        game.gameStatus = snapshot.gameStatus;
        game.dice.values = [...snapshot.diceValues];
        game.moveHistory = [...snapshot.moveHistory];
        game.turnsCompleted = { ...snapshot.turnsCompleted };
        game.endReason = snapshot.endReason;
        game.timeoutStrikes = snapshot.timeoutStrikes;
    }

    enumerateFullTurnPlans(game, player) {
        this._bumpStat('enumerateCalls');
        const rootStateKey = game.getSearchStateKey();
        const cacheKey = `${player}|${rootStateKey}`;
        if (this.turnPlanCache.has(cacheKey)) {
            this._bumpStat('enumerateCacheHits');
            return this.turnPlanCache.get(cacheKey);
        }

        const rootSnapshot = this.captureGameState(game);
        const plans = [];

        const explore = (prefix = []) => {
            const legalMoves = this.getRuleCompliantSingleMoves(game, player);
            if (legalMoves.length === 0) {
                plans.push({
                    moves: [...prefix],
                    usedDiceCount: prefix.length,
                    tieBreakKey: stablePlanKey(prefix)
                });
                return;
            }

            for (const move of legalMoves) {
                const snapshot = this.captureGameState(game);
                try {
                    if (!game.executeMove(move.from, move.dice, false)) {
                        continue;
                    }

                    explore([...prefix, move]);
                } finally {
                    this.restoreGameState(game, snapshot);
                }
            }
        };

        try {
            explore([]);
        } finally {
            this.restoreGameState(game, rootSnapshot);
        }

        plans.sort((a, b) => {
            if (a.usedDiceCount !== b.usedDiceCount) {
                return b.usedDiceCount - a.usedDiceCount;
            }

            return a.tieBreakKey.localeCompare(b.tieBreakKey);
        });

        if (this.turnPlanCache.size >= TURN_PLAN_CACHE_LIMIT) {
            this.turnPlanCache.clear();
        }
        this.turnPlanCache.set(cacheKey, plans);

        return plans;
    }

    applyMoveSequence(game, moves) {
        for (const move of moves) {
            if (!game.executeMove(move.from, move.dice, false)) {
                return false;
            }
        }

        return true;
    }

    isBotTurnPlayable(game) {
        return (
            game.currentPlayer === this.playerNumber &&
            game.availableMoves.length > 0 &&
            game.hasValidMoves()
        );
    }

    getRuleCompliantSingleMoves(game, player = this.playerNumber) {
        this._bumpStat('legalMoveCalls');
        const cacheKey = `${player}|${game.getSearchStateKey()}`;
        if (this.legalMoveCache.has(cacheKey)) {
            this._bumpStat('legalMoveCacheHits');
            return this.legalMoveCache.get(cacheKey);
        }

        const legalMoves = [];
        const seen = new Set();

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const source = game.board.slots[fromSlot];
            if (source.player !== player || source.count <= 0) {
                continue;
            }

            const legalFirstDice = [
                ...new Set(
                    game.getRuleCompliantDiceSequences(fromSlot)
                        .filter(sequence => sequence.length === 1)
                        .map(sequence => sequence[0])
                )
            ];

            for (const diceValue of legalFirstDice) {
                const result = game.simulateDiceSequence(fromSlot, [diceValue]);
                if (!result.valid) continue;

                const target = result.borneOffCount > 0 ? 25 : result.targetSlot;
                const key = `${fromSlot}|${diceValue}|${target}`;
                if (seen.has(key)) continue;
                seen.add(key);

                legalMoves.push({
                    from: fromSlot,
                    dice: diceValue,
                    target
                });
            }
        }

        legalMoves.sort((a, b) => {
            if (a.from !== b.from) return a.from - b.from;
            if (a.dice !== b.dice) return a.dice - b.dice;
            return a.target - b.target;
        });

        if (this.legalMoveCache.size >= LEGAL_MOVE_CACHE_LIMIT) {
            this.legalMoveCache.clear();
        }
        this.legalMoveCache.set(cacheKey, legalMoves);

        return legalMoves;
    }

    isSingleMoveStillLegal(game, move) {
        if (!move) return false;

        const snapshot = this.captureGameState(game);
        try {
            return game.executeMove(move.from, move.dice, false);
        } finally {
            this.restoreGameState(game, snapshot);
        }
    }

    getDeterministicDiceSample(seedKey, size) {
        const base = DICE_OUTCOMES.slice();

        let hash = 0;
        for (let i = 0; i < seedKey.length; i++) {
            hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
        }

        const offset = hash % base.length;
        const rotated = [...base.slice(offset), ...base.slice(0, offset)];

        return rotated.slice(0, clamp(size, 1, 21));
    }

    detectGamePhase(game, player) {
        const opponent = player === 1 ? 2 : 1;

        if (game.board.areAllPiecesInHomeBoard(player)) {
            return 'bearoff';
        }

        const madePoints = this.getMadePoints(game, player);
        const prime4 = this.countPrimeSegments(game, player, 4);
        const ownPip = this.getPipTotal(game, player);
        const oppPip = this.getPipTotal(game, opponent);

        if (prime4 > 0 || madePoints >= 6) {
            return 'block';
        }

        if (Math.abs(ownPip - oppPip) <= 18 || this.isLikelyContactlessRace(game, player)) {
            return 'race';
        }

        return 'opening';
    }

    isLikelyContactlessRace(game, player) {
        const opponent = player === 1 ? 2 : 1;

        if (
            game.board.areAllPiecesInHomeBoard(player) ||
            game.board.areAllPiecesInHomeBoard(opponent)
        ) {
            return true;
        }

        const ownRear = this.getRearCheckerProgress(game, player);
        const oppRear = this.getRearCheckerProgress(game, opponent);
        return ownRear >= 10 && oppRear >= 10;
    }

    evaluatePositionForPlayer(game, player, {
        phaseHint = null,
        includeWinMarsEstimate = true
    } = {}) {
        const opponent = player === 1 ? 2 : 1;

        const ownPip = this.getPipTotal(game, player);
        const oppPip = this.getPipTotal(game, opponent);
        const ownMade = this.getMadePoints(game, player);
        const oppMade = this.getMadePoints(game, opponent);
        const ownLongestPrime = this.getLongestPrime(game, player);
        const oppLongestPrime = this.getLongestPrime(game, opponent);
        const ownPrime5 = this.countPrimeSegments(game, player, 5);
        const ownPrime4 = this.countPrimeSegments(game, player, 4);
        const ownPrime3 = this.countPrimeSegments(game, player, 3);
        const ownHome = this.getHomeCheckerCount(game, player);
        const oppHome = this.getHomeCheckerCount(game, opponent);
        const ownRear = this.getRearCheckerProgress(game, player);
        const oppRear = this.getRearCheckerProgress(game, opponent);
        const ownStackPenalty = this.getStackPenalty(game, player);
        const oppMobilityPenalty = this.estimateMobilityPenalty(game, opponent);
        const ownBlockEscapeSuppression = this.estimateOpponentEscapeSuppression(game, player);
        const ownCriticalGatePressure = this.estimateCriticalGatePressure(game, player);
        const ownBearOff = game.board.borneOff[player] || 0;
        const oppBearOff = game.board.borneOff[opponent] || 0;

        const phase = phaseHint || this.detectGamePhase(game, player);

        let score = 0;

        const pipLead = oppPip - ownPip;
        score += pipLead * 16;

        score += (ownMade - oppMade) * 155;
        score += (ownLongestPrime - oppLongestPrime) * 220;
        score += ownPrime3 * 110;
        score += ownPrime4 * 265;
        score += ownPrime5 * 440;
        score += ownBlockEscapeSuppression * 130;
        score += ownCriticalGatePressure * 120;

        score += (ownRear - oppRear) * 60;
        score += (ownHome - oppHome) * 35;
        score += (ownBearOff - oppBearOff) * 1300;

        score -= ownStackPenalty * 170;
        score -= oppMobilityPenalty * 120;

        if (phase === 'opening') {
            score += ownPrime3 * 140;
            score += ownCriticalGatePressure * 120;
        } else if (phase === 'block') {
            score += ownPrime4 * 320;
            score += ownPrime5 * 540;
            score += ownBlockEscapeSuppression * 180;
            score -= pipLead < 0 ? Math.abs(pipLead) * 18 : 0;
        } else if (phase === 'race') {
            score += pipLead * 22;
            score += (ownBearOff - oppBearOff) * 1450;
            score -= ownPrime5 * 110;
        } else if (phase === 'bearoff') {
            score += this.evaluateBearOffRaceValue(game, player) * 230;
        }

        if (includeWinMarsEstimate) {
            const winEstimate = clamp(0.5 + ((score / 5000)), 0.01, 0.99);
            const marsEstimate = this.estimateMarsProbability(game, player, score);
            score += (winEstimate * 1400) + (marsEstimate * 900);
        }

        if (game.board.hasPlayerWon(player)) {
            score += 1_000_000;
        }

        if (game.board.hasPlayerWon(opponent)) {
            score -= 1_000_000;
        }

        const components = {
            pipLead,
            ownMade,
            oppMade,
            ownLongestPrime,
            oppLongestPrime,
            ownPrime3,
            ownPrime4,
            ownPrime5,
            ownHome,
            oppHome,
            ownRear,
            oppRear,
            ownStackPenalty,
            oppMobilityPenalty,
            ownBlockEscapeSuppression,
            ownCriticalGatePressure,
            ownBearOff,
            oppBearOff,
            includeWinMarsEstimate
        };

        return {
            phase,
            score,
            components
        };
    }

    evaluateBearOffRaceValue(game, player) {
        const key = `${player}|${game.getSearchStateKey()}`;
        if (this.bearOffValueCache.has(key)) {
            return this.bearOffValueCache.get(key);
        }

        const pip = this.getPipTotal(game, player);
        const borneOff = game.board.borneOff[player] || 0;

        let spreadPenalty = 0;
        for (const slotId of game.board.getHomeSlots(player)) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;
            spreadPenalty += Math.abs(slot.count - 2);
        }

        const expectedTurns = pip / 8.167;
        const value = (15 - expectedTurns * 1.55) + (borneOff * 0.9) - (spreadPenalty * 0.25);
        this.bearOffValueCache.set(key, value);
        return value;
    }

    estimateMarsProbability(game, player, score) {
        const opponent = player === 1 ? 2 : 1;
        const oppBorneOff = game.board.borneOff[opponent] || 0;
        const ownBorneOff = game.board.borneOff[player] || 0;

        const raw = 0.04 + (score / 20000) + ((ownBorneOff - oppBorneOff) / 18);
        if (oppBorneOff > 0) {
            return clamp(raw * 0.35, 0, 0.45);
        }

        return clamp(raw, 0, 0.82);
    }

    estimateCriticalGatePressure(game, player) {
        const opponent = player === 1 ? 2 : 1;
        let pressure = 0;

        for (let progress = 16; progress <= 22; progress++) {
            const slotId = game.board.getSlotFromProgress(opponent, progress);
            const slot = game.board.slots[slotId];
            if (slot.player === player && slot.count >= 2) {
                pressure += slot.count >= 3 ? 1.2 : 1;
            }
        }

        return pressure;
    }

    estimateOpponentEscapeSuppression(game, player) {
        const opponent = player === 1 ? 2 : 1;

        let rearSlotId = null;
        let rearProgress = Infinity;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== opponent || slot.count <= 0) continue;

            const progress = game.board.getProgress(opponent, slotId);
            if (progress < rearProgress) {
                rearProgress = progress;
                rearSlotId = slotId;
            }
        }

        if (rearSlotId === null) return 0;

        let blockedDice = 0;
        for (let diceValue = 1; diceValue <= 6; diceValue++) {
            const target = game.board.calculateTargetSlot(opponent, rearSlotId, diceValue);
            if (!game.board.isValidMove(opponent, rearSlotId, target)) {
                blockedDice += 1;
            }
        }

        return blockedDice;
    }

    estimateMobilityPenalty(game, player) {
        let blockedPoints = 0;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;

            let playable = false;
            for (let diceValue = 1; diceValue <= 6; diceValue++) {
                const target = game.board.calculateTargetSlot(player, slotId, diceValue);
                if (game.board.isValidMove(player, slotId, target)) {
                    playable = true;
                    break;
                }
            }

            if (!playable) blockedPoints += 1;
        }

        return blockedPoints;
    }

    getPipTotal(game, player) {
        let total = 0;
        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;
            total += game.board.getBearOffDistance(player, slotId) * slot.count;
        }

        return total;
    }

    getHomeCheckerCount(game, player) {
        const homeSlots = new Set(game.board.getHomeSlots(player));
        let total = 0;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;
            if (homeSlots.has(slotId)) {
                total += slot.count;
            }
        }

        return total;
    }

    getMadePoints(game, player) {
        let count = 0;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player === player && slot.count >= 2) {
                count += 1;
            }
        }

        return count;
    }

    getStackPenalty(game, player) {
        let penalty = 0;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 4) continue;
            penalty += slot.count - 4;
        }

        return penalty;
    }

    getRearCheckerProgress(game, player) {
        let rearProgress = Infinity;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;
            rearProgress = Math.min(rearProgress, game.board.getProgress(player, slotId));
        }

        return rearProgress === Infinity ? 24 : rearProgress;
    }

    countPrimeSegments(game, player, segmentLength) {
        let count = 0;

        for (let start = 0; start <= 24 - segmentLength; start++) {
            let complete = true;
            for (let offset = 0; offset < segmentLength; offset++) {
                const slotId = game.board.getSlotFromProgress(player, start + offset);
                const slot = game.board.slots[slotId];
                if (slot.player !== player || slot.count <= 0) {
                    complete = false;
                    break;
                }
            }

            if (complete) count += 1;
        }

        return count;
    }

    getLongestPrime(game, player = this.playerNumber) {
        let longest = 0;
        let current = 0;

        for (let progress = 0; progress < 24; progress++) {
            const slotId = game.board.getSlotFromProgress(player, progress);
            const slot = game.board.slots[slotId];

            if (slot.player === player && slot.count > 0) {
                current += 1;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
        }

        return longest;
    }

    evaluateHardPosition(game, fromSlot, diceValue) {
        const snapshot = this.captureGameState(game);

        try {
            if (!game.executeMove(fromSlot, diceValue, false)) {
                return Number.NEGATIVE_INFINITY;
            }

            let score = 0;
            let madePoints = 0;

            for (let slotId = 1; slotId <= 24; slotId++) {
                const slot = game.board.slots[slotId];
                if (slot.player !== this.playerNumber || slot.count <= 0) {
                    continue;
                }

                score += game.board.getProgress(this.playerNumber, slotId) * slot.count * 0.15;

                if (slot.count >= 2) madePoints += 1;
                if (slot.count > 5) {
                    score -= (slot.count - 5) * 2;
                }
            }

            const longestPrime = this.getLongestPrime(game, this.playerNumber);
            score += madePoints * 6;
            score += longestPrime * longestPrime * 2;

            return score;
        } finally {
            this.restoreGameState(game, snapshot);
        }
    }

    evaluateMove(from, to, game, isBearOff = false, diceValue = 0) {
        if (isBearOff) return 10000;

        if (this.difficulty === 'easy') {
            return this.random() * 100;
        }

        let score = diceValue * 0.5;
        const target = game.board.slots[to];

        if (target && target.count > 0 && target.player === this.playerNumber) {
            score += 25;
        }

        if (game.board.slots[from].count === 1) {
            score -= 15;
        }

        if (from === game.board.getHeadSlot(this.playerNumber)) {
            score += 20;
        }

        score += this.random() * 2;

        if (this.difficulty === 'hard') {
            if (this.playerNumber === 1 && to >= 19) {
                score += 15;
            }
            if (this.playerNumber === 2 && to >= 7 && to <= 12) {
                score += 15;
            }

            const checkForward = game.board.calculateTargetSlot(this.playerNumber, to, 1);
            const checkBackward = game.board.calculateTargetSlot(this.playerNumber, to, -1);

            if (game.board.slots[checkForward]?.player === this.playerNumber) {
                score += 10;
            }

            if (game.board.slots[checkBackward]?.player === this.playerNumber) {
                score += 10;
            }
        }

        return score;
    }
}
