// engine/uiManager.js

export class UIManager {
    constructor() {
        this.undoButton = document.getElementById('undo-button');
        this.confirmButton = document.getElementById('confirm-button');
        this.timerDisplay = document.getElementById('timer-countdown');
    }

    // Sıra insana (Beyaz) geçtiğinde buton düzenini ayarlar
    setHumanTurnLayout() {
        if (this.undoButton) this.undoButton.style.display = "none";
        if (this.confirmButton) this.confirmButton.style.display = "none";
    }

    // İnsan zar attığında strateji butonlarını açar
    setHumanPlayingLayout() {
        if (this.undoButton) this.undoButton.style.display = "inline-block";
        if (this.confirmButton) this.confirmButton.style.display = "inline-block";
    }

    // Sıra bota (Siyah) geçtiğinde tüm butonları kilitler/gizler
    setBotTurnLayout() {
        if (this.undoButton) this.undoButton.style.display = "none";
        if (this.confirmButton) this.confirmButton.style.display = "none";
    }

    // Sayaç numarasını ekranda günceller
    updateTimerText(seconds) {
        if (this.timerDisplay) {
            this.timerDisplay.textContent = seconds;
        }
    }
}
