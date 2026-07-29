// engine/sound.js

export const SOUND_PREFERENCE_KEY = 'narde-sound-enabled';

const EVENT_COOLDOWNS_MS = {
    dice: 120,
    piece: 60,
    invalid: 120,
    timeoutWarning: 450,
    win: 700,
    lose: 700,
    toggleConfirm: 220
};

function getAudioContextFactory() {
    const audioScope =
        typeof window !== 'undefined' ? window : globalThis;
    const AudioCtx =
        audioScope.AudioContext ||
        audioScope.webkitAudioContext;

    if (!AudioCtx) return null;
    return () => new AudioCtx();
}

function readEnabledPreference(storage) {
    if (!storage) return true;

    try {
        const rawValue = storage.getItem(SOUND_PREFERENCE_KEY);
        if (rawValue === '0') return false;
        if (rawValue === '1') return true;

        const normalized =
            String(rawValue || '').trim().toLowerCase();
        if (
            normalized === 'false' ||
            normalized === 'off'
        ) {
            return false;
        }
        if (
            normalized === 'true' ||
            normalized === 'on'
        ) {
            return true;
        }
    } catch (_error) {
        return true;
    }

    return true;
}

function writeEnabledPreference(storage, enabled) {
    if (!storage) return;

    try {
        storage.setItem(SOUND_PREFERENCE_KEY, enabled ? '1' : '0');
    } catch (_error) {
        // Storage errors are non-fatal for gameplay.
    }
}

function getNowMs() {
    if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
    }

    return Date.now();
}

export class SoundManager {
    constructor(options = {}) {
        this.storage = options.storage ??
            (typeof localStorage !== 'undefined' ? localStorage : null);
        this.audioContextFactory =
            options.audioContextFactory || getAudioContextFactory();
        this.getNow = options.getNow || getNowMs;
        this.random = options.random || Math.random;
        this.eventCooldowns = {
            ...EVENT_COOLDOWNS_MS,
            ...(options.eventCooldowns || {})
        };

        this.enabled = readEnabledPreference(this.storage);
        this.gameStarted = false;
        this.audioContext = null;
        this.masterGain = null;
        this.lastPlayedAt = new Map();
    }

    isEnabled() {
        return this.enabled;
    }

    async activateFromUserGesture() {
        this.gameStarted = true;

        if (!this.enabled) return false;
        return this.ensureContextFromUserGesture();
    }

    async setEnabled(enabled, options = {}) {
        const normalized = Boolean(enabled);
        const fromUserGesture = Boolean(options.fromUserGesture);

        this.enabled = normalized;
        writeEnabledPreference(this.storage, normalized);

        if (!normalized) {
            this.lastPlayedAt.clear();
            this.teardownContext();
            return false;
        }

        if (fromUserGesture) {
            await this.ensureContextFromUserGesture();
        }

        return true;
    }

    async toggleEnabled(options = {}) {
        await this.setEnabled(!this.enabled, options);
        return this.enabled;
    }

    async ensureContextFromUserGesture() {
        if (!this.enabled || !this.audioContextFactory) {
            return false;
        }

        if (!this.audioContext) {
            try {
                this.createAudioGraph();
            } catch (_error) {
                this.audioContext = null;
                this.masterGain = null;
                return false;
            }
        }

        if (
            this.audioContext &&
            this.audioContext.state === 'suspended' &&
            typeof this.audioContext.resume === 'function'
        ) {
            try {
                await this.audioContext.resume();
            } catch (_error) {
                return false;
            }
        }

        return this.isContextRunning();
    }

    teardownContext() {
        if (
            this.audioContext &&
            typeof this.audioContext.close === 'function' &&
            this.audioContext.state !== 'closed'
        ) {
            this.audioContext.close().catch(() => {});
        }

        this.audioContext = null;
        this.masterGain = null;
    }

    playDiceRoll() {
        if (!this.canPlay('dice')) return false;

        const startAt = this.audioContext.currentTime;
        for (let index = 0; index < 3; index++) {
            const offset = index * 0.019;
            this.playPulse({
                at: startAt + offset,
                frequency: 165 + this.random() * 240,
                duration: 0.06,
                gainPeak: 0.32,
                type: 'triangle'
            });
        }
        return true;
    }

