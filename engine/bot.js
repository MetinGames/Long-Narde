// engine/bot.js

const CHAMPION_REPLY_FINALIST_LIMIT = 12;
const CHAMPION_OPPONENT_THREAT_SCALE = 0.15;
const STANDARD_DIE_FACES = 6;
const CONTROLLED_MOVE_PROFILES = Object.freeze({
    easy: Object.freeze({
        scoreWindow: 30,
        maxCandidates: 3,
        temperature: 22
    }),
    medium: Object.freeze({
        scoreWindow: 8,
        maxCandidates: 2,
        temperature: 4
    })
});

export class NardeBot {
    constructor(
        playerNumber = 2,
        difficulty = 'medium',
        random = Math.random,
        options = {}
    ) {
        this.playerNumber = playerNumber;
        this.difficulty = difficulty;
        this.random = random;
        this.useRuleAnalysisCache = options.useRuleAnalysisCache !== false;
        this.useOpponentAwareStrategy =
            options.useOpponentAwareStrategy !== false;
        this.useOpponentReplyLookahead =
            options.useOpponentReplyLookahead !== false;
        this.useOpponentThreatAwareness =
            options.useOpponentThreatAwareness !== false;
        this.lastRuleAnalysisCacheMetrics = null;
        this.plannedTurnMoves = [];
        this.plannedTurnStateKey = '';
    }

