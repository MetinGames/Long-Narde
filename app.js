// app.js

import { NardeGame } from './engine/game.js';
import { Renderer } from './engine/renderer.js';
import { NardeBot } from './engine/bot.js';
import { UIManager } from './engine/uiManager.js';
import {
    applyTranslations,
    getLanguage,
    setLanguage,
    t
} from './engine/i18n.js';
import { DiceRollAnimation } from './engine/animations.js';
import { bindCanvasInput } from './engine/input.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium');
const ui = new UIManager();
const diceRollAnimation = new DiceRollAnimation();

let selectedSlotId = null;
let totalMoveCounter = 0;
let turnTimerInterval = null;
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
    turnTimerInterval = null;
    diceRollAnimation.stop();

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
        renderer.updateStatus(t('status.timeExpired'));
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
        renderer.updateStatus(t('status.yourTurn'));
    } else {
        ui.setBotTurnLayout();
        renderer.updateStatus(t('status.botTurn'));
    }

    schedule(startAutomaticDiceRoll, 650);
}

function startAutomaticDiceRoll() {
    if (game.gameStatus !== 'WAITING_FOR_DICE') return;

    const rollingPlayer = game.currentPlayer;
    ui.setBotTurnLayout();
    renderer.updateStatus(
        rollingPlayer === 1
            ? t('status.rollingYou')
            : t('status.rollingBot')
    );

    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');

    diceRollAnimation.start(die1, die2, () => {
        const diceValues = game.rollDice();
        selectedSlotId = null;
        updateScreen();

        if (rollingPlayer === 1) {
            ui.setHumanPlayingLayout();
            renderer.updateStatus(
                t('status.rolledYou', {
                    dice: diceValues.join(', ')
                })
            );
            startHumanTimer();

            if (!game.hasValidMoves()) {
                renderer.updateStatus(t('status.noMoves'));
            }
        } else {
            renderer.updateStatus(
                t('status.rolledBot', {
                    dice: diceValues.join(', ')
                })
            );
            schedule(runBotMove, 550);
        }
    });
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
            winner === 1 ? t('game.winTitle') : t('game.loseTitle');
    }
    if (message) {
        message.textContent =
            winner === 1
                ? t('game.winMessage')
                : t('game.loseMessage');
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
    renderer.updateStatus(t('status.starting'));

    schedule(startAutomaticDiceRoll, 650);
}

function explainUnplayableSlot(slotId) {
    const headSlot = game.board.getHeadSlot(game.currentPlayer);

    if (
        slotId === headSlot &&
        !game.canMoveFromHead()
    ) {
        renderer.updateStatus(
            t('status.headBlocked')
        );
    } else {
        renderer.updateStatus(
            t('status.pieceBlocked')
        );
    }
}

function selectPlayableSlot(slotId) {
    const legalTargets = game.getLegalTargets(slotId);

    if (legalTargets.length === 0) {
        selectedSlotId = null;
        updateScreen();
        explainUnplayableSlot(slotId);
        return false;
    }

    selectedSlotId = slotId;
    updateScreen();

    if (legalTargets.includes(25)) {
        renderer.updateStatus(
            t('status.selectCollect')
        );
    } else {
        renderer.updateStatus(
            t('status.selectTarget')
        );
    }
    return true;
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
            selectPlayableSlot(slotId);
        }
        return;
    }

    if (selectedSlotId === slotId) {
        selectedSlotId = null;
        updateScreen();
        renderer.updateStatus(t('status.deselected'));
        return;
    }

    const legalTargets =
        game.getLegalTargets(selectedSlotId);

    // Hedefte kendi pulumuz olsa bile önce hamleyi uygula.
    if (legalTargets.includes(slotId)) {
        if (!game.processPlayerInput(selectedSlotId, slotId)) {
            renderer.updateStatus(
                t('status.applyFailed')
            );
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
            renderer.updateStatus(t('status.moveComplete'));
        }
        return;
    }

    if (
        clickedSlot &&
        clickedSlot.player === game.currentPlayer &&
        clickedSlot.count > 0
    ) {
        selectPlayableSlot(slotId);
        return;
    }

    renderer.updateStatus(
        t('status.targetRequired')
    );
}

function bindEvents() {
    const difficultySelect =
        document.getElementById('bot-difficulty');
    const restartButton =
        document.getElementById('restart-button');
    const canvas =
        document.getElementById('game-canvas');
    const languageSelect =
        document.getElementById('language-select');
    const themeSelect =
        document.getElementById('theme-select');

    difficultySelect?.addEventListener('change', event => {
        bot.difficulty = event.target.value;
        renderer.updateStatus(
            t('status.difficulty', { level: event.target.selectedOptions[0].text })
        );
    });

    languageSelect?.addEventListener('change', event => {
        setLanguage(event.target.value);
        applyTranslations();
        updateScreen();
        renderer.updateStatus(t('status.languageChanged'));
    });

    themeSelect?.addEventListener('change', event => {
        renderer.setTheme(event.target.value);
        updateScreen();
        renderer.updateStatus(
            t('status.themeChanged', {
                theme: event.target.selectedOptions[0].text
            })
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
            renderer.updateStatus(t('status.undo'));
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
                t('status.useDice')
            );
            return;
        }

        finishCurrentTurn();
    });

    bindCanvasInput(canvas, {
        canInteract: () =>
            game.currentPlayer === 1 &&
            game.gameStatus === 'PLAYING',
        onSlotClick: handleSlotClick
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

window.addEventListener('DOMContentLoaded', async () => {
    setLanguage(getLanguage());
    applyTranslations();
    await renderer.initialize();

    const languageSelect =
        document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = getLanguage();
    }

    const themeSelect =
        document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = renderer.theme.id;
    }

    bindEvents();
    restartGame();
});
