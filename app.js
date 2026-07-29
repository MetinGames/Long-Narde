// app.js

import { NardeGame } from './engine/game.js';
import { Renderer } from './engine/renderer.js';
import { NardeBot } from './engine/bot.js';
import { UIManager } from './engine/uiManager.js';
import {
    applyTranslations,
    getLanguage,
    initializeLanguage,
    setLanguage,
    t
} from './engine/i18n.js';
import { DiceRollAnimation } from './engine/animations.js';
import { bindCanvasInput } from './engine/input.js';
import { TurnTimeoutController } from './engine/timeoutController.js';
import {
    getVictoryMomentProfile,
    shouldRunVictoryMoment,
    triggerVictoryMomentHook
} from './engine/victoryMoment.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium');
const ui = new UIManager();
const diceRollAnimation = new DiceRollAnimation();

let selectedSlotId = null;
let totalMoveCounter = 0;
let turnTimerInterval = null;
let scheduledTimeouts = new Set();
let isInitialStartPending = true;
let isTimeoutResolutionInProgress = false;
let hasVictoryMomentPlayed = false;
let victoryMomentHook = null;

const timeoutController = new TurnTimeoutController();

function schedule(callback, delay) {
    if (game.gameStatus === 'GAME_OVER') return null;

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

function terminateGame() {
    clearRuntimeTasks();
    timeoutController.stopTurnDeadline();
}

function showStartScreen() {
    const overlay = document.getElementById('start-screen');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
}

function hideStartScreen() {
    const overlay = document.getElementById('start-screen');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
}

function startGame() {
    if (!isInitialStartPending) return;

    isInitialStartPending = false;
    hideStartScreen();
    game.initGame();
    selectedSlotId = null;
    totalMoveCounter = 0;
    hasVictoryMomentPlayed = false;
    renderer.clearVictoryMoment();
    timeoutController.resetAll();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    renderer.updateStatus(t('status.starting'));
    schedule(startAutomaticDiceRoll, 650);
}

function initializeBeforeStart() {
    isInitialStartPending = true;
    game.initGame();
    selectedSlotId = null;
    totalMoveCounter = 0;
    hasVictoryMomentPlayed = false;
    renderer.clearVictoryMoment();
    timeoutController.resetAll();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    renderer.updateStatus(t('status.readyToStart'));
    showStartScreen();
}

function updateScreen() {
    syncActionButtonStates();
    renderer.render(game, selectedSlotId);
}

function syncActionButtonStates() {
    const isHumanPlayingTurn =
        game.currentPlayer === 1 &&
        game.gameStatus === 'PLAYING';
    const canUndo =
        isHumanPlayingTurn &&
        game.moveHistory.length > 0;
    const canConfirm =
        isHumanPlayingTurn &&
        !(
            game.availableMoves.length > 0 &&
            game.hasValidMoves()
        );

    ui.setUndoEnabled(canUndo);
    ui.setConfirmEnabled(canConfirm);
}

function getHumanTurnDuration() {
    const completedTurns = game.turnsCompleted[1] || 0;
    return Math.max(30, 60 - (completedTurns * 10));
}

function applyFinalTimeoutLoss() {
    if (game.gameStatus === 'GAME_OVER') return;

    const timeoutResult = game.recordHumanTimeout();
    if (timeoutResult === 'gameOver' || game.gameStatus === 'GAME_OVER') {
        showGameOver(2, 'game.timeExpiredGameOverMessage');
    }
}

function synchronizeTimeoutState() {
    if (isTimeoutResolutionInProgress) return;

    if (isInitialStartPending || game.gameStatus === 'GAME_OVER') {
        return;
    }

    const evaluation = timeoutController.evaluate({
        isStartScreen: isInitialStartPending,
        gameStatus: game.gameStatus,
        currentPlayer: game.currentPlayer,
        timeoutStrikes: game.timeoutStrikes
    });

    if (
        game.currentPlayer === 1 &&
        game.gameStatus === 'PLAYING' &&
        timeoutController.turnDeadlineAt > 0
    ) {
        ui.updateTimerText(evaluation.remainingSeconds);
    }

    if (evaluation.action === 'none') {
        return;
    }

    isTimeoutResolutionInProgress = true;
    try {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;

        if (evaluation.action === 'firstTimeout') {
            const timeoutResult = game.recordHumanTimeout();
            if (timeoutResult === 'warning') {
                renderer.updateStatus(t('status.timeoutWarning'));
                finishCurrentTurn();
                return;
            }
        }

        applyFinalTimeoutLoss();
    } finally {
        isTimeoutResolutionInProgress = false;
    }
}

function startHumanTimer() {
    clearInterval(turnTimerInterval);

    if (isInitialStartPending || game.gameStatus === 'GAME_OVER') {
        return;
    }

    const duration = getHumanTurnDuration();
    timeoutController.startHumanTurn(duration, game.timeoutStrikes);
    ui.updateTimerText(timeoutController.getRemainingSeconds());

    turnTimerInterval = setInterval(synchronizeTimeoutState, 1000);
}

function finishCurrentTurn() {
    if (game.gameStatus === 'GAME_OVER') return;

    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    timeoutController.stopTurnDeadline();
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

async function runBotMove() {
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
        await playVictoryMomentIfEligible({
            winner,
            targetId: move.target
        });
        showGameOver(winner);
        return;
    }

    schedule(runBotMove, 550);
}

function showGameOver(winner, messageKey = null) {
    terminateGame();
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
            messageKey
                ? t(messageKey)
                : winner === 1
                    ? t('game.winMessage')
                    : t('game.loseMessage');
    }
    if (statMoves) statMoves.textContent = totalMoveCounter;
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
}

