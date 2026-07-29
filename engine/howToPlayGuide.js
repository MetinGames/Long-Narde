// engine/howToPlayGuide.js

import { t } from './i18n.js';

export class HowToPlayGuide {
    constructor({
        modal,
        openButton,
        closeButtons = [],
        previousButton,
        nextButton,
        startButton,
        pageCounter,
        pageElements,
        focusableElements,
        onStart
    }) {
        this.modal = modal;
        this.openButton = openButton;
        this.closeButtons = Array.isArray(closeButtons)
            ? closeButtons.filter(Boolean)
            : [];
        this.previousButton = previousButton;
        this.nextButton = nextButton;
        this.startButton = startButton;
        this.pageCounter = pageCounter;
        this.onStart = onStart;

        const inferredPages =
            this.modal && typeof this.modal.querySelectorAll === 'function'
                ? Array.from(this.modal.querySelectorAll('[data-guide-page]'))
                : [];
        this.pages = pageElements || inferredPages;

        this.focusableElements =
            Array.isArray(focusableElements)
                ? focusableElements
                : null;

        this.currentPageIndex = 0;
        this.isOpen = false;
        this.hasStartedFromGuide = false;
        this.lastFocusedElement = null;

        this.boundOnKeyDown = event => {
            this.handleKeyDown(event);
        };

        this.bindEvents();
        this.render();
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

        this.previousButton?.addEventListener('click', () => {
            this.goToPreviousPage();
        });

        this.nextButton?.addEventListener('click', () => {
            this.goToNextPage();
        });

        this.startButton?.addEventListener('click', () => {
            this.startGameFromGuide();
        });
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
        if (this.focusableElements) {
            return this.focusableElements.filter(element =>
                element &&
                !element.disabled &&
                element.hidden !== true
            );
        }

        if (!this.modal || typeof this.modal.querySelectorAll !== 'function') {
            return [];
        }

        const candidates = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        return Array.from(candidates).filter(element =>
            !element.disabled &&
            element.getAttribute?.('aria-hidden') !== 'true' &&
            element.hidden !== true
        );
    }

    focusFirstControl() {
        const focusables = this.getFocusableElements();
        const target = focusables[0] || this.startButton || this.modal;
        if (target && typeof target.focus === 'function') {
            target.focus();
        }
    }

    open(triggerElement = null) {
        if (!this.modal) return;

        const doc = this.getDocument();
        this.lastFocusedElement = triggerElement || doc?.activeElement || null;
        this.currentPageIndex = 0;
        this.isOpen = true;

        this.modal.style.display = 'flex';
        this.modal.setAttribute('aria-hidden', 'false');

        this.render();

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

    goToNextPage() {
        if (!this.pages.length) return;

        this.currentPageIndex = Math.min(
            this.pages.length - 1,
            this.currentPageIndex + 1
        );
        this.render();
    }

    goToPreviousPage() {
        if (!this.pages.length) return;

        this.currentPageIndex = Math.max(
            0,
            this.currentPageIndex - 1
        );
        this.render();
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
        const doc = this.getDocument();
        const active = doc?.activeElement;

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

    startGameFromGuide() {
        if (this.hasStartedFromGuide) return;

        this.hasStartedFromGuide = true;
        this.close({ returnFocus: false });

        if (typeof this.onStart === 'function') {
            this.onStart();
        }
    }

    refreshForLanguage() {
        this.render();
    }

    render() {
        for (let index = 0; index < this.pages.length; index++) {
            const page = this.pages[index];
            const isActive = index === this.currentPageIndex;

            page.hidden = !isActive;
            page.setAttribute('aria-hidden', String(!isActive));
            page.classList?.toggle('is-active', isActive);
        }

        if (this.previousButton) {
            this.previousButton.disabled = this.currentPageIndex === 0;
        }

        if (this.nextButton) {
            this.nextButton.disabled =
                this.currentPageIndex >= this.pages.length - 1;
        }

        if (this.pageCounter) {
            this.pageCounter.textContent = t('guide.pageCounter', {
                current: this.pages.length > 0
                    ? this.currentPageIndex + 1
                    : 0,
                total: this.pages.length
            });
        }
    }
}
