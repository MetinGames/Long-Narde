export const GAME_STATE_SCHEMA_VERSION = 1;

const ACTIVE_STATUSES = new Set([
    'WAITING_FOR_DICE',
    'PLAYING'
]);

function isSafeIntegerInRange(value, minimum, maximum) {
    return Number.isSafeInteger(value) &&
        value >= minimum &&
        value <= maximum;
}

function cloneSlots(slots) {
    if (!Array.isArray(slots) || slots.length !== 25) return null;

    const cloned = [];
    for (let slotId = 0; slotId <= 24; slotId++) {
        const source = slots[slotId];
        if (!source || typeof source !== 'object') return null;

        const count = source.count;
        const player = source.player;
        if (!isSafeIntegerInRange(count, 0, 15)) return null;
        if (count === 0 && player !== null) return null;
        if (count > 0 && player !== 1 && player !== 2) return null;
        if (slotId === 0 && (count !== 0 || player !== null)) return null;

        cloned.push({ count, player });
    }

    return cloned;
}

function cloneBorneOff(borneOff) {
    const white = borneOff?.[1];
    const black = borneOff?.[2];
    if (!isSafeIntegerInRange(white, 0, 15)) return null;
    if (!isSafeIntegerInRange(black, 0, 15)) return null;
    return { 1: white, 2: black };
}

function hasCheckerConservation(slots, borneOff) {
    const totals = {
        1: borneOff[1],
        2: borneOff[2]
    };

    for (let slotId = 1; slotId <= 24; slotId++) {
        const slot = slots[slotId];
        if (slot.player === 1 || slot.player === 2) {
            totals[slot.player] += slot.count;
        }
    }

    return totals[1] === 15 && totals[2] === 15;
}

function cloneDiceValues(values) {
    if (!Array.isArray(values)) return null;
    if (values.length !== 0 && values.length !== 2) return null;
    if (!values.every(value => isSafeIntegerInRange(value, 1, 6))) {
        return null;
    }
    return [...values];
}

function cloneAvailableMoves(values, diceValues) {
    if (!Array.isArray(values) || values.length > 4) return null;
    if (!values.every(value => isSafeIntegerInRange(value, 1, 6))) {
        return null;
    }

    if (values.length === 0) return [];
    if (diceValues.length !== 2) return null;

    const maximumCounts = new Map();
    if (diceValues[0] === diceValues[1]) {
        maximumCounts.set(diceValues[0], 4);
    } else {
        maximumCounts.set(diceValues[0], 1);
        maximumCounts.set(diceValues[1], 1);
    }

    const actualCounts = new Map();
    for (const value of values) {
        actualCounts.set(value, (actualCounts.get(value) || 0) + 1);
        if (
            !maximumCounts.has(value) ||
            actualCounts.get(value) > maximumCounts.get(value)
        ) {
            return null;
        }
    }

    return [...values];
}

function cloneMove(move) {
    if (move === null || move === undefined) return null;
    if (!move || typeof move !== 'object') return null;

    const { fromSlot, targetSlot, player, diceValue } = move;
    if (!isSafeIntegerInRange(fromSlot, 1, 24)) return null;
    if (!isSafeIntegerInRange(targetSlot, 1, 25)) return null;
    if (player !== 1 && player !== 2) return null;
    if (!isSafeIntegerInRange(diceValue, 1, 6)) return null;

    return { fromSlot, targetSlot, player, diceValue };
}

function cloneMoveSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;

    const slots = cloneSlots(snapshot.slots);
    const borneOff = cloneBorneOff(snapshot.borneOff);
    if (!slots || !borneOff || !hasCheckerConservation(slots, borneOff)) {
        return null;
    }

    const availableMoves = Array.isArray(snapshot.availableMoves) &&
        snapshot.availableMoves.length <= 4 &&
        snapshot.availableMoves.every(value =>
            isSafeIntegerInRange(value, 1, 6)
        )
        ? [...snapshot.availableMoves]
        : null;
    if (!availableMoves) return null;
    if (!isSafeIntegerInRange(snapshot.headMoves, 0, 2)) return null;

    const move = cloneMove(snapshot.move);
    if (!move) return null;

    return {
        slots,
        borneOff,
        availableMoves,
        headMoves: snapshot.headMoves,
        move
    };
}

