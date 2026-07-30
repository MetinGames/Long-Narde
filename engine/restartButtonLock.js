// engine/restartButtonLock.js

export class RestartButtonLock {
    constructor({
        button,
        delayMs = 700,
        schedule = setTimeout,
        cancel = clearTimeout
    } = {}) {
        this.button = button || null;
        this.delayMs = delayMs;
        this.schedule = schedule;
        this.cancel = cancel;
        this.locked = false;
        this.unlockTimerId = null;
    }

    setButtonState(disabled) {
        if (!this.button) return;

        this.button.disabled = disabled;
        this.button.setAttribute(
            'aria-disabled',
            disabled ? 'true' : 'false'
        );
    }

    clearPendingUnlock() {
        if (this.unlockTimerId === null) return;
        this.cancel(this.unlockTimerId);
        this.unlockTimerId = null;
    }

    lock() {
        this.clearPendingUnlock();
        this.locked = true;
        this.setButtonState(true);

        this.unlockTimerId = this.schedule(() => {
            this.unlockTimerId = null;
            this.unlock();
        }, this.delayMs);
    }

    unlock() {
        this.clearPendingUnlock();
        this.locked = false;
        this.setButtonState(false);
    }

    isLocked() {
        return this.locked;
    }

    dispose() {
        this.clearPendingUnlock();
        this.locked = false;
    }
}
