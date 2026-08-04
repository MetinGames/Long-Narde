import { sanitizeGameState } from './gameSnapshot.js';
import { normalizeCheckerColor } from './checkerColorPreference.js';
import { normalizeTurnTimerSeconds } from './turnTimerPreference.js';
import { normalizeAutoTurnConfirmEnabled } from './autoTurnConfirm.js';

export const ONGOING_MATCH_STORAGE_KEY = 'nardora.ongoingMatch.v1';
export const ONGOING_MATCH_SCHEMA_VERSION = 1;
export const ONGOING_MATCH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'champion']);

function isSafeCounter(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
}

export function sanitizeOngoingMatch(raw, {
    now = Date.now(),
    maxAgeMs = ONGOING_MATCH_MAX_AGE_MS
} = {}) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.schemaVersion !== ONGOING_MATCH_SCHEMA_VERSION) return null;
    if (!Number.isFinite(raw.savedAt)) return null;
    if (raw.savedAt > now + 60000) return null;
    if (now - raw.savedAt > maxAgeMs) return null;

    const gameState = sanitizeGameState(raw.gameState);
    if (!gameState) return null;
    if (!isSafeCounter(raw.totalMoves)) return null;

    return {
        schemaVersion: ONGOING_MATCH_SCHEMA_VERSION,
        savedAt: raw.savedAt,
        gameState,
        totalMoves: raw.totalMoves,
        difficulty: DIFFICULTIES.has(raw.difficulty)
            ? raw.difficulty
            : 'medium',
        autoBearOffEnabled: Boolean(raw.autoBearOffEnabled),
        autoTurnConfirmEnabled: normalizeAutoTurnConfirmEnabled(
            raw.autoTurnConfirmEnabled
        ),
        humanCheckerColor: normalizeCheckerColor(raw.humanCheckerColor),
        turnTimerSeconds: normalizeTurnTimerSeconds(raw.turnTimerSeconds)
    };
}

export class OngoingMatchStore {
    constructor({
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        storageKey = ONGOING_MATCH_STORAGE_KEY,
        now = () => Date.now(),
        maxAgeMs = ONGOING_MATCH_MAX_AGE_MS
    } = {}) {
        this.storage = storage;
        this.storageKey = storageKey;
        this.now = now;
        this.maxAgeMs = maxAgeMs;
    }

    save({
        gameState,
        totalMoves,
        difficulty,
        autoBearOffEnabled,
        autoTurnConfirmEnabled,
        humanCheckerColor,
        turnTimerSeconds
    } = {}) {
        const savedAt = this.now();
        const snapshot = sanitizeOngoingMatch({
            schemaVersion: ONGOING_MATCH_SCHEMA_VERSION,
            savedAt,
            gameState,
            totalMoves,
            difficulty,
            autoBearOffEnabled,
            autoTurnConfirmEnabled,
            humanCheckerColor,
            turnTimerSeconds
        }, {
            now: savedAt,
            maxAgeMs: this.maxAgeMs
        });

        if (!snapshot || !this.storage) return snapshot;

        try {
            this.storage.setItem(this.storageKey, JSON.stringify(snapshot));
        } catch {
            // Local storage failure must never block local gameplay.
        }

        return snapshot;
    }

    load() {
        if (!this.storage) return null;

        try {
            const serialized = this.storage.getItem(this.storageKey);
            if (!serialized) return null;

            const snapshot = sanitizeOngoingMatch(JSON.parse(serialized), {
                now: this.now(),
                maxAgeMs: this.maxAgeMs
            });
            if (!snapshot) this.clear();
            return snapshot;
        } catch {
            this.clear();
            return null;
        }
    }

    clear() {
        if (!this.storage) return;
        try {
            this.storage.removeItem(this.storageKey);
        } catch {
            // Cleanup failure is non-fatal; a future load will validate again.
        }
    }
}
