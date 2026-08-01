// engine/restartButtonLock.js

export class RestartButtonLock {
    constructor({
        button,
        delayMs = 700,
        schedule = setTimeout,
        cancel = clearTimeout,
        now = () => Date.now()
    } = {}) {
        this.button = button || null;
        this.delayMs = delayMs;
        this.schedule = schedule;
        this.cancel = cancel;
        this.now = now;
        this.locked = false;
        this.unlockTimerId = null;
        this.unlockAt = 0;
    }

    setButtonState(disabled) {
        if (!this.button) return;

        this.button.disabled = disabled;
        this.button.setAttribute(
            'aria-disabled',
            disabled ? 'true' : 'false'
        );

        if (this.button.style && typeof this.button.style === 'object') {
            this.button.style.pointerEvents = disabled ? 'none' : 'auto';
        }
    }

    scheduleUnlockTimer(delayMs) {
        this.unlockTimerId = this.schedule(() => {
            this.unlockTimerId = null;
            this.unlock();
        }, Math.max(0, delayMs));
    }

    cancelPendingUnlockTimer() {
        if (this.unlockTimerId === null) return;
        this.cancel(this.unlockTimerId);
        this.unlockTimerId = null;
    }

    clearPendingUnlock() {
        if (this.unlockTimerId === null) return;
        this.cancelPendingUnlockTimer();

        if (!this.locked) {
            return;
        }

        const remainingMs = this.unlockAt - this.now();
        if (remainingMs <= 0) {
            this.unlock();
            return;
        }

        this.scheduleUnlockTimer(remainingMs);
    }

    lock() {
        this.cancelPendingUnlockTimer();
        this.locked = true;
        this.unlockAt = this.now() + this.delayMs;
        this.setButtonState(true);
        this.scheduleUnlockTimer(this.delayMs);
    }

    unlock() {
        this.clearPendingUnlock();
        this.locked = false;
        this.unlockAt = 0;
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
