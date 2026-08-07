// engine/sound.js

export const SOUND_PREFERENCE_KEY = 'narde-sound-enabled';
export const SOUND_VOLUME_PREFERENCE_KEY = 'nardora.sound-volume.v1';
export const DEFAULT_SOUND_VOLUME = 1;

const EVENT_COOLDOWNS_MS = {
    dice: 120,
    piece: 60,
    invalid: 120,
    timeoutWarning: 450,
    win: 700,
    lose: 700,
    toggleConfirm: 220
};

const OUTPUT_PROFILE = {
    masterGain: 0.68,
    limiter: {
        threshold: -9,
        knee: 12,
        ratio: 16,
        attack: 0.002,
        release: 0.16
    }
};

const RECORDED_SOUND_PROFILES = {
    diceRoll: {
        baseGain: 1.18,
        gainJitter: 0.05,
        baseRate: 1,
        rateJitter: 0.03,
        trimStartSeconds: 0.004
    },
    piecePlace: {
        baseGain: 1.04,
        gainJitter: 0.045,
        baseRate: 1.01,
        rateJitter: 0.025,
        trimStartSeconds: 0.162
    },
    pieceCollect: {
        baseGain: 1.12,
        gainJitter: 0.04,
        baseRate: 0.95,
        rateJitter: 0.025,
        trimStartSeconds: 0.168
    }
};

const MAX_TRACKED_MOVE_SOUNDS = 400;
const MAX_TRACKED_ROLL_SOUNDS = 300;
export const MAX_CONCURRENT_BUFFER_SOURCES = 8;

const DICE_COMPOSITE_PROFILE = {
    secondHitDelaySeconds: 0.028,
    firstHitGainMultiplier: 0.84,
    secondHitGainMultiplier: 0.72,
    firstHitRateOffset: -0.007,
    secondHitRateOffset: 0.016,
    firstHitPan: -0.08,
    secondHitPan: 0.1
};

