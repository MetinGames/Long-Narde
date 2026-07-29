// engine/playerStatsModal.js

import { t } from './i18n.js';

export class PlayerStatsModal {
    constructor({
        modal,
        openButton,
        closeButtons = [],
        resetButton,
        statsStore,
        valueElements,
        emptyState,
        cardsContainer,
        confirmReset = message => window.confirm(message)
    }) {
        this.modal = modal;
        this.openButton = openButton;
        this.closeButtons = closeButtons.filter(Boolean);
        this.resetButton = resetButton;
        this.statsStore = statsStore;
        this.valueElements = valueElements || {};
        this.emptyState = emptyState;
        this.cardsContainer = cardsContainer;
        this.confirmReset = confirmReset;

        this.isOpen = false;
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

        this.resetButton?.addEventListener('click', () => {
            this.handleReset();
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

    formatRate(rate) {
        return `${rate.toFixed(1)}%`;
    }

    render() {
        const summary = this.statsStore.getSummary();

        if (this.valueElements.totalMatches) {
            this.valueElements.totalMatches.textContent = String(summary.totalMatches);
        }
        if (this.valueElements.wins) {
            this.valueElements.wins.textContent = String(summary.wins);
        }
        if (this.valueElements.losses) {
            this.valueElements.losses.textContent = String(summary.losses);
        }
        if (this.valueElements.winRate) {
            this.valueElements.winRate.textContent = this.formatRate(summary.winRate);
        }
        if (this.valueElements.totalMoves) {
            this.valueElements.totalMoves.textContent = String(summary.totalMoves);
        }
        if (this.valueElements.bestWinMoves) {
            this.valueElements.bestWinMoves.textContent =
                summary.bestWinMoves === null
                    ? t('stats.noBestWin')
                    : String(summary.bestWinMoves);
        }
        if (this.valueElements.normalLosses) {
            this.valueElements.normalLosses.textContent = String(summary.normalLosses);
        }
        if (this.valueElements.timeoutLosses) {
            this.valueElements.timeoutLosses.textContent = String(summary.timeoutLosses);
        }

        const hasMatches = summary.totalMatches > 0;
        if (this.emptyState) {
            this.emptyState.hidden = hasMatches;
            this.emptyState.setAttribute('aria-hidden', String(hasMatches));
        }

        if (this.cardsContainer) {
            this.cardsContainer.hidden = !hasMatches;
            this.cardsContainer.setAttribute('aria-hidden', String(!hasMatches));
        }
    }

    refreshForLanguage() {
        this.render();
    }

    handleReset() {
        const confirmed = this.confirmReset(t('stats.resetConfirm'));
        if (!confirmed) return;

        this.statsStore.reset();
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
        const activeElement = this.getDocument()?.activeElement;

        if (event.shiftKey && activeElement === first) {
            event.preventDefault?.();
            last.focus?.();
            return;
        }

        if (!event.shiftKey && activeElement === last) {
            event.preventDefault?.();
            first.focus?.();
        }
    }
}
