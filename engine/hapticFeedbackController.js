export const HAPTIC_STORAGE_KEY = 'nardora.haptics.v1';
export const DEFAULT_HAPTIC_ENABLED = false;

export const HAPTIC_PATTERNS = Object.freeze({
    move: Object.freeze([18]),
    collect: Object.freeze([24]),
    undo: Object.freeze([12])
});

function getDefaultStorage() {
    try {
        return globalThis.localStorage;
    } catch {
        return null;
    }
}

function getDefaultNavigator() {
    try {
        return globalThis.navigator;
    } catch {
        return null;
    }
}

export function normalizeHapticEnabled(value) {
    return value === true || value === 'true';
}

export function readHapticPreference(storage) {
    if (!storage?.getItem) return DEFAULT_HAPTIC_ENABLED;

    try {
        return normalizeHapticEnabled(
            storage.getItem(HAPTIC_STORAGE_KEY)
        );
    } catch {
        return DEFAULT_HAPTIC_ENABLED;
    }
}

export function persistHapticPreference(storage, value) {
    const enabled = normalizeHapticEnabled(value);
    if (!storage?.setItem) return enabled;

    try {
        storage.setItem(HAPTIC_STORAGE_KEY, String(enabled));
    } catch {
        // The explicit in-memory choice remains usable when storage is blocked.
    }

    return enabled;
}

export class HapticFeedbackController {
    constructor({
        button = null,
        storage = getDefaultStorage(),
        navigatorRef = getDefaultNavigator(),
        translate = key => key,
        patterns = HAPTIC_PATTERNS
    } = {}) {
        this.button = button;
        this.storage = storage;
        this.navigatorRef = navigatorRef;
        this.translate = translate;
        this.patterns = patterns;
        this.enabled = DEFAULT_HAPTIC_ENABLED;
        this.started = false;
        this.lastEventKey = null;
        this.handleToggle = this.handleToggle.bind(this);
    }

    isSupported() {
        return typeof this.navigatorRef?.vibrate === 'function';
    }

    isEnabled() {
        return this.enabled;
    }

    start() {
        if (this.started) return false;

        this.started = true;
        this.button?.addEventListener?.('click', this.handleToggle);
        this.setEnabled(
            readHapticPreference(this.storage),
            { persist: false }
        );
        return true;
    }

    stop() {
        if (!this.started) return false;

        this.button?.removeEventListener?.('click', this.handleToggle);
        this.started = false;
        return true;
    }

    handleToggle(event) {
        event?.preventDefault?.();
        this.setEnabled(!this.enabled);
    }

    setEnabled(value, { persist = true } = {}) {
        const enabled = normalizeHapticEnabled(value);
        this.enabled = persist
            ? persistHapticPreference(this.storage, enabled)
            : enabled;

        if (!this.enabled) {
            this.lastEventKey = null;
        }
        this.refreshForLanguage();
        return this.enabled;
    }

    refreshForLanguage() {
        if (!this.button) return;

        const labelKey = this.enabled
            ? 'ui.disableHaptics'
            : 'ui.enableHaptics';
        const label = this.translate(labelKey);

        this.button.setAttribute('aria-pressed', String(this.enabled));
        this.button.setAttribute('aria-label', label);
        this.button.setAttribute('title', label);
        this.button.setAttribute(
            'data-haptic-supported',
            String(this.isSupported())
        );
        this.button.classList?.toggle('is-active', this.enabled);

        const labelElement = this.button.querySelector?.(
            '[data-haptic-label]'
        );
        if (labelElement) labelElement.textContent = label;
    }

    trigger(eventType, { eventId = null } = {}) {
        if (!this.enabled || !this.isSupported()) return false;

        const pattern = this.patterns?.[eventType];
        if (!Array.isArray(pattern) || pattern.length === 0) return false;

        const eventKey = eventId === null || eventId === undefined
            ? null
            : `${eventType}:${String(eventId)}`;
        if (eventKey !== null && eventKey === this.lastEventKey) {
            return false;
        }
        if (eventKey !== null) this.lastEventKey = eventKey;

        try {
            return this.navigatorRef.vibrate([...pattern]) !== false;
        } catch {
            return false;
        }
    }
}
