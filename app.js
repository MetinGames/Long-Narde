// app.js

import { NardeGame } from './engine/game.js';
import { Renderer } from './engine/renderer.js';
import { NardeBot } from './engine/bot.js';
import { UIManager } from './engine/uiManager.js';
import {
    applyTranslations,
    getLanguage,
    initializeLanguage,
    t
} from './engine/i18n.js';
import { setupLanguageSelectors } from './engine/languageSelectors.js';
import { DiceRollAnimation } from './engine/animations.js';
import { bindCanvasInput } from './engine/input.js';
import { TurnTimeoutController } from './engine/timeoutController.js';
import { HowToPlayGuide } from './engine/howToPlayGuide.js';
import { FeedbackModal } from './engine/feedbackModal.js';
import {
    MatchStatsRecorder,
    PlayerStatsStore
} from './engine/playerStats.js';
import { PlayerStatsModal } from './engine/playerStatsModal.js';
import {
    applyPostUndoLayout,
    getActionButtonState
} from './engine/undoActionButtons.js';
import {
    getVictoryMomentProfile,
    shouldRunVictoryMoment,
    triggerVictoryMomentHook
} from './engine/victoryMoment.js';
import {
    applyBotMoveFeedback,
    endBotMoveFeedback,
    resetBotMoveFeedback,
    startBotMoveFeedback
} from './engine/botMoveFeedback.js';
import { BotTurnTouchFeedback } from './engine/botTurnTouchFeedback.js';
import { RestartButtonLock } from './engine/restartButtonLock.js';
import { GameFeedbackToast } from './engine/gameFeedbackToast.js';
import { createAppRuntimeState } from './engine/appRuntimeState.js';
import { createRuntimeDiagnostics } from './engine/runtimeDiagnostics.js';
import { createFullscreenController } from './engine/fullscreenController.js';
import {
    createAutoBearOffFlow,
    isAutoBearOffEligible
} from './engine/autoBearOff.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium');
const ui = new UIManager();
const diceRollAnimation = new DiceRollAnimation();

const runtimeState = createAppRuntimeState();
const runtimeDiagnostics = createRuntimeDiagnostics({
    appVersion: 'unknown',
    getContext: () => ({
        gameStatus: game.gameStatus,
        currentPlayer: game.currentPlayer,
        language: getLanguage(),
        theme: renderer.theme?.id ?? 'unknown'
    })
});
let victoryMomentHook = null;
let howToPlayGuide = null;
let playerStatsModal = null;
let feedbackModal = null;
let restartButtonLock = null;
let gameFeedbackToast = null;
let languageSelectors = null;
let fullscreenController = null;
let autoBearOffEnabled = false;
let autoBearOffContainer = null;
let autoBearOffToggle = null;
let autoBearOffHint = null;

const botTurnTouchFeedback = new BotTurnTouchFeedback();

const timeoutController = new TurnTimeoutController();
const playerStatsStore = new PlayerStatsStore();
const matchStatsRecorder = new MatchStatsRecorder({
    store: playerStatsStore,
    humanPlayer: 1
});

const autoBearOffFlow = createAutoBearOffFlow({
    game,
    getContext: () => ({
        isEnabled: autoBearOffEnabled,
        isStartScreen: runtimeState.isInitialStartPending(),
        isTimeoutResolutionInProgress: runtimeState.isTimeoutResolutionInProgress()
    }),
    scheduleStep: (callback, delayMs) => schedule(callback, delayMs),
    cancelStep: timeoutId => {
        clearTimeout(timeoutId);
        runtimeState.removeScheduledTimeout(timeoutId);
    },
    stepDelayMs: 300,
    applyMove: move => {
        if (game.gameStatus !== 'PLAYING' || game.currentPlayer !== 1) {
            return false;
        }

        const applied = game.executeMove(move.from, move.dice);
        if (!applied) return false;

        game.resetTimeoutStrikes();
        timeoutController.clearForfeitWindow();
        runtimeState.clearSelectedSlotId();
        runtimeState.incrementTotalMoveCounter();
        updateScreen();
        ui.setHumanMoveLayout();

        const winner = game.checkWinCondition();
        if (winner !== 0) {
            void (async () => {
                await playVictoryMomentIfEligible({
                    winner,
                    targetId: move.target
                });
                showGameOver(winner);
            })();
        }

        return true;
    },
    onAfterMove: () => {
        updateAutoBearOffControl();
    },
    onFinishTurn: () => {
        if (game.gameStatus !== 'PLAYING' || game.currentPlayer !== 1) {
            return;
        }

        finishCurrentTurn();
    }
});

