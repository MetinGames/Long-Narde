// engine/app.js

import { NardeGame } from './engine/game.js';
import { Renderer } from './engine/renderer.js';
import { NardeBot } from './engine/bot.js';
import { UIManager } from './engine/uiManager.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium'); // Başlangıç zorluğu orta
const ui = new UIManager();

let selectedSlotId = null; 
let turnTimerInterval = null;
let turnEndTime = 0; 
let timeLeft = 60; 
let totalMoveCounter = 0; // YENİ: Maç sonu istatistiği için hamle sayacı

const boardWidth = 800, boardHeight = 600, borderSize = 20, barWidth = 30;

// YENİ: Arayüzden bot zorluğu değiştirildiğinde bota aktar
const difficultySelect = document.getElementById('bot-difficulty');
if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
        bot.difficulty = e.target.value;
        renderer.updateStatus(`Bot zorluğu değiştirildi: ${e.target.options[e.target.selectedIndex].text}`);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    game.initGame();
    updateScreen();

    // OTOMATİK ZAR ATMA MOTORU
    function startAutomaticDiceRoll() {
        if (
            game.gameStatus !== 'WAITING_FOR_DICE' ||
            game.currentPlayer !== 1
        ) {
            return;
        }

        ui.setBotTurnLayout();
        renderer.updateStatus("Zarlar otomatik olarak atılıyor...");

        let count = 0;
        const d1 = document.getElementById('die1');
        const d2 = document.getElementById('die2');

        const anim = setInterval(() => {
            if (d1) d1.textContent = Math.floor(Math.random() * 6) + 1;
            if (d2) d2.textContent = Math.floor(Math.random() * 6) + 1;

            count++;

            if (count >= 10) {
                clearInterval(anim);

                const zarlar = game.rollDice();
                selectedSlotId = null;

                updateScreen();
                ui.setHumanPlayingLayout();

                const diceText = Array.isArray(zarlar)
                    ? zarlar.join(', ')
                    : zarlar;

                renderer.updateStatus(
                    `Zarlar: ${diceText}. Hamlelerinizi yapın.`
                );

                startTurnTimer();
            }
        }, 70);
    }

    // Oyun açıldıktan kısa süre sonra ilk zarlar otomatik atılır.
    setTimeout(startAutomaticDiceRoll, 700);

    // RESTART BUTONU
    const rBtn = document.getElementById('restart-button');
    if (rBtn) {
        rBtn.addEventListener('click', () => {
            document.getElementById('game-over-overlay').style.display = "none";
            clearInterval(turnTimerInterval);
            game.initGame(); 
            selectedSlotId = null; 
            totalMoveCounter = 0; // Sayaç sıfırlanır
            updateScreen();
            ui.setHumanTurnLayout();
            renderer.updateStatus("Yeni oyun başladı! Zar atın.");
        });
    }

    // MUTLAK ZAMANLAYICI (ABSOLUTE TIMER)
    function startTurnTimer() {
        clearInterval(turnTimerInterval); 
        const durationInSeconds = 60;
        turnEndTime = Date.now() + (durationInSeconds * 1000); 
        timeLeft = durationInSeconds;
        ui.updateTimerText(timeLeft);
        
        turnTimerInterval = setInterval(() => {
            const now = Date.now();
            timeLeft = Math.ceil((turnEndTime - now) / 1000);

            if (timeLeft <= 0) {
                timeLeft = 0;
                ui.updateTimerText(timeLeft);
                clearInterval(turnTimerInterval);
                renderer.updateStatus(`Süre doldu! Hamle hakkınızı kaybettiniz.`);
                forceSwitchTurn();
            } else {
                ui.updateTimerText(timeLeft);
            }
        }, 500); 
    }

    function forceSwitchTurn() {
        clearInterval(turnTimerInterval); 
        game.confirmTurnEnd(); 
        selectedSlotId = null; 
        updateScreen();
        if (game.currentPlayer === 2) { 
            ui.setBotTurnLayout(); 
            triggerBotTurnSequence(); 
        } else { 
            ui.setHumanTurnLayout(); 
        }
    }

    function triggerBotTurnSequence() {
        if (game.gameStatus === 'WAITING_FOR_DICE' && game.currentPlayer === 2) {
            renderer.updateStatus("Bilgisayar sırası: Zar atılıyor...");
            startTurnTimer();
            setTimeout(() => {
                const zarlar = game.rollDice(); 
                updateScreen();
                
                const diceText = Array.isArray(zarlar) ? zarlar.join(', ') : zarlar;
                renderer.updateStatus(`Bilgisayar zar attı: ${diceText}. Düşünüyor...`);
                
                setTimeout(() => runBotMoves(), 1200);
            }, 1000);
        }
    }

    function runBotMoves() {
        if (game.gameStatus === 'GAME_OVER') { handleGameOver(); return; }
        if (game.availableMoves.length === 0 || !game.hasValidMoves()) { endBotTurnSuccessfully(); return; }

        const bestMove = bot.makeDecision(game);
        if (!bestMove) { endBotTurnSuccessfully(); return; }

        game.executeMove(bestMove.from, bestMove.dice); 
        updateScreen();
        
        if (game.checkWinCondition() !== 0) { handleGameOver(); return; }
        setTimeout(() => runBotMoves(), 1000);
    }

    function endBotTurnSuccessfully() {
        clearInterval(turnTimerInterval); 
        game.confirmTurnEnd(); 
        selectedSlotId = null; 
        updateScreen();
        ui.setHumanTurnLayout(); 
        renderer.updateStatus("Sıra sana geçti. Zarlar hazırlanıyor...");
        setTimeout(startAutomaticDiceRoll, 700);
    }

    function handleGameOver() {
        clearInterval(turnTimerInterval);
        const winner = game.checkWinCondition();
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            overlay.style.display = "flex";
            document.getElementById('winner-title').textContent = winner === 1 ? "Tebrikler! 🎉" : "Oyun Bitti 😞";
            document.getElementById('winner-message').textContent = winner === 1 ? "Harika bir stratejiyle bilgisayarı yendiniz!" : "Bilgisayar kazandı.";
            
            // İstatistikleri doldur
            const statMoves = document.getElementById('stat-moves');
            if (statMoves) statMoves.textContent = totalMoveCounter || "15+";
        }
    }

    ui.undoButton.addEventListener('click', () => {
        if (game.currentPlayer === 1 && game.undoTurnMoves()) {
            selectedSlotId = null; 
            updateScreen(); 
            renderer.updateStatus("Tüm hamleleriniz geri alındı!");
        }
    });

    ui.confirmButton.addEventListener('click', () => {
        if (game.currentPlayer === 1) {
            if (game.availableMoves.length === 0 || !game.hasValidMoves()) {
                clearInterval(turnTimerInterval); 
                game.confirmTurnEnd(); 
                selectedSlotId = null; 
                updateScreen();
                ui.setBotTurnLayout(); 
                triggerBotTurnSequence();
            } else { 
                renderer.updateStatus(`Henüz oynamadığınız zarlarınız var!`); 
            }
        }
    });

    // CANVAS CLICK
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', (event) => {
        if (game.currentPlayer !== 1 || game.gameStatus === 'GAME_OVER') return; 
        const rect = canvas.getBoundingClientRect();
        const slotId = getSlotFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);
        if (slotId !== null) handleSlotClick(slotId);
    });
});