const RECORDED_SOUND_SOURCES = {
    diceRoll: '../assets/sounds/freesound_community-gamemisc_dice-roll-on-wood_jaku5-37414.mp3',
    woodHit: '../assets/sounds/sumaga123-wood-hit-432148.mp3'
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

export function normalizeSoundVolume(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_SOUND_VOLUME;
    return Math.min(1, Math.max(0, numeric));
}

function readVolumePreference(storage) {
    if (!storage) return DEFAULT_SOUND_VOLUME;
    try {
        const value = storage.getItem(SOUND_VOLUME_PREFERENCE_KEY);
        return value === null ? DEFAULT_SOUND_VOLUME : normalizeSoundVolume(value);
    } catch (_error) {
        return DEFAULT_SOUND_VOLUME;
    }
}

function writeVolumePreference(storage, volume) {
    if (!storage) return;
    try {
        storage.setItem(SOUND_VOLUME_PREFERENCE_KEY, String(volume));
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
        this.recordedBufferLoader =
            options.recordedBufferLoader || null;

        this.enabled = readEnabledPreference(this.storage);
        this.volume = readVolumePreference(this.storage);
        this.gameStarted = false;
        this.audioContext = null;
        this.masterGain = null;
        this.lastPlayedAt = new Map();
        this.recordedBuffers = new Map();
        this.recordedLoadPromises = new Map();
        this.recordedPreloadPromise = null;
        this.activeBufferSources = new Set();
        this.playedPieceMoveIds = new Set();
        this.playedPieceMoveOrder = [];
        this.playedDiceRollIds = new Set();
        this.playedDiceRollOrder = [];
    }

    isEnabled() {
        return this.enabled;
    }

    getVolume() {
        return this.volume;
    }

    setVolume(volume) {
        this.volume = normalizeSoundVolume(volume);
        writeVolumePreference(this.storage, this.volume);
        this.applyMasterVolume();
        return this.volume;
    }

    applyMasterVolume() {
        if (!this.masterGain) return;
        const gain = OUTPUT_PROFILE.masterGain * this.volume;
        if (this.masterGain.gain) {
            this.masterGain.gain.value = gain;
        }
    }

    async activateFromUserGesture() {
        this.gameStarted = true;
        this.resetMoveScopedPlaybackTracking();
        this.resetRollScopedPlaybackTracking();

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
            this.resetMoveScopedPlaybackTracking();
            this.resetRollScopedPlaybackTracking();
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
            ['suspended', 'interrupted'].includes(this.audioContext.state) &&
            typeof this.audioContext.resume === 'function'
        ) {
            try {
                await this.audioContext.resume();
            } catch (_error) {
                return false;
            }
        }

        if (this.isContextRunning()) {
            void this.preloadRecordedSounds();
        }

        return this.isContextRunning();
    }

    teardownContext() {
        for (const source of this.activeBufferSources) {
            try {
                source.stop?.();
            } catch {
                // A source that already ended is safe to ignore.
            }
        }
        this.activeBufferSources.clear();

        if (
            this.audioContext &&
            typeof this.audioContext.close === 'function' &&
            this.audioContext.state !== 'closed'
        ) {
            this.audioContext.close().catch(() => {});
        }

        this.audioContext = null;
        this.masterGain = null;
        this.outputLimiter = null;
        this.outputNode = null;
        this.recordedPreloadPromise = null;
    }

    playDiceRoll() {
        if (!this.canPlay('dice')) return false;

        const buffer = this.recordedBuffers.get('diceRoll');
        if (buffer) {
            this.playCompositeDiceRollBuffer(
                buffer,
                RECORDED_SOUND_PROFILES.diceRoll
            );
            return true;
        }

        void this.loadRecordedSoundBuffer('diceRoll').catch(() => {});
        return false;
    }

    playDiceRollForRoll({ rollId } = {}) {
        if (!Number.isInteger(rollId) || rollId <= 0) {
            return false;
        }

        if (this.playedDiceRollIds.has(rollId)) {
            return false;
        }

        this.playedDiceRollIds.add(rollId);
        this.playedDiceRollOrder.push(rollId);
        this.trimRollSoundTracking();

        return this.playDiceRoll();
    }

    playPiecePlace({ isCollect = false } = {}) {
        return this.playRecordedSound(
            'piece',
            'woodHit',
            isCollect
                ? RECORDED_SOUND_PROFILES.pieceCollect
                : RECORDED_SOUND_PROFILES.piecePlace
        );
    }

    playPiecePlaceForMove({
        moveId,
        isCollect = false,
        wasInvalid = false,
        wasCanceled = false,
        wasUndo = false
    } = {}) {
        if (
            !Number.isInteger(moveId) ||
            moveId <= 0 ||
            wasInvalid ||
            wasCanceled ||
            wasUndo
        ) {
            return false;
        }

        if (this.playedPieceMoveIds.has(moveId)) {
            return false;
        }

        this.playedPieceMoveIds.add(moveId);
        this.playedPieceMoveOrder.push(moveId);
        this.trimMoveSoundTracking();

        return this.playPiecePlace({ isCollect });
    }

    resetMoveScopedPlaybackTracking() {
        this.playedPieceMoveIds.clear();
        this.playedPieceMoveOrder.length = 0;
    }

    resetRollScopedPlaybackTracking() {
        this.playedDiceRollIds.clear();
        this.playedDiceRollOrder.length = 0;
    }

    trimMoveSoundTracking() {
        while (this.playedPieceMoveOrder.length > MAX_TRACKED_MOVE_SOUNDS) {
            const oldest = this.playedPieceMoveOrder.shift();
            this.playedPieceMoveIds.delete(oldest);
        }
    }

    trimRollSoundTracking() {
        while (this.playedDiceRollOrder.length > MAX_TRACKED_ROLL_SOUNDS) {
            const oldest = this.playedDiceRollOrder.shift();
            this.playedDiceRollIds.delete(oldest);
        }
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
        if (
            !this.enabled ||
            !this.gameStarted ||
            !this.audioContext ||
            !this.masterGain
        ) {
            return false;
        }

        if (!this.isContextRunning()) {
            return false;
        }

        const now = this.getNow();
        const cooldown = this.eventCooldowns[eventKey] ?? 80;
        const lastAt = this.lastPlayedAt.get(eventKey) ?? -Infinity;
        if (now - lastAt < cooldown) {
            return false;
        }

        this.lastPlayedAt.set(eventKey, now);
        return true;
    }

    createAudioGraph() {
        const context = this.audioContextFactory();
        const gainNode = context.createGain();
        gainNode.gain.value = OUTPUT_PROFILE.masterGain * this.volume;

        let outputNode = context.destination;
        if (typeof context.createDynamicsCompressor === 'function') {
            const limiter = context.createDynamicsCompressor();
            limiter.threshold.value = OUTPUT_PROFILE.limiter.threshold;
            limiter.knee.value = OUTPUT_PROFILE.limiter.knee;
            limiter.ratio.value = OUTPUT_PROFILE.limiter.ratio;
            limiter.attack.value = OUTPUT_PROFILE.limiter.attack;
            limiter.release.value = OUTPUT_PROFILE.limiter.release;
            gainNode.connect(limiter);
            limiter.connect(context.destination);
            this.outputLimiter = limiter;
            outputNode = limiter;
        } else {
            this.outputLimiter = null;
            gainNode.connect(context.destination);
        }

        this.audioContext = context;
        this.masterGain = gainNode;
        this.outputNode = outputNode;
    }

    async preloadRecordedSounds() {
        if (!this.enabled || !this.audioContext || !this.isContextRunning()) {
            return;
        }

        if (!this.recordedPreloadPromise) {
            this.recordedPreloadPromise = Promise.allSettled(
                Object.keys(RECORDED_SOUND_SOURCES).map(soundKey =>
                    this.loadRecordedSoundBuffer(soundKey)
                )
            ).then(() => undefined)
                .catch(() => undefined)
                .finally(() => {
                    this.recordedPreloadPromise = null;
                });
        }

        await this.recordedPreloadPromise;
    }

    async loadRecordedSoundBuffer(soundKey) {
        if (!this.enabled || !this.audioContext) return null;

        if (this.recordedBuffers.has(soundKey)) {
            return this.recordedBuffers.get(soundKey);
        }

        if (this.recordedLoadPromises.has(soundKey)) {
            return this.recordedLoadPromises.get(soundKey);
        }

        const loadPromise = this.decodeRecordedSoundBuffer(soundKey)
            .then(buffer => {
                if (buffer) {
                    this.recordedBuffers.set(soundKey, buffer);
                }
                return buffer;
            })
            .finally(() => {
                this.recordedLoadPromises.delete(soundKey);
            });

        this.recordedLoadPromises.set(soundKey, loadPromise);
        return loadPromise;
    }

    async decodeRecordedSoundBuffer(soundKey) {
        const sourcePath = RECORDED_SOUND_SOURCES[soundKey];
        if (!sourcePath || !this.audioContext) {
            return null;
        }

        if (typeof this.recordedBufferLoader === 'function') {
            return this.recordedBufferLoader({
                context: this.audioContext,
                soundKey,
                sourcePath,
                sourceUrl: this.resolveAssetUrl(sourcePath)
            });
        }

        if (typeof fetch !== 'function') {
            return null;
        }

        const response = await fetch(this.resolveAssetUrl(sourcePath));
        if (!response.ok) {
            throw new Error(`Ses dosyasi yuklenemedi: ${sourcePath}`);
        }

        const fileData = await response.arrayBuffer();
        return this.decodeAudioData(fileData);
    }

    resolveAssetUrl(sourcePath) {
        return new URL(sourcePath, import.meta.url).href;
    }

    decodeAudioData(fileData) {
        if (!this.audioContext) {
            return Promise.resolve(null);
        }

        const decoded = this.audioContext.decodeAudioData(fileData.slice(0));
        if (decoded && typeof decoded.then === 'function') {
            return decoded;
        }

        return new Promise((resolve, reject) => {
            this.audioContext.decodeAudioData(fileData.slice(0), resolve, reject);
        });
    }

    isContextRunning() {
        return Boolean(
            this.audioContext &&
            this.audioContext.state === 'running'
        );
    }

    playRecordedSound(eventKey, soundKey, profile) {
        if (!this.canPlay(eventKey)) return false;

        const buffer = this.recordedBuffers.get(soundKey);
        if (buffer) {
            this.playBufferInstance(buffer, profile);
            return true;
        }

        // When a buffer is not yet ready, trigger lazy load but avoid late playback.
        // This keeps checker contact aligned with visual landing instead of trailing it.
        void this.loadRecordedSoundBuffer(soundKey).catch(() => {});
        return false;
    }

    playCompositeDiceRollBuffer(buffer, profile) {
        this.playBufferInstance(buffer, profile, {
            gainMultiplier: DICE_COMPOSITE_PROFILE.firstHitGainMultiplier,
            rateOffset: DICE_COMPOSITE_PROFILE.firstHitRateOffset,
            pan: DICE_COMPOSITE_PROFILE.firstHitPan
        });

        this.playBufferInstance(buffer, profile, {
            startDelaySeconds: DICE_COMPOSITE_PROFILE.secondHitDelaySeconds,
            gainMultiplier: DICE_COMPOSITE_PROFILE.secondHitGainMultiplier,
            rateOffset: DICE_COMPOSITE_PROFILE.secondHitRateOffset,
            pan: DICE_COMPOSITE_PROFILE.secondHitPan
        });
    }

    playBufferInstance(buffer, profile, options = {}) {
        if (!this.audioContext || !this.masterGain) {
            return;
        }

        if (this.activeBufferSources.size >= MAX_CONCURRENT_BUFFER_SOURCES) {
            return;
        }

        const startDelaySeconds = Math.max(
            0,
            Number(options.startDelaySeconds) || 0
        );
        const rateOffset = Number(options.rateOffset) || 0;
        const gainMultiplier = Math.max(
            0,
            Number(options.gainMultiplier) || 1
        );
        const panValue = Math.max(
            -1,
            Math.min(1, Number(options.pan) || 0)
        );

        const source = this.audioContext.createBufferSource();
        this.activeBufferSources.add(source);
        source.onended = () => {
            this.activeBufferSources.delete(source);
        };
        const gainNode = this.audioContext.createGain();
        const gainJitter = (this.random() * 2 - 1) * profile.gainJitter;
        const rateJitter = (this.random() * 2 - 1) * profile.rateJitter;
        const startAt = this.audioContext.currentTime + startDelaySeconds;
        const gainValue = Math.min(
            1.35,
            Math.max(0.01, (profile.baseGain + gainJitter) * gainMultiplier)
        );
        const rateValue = Math.max(
            0.85,
            profile.baseRate + rateJitter + rateOffset
        );

        source.buffer = buffer;
        source.playbackRate.setValueAtTime(
            rateValue,
            startAt
        );
        gainNode.gain.setValueAtTime(
            gainValue,
            startAt
        );

        let outputNode = gainNode;
        if (typeof this.audioContext.createStereoPanner === 'function') {
            const panner = this.audioContext.createStereoPanner();
            panner.pan.setValueAtTime(panValue, startAt);
            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(this.masterGain);
            outputNode = panner;
        }

        if (outputNode === gainNode) {
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
        }

        source.start(
            startAt,
            Math.max(0, profile.trimStartSeconds || 0)
        );
    }

    playPulse({
        at,
        frequency,
        duration,
        gainPeak,
        type = 'sine'
    }) {
        if (!this.audioContext || !this.masterGain) {
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, at);

        const fadeInDuration = Math.min(0.012, duration * 0.35);
        const fadeOutStart = at + duration * 0.62;
        const endAt = at + duration;

        gainNode.gain.setValueAtTime(0.0001, at);
        gainNode.gain.linearRampToValueAtTime(
            gainPeak,
            at + fadeInDuration
        );
        gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            Math.max(fadeOutStart, at + fadeInDuration + 0.01)
        );

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(at);
        oscillator.stop(endAt + 0.02);
    }
}