    playPiecePlace() {
        if (!this.canPlay('piece')) return false;

        this.playPulse({
            at: this.audioContext.currentTime,
            frequency: 390,
            duration: 0.055,
            gainPeak: 0.275,
            type: 'triangle'
        });
        return true;
    }

    playInvalidMove() {
        if (!this.canPlay('invalid')) return false;

        const startAt = this.audioContext.currentTime;
        this.playPulse({
            at: startAt,
            frequency: 300,
            duration: 0.05,
            gainPeak: 0.2,
            type: 'sine'
        });
        this.playPulse({
            at: startAt + 0.055,
            frequency: 235,
            duration: 0.06,
            gainPeak: 0.19,
            type: 'sine'
        });
        return true;
    }

    playTimeoutWarning() {
        if (!this.canPlay('timeoutWarning')) return false;

        const startAt = this.audioContext.currentTime;
        this.playPulse({
            at: startAt,
            frequency: 520,
            duration: 0.09,
            gainPeak: 0.22,
            type: 'square'
        });
        this.playPulse({
            at: startAt + 0.11,
            frequency: 470,
            duration: 0.12,
            gainPeak: 0.205,
            type: 'square'
        });
        return true;
    }

    playResultWin() {
        if (!this.canPlay('win')) return false;

        const startAt = this.audioContext.currentTime;
        this.playPulse({
            at: startAt,
            frequency: 440,
            duration: 0.1,
            gainPeak: 0.245,
            type: 'triangle'
        });
        this.playPulse({
            at: startAt + 0.09,
            frequency: 554,
            duration: 0.12,
            gainPeak: 0.29,
            type: 'triangle'
        });
        this.playPulse({
            at: startAt + 0.2,
            frequency: 659,
            duration: 0.15,
            gainPeak: 0.325,
            type: 'triangle'
        });
        return true;
    }

    playResultLose() {
        if (!this.canPlay('lose')) return false;

        const startAt = this.audioContext.currentTime;
        this.playPulse({
            at: startAt,
            frequency: 250,
            duration: 0.1,
            gainPeak: 0.2,
            type: 'sine'
        });
        this.playPulse({
            at: startAt + 0.11,
            frequency: 190,
            duration: 0.12,
            gainPeak: 0.185,
            type: 'sine'
        });
        this.playPulse({
            at: startAt + 0.24,
            frequency: 146,
            duration: 0.18,
            gainPeak: 0.175,
            type: 'sine'
        });
        return true;
    }

    playToggleOnConfirm() {
        if (!this.canPlay('toggleConfirm')) return false;

        const startAt = this.audioContext.currentTime;
        this.playPulse({
            at: startAt,
            frequency: 590,
            duration: 0.09,
            gainPeak: 0.25,
            type: 'triangle'
        });
        this.playPulse({
            at: startAt + 0.085,
            frequency: 760,
            duration: 0.1,
            gainPeak: 0.285,
            type: 'triangle'
        });
        return true;
    }

    canPlay(eventKey) {
        if (!this.enabled || !this.gameStarted) return false;
        if (!this.isContextRunning()) return false;

        const now = this.getNow();
        const cooldown = this.eventCooldowns[eventKey] || 0;
        const previousAt = this.lastPlayedAt.get(eventKey) || -Infinity;

        if (now - previousAt < cooldown) {
            return false;
        }

        this.lastPlayedAt.set(eventKey, now);
        return true;
    }

    createAudioGraph() {
        const context = this.audioContextFactory();
        const gainNode = context.createGain();

        gainNode.gain.value = 0.19;
        gainNode.connect(context.destination);

        this.audioContext = context;
        this.masterGain = gainNode;
    }

    isContextRunning() {
        return Boolean(
            this.audioContext &&
            this.masterGain &&
            this.audioContext.state === 'running'
        );
    }

    playPulse({
        at,
        frequency,
        duration,
        gainPeak,
        type
    }) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const attackEnd = at + 0.007;
        const endAt = at + duration;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, at);

        gainNode.gain.setValueAtTime(0.0001, at);
        gainNode.gain.linearRampToValueAtTime(gainPeak, attackEnd);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(at);
        oscillator.stop(endAt + 0.02);
    }
}