function getSlotFromCoordinates(x, y) {
    const trayWidth = 55; 
    
    if (x >= boardWidth - borderSize - trayWidth && x <= boardWidth - borderSize) {
        return 25; 
    }

    if (x < borderSize || x > boardWidth - borderSize - trayWidth || y < borderSize || y > boardHeight - borderSize) return null;
    
    const usableWidth = boardWidth - (borderSize * 2) - barWidth - trayWidth; 
    const slotWidth = usableWidth / 12; 
    const middleBarX = borderSize + (usableWidth / 2);
    
    if (x >= middleBarX && x < middleBarX + barWidth) return null;
    
    let colIndex = x < middleBarX ? Math.floor((x - borderSize) / slotWidth) : Math.floor((x - borderSize - barWidth) / slotWidth);
    
    return y < (boardHeight / 2) ? (12 - colIndex) : (13 + colIndex);
}

function handleSlotClick(slotId) {
    if (game.gameStatus !== 'PLAYING' || game.currentPlayer !== 1) return;
    const slot = slotId === 25 ? null : game.board.slots[slotId]; 

    if (selectedSlotId === null) {
        if (slot && slot.player === game.currentPlayer && slot.count > 0) { 
            selectedSlotId = slotId; 
            updateScreen(); 
        }
    } else {
        if (selectedSlotId === slotId) { 
            selectedSlotId = null; 
            updateScreen(); 
            return; 
        }

        const hamleBasarili = game.processPlayerInput(selectedSlotId, slotId);
        
        if (hamleBasarili) {
            selectedSlotId = null; 
            totalMoveCounter++; // Başarılı her hamlede sayacı artır
            updateScreen();
            if (game.checkWinCondition() !== 0) {
                handleGameOver();
            }
        }
    }
}

function updateScreen() { renderer.render(game, selectedSlotId); }