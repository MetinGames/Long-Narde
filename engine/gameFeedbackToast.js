// engine/gameFeedbackToast.js

export class GameFeedbackToast {
    constructor({
        container,
        durationMs = 1400,
        schedule = setTimeout,
        cancel = clearTimeout,
        documentRef = document
    } = {}) {
        this.container = container || null;
        this.durationMs = durationMs;
        this.schedule = schedule;
        this.cancel = cancel;
        this.documentRef = documentRef;
        this.hideTimerId = null;
        this.element = null;
    }

    ensureElement() {
        if (this.element) return this.element;
        if (!this.container || !this.documentRef) return null;

        let toast = this.documentRef.getElementById('game-feedback-toast');
        if (!toast) {
            toast = this.documentRef.createElement('div');
            toast.id = 'game-feedback-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');
            toast.setAttribute('aria-hidden', 'true');
            toast.className = 'game-feedback-toast';
            this.container.appendChild(toast);
        }

        this.element = toast;
        return toast;
    }

    clearHideTimer() {
        if (this.hideTimerId === null) return;
        this.cancel(this.hideTimerId);
        this.hideTimerId = null;
    }

    show(message, { durationMs = this.durationMs } = {}) {
        const toast = this.ensureElement();
        if (!toast || !message) return false;

        this.clearHideTimer();
        toast.textContent = message;
        toast.classList.add('is-visible');
        toast.setAttribute('aria-hidden', 'false');

        const safeDuration = Math.max(0, Number(durationMs) || 0);
        this.hideTimerId = this.schedule(() => {
            this.hide();
        }, safeDuration);

        return true;
    }

    hide() {
        this.clearHideTimer();
        const toast = this.ensureElement();
        if (!toast) return;

        toast.classList.remove('is-visible');
        toast.setAttribute('aria-hidden', 'true');
    }

    dispose() {
        this.clearHideTimer();
        this.element = null;
    }
}