function schedule(callback, delay, meta = null) {
    if (game.gameStatus === 'GAME_OVER') return null;

    const scheduledToken = runtimeState.captureSessionToken();

    if (meta?.kind === 'bot-callback') {
        runtimeDiagnostics.recordBotCallbackScheduled(`delayMs=${delay}`);
    }

    const timeoutId = setTimeout(() => {
        runtimeState.removeScheduledTimeout(timeoutId);
        if (!runtimeState.isSessionTokenCurrent(scheduledToken)) {
            return;
        }

        if (meta?.kind === 'bot-callback') {
            runtimeDiagnostics.recordBotCallbackStart(`delayMs=${delay}`);
        }

        try {
            const result = callback();
            if (result && typeof result.then === 'function') {
                result.finally(() => {
                    if (meta?.kind === 'bot-callback') {
                        runtimeDiagnostics.recordBotCallbackEnd(`delayMs=${delay}`);
                    }
                });
                return;
            }
        } catch (error) {
            if (meta?.kind === 'bot-callback') {
                runtimeDiagnostics.recordBotCallbackEnd(`delayMs=${delay}`);
            }
            throw error;
        }

        if (meta?.kind === 'bot-callback') {
            runtimeDiagnostics.recordBotCallbackEnd(`delayMs=${delay}`);
        }
    }, delay);
    runtimeState.addScheduledTimeout(timeoutId);
    return timeoutId;
}

function clearRuntimeTasks() {
    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('runtime-cleared');

    clearInterval(runtimeState.getTurnTimerInterval());
    runtimeState.clearTurnTimerInterval();
    diceRollAnimation.stop();

    runtimeState.clearScheduledTimeouts(clearTimeout);

    restartButtonLock?.clearPendingUnlock();
    gameFeedbackToast?.hide();
}

function setStatus(message) {
    renderer.updateStatus(message);
    return true;
}

function terminateGame() {
    autoBearOffFlow.stop('game-terminated');
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
    feedbackModal?.close({ returnFocus: false });
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    howToPlayGuide?.close({ returnFocus: false });
    playerStatsModal?.close({ returnFocus: false });
}

function startGame() {
    if (!runtimeState.isInitialStartPending()) return;

    matchStatsRecorder.beginMatch();
    howToPlayGuide?.close({ returnFocus: false });
    playerStatsModal?.close({ returnFocus: false });
    hideStartScreen();
    game.initGame();
    runtimeState.resetForSession({ initialStartPending: false });
    runtimeDiagnostics.recordGameStart('startGame');
    renderer.clearVictoryMoment();
    resetBotMoveFeedback(renderer);
    botTurnTouchFeedback.reset();
    timeoutController.resetAll();
    bot.resetPlannedTurn?.();
    resetAutoBearOffForNewGame();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    setStatus(t('status.starting'), { force: true });
    schedule(startAutomaticDiceRoll, 650);
}

function initializeBeforeStart() {
    runtimeState.resetForSession({ initialStartPending: true });
    matchStatsRecorder.resetPendingMatch();
    game.initGame();
    renderer.clearVictoryMoment();
    resetBotMoveFeedback(renderer);
    botTurnTouchFeedback.reset();
    timeoutController.resetAll();
    bot.resetPlannedTurn?.();
    resetAutoBearOffForNewGame();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    setStatus(t('status.readyToStart'), { force: true });
    showStartScreen();
}