function prefersReducedMotion() {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateForDuration(durationMs, onProgress) {
    const now =
        typeof performance !== 'undefined' && performance.now
            ? () => performance.now()
            : () => Date.now();

    return new Promise(resolve => {
        const startAt = now();
        const raf =
            typeof requestAnimationFrame === 'function'
                ? requestAnimationFrame
                : callback => setTimeout(callback, 16);

        function step() {
            const elapsed = now() - startAt;
            const progress = Math.max(0, Math.min(1, elapsed / durationMs));
            onProgress(progress);

            if (progress >= 1) {
                resolve();
                return;
            }

            raf(step);
        }

        raf(step);
    });
}

async function playVictoryMomentIfEligible({ winner, targetId }) {
    const shouldPlay = shouldRunVictoryMoment({
        winner,
        endReason: game.endReason,
        targetId,
        alreadyTriggered: hasVictoryMomentPlayed
    });

    if (!shouldPlay) return;

    hasVictoryMomentPlayed = true;

    const reducedMotion = prefersReducedMotion();
    const profile = getVictoryMomentProfile(reducedMotion);

    triggerVictoryMomentHook(victoryMomentHook, {
        winner,
        endReason: game.endReason,
        profile
    });

    renderer.startVictoryMoment({
        winner,
        durationMs: profile.durationMs,
        settleDurationMs: profile.settleDurationMs,
        flashDurationMs: profile.flashDurationMs,
        reducedMotion
    });

    await animateForDuration(profile.durationMs, progress => {
        renderer.setVictoryMomentProgress(progress);
        updateScreen();
    });

    renderer.clearVictoryMoment();
    updateScreen();
}

function restartGame() {
    clearRuntimeTasks();

    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    game.initGame();
    selectedSlotId = null;
    totalMoveCounter = 0;
    hasVictoryMomentPlayed = false;
    renderer.clearVictoryMoment();
    timeoutController.resetAll();

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

async function handleSlotClick(slotId) {
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

        game.resetTimeoutStrikes();
        timeoutController.clearForfeitWindow();
        selectedSlotId = null;
        totalMoveCounter++;
        updateScreen();
        ui.setHumanMoveLayout();

        const winner = game.checkWinCondition();
        if (winner !== 0) {
            await playVictoryMomentIfEligible({
                winner,
                targetId: slotId
            });
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
    const startButton =
        document.getElementById('start-button');
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
    startButton?.addEventListener('click', startGame);

    ui.undoButton?.addEventListener('click', () => {
        if (
            game.currentPlayer === 1 &&
            game.undoTurnMoves()
        ) {
            selectedSlotId = null;
            updateScreen();
            ui.setHumanPlayingLayout();
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
        layout: () => renderer.getBoardLayout(),
        onSlotClick: handleSlotClick
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            synchronizeTimeoutState();
        }
    });

    window.addEventListener('focus', () => {
        synchronizeTimeoutState();
    });

    window.addEventListener('pageshow', () => {
        synchronizeTimeoutState();
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    initializeLanguage();
    applyTranslations();
    document.body.classList.add('i18n-ready');
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

    // Shorten displayed theme name on mobile landscape without changing values or logic.
    (function setupMobileShortTheme() {
        const select = document.getElementById('theme-select');
        if (!select) return;

        const mq = window.matchMedia('(max-width: 900px) and (orientation: landscape)');

        function restoreAll() {
            for (const opt of select.options) {
                if (opt.dataset.origText) {
                    opt.textContent = opt.dataset.origText;
                    delete opt.dataset.origText;
                }
            }
        }

        function applyShortening(m) {
            // First restore any previously modified labels
            for (const opt of select.options) {
                if (opt.dataset.origText) opt.textContent = opt.dataset.origText;
            }

            if (!m.matches) return;

            const sel = select.selectedOptions[0];
            if (!sel) return;

            // Only change the visible label for the selected option; keep value intact.
            if (!sel.dataset.origText) sel.dataset.origText = sel.textContent;
            if (sel.value === 'anatolian') {
                sel.textContent = 'Anadolu';
            }
        }

        // Initial apply
        applyShortening(mq);

        // React to orientation/size changes
        try {
            mq.addEventListener('change', () => applyShortening(mq));
        } catch (e) {
            // Older browsers
            mq.addListener(() => applyShortening(mq));
        }

        // When user changes theme, restore labels and reapply shortening if needed
        select.addEventListener('change', () => {
            restoreAll();
            applyShortening(mq);
        });
    })();
    initializeBeforeStart();
});
