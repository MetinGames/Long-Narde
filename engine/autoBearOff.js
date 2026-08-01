// engine/autoBearOff.js

function compareMoveSignature(a, b) {
    const aKey = a.moves
        .map(move => `${move.from}-${move.dice}-${move.target}`)
        .join(';');
    const bKey = b.moves
        .map(move => `${move.from}-${move.dice}-${move.target}`)
        .join(';');

    if (aKey < bKey) return 1;
    if (aKey > bKey) return -1;
    return 0;
}

function isPlanBetter(candidate, currentBest) {
    if (!currentBest) return true;

    if (candidate.usedDiceCount !== currentBest.usedDiceCount) {
        return candidate.usedDiceCount > currentBest.usedDiceCount;
    }

    if (candidate.bearOffCount !== currentBest.bearOffCount) {
        return candidate.bearOffCount > currentBest.bearOffCount;
    }

    if (candidate.pipReduction !== currentBest.pipReduction) {
        return candidate.pipReduction > currentBest.pipReduction;
    }

    return compareMoveSignature(candidate, currentBest) > 0;
}

function getPlayerPipTotal(game, player) {
    let total = 0;

    for (let slotId = 1; slotId <= 24; slotId++) {
        const slot = game.board.slots[slotId];
        if (slot.player !== player || slot.count <= 0) continue;

        total += game.board.getBearOffDistance(player, slotId) * slot.count;
    }

    return total;
}

function getRuleCompliantSingleMoves(game, player) {
    const moves = [];
    const seen = new Set();

    for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
        const source = game.board.slots[fromSlot];
        if (source.player !== player || source.count <= 0) {
            continue;
        }

        const sequences = game.getRuleCompliantDiceSequences(fromSlot);
        for (const sequence of sequences) {
            if (!Array.isArray(sequence) || sequence.length === 0) {
                continue;
            }

            const diceValue = sequence[0];
            const result = game.simulateDiceSequence(fromSlot, [diceValue]);
            if (!result.valid) continue;

            const target = result.borneOffCount > 0
                ? 25
                : result.targetSlot;
            const key = `${fromSlot}|${diceValue}|${target}`;
            if (seen.has(key)) continue;

            seen.add(key);
            moves.push({
                from: fromSlot,
                dice: diceValue,
                target
            });
        }
    }

    moves.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.dice !== b.dice) return a.dice - b.dice;
        return a.target - b.target;
    });

    return moves;
}

function shouldEndTurn(game, player) {
    return game.gameStatus === 'PLAYING' &&
        game.currentPlayer === player &&
        (
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        );
}

export function isAutoBearOffEligible(game, { player = 1 } = {}) {
    if (!game) return false;

    if (
        game.gameStatus !== 'PLAYING' ||
        game.currentPlayer !== player
    ) {
        return false;
    }

    if (game.availableMoves.length === 0 || !game.hasValidMoves()) {
        return false;
    }

    return game.board.areAllPiecesInHomeBoard(player);
}

export function findBestAutoBearOffPlan(game, { player = 1 } = {}) {
    if (!isAutoBearOffEligible(game, { player })) {
        return null;
    }

    const rootSnapshot = game.createMoveStateSnapshot();

    function explore() {
        const legalMoves = getRuleCompliantSingleMoves(game, player);
        if (legalMoves.length === 0) {
            return {
                moves: [],
                usedDiceCount: 0,
                bearOffCount: 0,
                pipReduction: 0
            };
        }

        let bestPlan = null;

        for (const move of legalMoves) {
            const snapshot = game.createMoveStateSnapshot();
            const pipBefore = getPlayerPipTotal(game, player);
            const borneOffBefore = game.board.borneOff[player];

            try {
                if (!game.executeMove(move.from, move.dice, false)) {
                    continue;
                }

                const pipAfter = getPlayerPipTotal(game, player);
                const borneOffAfter = game.board.borneOff[player];
                const tail = explore();

                const candidate = {
                    moves: [move, ...tail.moves],
                    usedDiceCount: 1 + tail.usedDiceCount,
                    bearOffCount:
                        (borneOffAfter - borneOffBefore) + tail.bearOffCount,
                    pipReduction:
                        (pipBefore - pipAfter) + tail.pipReduction
                };

                if (isPlanBetter(candidate, bestPlan)) {
                    bestPlan = candidate;
                }
            } finally {
                game.restoreMoveState(snapshot);
            }
        }

        return bestPlan || {
            moves: [],
            usedDiceCount: 0,
            bearOffCount: 0,
            pipReduction: 0
        };
    }

    try {
        return explore();
    } finally {
        game.restoreMoveState(rootSnapshot);
    }
}

export function pickNextAutoBearOffMove(game, options = {}) {
    const plan = findBestAutoBearOffPlan(game, options);
    if (!plan || plan.moves.length === 0) return null;

    return {
        ...plan.moves[0],
        plan
    };
}

export function createAutoBearOffFlow({
    game,
    player = 1,
    stepDelayMs = 300,
    getContext = () => ({}),
    scheduleStep = (callback, delayMs) => setTimeout(callback, delayMs),
    cancelStep = timeoutId => clearTimeout(timeoutId),
    applyMove = move => game.executeMove(move.from, move.dice),
    onAfterMove,
    onFinishTurn
} = {}) {
    let isRunning = false;
    let lastStopReason = null;
    let runToken = 0;
    let scheduledStepId = null;

    function clearPendingStep() {
        if (!scheduledStepId) return;
        cancelStep(scheduledStepId);
        scheduledStepId = null;
    }

    function canRunInCurrentContext() {
        const context = getContext() || {};

        if (context.isEnabled !== true) return false;
        if (context.isStartScreen === true) return false;
        if (context.isTimeoutResolutionInProgress === true) return false;

        return isAutoBearOffEligible(game, { player });
    }

    function stop(reason = 'stopped') {
        clearPendingStep();
        isRunning = false;
        runToken += 1;
        lastStopReason = reason;
    }

    function step(expectedToken) {
        if (!isRunning || expectedToken !== runToken) {
            return;
        }

        if (!canRunInCurrentContext()) {
            stop('state-changed');
            return;
        }

        const stateBefore = game.getSearchStateKey();
        const next = pickNextAutoBearOffMove(game, { player });

        if (!next) {
            if (shouldEndTurn(game, player)) {
                onFinishTurn?.();
                stop('finished-turn');
                return;
            }

            stop('no-legal-auto-move');
            return;
        }

        const applied = applyMove(next);
        if (!applied) {
            stop('apply-failed');
            return;
        }

        onAfterMove?.(next);

        if (game.gameStatus === 'GAME_OVER' || game.currentPlayer !== player) {
            stop('state-changed');
            return;
        }

        if (shouldEndTurn(game, player)) {
            onFinishTurn?.();
            stop('finished-turn');
            return;
        }

        if (game.getSearchStateKey() === stateBefore) {
            stop('stalled');
            return;
        }

        scheduledStepId = scheduleStep(
            () => step(expectedToken),
            stepDelayMs
        );
    }

    function evaluate() {
        if (isRunning && !canRunInCurrentContext()) {
            stop('state-changed');
            return false;
        }

        if (isRunning) return true;
        if (!canRunInCurrentContext()) return false;

        isRunning = true;
        runToken += 1;
        const token = runToken;
        step(token);
        return isRunning;
    }

    return {
        evaluate,
        stop,
        isRunning: () => isRunning,
        getLastStopReason: () => lastStopReason
    };
}
