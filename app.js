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
import { PlayerIdentityStore } from './engine/playerIdentity.js';
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
import { createBotCallbackController } from './engine/botCallbackController.js';
import { createFullscreenController } from './engine/fullscreenController.js';
import { applyBotDifficultySelection } from './engine/botDifficultyController.js';
import { SoundManager } from './engine/sound.js';
import {
    createAutoBearOffFlow,
    isAutoBearOffEligible
} from './engine/autoBearOff.js';
import {
    applyNoLegalMoveAutoPass,
    hasAnyRuleCompliantTurnStart
} from './engine/noLegalMoveAutoPass.js';
import {
    getNoLegalMoveRuleExplanation,
    getUnplayableRuleExplanation
} from './engine/ruleExplanations.js';
import { createAppResumeController } from './engine/appResumeController.js';
import {
    createMobileThemeLabelController
} from './engine/mobileThemeLabelController.js';
import { createStartModeController } from './engine/startModeController.js';
import {
    FriendMatchPreviewController
} from './engine/friendMatchPreviewController.js';

const game = new NardeGame();
const renderer = new Renderer();
const bot = new NardeBot(2, 'medium');
const ui = new UIManager();
const diceRollAnimation = new DiceRollAnimation();
const sound = new SoundManager();

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
let mobileThemeLabelController = null;
let startModeController = null;
let friendMatchPreviewController = null;
let autoBearOffEnabled = false;
let autoBearOffContainer = null;
let autoBearOffToggle = null;
let autoBearOffHint = null;

const botTurnTouchFeedback = new BotTurnTouchFeedback();

