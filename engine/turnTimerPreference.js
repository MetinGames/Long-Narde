export const TURN_TIMER_STORAGE_KEY = 'nardora.turnTimerSeconds.v1';

export const TURN_TIMER_SECONDS = Object.freeze({
    OFF: 0,
    QUICK: 30,
    RELAXED: 60,
    EXTENDED: 90
});

export const DEFAULT_TURN_TIMER_SECONDS = TURN_TIMER_SECONDS.QUICK;

const SUPPORTED_DURATIONS = new Set(
    Object.values(TURN_TIMER_SECONDS)
);

export function normalizeTurnTimerSeconds(value) {
    if (value === null || value === undefined || value === '') {
        return DEFAULT_TURN_TIMER_SECONDS;
    }
    const duration = Number(value);
    return SUPPORTED_DURATIONS.has(duration)
        ? duration
        : DEFAULT_TURN_TIMER_SECONDS;
}

export function readTurnTimerPreference(storage) {
    if (!storage) return DEFAULT_TURN_TIMER_SECONDS;

    try {
        return normalizeTurnTimerSeconds(
            storage.getItem(TURN_TIMER_STORAGE_KEY)
        );
    } catch {
        return DEFAULT_TURN_TIMER_SECONDS;
    }
}

export function persistTurnTimerPreference(storage, value) {
    const duration = normalizeTurnTimerSeconds(value);
    if (!storage) return duration;

    try {
        storage.setItem(TURN_TIMER_STORAGE_KEY, String(duration));
    } catch {
        // The in-memory selection still applies when browser storage is blocked.
    }

    return duration;
}

export class TurnTimerPreferenceController {
    constructor({
        select = null,
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        onChange = () => {}
    } = {}) {
        this.select = select;
        this.storage = storage;
        this.onChange = onChange;
        this.durationSeconds = DEFAULT_TURN_TIMER_SECONDS;
        this.changeHandler = null;
    }

    start() {
        if (!this.select || this.changeHandler) return false;

        this.changeHandler = event => {
            this.setDurationSeconds(event?.target?.value);
        };
        this.select.addEventListener('change', this.changeHandler);
        this.setDurationSeconds(
            readTurnTimerPreference(this.storage),
            { persist: false }
        );
        return true;
    }

    setDurationSeconds(value, { persist = true, notify = true } = {}) {
        const duration = normalizeTurnTimerSeconds(value);
        this.durationSeconds = persist
            ? persistTurnTimerPreference(this.storage, duration)
            : duration;

        if (this.select) {
            this.select.value = String(this.durationSeconds);
        }
        if (notify) this.onChange(this.durationSeconds);
        return this.durationSeconds;
    }

    getDurationSeconds() {
        return this.durationSeconds;
    }

    stop() {
        if (!this.select || !this.changeHandler) return false;

        this.select.removeEventListener('change', this.changeHandler);
        this.changeHandler = null;
        return true;
    }
}