function updateScreen() {
    syncActionButtonStates();
    renderer.render(game, runtimeState.getSelectedSlotId());
    updateAutoBearOffControl();
}

function syncActionButtonStates() {
    const {
        canUndo,
        canConfirm
    } = getActionButtonState(game);

    const autoRunning = autoBearOffFlow.isRunning();
    ui.setUndoEnabled(autoRunning ? false : canUndo);
    ui.setConfirmEnabled(autoRunning ? false : canConfirm);
}

function getHumanTurnDuration() {
    return 30;
}

function isAutoBearOffCurrentlyEligible() {
    if (runtimeState.isInitialStartPending()) return false;

    return isAutoBearOffEligible(game);
}

function updateAutoBearOffControl() {
    if (!autoBearOffToggle || !autoBearOffContainer || !autoBearOffHint) {
        return;
    }

    const isEligible = isAutoBearOffCurrentlyEligible();
    const isRunning = autoBearOffFlow.isRunning();
    const canInteract = isEligible || autoBearOffEnabled;
    const hintKey = isRunning
        ? 'ui.autoBearOffHintRunning'
        : isEligible
            ? 'ui.autoBearOffHintReady'
            : 'ui.autoBearOffHintDisabled';

    autoBearOffToggle.checked = autoBearOffEnabled;
    autoBearOffToggle.disabled = !canInteract;
    autoBearOffToggle.setAttribute('aria-disabled', String(!canInteract));
    autoBearOffContainer.classList.toggle('is-disabled', !isEligible);
    autoBearOffHint.textContent = t(hintKey);
}

function setAutoBearOffEnabled(value) {
    autoBearOffEnabled = Boolean(value);
    if (!autoBearOffEnabled) {
        autoBearOffFlow.stop('disabled-by-user');
    } else {
        autoBearOffFlow.evaluate();
    }

    updateAutoBearOffControl();
}

function resetAutoBearOffForNewGame() {
    autoBearOffFlow.stop('new-game');
    autoBearOffEnabled = false;

    if (autoBearOffToggle) {
        autoBearOffToggle.checked = false;
    }

    updateAutoBearOffControl();
}

function synchronizeAutoBearOffFlow() {
    if (!autoBearOffEnabled) {
        autoBearOffFlow.stop('disabled');
        updateAutoBearOffControl();
        return;
    }

    autoBearOffFlow.evaluate();
    updateAutoBearOffControl();
}

function applyFinalTimeoutLoss() {
    if (game.gameStatus === 'GAME_OVER') return;

    const timeoutResult = game.recordHumanTimeout();
    if (timeoutResult === 'gameOver' || game.gameStatus === 'GAME_OVER') {
        runtimeDiagnostics.recordFinalTimeoutLoss('final-timeout-loss');
        showGameOver(2, 'game.timeExpiredGameOverMessage');
    }
}