const timeoutController = new TurnTimeoutController();
const playerStatsStore = new PlayerStatsStore();
const playerIdentityStore = new PlayerIdentityStore();
const matchStatsRecorder = new MatchStatsRecorder({
    store: playerStatsStore,
    humanPlayer: 1
});
const botCallbackController = createBotCallbackController({
    scheduleCallback: (callback, delay) => schedule(callback, delay, {
        kind: 'bot-callback'
    })
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
        const moveId = runtimeState.incrementTotalMoveCounter();
        sound.playPiecePlaceForMove({
            moveId,
            isCollect: move.target === 25
        });
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

const appResumeController = createAppResumeController({
    onResume: () => {
        synchronizeTimeoutState();
        synchronizeAutoBearOffFlow();
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

function resetBotCallbackGuards() {
    botCallbackController.reset();
}

function scheduleBotMoveCallback(delay = 550) {
    return botCallbackController.scheduleNext(runBotMove, delay);
}

function clearRuntimeTasks() {
    runtimeState.invalidateSessionToken();
    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('runtime-cleared');
    resetBotCallbackGuards();
    runtimeState.cancelPendingRoll();

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
    document.body?.classList.add('is-start-screen-open');
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
}

function hideStartScreen() {
    const overlay = document.getElementById('start-screen');
    if (!overlay) return;
    document.body?.classList.remove('is-start-screen-open');
    feedbackModal?.close({ returnFocus: false });
    friendMatchPreviewController?.close({ returnFocus: false });
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    howToPlayGuide?.close({ returnFocus: false });
    playerStatsModal?.close({ returnFocus: false });
}

function startGame() {
    if (!runtimeState.isInitialStartPending()) return false;

    void sound.activateFromUserGesture().catch(() => {});

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
    resetAutoBearOffForNewGame();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    setStatus(t('status.starting'), { force: true });
    schedule(startAutomaticDiceRoll, 650);
    return true;
}

function initializeBeforeStart() {
    startModeController?.reset();
    runtimeState.resetForSession({ initialStartPending: true });
    matchStatsRecorder.resetPendingMatch();
    game.initGame();
    renderer.clearVictoryMoment();
    resetBotMoveFeedback(renderer);
    botTurnTouchFeedback.reset();
    timeoutController.resetAll();
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

    runtimeState.invalidateSessionToken();
    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('turn-finished');
    resetBotCallbackGuards();

    clearInterval(runtimeState.getTurnTimerInterval());
    runtimeState.clearTurnTimerInterval();
    timeoutController.stopTurnDeadline();
    runtimeState.clearSelectedSlotId();

    game.confirmTurnEnd();
    updateScreen();
    beginCurrentTurn();
}

function stopHumanTurnTimer() {
    clearInterval(runtimeState.getTurnTimerInterval());
    runtimeState.clearTurnTimerInterval();
}

function passCurrentTurnWhenNoLegalMove() {
    const autoPass = applyNoLegalMoveAutoPass({
        game,
        runtimeState,
        timeoutController,
        bot,
        autoBearOffFlow,
        resetBotCallbackGuards,
        stopTurnTimer: stopHumanTurnTimer,
        endBotMoveFeedback: () => endBotMoveFeedback(renderer)
    });

    if (!autoPass.passed) {
        return false;
    }

    const statusOverrideKey =
        getNoLegalMoveRuleExplanation().messageKey;

    if (autoPass.toPlayer === 1) {
        ui.setHumanTurnLayout();
    } else {
        ui.setBotTurnLayout();
    }

    setStatus(t(statusOverrideKey), { force: true });

    updateScreen();

    schedule(() => {
        beginCurrentTurn({
            statusOverrideKey
        });
    }, 0, {
        kind: 'auto-pass'
    });

    return true;
}

function beginCurrentTurn(options = {}) {
    if (game.gameStatus === 'GAME_OVER') return;

    const statusOverrideKey = options.statusOverrideKey || null;

    runtimeState.invalidateSessionToken();
    bot.resetPlannedTurn?.();
    autoBearOffFlow.stop('turn-changed');
    resetBotCallbackGuards();

    if (game.currentPlayer === 1) {
        botTurnTouchFeedback.reset();
        gameFeedbackToast?.hide();
        ui.setHumanTurnLayout();
        setStatus(
            t(statusOverrideKey || 'status.yourTurn'),
            { force: true }
        );
    } else {
        botTurnTouchFeedback.reset();
        gameFeedbackToast?.hide();
        ui.setBotTurnLayout();
        setStatus(
            t(statusOverrideKey || 'status.botTurn'),
            { force: true }
        );
    }

    runtimeDiagnostics.recordTurnChange(`currentPlayer=${game.currentPlayer}`);
    updateAutoBearOffControl();

    schedule(startAutomaticDiceRoll, 650);
}

function startAutomaticDiceRoll() {
    if (game.gameStatus !== 'WAITING_FOR_DICE') return;

    const rollingPlayer = game.currentPlayer;
    const rollToken = runtimeState.getOrCreatePendingRollToken(rollingPlayer);
    if (!runtimeState.markRollAnimationStarted(rollToken)) {
        return;
    }

    ui.setBotTurnLayout();
    setStatus(
        rollingPlayer === 1
            ? t('status.rollingYou')
            : t('status.rollingBot'),
        { force: true }
    );

    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');

    sound.playDiceRollForRoll({ rollId: rollToken });

    diceRollAnimation.start(die1, die2, () => {
        runtimeState.markRollAnimationFinished(rollToken);

        const diceValues = game.rollDice();
        if (!diceValues) {
            return;
        }

        runtimeState.clearSelectedSlotId();

        if (!hasAnyRuleCompliantTurnStart(game, { player: rollingPlayer })) {
            passCurrentTurnWhenNoLegalMove();
            return;
        }

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

            synchronizeAutoBearOffFlow();
        } else {
            autoBearOffFlow.stop('bot-turn');
            setStatus(
                t('status.rolledBot', {
                    dice: diceValues.join(', ')
                }),
                { force: true }
            );
            scheduleBotMoveCallback(550);
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

    if (game.availableMoves.length === 0) {
        endBotMoveFeedback(renderer);
        finishCurrentTurn();
        return;
    }

    if (!hasAnyRuleCompliantTurnStart(game, { player: bot.playerNumber })) {
        passCurrentTurnWhenNoLegalMove();
        return;
    }

    startBotMoveFeedback(renderer);

    const move = bot.makeDecision(game);
    if (!move || !game.executeMove(move.from, move.dice)) {
        endBotMoveFeedback(renderer);
        finishCurrentTurn();
        return;
    }

    applyBotMoveFeedback(renderer, {
        fromSlot: move.from,
        targetSlot: move.target,
        reducedMotion: prefersReducedMotion()
    });

    const moveId = runtimeState.incrementTotalMoveCounter();
    sound.playPiecePlaceForMove({
        moveId,
        isCollect: move.target === 25
    });
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

    scheduleBotMoveCallback(550);
}

function showGameOver(winner, messageKey = null) {
    terminateGame();
    runtimeState.clearSelectedSlotId();
    runtimeDiagnostics.recordGameEnd(
        `winner=${winner} | reason=${game.endReason} | status=${game.gameStatus}`
    );
    matchStatsRecorder.recordIfGameOver({
        winner,
        endReason: game.endReason,
        totalMoves: runtimeState.getTotalMoveCounter(),
        gameStatus: game.gameStatus,
        difficulty: bot.difficulty
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
    resetAutoBearOffForNewGame();

    updateScreen();
    ui.setHumanTurnLayout();
    ui.updateTimerText(getHumanTurnDuration());
    setStatus(t('status.starting'), { force: true });

    schedule(startAutomaticDiceRoll, 650);
}

function explainUnplayableSlot(slotId) {
    const reason = game.getUnplayableReason(slotId);
    const explanation = getUnplayableRuleExplanation(reason);

    setStatus(t(explanation.messageKey));
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
        const moveId = runtimeState.incrementTotalMoveCounter();
        sound.playPiecePlaceForMove({
            moveId,
            isCollect: slotId === 25
        });
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
    const botMatchButton =
        document.getElementById('bot-match-button');
    const friendMatchButton =
        document.getElementById('friend-match-button');
    const onlineMatchButton =
        document.getElementById('online-match-button');
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
    const startDifficultySelect =
        document.getElementById('start-bot-difficulty');
    const themeSelect =
        document.getElementById('theme-select');
    const howToPlayButton =
        document.getElementById('how-to-play-button');
    const howToPlayModal =
        document.getElementById('how-to-play-modal');
    const statsButton =
        document.getElementById('player-stats-button');
    const friendPreviewButton =
        document.getElementById('friend-preview-button');
    const friendPreviewModal =
        document.getElementById('friend-preview-modal');
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
    const profileAvatarButtons = statsModal
        ? statsModal.querySelectorAll('[data-avatar-id]')
        : [];
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
            timeoutLosses: document.getElementById('stats-timeout-losses-value'),
            averageMoves: document.getElementById('stats-average-moves-value'),
            bestWinStreak: document.getElementById('stats-best-streak-value'),
            byDifficulty: {
                easy: document.getElementById('stats-easy-record-value'),
                medium: document.getElementById('stats-medium-record-value'),
                hard: document.getElementById('stats-hard-record-value'),
                champion: document.getElementById('stats-champion-record-value')
            }
        },
        emptyState: statsEmptyState,
        cardsContainer: statsCardsContainer,
        identityStore: playerIdentityStore,
        profileElements: {
            displayNameInput: document.getElementById('profile-display-name'),
            previewGlyph: document.getElementById('profile-preview-avatar'),
            previewName: document.getElementById('profile-preview-name'),
            saveButton: document.getElementById('profile-save-button'),
            resetButton: document.getElementById('profile-reset-button'),
            status: document.getElementById('profile-status')
        },
        avatarButtons: profileAvatarButtons,
        achievementElements: {
            'first-match': {
                card: document.getElementById('achievement-first-match'),
                state: document.querySelector('[data-achievement-state="first-match"]')
            },
            'first-win': {
                card: document.getElementById('achievement-first-win'),
                state: document.querySelector('[data-achievement-state="first-win"]')
            },
            'ten-matches': {
                card: document.getElementById('achievement-ten-matches'),
                state: document.querySelector('[data-achievement-state="ten-matches"]')
            },
            'champion-win': {
                card: document.getElementById('achievement-champion-win'),
                state: document.querySelector('[data-achievement-state="champion-win"]')
            }
        }
    });

    friendMatchPreviewController = new FriendMatchPreviewController({
        identityStore: playerIdentityStore,
        translate: (key, values) => t(key, values),
        elements: {
            modal: friendPreviewModal,
            openButton: friendPreviewButton,
            closeButtons: [
                document.getElementById('friend-preview-close-button'),
                document.getElementById('friend-preview-close-footer-button')
            ].filter(Boolean),
            nextButton: document.getElementById('friend-preview-next-button'),
            resetButton: document.getElementById('friend-preview-reset-button'),
            stageTitle: document.getElementById('friend-preview-stage-title'),
            stageDetail: document.getElementById('friend-preview-stage-detail'),
            roomCode: document.getElementById('friend-preview-room-code'),
            roomStatus: document.getElementById('friend-preview-room-status'),
            revision: document.getElementById('friend-preview-revision'),
            inviteStatus: document.getElementById('friend-preview-invite-status'),
            protocolVersion: document.getElementById('friend-preview-protocol-version'),
            hostCard: document.getElementById('friend-preview-host-card'),
            hostAvatar: document.getElementById('friend-preview-host-avatar'),
            hostName: document.getElementById('friend-preview-host-name'),
            hostStatus: document.getElementById('friend-preview-host-status'),
            friendCard: document.getElementById('friend-preview-friend-card'),
            friendAvatar: document.getElementById('friend-preview-friend-avatar'),
            friendName: document.getElementById('friend-preview-friend-name'),
            friendStatus: document.getElementById('friend-preview-friend-status'),
            timelineSteps: friendPreviewModal
                ? friendPreviewModal.querySelectorAll('[data-step-index]')
                : [],
            liveStatus: document.getElementById('friend-preview-live-status')
        },
        onStateChange: ({ stage, errorKey, eventType, revision }) => {
            runtimeDiagnostics.recordStateChange(
                errorKey ? 'friend-preview-error' : 'friend-preview-state',
                {
                    stage,
                    eventType: eventType || 'none',
                    revision,
                    error: errorKey || 'none'
                }
            );
        }
    });
    friendMatchPreviewController.start();

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

    // Browser autoplay policy: attempt to unlock AudioContext on first user gesture.
    const primeAudioContext = () => {
        void sound.ensureContextFromUserGesture();
    };
    document.addEventListener('pointerdown', primeAudioContext, { once: true });
    document.addEventListener('keydown', primeAudioContext, { once: true });

    const difficultySelectors = [
        difficultySelect,
        startDifficultySelect
    ].filter(Boolean);
    for (const selector of difficultySelectors) {
        selector.value = bot.difficulty;
    }

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

    const handleDifficultyChange = event => {
        const selection = applyBotDifficultySelection({
            bot,
            game,
            runtimeState,
            nextDifficulty: event.target.value,
            resetBotCallbackGuards,
            scheduleBotMoveCallback
        });
        for (const selector of difficultySelectors) {
            selector.value = selection.difficulty;
        }
        setStatus(
            t('status.difficulty', { level: event.target.selectedOptions[0].text }),
            { force: true }
        );
    };
    for (const selector of difficultySelectors) {
        selector.addEventListener('change', handleDifficultyChange);
    }

    startModeController = createStartModeController({
        availableModes: [
            { mode: 'quick-play', button: startButton },
            { mode: 'bot-match', button: botMatchButton }
        ],
        unavailableModes: [
            { mode: 'friend-match', button: friendMatchButton },
            { mode: 'online', button: onlineMatchButton }
        ],
        onStart: () => startGame()
    });
    startModeController.start();

    languageSelectors = setupLanguageSelectors({
        selectors: [languageSelect, startLanguageSelect],
        onLanguageApplied: () => {
            howToPlayGuide?.refreshForLanguage();
            playerStatsModal?.refreshForLanguage();
            friendMatchPreviewController?.refreshForLanguage();
            fullscreenController?.refreshLabels();
            mobileThemeLabelController?.refresh();
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

    appResumeController.start();

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

    mobileThemeLabelController = createMobileThemeLabelController({
        select: themeSelect
    });

    bindEvents();
    languageSelectors?.syncToCurrentLanguage();
    runtimeDiagnostics.start();
    mobileThemeLabelController.start();
    initializeBeforeStart();
});