    makeDecision(game) {
        if (this.difficulty === 'champion') {
            return this.makeChampionDecision(game);
        }

        if (
            game.currentPlayer !== this.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        ) {
            return null;
        }

        const legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];
            if (
                slot.player !== this.playerNumber ||
                slot.count <= 0
            ) {
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
                const result = game.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (!result.valid) continue;

                let score = this.evaluateMove(
                    fromSlot,
                    result.targetSlot,
                    game,
                    result.borneOffCount > 0,
                    diceValue
                );

                if (this.difficulty === 'hard') {
                    score += this.evaluateHardPosition(
                        game,
                        fromSlot,
                        diceValue
                    );
                }

                legalMoves.push({
                    from: fromSlot,
                    dice: diceValue,
                    target: result.borneOffCount > 0
                        ? 25
                        : result.targetSlot,
                    score
                });
            }
        }

        if (legalMoves.length === 0) return null;

        legalMoves.sort((a, b) => b.score - a.score);

        if (CONTROLLED_MOVE_PROFILES[this.difficulty]) {
            return this.selectControlledMove(legalMoves);
        }

        return legalMoves[0];
    }

    selectControlledMove(rankedMoves) {
        const profile = CONTROLLED_MOVE_PROFILES[this.difficulty];

        if (!profile || rankedMoves.length < 2) {
            return rankedMoves[0] || null;
        }

        const bestScore = rankedMoves[0].score;
        const candidates = rankedMoves
            .filter(move =>
                bestScore - move.score <= profile.scoreWindow
            )
            .slice(0, profile.maxCandidates);

        if (candidates.length < 2) return candidates[0];

        const weights = candidates.map(
            move => Math.exp(
                (move.score - bestScore) / profile.temperature
            )
        );
        const totalWeight = weights.reduce(
            (sum, weight) => sum + weight,
            0
        );
        const randomValue = Math.min(
            Math.max(Number(this.random()) || 0, 0),
            1
        );
        const targetWeight = randomValue * totalWeight;
        let cumulativeWeight = 0;

        for (let index = 0; index < candidates.length; index++) {
            cumulativeWeight += weights[index];
            if (targetWeight < cumulativeWeight) {
                return candidates[index];
            }
        }

        return candidates[candidates.length - 1];
    }

    resetPlannedTurn() {
        this.plannedTurnMoves = [];
        this.plannedTurnStateKey = '';
    }

    makeChampionDecision(game) {
        const cacheScope =
            this.useRuleAnalysisCache &&
            typeof game.beginRuleAnalysisCacheScope === 'function'
                ? game.beginRuleAnalysisCacheScope()
                : null;

        try {
            return this.makeChampionDecisionWithinScope(game);
        } finally {
            this.lastRuleAnalysisCacheMetrics =
                cacheScope?.finish() || null;
        }
    }

    makeChampionDecisionWithinScope(game) {
        if (
            game.currentPlayer !== this.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves() ||
            game.gameStatus !== 'PLAYING'
        ) {
            this.resetPlannedTurn();
            return null;
        }

        const currentStateKey = game.getSearchStateKey();
        if (this.plannedTurnStateKey !== currentStateKey) {
            const plan = this.buildChampionPlan(game);
            this.plannedTurnMoves = plan?.moves || [];
            this.plannedTurnStateKey = currentStateKey;
        }

        if (this.plannedTurnMoves.length === 0) {
            this.resetPlannedTurn();
            return null;
        }

        let nextMove = this.plannedTurnMoves[0];
        if (!this.isSingleMoveStillLegal(game, nextMove)) {
            const replanned = this.buildChampionPlan(game);
            this.plannedTurnMoves = replanned?.moves || [];
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

    buildChampionPlan(game) {
        const player = this.playerNumber;
        const startSnapshot = game.createMoveStateSnapshot();
        const startPip = this.getPipTotal(game, player);
        const startOpponentPip = this.getPipTotal(game, player === 1 ? 2 : 1);
        const startHeadCount =
            game.board.slots[game.board.getHeadSlot(player)]?.count || 0;
        const startBorneOff = game.board.borneOff[player] || 0;
        const startMadePoints = this.getMadePoints(game, player);
        const startLongestPrime = this.getLongestPrime(game);
        const startRearProgress = this.getRearCheckerProgress(game, player);
        const isBearOffStage = game.board.areAllPiecesInHomeBoard(player);

        const candidates = [];

        const explore = (movesPrefix = []) => {
            const legalMoves = this.getRuleCompliantSingleMoves(game);
            if (legalMoves.length === 0) {
                candidates.push(
                    this.evaluateChampionPlanTerminal({
                        game,
                        moves: movesPrefix,
                        startPip,
                        startOpponentPip,
                        startHeadCount,
                        startBorneOff,
                        startMadePoints,
                        startLongestPrime,
                        startRearProgress,
                        isBearOffStage
                    })
                );
                return;
            }

            for (const move of legalMoves) {
                const snapshot = game.createMoveStateSnapshot();

                try {
                    if (!game.executeMove(move.from, move.dice, false)) {
                        continue;
                    }

                    explore([...movesPrefix, move]);
                } finally {
                    game.restoreMoveState(snapshot);
                }
            }
        };

        try {
            explore([]);
        } finally {
            game.restoreMoveState(startSnapshot);
        }

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) => this.compareChampionPlans(a, b));
        const finalists = candidates.slice(
            0,
            CHAMPION_REPLY_FINALIST_LIMIT
        );

        if (
            this.useOpponentAwareStrategy &&
            this.useOpponentReplyLookahead
        ) {
            this.applyOpponentReplyLookahead(
                game,
                finalists,
                startSnapshot
            );
            finalists.sort((a, b) => this.compareChampionPlans(a, b));
        }

        return finalists[0];
    }

    compareChampionPlans(a, b) {
        if (a.usedDiceCount !== b.usedDiceCount) {
            return b.usedDiceCount - a.usedDiceCount;
        }

        if (a.isBearOffStage || b.isBearOffStage) {
            if (a.bearOffCount !== b.bearOffCount) {
                return b.bearOffCount - a.bearOffCount;
            }

            if (a.pipReduction !== b.pipReduction) {
                return b.pipReduction - a.pipReduction;
            }
        }

        if (a.winNow !== b.winNow) {
            return b.winNow - a.winNow;
        }

        if (a.score !== b.score) {
            return b.score - a.score;
        }

        if (a.bearOffCount !== b.bearOffCount) {
            return b.bearOffCount - a.bearOffCount;
        }

        if (a.pipReduction !== b.pipReduction) {
            return b.pipReduction - a.pipReduction;
        }

        if (a.remainingPip !== b.remainingPip) {
            return a.remainingPip - b.remainingPip;
        }

        return a.tieBreakKey.localeCompare(b.tieBreakKey);
    }

    evaluateChampionPlanTerminal({
        game,
        moves,
        startPip,
        startOpponentPip,
        startHeadCount,
        startBorneOff,
        startMadePoints,
        startLongestPrime,
        startRearProgress,
        isBearOffStage
    }) {
        const player = this.playerNumber;
        const opponent = player === 1 ? 2 : 1;

        const remainingPip = this.getPipTotal(game, player);
        const opponentPip = this.getPipTotal(game, opponent);
        const pipReduction = startPip - remainingPip;
        const opponentPipGain = opponentPip - startOpponentPip;
        const bearOffCount = (game.board.borneOff[player] || 0) - startBorneOff;

        const headCount =
            game.board.slots[game.board.getHeadSlot(player)]?.count || 0;
        const madePoints = this.getMadePoints(game, player);
        const longestPrime = this.getLongestPrime(game);
        const prime3 = this.countPrimeSegments(game, player, 3);
        const prime4 = this.countPrimeSegments(game, player, 4);
        const prime5 = this.countPrimeSegments(game, player, 5);
        const rearProgress = this.getRearCheckerProgress(game, player);
        const homeCount = this.getHomeCheckerCount(game, player);
        const stackPenalty = this.getStackPenalty(game, player);
        const blockingStructure = this.getBlockingStructure(game, player);
        let opponentBlockingStructure = null;

        const winNow = game.board.hasPlayerWon(player) ? 1 : 0;

        let score = 0;
        score += winNow * 1_000_000;
        score += bearOffCount * 20_000;
        score += pipReduction * 120;
        score += homeCount * 40;
        score += (startHeadCount - headCount) * 300;
        score += (rearProgress - startRearProgress) * 180;
        if (this.useOpponentAwareStrategy) {
            score += this.getBlockingStructureScore(blockingStructure);
            if (this.useOpponentThreatAwareness) {
                opponentBlockingStructure = this.getBlockingStructure(
                    game,
                    opponent
                );
                score -= this.getBlockingStructureScore(
                    opponentBlockingStructure
                ) * CHAMPION_OPPONENT_THREAT_SCALE;
            }
            score -= stackPenalty * 300;
        } else {
            score += prime3 * 220;
            score += prime4 * 520;
            score += prime5 * 980;
            score += Math.max(0, madePoints - startMadePoints) * 140;
            score += Math.max(0, longestPrime - startLongestPrime) * 260;
            score -= Math.max(0, startMadePoints - madePoints) * 200;
            score -= Math.max(0, startLongestPrime - longestPrime) * 260;
            score -= stackPenalty * 130;
        }
        score -= opponentPipGain * 15;

        const tieBreakKey = moves
            .map(move => `${String(move.from).padStart(2, '0')}:${String(move.dice).padStart(2, '0')}:${String(move.target).padStart(2, '0')}`)
            .join('|');

        return {
            moves,
            usedDiceCount: moves.length,
            bearOffCount,
            pipReduction,
            remainingPip,
            winNow,
            score,
            stackPenalty,
            blockingStructure,
            opponentBlockingStructure,
            opponentReplyMobility: null,
            tieBreakKey,
            isBearOffStage
        };
    }

    applyOpponentReplyLookahead(game, candidates, startSnapshot) {
        try {
            for (const candidate of candidates) {
                game.restoreMoveState(startSnapshot);
                let valid = true;

                for (const move of candidate.moves) {
                    if (!game.executeMove(move.from, move.dice, false)) {
                        valid = false;
                        break;
                    }
                }

                if (!valid) continue;

                const mobility = this.getOpponentReplyMobility(game);
                candidate.opponentReplyMobility = mobility;
                candidate.score += mobility.blockedDice * 400;
                candidate.score -= mobility.legalMoveCount * 35;
            }
        } finally {
            game.restoreMoveState(startSnapshot);
        }
    }

    getOpponentReplyMobility(game) {
        // Bounded beta lookahead: inspect the opponent's next legal single
        // move for every possible die face, not a full unknown-dice turn tree.
        const saved = {
            currentPlayer: game.currentPlayer,
            availableMoves: [...game.availableMoves],
            diceValues: [...game.dice.values],
            headMoves: game.headMovesThisTurn,
            status: game.gameStatus
        };
        const opponent = this.playerNumber === 1 ? 2 : 1;
        let legalMoveCount = 0;
        let blockedDice = 0;

        try {
            game.currentPlayer = opponent;
            game.headMovesThisTurn = 0;
            game.gameStatus = 'PLAYING';

            for (let die = 1; die <= STANDARD_DIE_FACES; die++) {
                game.availableMoves = [die];
                game.dice.values = [die];
                const legalMoves = game.getRawLegalSingleMoves();
                legalMoveCount += legalMoves.length;
                if (legalMoves.length === 0) blockedDice++;
            }
        } finally {
            game.currentPlayer = saved.currentPlayer;
            game.availableMoves = saved.availableMoves;
            game.dice.values = saved.diceValues;
            game.headMovesThisTurn = saved.headMoves;
            game.gameStatus = saved.status;
        }

        return {
            legalMoveCount,
            blockedDice,
            playableDice: STANDARD_DIE_FACES - blockedDice
        };
    }

    getRuleCompliantSingleMoves(game) {
        const legalMoves = [];
        const seen = new Set();

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const source = game.board.slots[fromSlot];
            if (
                source.player !== this.playerNumber ||
                source.count <= 0
            ) {
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
                const result = game.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (!result.valid) continue;

                const target = result.borneOffCount > 0
                    ? 25
                    : result.targetSlot;
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

        return legalMoves;
    }

    isSingleMoveStillLegal(game, move) {
        if (!move) return false;

        const snapshot = game.createMoveStateSnapshot();
        try {
            return game.executeMove(move.from, move.dice, false);
        } finally {
            game.restoreMoveState(snapshot);
        }
    }

    getPipTotal(game, player) {
        let total = 0;
        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;

            total += game.board.getPipDistance(player, slotId) * slot.count;
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
                count++;
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

    getBlockingStructure(game, player) {
        const opponent = player === 1 ? 2 : 1;
        const opponentRear = this.getRearCheckerProgress(game, opponent);
        let pressure = 0;
        let current = 0;
        let longest = 0;
        let prime3 = 0;
        let prime4 = 0;
        let prime5 = 0;

        for (
            let opponentProgress = opponentRear + 1;
            opponentProgress < 24;
            opponentProgress++
        ) {
            const slotId = game.board.getSlotFromProgress(
                opponent,
                opponentProgress
            );
            const slot = game.board.slots[slotId];
            const blocks = slot.player === player && slot.count > 0;

            if (!blocks) {
                current = 0;
                continue;
            }

            const distance = opponentProgress - opponentRear;
            if (distance <= 12) pressure += 13 - distance;

            current++;
            longest = Math.max(longest, current);
            if (current >= 3) prime3++;
            if (current >= 4) prime4++;
            if (current >= 5) prime5++;
        }

        return {
            pressure,
            longest,
            prime3,
            prime4,
            prime5
        };
    }

    getBlockingStructureScore(structure) {
        return structure.pressure * 80 +
            structure.prime3 * 600 +
            structure.prime4 * 1_200 +
            structure.prime5 * 2_200;
    }

    getRearCheckerProgress(game, player) {
        let rearProgress = Infinity;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = game.board.slots[slotId];
            if (slot.player !== player || slot.count <= 0) continue;

            const progress = game.board.getProgress(player, slotId);
            rearProgress = Math.min(rearProgress, progress);
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

            if (complete) count++;
        }

        return count;
    }

    getLongestPrime(game) {
        let longest = 0;
        let current = 0;

        for (let progress = 0; progress < 24; progress++) {
            const slotId = game.board.getSlotFromProgress(
                this.playerNumber,
                progress
            );
            const slot = game.board.slots[slotId];

            if (
                slot.player === this.playerNumber &&
                slot.count > 0
            ) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
        }

        return longest;
    }

    evaluateHardPosition(game, fromSlot, diceValue) {
        const snapshot = game.createMoveStateSnapshot();

        try {
            if (!game.executeMove(fromSlot, diceValue, false)) {
                return Number.NEGATIVE_INFINITY;
            }

            let score = 0;
            let madePoints = 0;

            for (let slotId = 1; slotId <= 24; slotId++) {
                const slot = game.board.slots[slotId];
                if (
                    slot.player !== this.playerNumber ||
                    slot.count <= 0
                ) {
                    continue;
                }

                score += game.board.getProgress(
                    this.playerNumber,
                    slotId
                ) * slot.count * 0.15;

                if (slot.count >= 2) madePoints++;
                if (slot.count > 5) {
                    score -= (slot.count - 5) * 2;
                }
            }

            const longestPrime = this.getLongestPrime(game);
            score += madePoints * 6;
            score += longestPrime * longestPrime * 2;

            return score;
        } finally {
            game.restoreMoveState(snapshot);
        }
    }

    evaluateMove(
        from,
        to,
        game,
        isBearOff = false,
        diceValue = 0
    ) {
        if (isBearOff) return 10000;

        let score = diceValue * 0.5;
        const target = game.board.slots[to];

        if (
            target &&
            target.count > 0 &&
            target.player === this.playerNumber
        ) {
            score += 25;
        }

        if (game.board.slots[from].count === 1) {
            score -= 15;
        }

        if (from === game.board.getHeadSlot(this.playerNumber)) {
            score += 20;
        }

        if (this.difficulty === 'hard') {
            score += this.random() * 2;

            if (this.playerNumber === 1 && to >= 19) {
                score += 15;
            }
            if (this.playerNumber === 2 && to >= 7 && to <= 12) {
                score += 15;
            }

            const checkForward = game.board.calculateTargetSlot(
                this.playerNumber,
                to,
                1
            );
            const checkBackward = game.board.calculateTargetSlot(
                this.playerNumber,
                to,
                -1
            );

            if (
                game.board.slots[checkForward]?.player ===
                this.playerNumber
            ) {
                score += 10;
            }
            if (
                game.board.slots[checkBackward]?.player ===
                this.playerNumber
            ) {
                score += 10;
            }
        }

        return score;
    }
}
