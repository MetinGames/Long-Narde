// app.js

import { NardeGame } from './engine/game.js';
import { Renderer } from './engine/renderer.js';
import { NardeBot } from './engine/bot.js';
import { UIManager } from './engine/uiManager.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium');
const ui = new UIManager();

const BOARD = {
    width: 800,
    height: 600,
    border: 20,
    bar: 30,
    tray: 55
};

let selectedSlotId = null;
let totalMoveCounter = 0;
let turnTimerInterval = null;
let diceAnimationInterval = null;
let turnEndTime = 0;
let scheduledTimeouts = new Set();

function schedule(callback, delay) {
    const timeoutId = setTimeout(() => {
        scheduledTimeouts.delete(timeoutId);
        callback();
    }, delay);
    scheduledTimeouts.add(timeoutId);
    return timeoutId;
}

function clearRuntimeTasks() {
    clearInterval(turnTimerInterval);
    clearInterval(diceAnimationInterval);
    turnTimerInterval = null;
    diceAnimationInterval = null;

    for (const timeoutId of scheduledTimeouts) {
        clearTimeout(timeoutId);
    }
    scheduledTimeouts.clear();
}

function updateScreen() {
    renderer.render(game, selectedSlotId);
}

function getHumanTurnDuration() {
    const completedTurns = game.turnsCompleted[1] || 0;
    return Math.max(30, 60 - (completedTurns * 10));
}

function updateTimerFromClock() {
    if (!turnEndTime || game.currentPlayer !== 1) return;

    const secondsLeft = Math.max(
        0,
        Math.ceil((turnEndTime - Date.now()) / 1000)
    );
    ui.updateTimerText(secondsLeft);

    if (secondsLeft === 0) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
        renderer.updateStatus('Süreniz doldu. Sıra bilgisayara geçti.');
        finishCurrentTurn();
    }
}

function startHumanTimer() {
    clearInterval(turnTimerInterval);

    const duration = getHumanTurnDuration();
    turnEndTime = Date.now() + (duration * 1000);
    ui.updateTimerText(duration);

    turnTimerInterval = setInterval(updateTimerFromClock, 250);
}

function finishCurrentTurn() {
    if (game.gameStatus === 'GAME_OVER') return;

    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    turnEndTime = 0;
    selectedSlotId = null;

    game.confirmTurnEnd();
    updateScreen();
    beginCurrentTurn();
}

function beginCurrentTurn() {
    if (game.gameStatus === 'GAME_OVER') return;

    if (game.currentPlayer === 1) {
        ui.setHumanTurnLayout();
        renderer.updateStatus('Sıra sizde.');
    } else {
        ui.setBotTurnLayout();
        renderer.updateStatus('Bilgisayarın sırası.');
    }

    schedule(startAutomaticDiceRoll, 650);
}

function startAutomaticDiceRoll() {
    if (game.gameStatus !== 'WAITING_FOR_DICE') return;

    const rollingPlayer = game.currentPlayer;
    ui.setBotTurnLayout();
    renderer.updateStatus(
        rollingPlayer === 1
            ? 'Zarlarınız atılıyor...'
            : 'Bilgisayar zar atıyor...'
    );

    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    let frame = 0;

    clearInterval(diceAnimationInterval);
    diceAnimationInterval = setInterval(() => {
        if (die1) die1.textContent = Math.floor(Math.random() * 6) + 1;
        if (die2) die2.textContent = Math.floor(Math.random() * 6) + 1;

        frame++;
        if (frame < 10) return;

        clearInterval(diceAnimationInterval);
        diceAnimationInterval = null;

        const diceValues = game.rollDice();
        selectedSlotId = null;
        updateScreen();

        if (rollingPlayer === 1) {
            ui.setHumanPlayingLayout();
            renderer.updateStatus(
                `Zarlar: ${diceValues.join(', ')}. Hamlenizi yapın.`
            );
            startHumanTimer();

            if (!game.hasValidMoves()) {
                renderer.updateStatus(
                    'Geçerli hamle yok. Hamleyi bitirin.'
                );
            }
        } else {
            renderer.updateStatus(
                `Bilgisayarın zarları: ${diceValues.join(', ')}.`
            );
            schedule(runBotMove, 550);
        }
    }, 70);
}

function runBotMove() {
    if (
        game.gameStatus === 'GAME_OVER' ||
        game.currentPlayer !== 2
    ) {
        return;
    }

    if (
        game.availableMoves.length === 0 ||
        !game.hasValidMoves()
    ) {
        finishCurrentTurn();
        return;
    }

    const move = bot.makeDecision(game);
    if (!move || !game.executeMove(move.from, move.dice)) {
        finishCurrentTurn();
        return;
    }

    totalMoveCounter++;
    updateScreen();

    const winner = game.checkWinCondition();
    if (winner !== 0) {
        showGameOver(winner);
        return;
    }

    schedule(runBotMove, 550);
}

