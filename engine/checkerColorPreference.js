export const CHECKER_COLOR_STORAGE_KEY = 'nardora.checkerColor.v1';

export const CHECKER_COLOR = Object.freeze({
    WHITE: 'white',
    BLACK: 'black'
});

const SUPPORTED_CHECKER_COLORS = new Set(Object.values(CHECKER_COLOR));

export function normalizeCheckerColor(value) {
    return SUPPORTED_CHECKER_COLORS.has(value)
        ? value
        : CHECKER_COLOR.WHITE;
}

export function getOppositeCheckerColor(value) {
    return normalizeCheckerColor(value) === CHECKER_COLOR.BLACK
        ? CHECKER_COLOR.WHITE
        : CHECKER_COLOR.BLACK;
}

export function readCheckerColorPreference(storage) {
    if (!storage) return CHECKER_COLOR.WHITE;

    try {
        return normalizeCheckerColor(
            storage.getItem(CHECKER_COLOR_STORAGE_KEY)
        );
    } catch {
        return CHECKER_COLOR.WHITE;
    }
}

export function persistCheckerColorPreference(storage, color) {
    const normalized = normalizeCheckerColor(color);
    if (!storage) return normalized;

    try {
        storage.setItem(CHECKER_COLOR_STORAGE_KEY, normalized);
    } catch {
        // The in-memory selection still applies when browser storage is blocked.
    }

    return normalized;
}

export class CheckerColorPreferenceController {
    constructor({
        inputs = [],
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        onChange = () => {}
    } = {}) {
        this.inputs = Array.from(inputs).filter(Boolean);
        this.storage = storage;
        this.onChange = onChange;
        this.color = CHECKER_COLOR.WHITE;
        this.listeners = [];
        this.active = false;
    }

    start() {
        if (this.active || this.inputs.length === 0) return false;

        for (const input of this.inputs) {
            const handler = event => {
                if (!event?.target?.checked) return;
                this.setColor(event.target.value);
            };
            input.addEventListener('change', handler);
            this.listeners.push({ input, handler });
        }

        this.active = true;
        this.setColor(
            readCheckerColorPreference(this.storage),
            { persist: false }
        );
        return true;
    }

    setColor(value, { persist = true, notify = true } = {}) {
        const color = normalizeCheckerColor(value);
        this.color = persist
            ? persistCheckerColorPreference(this.storage, color)
            : color;

        for (const input of this.inputs) {
            input.checked = input.value === this.color;
        }

        if (notify) this.onChange(this.color);
        return this.color;
    }

    getColor() {
        return this.color;
    }

    stop() {
        if (!this.active) return false;

        for (const { input, handler } of this.listeners.splice(0)) {
            input.removeEventListener('change', handler);
        }
        this.active = false;
        return true;
    }
}
