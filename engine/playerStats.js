// engine/playerStats.js

export const PLAYER_STATS_STORAGE_KEY = 'longNarde.playerStats.v1';
export const PLAYER_STATS_SCHEMA_VERSION = 1;

export function createDefaultPlayerStats() {
    return {
        schemaVersion: PLAYER_STATS_SCHEMA_VERSION,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        totalMoves: 0,
        bestWinMoves: null,
        normalLosses: 0,
        timeoutLosses: 0
    };
}

function toSafeInteger(value, fallback = 0) {
    if (value === null && fallback === null) return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.max(0, Math.floor(parsed));
}

function sanitizePlayerStats(raw) {
    const defaults = createDefaultPlayerStats();

    if (!raw || typeof raw !== 'object') {
        return defaults;
    }

    const stats = {
        schemaVersion: PLAYER_STATS_SCHEMA_VERSION,
        totalMatches: toSafeInteger(raw.totalMatches),
        wins: toSafeInteger(raw.wins),
        losses: toSafeInteger(raw.losses),
        totalMoves: toSafeInteger(raw.totalMoves),
        bestWinMoves:
            raw.bestWinMoves === null || raw.bestWinMoves === undefined
                ? null
                : toSafeInteger(raw.bestWinMoves, null),
        normalLosses: toSafeInteger(raw.normalLosses),
        timeoutLosses: toSafeInteger(raw.timeoutLosses)
    };

    if (stats.bestWinMoves === 0 && stats.wins === 0) {
        stats.bestWinMoves = null;
    }

    const totalOutcomes = stats.wins + stats.losses;
    if (stats.totalMatches !== totalOutcomes) {
        stats.totalMatches = totalOutcomes;
    }

    if (stats.timeoutLosses > stats.losses) {
        stats.timeoutLosses = stats.losses;
    }

    if (stats.normalLosses > stats.losses) {
        stats.normalLosses = stats.losses;
    }

    if (stats.normalLosses + stats.timeoutLosses > stats.losses) {
        stats.normalLosses = Math.max(0, stats.losses - stats.timeoutLosses);
    }

    return stats;
}

export function calculateWinRate(stats) {
    if (!stats || stats.totalMatches <= 0) return 0;

    const rate = (stats.wins / stats.totalMatches) * 100;
    return Math.round(rate * 10) / 10;
}

export class PlayerStatsStore {
    constructor({
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        storageKey = PLAYER_STATS_STORAGE_KEY
    } = {}) {
        this.storage = storage;
        this.storageKey = storageKey;
    }

    load() {
        if (!this.storage) {
            return createDefaultPlayerStats();
        }

        try {
            const raw = this.storage.getItem(this.storageKey);
            if (!raw) {
                return createDefaultPlayerStats();
            }

            const parsed = JSON.parse(raw);
            return sanitizePlayerStats(parsed);
        } catch {
            return createDefaultPlayerStats();
        }
    }

    save(stats) {
        const sanitized = sanitizePlayerStats(stats);

        if (!this.storage) {
            return sanitized;
        }

        try {
            this.storage.setItem(this.storageKey, JSON.stringify(sanitized));
        } catch {
            // Storage errors must not break gameplay.
        }

        return sanitized;
    }

    reset() {
        const defaults = createDefaultPlayerStats();

        if (this.storage) {
            try {
                this.storage.removeItem(this.storageKey);
            } catch {
                // Ignore storage remove failures.
            }
        }

        return defaults;
    }

    getSummary() {
        const stats = this.load();
        return {
            ...stats,
            winRate: calculateWinRate(stats)
        };
    }

    recordMatch({ winner, endReason, totalMoves, humanPlayer = 1 } = {}) {
        if (winner !== 1 && winner !== 2) {
            return this.getSummary();
        }

        const next = this.load();
        next.totalMatches += 1;
        next.totalMoves += toSafeInteger(totalMoves);

        if (winner === humanPlayer) {
            next.wins += 1;
            const safeMoves = toSafeInteger(totalMoves);

            if (
                next.bestWinMoves === null ||
                safeMoves < next.bestWinMoves
            ) {
                next.bestWinMoves = safeMoves;
            }
        } else {
            next.losses += 1;
            if (endReason === 'timeout') {
                next.timeoutLosses += 1;
            } else {
                next.normalLosses += 1;
            }
        }

        const saved = this.save(next);
        return {
            ...saved,
            winRate: calculateWinRate(saved)
        };
    }
}

export class MatchStatsRecorder {
    constructor({ store, humanPlayer = 1 } = {}) {
        this.store = store;
        this.humanPlayer = humanPlayer;
        this.matchIdCounter = 0;
        this.activeMatchId = null;
        this.hasRecordedResult = false;
    }

    beginMatch() {
        this.matchIdCounter += 1;
        this.activeMatchId = this.matchIdCounter;
        this.hasRecordedResult = false;
        return this.activeMatchId;
    }

    resetPendingMatch() {
        this.activeMatchId = null;
        this.hasRecordedResult = false;
    }

    recordIfGameOver({ winner, endReason, totalMoves, gameStatus } = {}) {
        if (
            this.activeMatchId === null ||
            this.hasRecordedResult ||
            gameStatus !== 'GAME_OVER'
        ) {
            return {
                recorded: false,
                summary: this.store?.getSummary?.() ?? null
            };
        }

        const summary = this.store.recordMatch({
            winner,
            endReason,
            totalMoves,
            humanPlayer: this.humanPlayer
        });

        this.hasRecordedResult = true;
        return {
            recorded: true,
            summary
        };
    }
}
