// engine/feedbackModal.js

export class FeedbackModal {
    constructor({
        modal,
        openButton,
        closeButtons = [],
        backdropClose = true
    }) {
        this.modal = modal;
        this.openButton = openButton;
        this.closeButtons = Array.isArray(closeButtons)
            ? closeButtons.filter(Boolean)
            : [];
        this.backdropClose = backdropClose;

        this.isOpen = false;
        this.lastFocusedElement = null;

        this.boundOnKeyDown = event => {
            this.handleKeyDown(event);
        };

        this.boundOnModalClick = event => {
            if (this.backdropClose && event.target === this.modal) {
                this.close();
            }
        };

        this.bindEvents();
    }

    bindEvents() {
        this.openButton?.addEventListener('click', () => {
            this.open(this.openButton);
        });

        for (const closeButton of this.closeButtons) {
            closeButton.addEventListener('click', () => {
                this.close();
            });
        }

        this.modal?.addEventListener?.('click', this.boundOnModalClick);
    }

    getDocument() {
        if (this.modal?.ownerDocument) {
            return this.modal.ownerDocument;
        }

        if (typeof document !== 'undefined') {
            return document;
        }

        return null;
    }

    getFocusableElements() {
        if (!this.modal || typeof this.modal.querySelectorAll !== 'function') {
            return [];
        }

        const candidates = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        return Array.from(candidates).filter(element =>
            element &&
            !element.disabled &&
            element.hidden !== true &&
            element.getAttribute?.('aria-hidden') !== 'true'
        );
    }

    focusFirstControl() {
        const focusables = this.getFocusableElements();
        const target = focusables[0] || this.modal;
        target?.focus?.();
    }

    open(triggerElement = null) {
        if (!this.modal) return;

        const doc = this.getDocument();
        this.lastFocusedElement = triggerElement || doc?.activeElement || null;
        this.isOpen = true;

        this.modal.style.display = 'flex';
        this.modal.setAttribute('aria-hidden', 'false');

        doc?.addEventListener('keydown', this.boundOnKeyDown);
        this.focusFirstControl();
    }

    close({ returnFocus = true } = {}) {
        if (!this.modal) return;

        this.isOpen = false;
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');

        const doc = this.getDocument();
        doc?.removeEventListener('keydown', this.boundOnKeyDown);

        if (
            returnFocus &&
            this.lastFocusedElement &&
            typeof this.lastFocusedElement.focus === 'function'
        ) {
            this.lastFocusedElement.focus();
        }
    }

    handleKeyDown(event) {
        if (!this.isOpen) return;

        if (event.key === 'Escape') {
            event.preventDefault?.();
            this.close();
            return;
        }

        if (event.key !== 'Tab') return;

        const focusables = this.getFocusableElements();
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = this.getDocument()?.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault?.();
            last.focus?.();
            return;
        }

        if (!event.shiftKey && active === last) {
            event.preventDefault?.();
            first.focus?.();
        }
    }

    refreshForLanguage() {
        return this.isOpen;
    }
}