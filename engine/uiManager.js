// engine/uiManager.js

import { t } from './i18n.js';

export class UIManager {
    constructor() {
        this.actionButtons = document.getElementById('action-buttons');
        this.undoButton = document.getElementById('undo-button');
        this.confirmButton = document.getElementById('confirm-button');
        this.timerContainer = document.getElementById('timer-container');
        this.timerDisplay = document.getElementById('timer-countdown');
    }

    setActionButtonsVisible(isVisible) {
        if (!this.actionButtons) return;

        this.actionButtons.classList.toggle(
            'is-visible',
            isVisible
        );
        this.actionButtons.setAttribute(
            'aria-hidden',
            String(!isVisible)
        );

        if (this.undoButton) {
            this.undoButton.tabIndex = isVisible ? 0 : -1;
        }
        if (this.confirmButton) {
            this.confirmButton.tabIndex = isVisible ? 0 : -1;
        }
    }

    // Yeni insan turunda kontroller henüz görünmez.
    setHumanTurnLayout() {
        this.setActionButtonsVisible(false);
    }

    // Zar atıldıktan sonra ilk başarılı hamleye kadar gizli kalır.
    setHumanPlayingLayout() {
        this.setActionButtonsVisible(false);
    }

    // İlk başarılı hamleden sonra geçici kontroller belirir.
    setHumanMoveLayout() {
        this.setActionButtonsVisible(true);
    }

    // Sıra bota geçtiğinde geçici kontroller kaybolur.
    setBotTurnLayout() {
        this.setActionButtonsVisible(false);
    }

    setUndoEnabled(isEnabled) {
        if (!this.undoButton) return;

        this.undoButton.disabled = !isEnabled;
        this.undoButton.setAttribute(
            'aria-disabled',
            String(!isEnabled)
        );
    }

    setConfirmEnabled(isEnabled) {
        if (!this.confirmButton) return;

        this.confirmButton.disabled = !isEnabled;
        this.confirmButton.setAttribute(
            'aria-disabled',
            String(!isEnabled)
        );
    }

    // Sayaç numarasını ekranda günceller
    updateTimerText(seconds) {
        this.timerContainer?.classList.remove('is-disabled');
        if (this.timerDisplay) {
            this.timerDisplay.textContent = `${seconds} ${t('ui.secondsShort')}`;
        }
    }

    updateTimerDisabled() {
        this.timerContainer?.classList.add('is-disabled');
        if (this.timerDisplay) {
            this.timerDisplay.textContent = t('ui.timerOff');
        }
    }
}
