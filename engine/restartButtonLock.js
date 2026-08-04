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

        // Keep receiving click events so an elapsed lock can recover even if
        // the browser throttled or discarded its unlock timer.
        this.button.disabled = false;
        this.button.setAttribute(
            'aria-disabled',
            disabled ? 'true' : 'false'
        );
        this.button.classList?.toggle(
            'is-restart-locked',
            disabled
        );

        if (this.button.style && typeof this.button.style === 'object') {
            this.button.style.pointerEvents = 'auto';
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
        this.cancelPendingUnlockTimer();
        this.locked = false;
        this.unlockAt = 0;
        this.setButtonState(false);
    }

    isLocked() {
        if (
            this.locked &&
            this.unlockAt > 0 &&
            this.now() >= this.unlockAt
        ) {
            this.unlock();
        }

        return this.locked;
    }

    dispose() {
        this.cancelPendingUnlockTimer();
        this.locked = false;
        this.unlockAt = 0;
        this.setButtonState(false);
    }
}