function cloneTurnsCompleted(turnsCompleted) {
    const white = turnsCompleted?.[1];
    const black = turnsCompleted?.[2];
    if (!isSafeIntegerInRange(white, 0, 100000)) return null;
    if (!isSafeIntegerInRange(black, 0, 100000)) return null;
    return { 1: white, 2: black };
}

export function sanitizeGameState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.schemaVersion !== GAME_STATE_SCHEMA_VERSION) return null;
    if (!ACTIVE_STATUSES.has(raw.status)) return null;
    if (raw.currentPlayer !== 1 && raw.currentPlayer !== 2) return null;

    const slots = cloneSlots(raw.board?.slots);
    const borneOff = cloneBorneOff(raw.board?.borneOff);
    if (!slots || !borneOff || !hasCheckerConservation(slots, borneOff)) {
        return null;
    }
    if (borneOff[1] >= 15 || borneOff[2] >= 15) return null;

    const diceValues = cloneDiceValues(raw.diceValues);
    if (!diceValues) return null;
    const availableMoves = cloneAvailableMoves(raw.availableMoves, diceValues);
    if (!availableMoves) return null;
    if (raw.status === 'PLAYING' && diceValues.length !== 2) return null;
    if (raw.status === 'WAITING_FOR_DICE' && availableMoves.length !== 0) {
        return null;
    }

    if (!isSafeIntegerInRange(raw.timeoutStrikes, 0, 2)) return null;
    if (!isSafeIntegerInRange(raw.headMovesThisTurn, 0, 2)) return null;
    const turnsCompleted = cloneTurnsCompleted(raw.turnsCompleted);
    if (!turnsCompleted) return null;

    if (!Array.isArray(raw.moveHistory) || raw.moveHistory.length > 4) {
        return null;
    }
    const moveHistory = raw.moveHistory.map(cloneMoveSnapshot);
    if (moveHistory.some(snapshot => snapshot === null)) return null;
    if (moveHistory.some(snapshot =>
        snapshot.move.player !== raw.currentPlayer ||
        !snapshot.availableMoves.includes(snapshot.move.diceValue)
    )) {
        return null;
    }
    if (raw.status !== 'PLAYING' && moveHistory.length > 0) return null;

    return {
        schemaVersion: GAME_STATE_SCHEMA_VERSION,
        board: { slots, borneOff },
        diceValues,
        currentPlayer: raw.currentPlayer,
        status: raw.status,
        mode: raw.mode === 'ranked' ? 'ranked' : 'casual',
        timeoutStrikes: raw.timeoutStrikes,
        endReason: null,
        victoryType: null,
        matchPoints: 0,
        availableMoves,
        headMovesThisTurn: raw.headMovesThisTurn,
        turnsCompleted,
        moveHistory
    };
}

export function createGameStateSnapshot(game) {
    return sanitizeGameState({
        schemaVersion: GAME_STATE_SCHEMA_VERSION,
        board: {
            slots: game.cloneBoardSlots(),
            borneOff: { ...game.board.borneOff }
        },
        diceValues: [...game.dice.values],
        currentPlayer: game.currentPlayer,
        status: game.gameStatus,
        mode: game.mode,
        timeoutStrikes: game.timeoutStrikes,
        endReason: game.endReason,
        victoryType: game.victoryType,
        matchPoints: game.matchPoints,
        availableMoves: [...game.availableMoves],
        headMovesThisTurn: game.headMovesThisTurn,
        turnsCompleted: { ...game.turnsCompleted },
        moveHistory: game.moveHistory
    });
}
