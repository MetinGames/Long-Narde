// engine/playerStats.js

export const PLAYER_STATS_STORAGE_KEY = 'longNarde.playerStats.v2';
export const LEGACY_PLAYER_STATS_STORAGE_KEY = 'longNarde.playerStats.v1';
export const PLAYER_STATS_SCHEMA_VERSION = 2;

export const BOT_DIFFICULTY_IDS = Object.freeze([
    'easy',
    'medium',
    'hard',
    'champion'
]);

export const PLAYER_ACHIEVEMENTS = Object.freeze([
    { id: 'first-match', isUnlocked: stats => stats.totalMatches >= 1 },
    { id: 'first-win', isUnlocked: stats => stats.wins >= 1 },
    { id: 'ten-matches', isUnlocked: stats => stats.totalMatches >= 10 },
    {
        id: 'champion-win',
        isUnlocked: stats => stats.byDifficulty.champion.wins >= 1
    }
]);

function createDefaultDifficultyStats() {
    return Object.fromEntries(BOT_DIFFICULTY_IDS.map(difficulty => [
        difficulty,
        { matches: 0, wins: 0, losses: 0 }
    ]));
}

export function createDefaultPlayerStats() {
    return {
        schemaVersion: PLAYER_STATS_SCHEMA_VERSION,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        totalMoves: 0,
        bestWinMoves: null,
        normalLosses: 0,
        timeoutLosses: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        byDifficulty: createDefaultDifficultyStats(),
        unlockedAchievementIds: []
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

    const byDifficulty = createDefaultDifficultyStats();
    for (const difficulty of BOT_DIFFICULTY_IDS) {
        const source = raw.byDifficulty?.[difficulty];
        const wins = toSafeInteger(source?.wins);
        const losses = toSafeInteger(source?.losses);
        byDifficulty[difficulty] = {
            matches: wins + losses,
            wins,
            losses
        };
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
        timeoutLosses: toSafeInteger(raw.timeoutLosses),
        currentWinStreak: toSafeInteger(raw.currentWinStreak),
        bestWinStreak: toSafeInteger(raw.bestWinStreak),
        byDifficulty,
        unlockedAchievementIds: []
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

    if (stats.bestWinStreak < stats.currentWinStreak) {
        stats.bestWinStreak = stats.currentWinStreak;
    }

    const knownAchievementIds = new Set(
        PLAYER_ACHIEVEMENTS.map(achievement => achievement.id)
    );
    const persistedAchievementIds = Array.isArray(raw.unlockedAchievementIds)
        ? raw.unlockedAchievementIds.filter(id => knownAchievementIds.has(id))
        : [];
    const earnedAchievementIds = PLAYER_ACHIEVEMENTS
        .filter(achievement => achievement.isUnlocked(stats))
        .map(achievement => achievement.id);
    stats.unlockedAchievementIds = Array.from(new Set([
        ...persistedAchievementIds,
        ...earnedAchievementIds
    ]));

    return stats;
}

export function calculateWinRate(stats) {
    if (!stats || stats.totalMatches <= 0) return 0;

    const rate = (stats.wins / stats.totalMatches) * 100;
    return Math.round(rate * 10) / 10;
}

export function calculateAverageMoves(stats) {
    if (!stats || stats.totalMatches <= 0) return 0;
    const average = stats.totalMoves / stats.totalMatches;
    return Math.round(average * 10) / 10;
}

export class PlayerStatsStore {
    constructor({
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        storageKey = PLAYER_STATS_STORAGE_KEY,
        legacyStorageKey = LEGACY_PLAYER_STATS_STORAGE_KEY
    } = {}) {
        this.storage = storage;
        this.storageKey = storageKey;
        this.legacyStorageKey = legacyStorageKey;
    }

    load() {
        if (!this.storage) {
            return createDefaultPlayerStats();
        }

        try {
            const current = this.storage.getItem(this.storageKey);
            const legacy = current
                ? null
                : this.storage.getItem(this.legacyStorageKey);
            const serialized = current || legacy;
            if (!serialized) {
                return createDefaultPlayerStats();
            }

            const parsed = JSON.parse(serialized);
            const stats = sanitizePlayerStats(parsed);
            if (legacy || parsed.schemaVersion !== PLAYER_STATS_SCHEMA_VERSION) {
                this.save(stats);
                try {
                    this.storage.removeItem(this.legacyStorageKey);
                } catch {
                    // Migration cleanup failure must not break gameplay.
                }
            }
            return stats;
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
                this.storage.removeItem(this.legacyStorageKey);
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
            winRate: calculateWinRate(stats),
            averageMoves: calculateAverageMoves(stats)
        };
    }

    recordMatch({
        winner,
        endReason,
        totalMoves,
        humanPlayer = 1,
        difficulty = 'medium'
    } = {}) {
        if (winner !== 1 && winner !== 2) {
            return this.getSummary();
        }

        const next = this.load();
        next.totalMatches += 1;
        next.totalMoves += toSafeInteger(totalMoves);

        const normalizedDifficulty = BOT_DIFFICULTY_IDS.includes(difficulty)
            ? difficulty
            : 'medium';
        const difficultyStats = next.byDifficulty[normalizedDifficulty];
        difficultyStats.matches += 1;

        if (winner === humanPlayer) {
            next.wins += 1;
            next.currentWinStreak += 1;
            next.bestWinStreak = Math.max(
                next.bestWinStreak,
                next.currentWinStreak
            );
            difficultyStats.wins += 1;
            const safeMoves = toSafeInteger(totalMoves);

            if (
                next.bestWinMoves === null ||
                safeMoves < next.bestWinMoves
            ) {
                next.bestWinMoves = safeMoves;
            }
        } else {
            next.losses += 1;
            next.currentWinStreak = 0;
            difficultyStats.losses += 1;
            if (endReason === 'timeout') {
                next.timeoutLosses += 1;
            } else {
                next.normalLosses += 1;
            }
        }

        const saved = this.save(next);
        return {
            ...saved,
            winRate: calculateWinRate(saved),
            averageMoves: calculateAverageMoves(saved)
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

    recordIfGameOver({
        winner,
        endReason,
        totalMoves,
        gameStatus,
        difficulty = 'medium'
    } = {}) {
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
            humanPlayer: this.humanPlayer,
            difficulty
        });

        this.hasRecordedResult = true;
        return {
            recorded: true,
            summary
        };
    }
}