function synchronizeTimeoutState() {
    if (runtimeState.isTimeoutResolutionInProgress()) return;

    if (runtimeState.isInitialStartPending() || game.gameStatus === 'GAME_OVER') {
        return;
    }

    const evaluation = timeoutController.evaluate({
        isStartScreen: runtimeState.isInitialStartPending(),
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

    autoBearOffFlow.stop('timeout-resolution');

    runtimeState.setTimeoutResolutionInProgress(true);
    try {
        clearInterval(runtimeState.getTurnTimerInterval());
        runtimeState.clearTurnTimerInterval();

        if (evaluation.action === 'firstTimeout') {
            runtimeDiagnostics.recordFirstTimeout('first-timeout');
            const timeoutResult = game.recordHumanTimeout();
            if (timeoutResult === 'warning') {
                setStatus(t('status.timeoutWarning'), { force: true });
                finishCurrentTurn();
                return;
            }
        }

        applyFinalTimeoutLoss();
    } finally {
        runtimeState.setTimeoutResolutionInProgress(false);
    }
}

function startHumanTimer() {
    clearInterval(runtimeState.getTurnTimerInterval());

    if (runtimeState.isInitialStartPending() || game.gameStatus === 'GAME_OVER') {
        return;
    }

    const duration = getHumanTurnDuration();
    timeoutController.startHumanTurn(duration, game.timeoutStrikes);
    ui.updateTimerText(timeoutController.getRemainingSeconds());

    runtimeState.setTurnTimerInterval(setInterval(synchronizeTimeoutState, 1000));
}

function finishCurrentTurn() {
    if (game.gameStatus === 'GAME_OVER') return;

    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('turn-finished');

    clearInterval(runtimeState.getTurnTimerInterval());
    runtimeState.clearTurnTimerInterval();
    timeoutController.stopTurnDeadline();
    runtimeState.clearSelectedSlotId();

    game.confirmTurnEnd();
    updateScreen();
    beginCurrentTurn();
}

function beginCurrentTurn() {
    if (game.gameStatus === 'GAME_OVER') return;

    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('turn-changed');

    if (game.currentPlayer === 1) {
        botTurnTouchFeedback.reset();
        gameFeedbackToast?.hide();
        ui.setHumanTurnLayout();
        setStatus(t('status.yourTurn'), { force: true });
    } else {
        botTurnTouchFeedback.reset();
        gameFeedbackToast?.hide();
        ui.setBotTurnLayout();
        setStatus(t('status.botTurn'), { force: true });
    }

    runtimeDiagnostics.recordTurnChange(`currentPlayer=${game.currentPlayer}`);
    updateAutoBearOffControl();

    schedule(startAutomaticDiceRoll, 650);
}

function startAutomaticDiceRoll() {
    if (game.gameStatus !== 'WAITING_FOR_DICE') return;

    const rollingPlayer = game.currentPlayer;
    ui.setBotTurnLayout();
    setStatus(
        rollingPlayer === 1
            ? t('status.rollingYou')
            : t('status.rollingBot'),
        { force: true }
    );

    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');

    diceRollAnimation.start(die1, die2, () => {
        const diceValues = game.rollDice();
        runtimeState.clearSelectedSlotId();
        updateScreen();

        if (rollingPlayer === 1) {
            ui.setHumanPlayingLayout();
            setStatus(
                t('status.rolledYou', {
                    dice: diceValues.join(', ')
                }),
                { force: true }
            );
            startHumanTimer();

            if (!game.hasValidMoves()) {
                setStatus(t('status.noMoves'), { force: true });
            }

            synchronizeAutoBearOffFlow();
        } else {
            autoBearOffFlow.stop('bot-turn');
            setStatus(
                t('status.rolledBot', {
                    dice: diceValues.join(', ')
                }),
                { force: true }
            );
            schedule(runBotMove, 550, { kind: 'bot-callback' });
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
        endBotMoveFeedback(renderer);
        finishCurrentTurn();
        return;
    }

    startBotMoveFeedback(renderer);

    const move = bot.makeDecision(game);
    if (!move) {
        endBotMoveFeedback(renderer);
        finishCurrentTurn();
        return;
    }

    let moveApplied = game.executeMove(move.from, move.dice);
    if (!moveApplied) {
        bot.resetPlannedTurn?.();
        const fallbackMove = bot.makeDecision(game);
        if (fallbackMove) {
            moveApplied = game.executeMove(fallbackMove.from, fallbackMove.dice);
            if (moveApplied) {
                move.from = fallbackMove.from;
                move.dice = fallbackMove.dice;
                move.target = fallbackMove.target;
            }
        }
    }

    if (!moveApplied) {
        endBotMoveFeedback(renderer);
        finishCurrentTurn();
        return;
    }

    applyBotMoveFeedback(renderer, {
        fromSlot: move.from,
        targetSlot: move.target,
        reducedMotion: prefersReducedMotion()
    });

    runtimeState.incrementTotalMoveCounter();
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

    schedule(runBotMove, 550, { kind: 'bot-callback' });
}

function showGameOver(winner, messageKey = null) {
    bot.resetPlannedTurn?.();
    terminateGame();
    runtimeState.clearSelectedSlotId();
    runtimeDiagnostics.recordGameEnd(
        `winner=${winner} | reason=${game.endReason} | status=${game.gameStatus}`
    );
    matchStatsRecorder.recordIfGameOver({
        winner,
        endReason: game.endReason,
        totalMoves: runtimeState.getTotalMoveCounter(),
        gameStatus: game.gameStatus
    });
    playerStatsModal?.render();
    botTurnTouchFeedback.reset();
    gameFeedbackToast?.hide();
    endBotMoveFeedback(renderer);
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
    if (statMoves) statMoves.textContent = runtimeState.getTotalMoveCounter();
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    restartButtonLock?.lock();
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
        alreadyTriggered: runtimeState.hasVictoryMomentPlayed()
    });

    if (!shouldPlay) return;

    runtimeState.setVictoryMomentPlayed(true);

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
    if (restartButtonLock?.isLocked()) {
        return;
    }

    clearRuntimeTasks();
    matchStatsRecorder.beginMatch();

    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    game.initGame();
    runtimeState.resetForSession({ initialStartPending: false });
    runtimeDiagnostics.recordGameStart('restartGame');
    renderer.clearVictoryMoment();
    resetBotMoveFeedback(renderer);
    botTurnTouchFeedback.reset();
    gameFeedbackToast?.hide();
    restartButtonLock?.unlock();
    timeoutController.resetAll();
    bot.resetPlannedTurn?.();
    resetAutoBearOffForNewGame();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    setStatus(t('status.starting'), { force: true });

    schedule(startAutomaticDiceRoll, 650);
}

function explainUnplayableSlot(slotId) {
    const reason = game.getUnplayableReason(slotId);

    if (reason === 'headBlocked') {
        setStatus(
            t('status.headBlocked')
        );
    } else if (reason === 'maxMoveConstraint') {
        setStatus(
            t('status.maxMoveConstraint')
        );
    } else {
        setStatus(
            t('status.pieceBlocked')
        );
    }
}

function selectPlayableSlot(slotId) {
    const legalTargets = game.getLegalTargets(slotId);

    if (legalTargets.length === 0) {
        runtimeState.clearSelectedSlotId();
        updateScreen();
        explainUnplayableSlot(slotId);
        return false;
    }

    runtimeState.setSelectedSlotId(slotId);
    updateScreen();

    if (legalTargets.includes(25)) {
        setStatus(
            t('status.selectCollect')
        );
    } else {
        setStatus(
            t('status.selectTarget')
        );
    }
    return true;
}

async function handleSlotClick(slotId) {
    if (
        game.gameStatus !== 'PLAYING' ||
        game.currentPlayer !== 1 ||
        autoBearOffFlow.isRunning()
    ) {
        return;
    }

    const clickedSlot =
        slotId === 25 ? null : game.board.slots[slotId];

    const selectedSlotId = runtimeState.getSelectedSlotId();

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
        runtimeState.clearSelectedSlotId();
        updateScreen();
        setStatus(t('status.deselected'));
        return;
    }

    const legalTargets =
        game.getLegalTargets(selectedSlotId);

    // Hedefte kendi pulumuz olsa bile önce hamleyi uygula.
    if (legalTargets.includes(slotId)) {
        if (!game.processPlayerInput(selectedSlotId, slotId)) {
            setStatus(
                t('status.applyFailed')
            );
            return;
        }

        game.resetTimeoutStrikes();
        timeoutController.clearForfeitWindow();
        runtimeState.clearSelectedSlotId();
        runtimeState.incrementTotalMoveCounter();
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
            setStatus(t('status.moveComplete'));
        } else {
            synchronizeAutoBearOffFlow();
        }

        updateAutoBearOffControl();
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

    setStatus(
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
    const feedbackButton =
        document.getElementById('feedback-button');
    const feedbackModalElement =
        document.getElementById('feedback-modal');
    const feedbackCloseButton =
        document.getElementById('feedback-close-button');
    const canvas =
        document.getElementById('game-canvas');
    const boardWrapper =
        document.getElementById('board-wrapper');
    autoBearOffContainer =
        document.getElementById('auto-bearoff-container');
    autoBearOffToggle =
        document.getElementById('auto-bearoff-toggle');
    autoBearOffHint =
        document.getElementById('auto-bearoff-hint');
    const languageSelect =
        document.getElementById('language-select');
    const startLanguageSelect =
        document.getElementById('start-language-select');
    const themeSelect =
        document.getElementById('theme-select');
    const howToPlayButton =
        document.getElementById('how-to-play-button');
    const howToPlayModal =
        document.getElementById('how-to-play-modal');
    const statsButton =
        document.getElementById('player-stats-button');
    const statsModal =
        document.getElementById('player-stats-modal');
    const statsCloseButtons = [
        document.getElementById('stats-close-button'),
        document.getElementById('stats-close-footer-button')
    ].filter(Boolean);
    const statsResetButton =
        document.getElementById('stats-reset-button');
    const statsEmptyState =
        document.getElementById('stats-empty-state');
    const statsCardsContainer =
        document.getElementById('player-stats-cards');
    const guidePrevButton =
        document.getElementById('guide-prev-button');
    const guideNextButton =
        document.getElementById('guide-next-button');
    const guideStartButton =
        document.getElementById('guide-start-button');
    const guidePageCounter =
        document.getElementById('guide-page-counter');
    const guideCloseButtons = [
        document.getElementById('guide-close-button'),
        document.getElementById('guide-close-footer-button')
    ].filter(Boolean);
    const guidePages = howToPlayModal
        ? Array.from(howToPlayModal.querySelectorAll('[data-guide-page]'))
        : [];

    howToPlayGuide = new HowToPlayGuide({
        modal: howToPlayModal,
        openButton: howToPlayButton,
        closeButtons: guideCloseButtons,
        previousButton: guidePrevButton,
        nextButton: guideNextButton,
        startButton: guideStartButton,
        pageCounter: guidePageCounter,
        pageElements: guidePages,
        onStart: startGame
    });

    playerStatsModal = new PlayerStatsModal({
        modal: statsModal,
        openButton: statsButton,
        closeButtons: statsCloseButtons,
        resetButton: statsResetButton,
        statsStore: playerStatsStore,
        valueElements: {
            totalMatches: document.getElementById('stats-total-matches-value'),
            wins: document.getElementById('stats-wins-value'),
            losses: document.getElementById('stats-losses-value'),
            winRate: document.getElementById('stats-win-rate-value'),
            totalMoves: document.getElementById('stats-total-moves-value'),
            bestWinMoves: document.getElementById('stats-best-win-value'),
            normalLosses: document.getElementById('stats-normal-losses-value'),
            timeoutLosses: document.getElementById('stats-timeout-losses-value')
        },
        emptyState: statsEmptyState,
        cardsContainer: statsCardsContainer
    });

    feedbackModal = new FeedbackModal({
        modal: feedbackModalElement,
        openButton: feedbackButton,
        closeButtons: [feedbackCloseButton]
    });

    const diagnosticsCopyButton =
        document.getElementById('feedback-diagnostics-copy-button');
    const diagnosticsClearButton =
        document.getElementById('feedback-diagnostics-clear-button');
    const diagnosticsMessage =
        document.getElementById('feedback-diagnostics-message');

    function setDiagnosticsMessage(messageKey) {
        if (diagnosticsMessage) {
            diagnosticsMessage.textContent = t(messageKey);
        }
    }

    diagnosticsCopyButton?.addEventListener('click', async () => {
        const copied = await runtimeDiagnostics.copyReportToClipboard({});
        setDiagnosticsMessage(
            copied
                ? 'status.diagnosticsCopied'
                : 'status.diagnosticsCopyFailed'
        );
    });

    diagnosticsClearButton?.addEventListener('click', () => {
        try {
            runtimeDiagnostics.clearRecords();
            setDiagnosticsMessage('status.diagnosticsCleared');
        } catch {
            setDiagnosticsMessage('status.diagnosticsClearFailed');
        }
    });

    difficultySelect?.addEventListener('change', event => {
        bot.difficulty = event.target.value;
        setStatus(
            t('status.difficulty', { level: event.target.selectedOptions[0].text }),
            { force: true }
        );
    });

    languageSelectors = setupLanguageSelectors({
        selectors: [languageSelect, startLanguageSelect],
        onLanguageApplied: () => {
            howToPlayGuide?.refreshForLanguage();
            playerStatsModal?.refreshForLanguage();
            fullscreenController?.refreshLabels();
            updateScreen();
            updateAutoBearOffControl();
        },
        onStatusChange: message => {
            setStatus(message, { force: true });
        }
    });

    themeSelect?.addEventListener('change', event => {
        renderer.setTheme(event.target.value);
        updateScreen();
        setStatus(
            t('status.themeChanged', {
                theme: event.target.selectedOptions[0].text
            }),
            { force: true }
        );
    });

    restartButton?.addEventListener('click', restartGame);
    startButton?.addEventListener('click', startGame);
    autoBearOffToggle?.addEventListener('change', event => {
        setAutoBearOffEnabled(event.target.checked);
    });
    restartButtonLock = new RestartButtonLock({
        button: restartButton,
        delayMs: 700
    });
    gameFeedbackToast = new GameFeedbackToast({
        container: boardWrapper,
        durationMs: 1400
    });
    gameFeedbackToast.ensureElement();

    fullscreenController = createFullscreenController({
        rootElement: document.getElementById('game-container'),
        toggleButton: document.getElementById('fullscreen-toggle'),
        iconElement: document.getElementById('fullscreen-toggle-icon'),
        labelElement: document.getElementById('fullscreen-toggle-label'),
        translate: key => t(key),
        runtimeDiagnostics,
        onLayoutChange: () => {
            updateScreen();
        }
    });

    ui.undoButton?.addEventListener('click', () => {
        if (
            !autoBearOffFlow.isRunning() &&
            game.currentPlayer === 1 &&
            game.undoTurnMoves()
        ) {
            runtimeState.clearSelectedSlotId();
            updateScreen();
            applyPostUndoLayout({ game, ui });
            setStatus(t('status.undo'));
        }
    });

    ui.confirmButton?.addEventListener('click', () => {
        if (
            autoBearOffFlow.isRunning() ||
            game.currentPlayer !== 1 ||
            game.gameStatus !== 'PLAYING'
        ) {
            return;
        }

        if (
            game.availableMoves.length > 0 &&
            game.hasValidMoves()
        ) {
            setStatus(
                t('status.useDice')
            );
            return;
        }

        finishCurrentTurn();
    });

    bindCanvasInput(canvas, {
        canInteract: () =>
            !autoBearOffFlow.isRunning() &&
            game.currentPlayer === 1 &&
            game.gameStatus === 'PLAYING',
        onBlockedInteraction: () => {
            if (
                botTurnTouchFeedback.shouldShowWaitMessage({
                    isStartScreen: runtimeState.isInitialStartPending(),
                    gameStatus: game.gameStatus,
                    currentPlayer: game.currentPlayer
                })
            ) {
                gameFeedbackToast?.show(t('status.waitForBotTurn'), {
                    durationMs: 1400
                });
            }
        },
        layout: () => renderer.getBoardLayout(),
        onSlotClick: handleSlotClick
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            synchronizeTimeoutState();
            synchronizeAutoBearOffFlow();
        }
    });

    window.addEventListener('focus', () => {
        synchronizeTimeoutState();
        synchronizeAutoBearOffFlow();
    });

    window.addEventListener('pageshow', () => {
        synchronizeTimeoutState();
        synchronizeAutoBearOffFlow();
    });

    updateAutoBearOffControl();
}

window.addEventListener('DOMContentLoaded', async () => {
    initializeLanguage();
    applyTranslations();
    document.body.classList.add('i18n-ready');
    await renderer.initialize();

    const themeSelect =
        document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = renderer.theme.id;
    }

    bindEvents();
    languageSelectors?.syncToCurrentLanguage();
    runtimeDiagnostics.start();

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