function showGameOver(winner) {
    clearRuntimeTasks();
    selectedSlotId = null;
    updateScreen();
    ui.setBotTurnLayout();

    const overlay = document.getElementById('game-over-overlay');
    const title = document.getElementById('winner-title');
    const message = document.getElementById('winner-message');
    const statMoves = document.getElementById('stat-moves');

    if (title) {
        title.textContent =
            winner === 1 ? 'Tebrikler! 🎉' : 'Bu Kez Bilgisayar Kazandı';
    }
    if (message) {
        message.textContent =
            winner === 1
                ? 'Kazandınız! Harika bir oyun çıkardınız.'
                : 'Yeni oyunda rövanşı alabilirsiniz.';
    }
    if (statMoves) statMoves.textContent = totalMoveCounter;
    if (overlay) overlay.style.display = 'flex';
}

function restartGame() {
    clearRuntimeTasks();

    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.style.display = 'none';

    game.initGame();
    selectedSlotId = null;
    totalMoveCounter = 0;
    turnEndTime = 0;

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    renderer.updateStatus('Yeni oyun başlıyor...');

    schedule(startAutomaticDiceRoll, 650);
}

function getSlotFromCoordinates(x, y) {
    const {
        width,
        height,
        border,
        bar,
        tray
    } = BOARD;

    if (
        x >= width - border - tray &&
        x <= width - border &&
        y >= border &&
        y <= height - border
    ) {
        return 25;
    }

    if (
        x < border ||
        x > width - border - tray ||
        y < border ||
        y > height - border
    ) {
        return null;
    }

    const usableWidth = width - (border * 2) - bar - tray;
    const slotWidth = usableWidth / 12;
    const middleBarX = border + (usableWidth / 2);

    if (x >= middleBarX && x < middleBarX + bar) {
        return null;
    }

    const colIndex = x < middleBarX
        ? Math.floor((x - border) / slotWidth)
        : Math.floor((x - border - bar) / slotWidth);

    if (colIndex < 0 || colIndex > 11) return null;

    return y < (height / 2)
        ? 12 - colIndex
        : 13 + colIndex;
}

function handleSlotClick(slotId) {
    if (
        game.gameStatus !== 'PLAYING' ||
        game.currentPlayer !== 1
    ) {
        return;
    }

    const clickedSlot =
        slotId === 25 ? null : game.board.slots[slotId];

    if (selectedSlotId === null) {
        if (
            clickedSlot &&
            clickedSlot.player === game.currentPlayer &&
            clickedSlot.count > 0
        ) {
            selectedSlotId = slotId;
            updateScreen();
        }
        return;
    }

    if (selectedSlotId === slotId) {
        selectedSlotId = null;
        updateScreen();
        return;
    }

    if (
        clickedSlot &&
        clickedSlot.player === game.currentPlayer &&
        clickedSlot.count > 0
    ) {
        selectedSlotId = slotId;
        updateScreen();
        return;
    }

    if (!game.processPlayerInput(selectedSlotId, slotId)) {
        renderer.updateStatus('Bu hedefe geçerli bir hamle yapılamıyor.');
        return;
    }

    selectedSlotId = null;
    totalMoveCounter++;
    updateScreen();

    const winner = game.checkWinCondition();
    if (winner !== 0) {
        showGameOver(winner);
        return;
    }

    if (
        game.availableMoves.length === 0 ||
        !game.hasValidMoves()
    ) {
        renderer.updateStatus('Hamleniz tamamlandı.');
    }
}

function bindEvents() {
    const difficultySelect =
        document.getElementById('bot-difficulty');
    const restartButton =
        document.getElementById('restart-button');
    const canvas =
        document.getElementById('game-canvas');

    difficultySelect?.addEventListener('change', event => {
        bot.difficulty = event.target.value;
        renderer.updateStatus(
            `Bot seviyesi: ${event.target.selectedOptions[0].text}`
        );
    });

    restartButton?.addEventListener('click', restartGame);

    ui.undoButton?.addEventListener('click', () => {
        if (
            game.currentPlayer === 1 &&
            game.undoTurnMoves()
        ) {
            selectedSlotId = null;
            updateScreen();
            renderer.updateStatus('Bu turdaki hamleler geri alındı.');
        }
    });

    ui.confirmButton?.addEventListener('click', () => {
        if (
            game.currentPlayer !== 1 ||
            game.gameStatus !== 'PLAYING'
        ) {
            return;
        }

        if (
            game.availableMoves.length > 0 &&
            game.hasValidMoves()
        ) {
            renderer.updateStatus(
                'Önce kullanılabilecek zarları oynamalısınız.'
            );
            return;
        }

        finishCurrentTurn();
    });

    canvas?.addEventListener('click', event => {
        if (
            game.currentPlayer !== 1 ||
            game.gameStatus !== 'PLAYING'
        ) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        const slotId = getSlotFromCoordinates(x, y);

        if (slotId !== null) handleSlotClick(slotId);
    });

    document.addEventListener('visibilitychange', () => {
        if (
            document.visibilityState === 'visible' &&
            turnTimerInterval
        ) {
            updateTimerFromClock();
        }
    });

    window.addEventListener('focus', updateTimerFromClock);
}

window.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    restartGame();
});
