const STORAGE_KEY = 'narde-point-numbers';

function readStoredVisibility(storage) {
    if (!storage?.getItem) return false;

    try {
        return storage.getItem(STORAGE_KEY) === 'visible';
    } catch {
        return false;
    }
}

function persistVisibility(storage, isVisible) {
    if (!storage?.setItem) return;

    try {
        storage.setItem(
            STORAGE_KEY,
            isVisible ? 'visible' : 'hidden'
        );
    } catch {
        // The in-memory preference still works when storage is unavailable.
    }
}

function getDefaultStorage() {
    try {
        return globalThis.localStorage;
    } catch {
        return null;
    }
}

export class PointNumberController {
    constructor({
        button,
        renderer,
        translate,
        storage,
        onChange = () => null
    } = {}) {
        this.button = button || null;
        this.renderer = renderer || null;
        this.translate = translate || (key => key);
        this.storage = storage === undefined
            ? getDefaultStorage()
            : storage;
        this.onChange = onChange;
        this.isVisible = false;
        this.isStarted = false;
        this.handleClick = this.handleClick.bind(this);
    }

    applyVisibility(isVisible, { persist = true } = {}) {
        this.isVisible = Boolean(isVisible);
        this.renderer?.setPointNumbersVisible?.(
            this.isVisible
        );

        if (persist) {
            persistVisibility(this.storage, this.isVisible);
        }

        this.refreshForLanguage();
        this.onChange(this.isVisible);
    }

    refreshForLanguage() {
        if (!this.button) return;

        const key = this.isVisible
            ? 'ui.hidePointNumbers'
            : 'ui.showPointNumbers';
        const label = this.translate(key);

        this.button.setAttribute(
            'aria-pressed',
            this.isVisible ? 'true' : 'false'
        );
        this.button.setAttribute('aria-label', label);
        this.button.setAttribute('title', label);
        this.button.classList?.toggle(
            'is-active',
            this.isVisible
        );
    }

    handleClick(event) {
        event?.preventDefault?.();
        this.applyVisibility(!this.isVisible);
    }

    start() {
        if (this.isStarted) return;
        this.isStarted = true;

        this.applyVisibility(
            readStoredVisibility(this.storage),
            { persist: false }
        );
        this.button?.addEventListener?.(
            'click',
            this.handleClick
        );
    }

    dispose() {
        this.button?.removeEventListener?.(
            'click',
            this.handleClick
        );
        this.isStarted = false;
    }
}

export { STORAGE_KEY as POINT_NUMBER_STORAGE_KEY };
