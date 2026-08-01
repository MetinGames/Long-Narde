import test from 'node:test';
import assert from 'node:assert/strict';

import { bindCanvasInput } from '../engine/input.js';
import { BotTurnTouchFeedback } from '../engine/botTurnTouchFeedback.js';
import { GameFeedbackToast } from '../engine/gameFeedbackToast.js';
import { getLanguage, setLanguage, t } from '../engine/i18n.js';

class FakeCanvas {
    constructor(rect) {
        this.rect = rect;
        this.listeners = new Map();
    }

    getBoundingClientRect() {
        return this.rect;
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    setPointerCapture() {}

    emit(type, event) {
        this.listeners.get(type)?.(event);
    }
}

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(name) {
        this.values.add(name);
    }

    remove(name) {
        this.values.delete(name);
    }

    contains(name) {
        return this.values.has(name);
    }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = new Map();
        this.textContent = '';
        this.className = '';
        this.classList = new FakeClassList();
        this.id = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }
}

function createFakeDocument() {
    const elements = new Map();

    return {
        createElement(tagName) {
            return new FakeElement(tagName);
        },
        getElementById(id) {
            return elements.get(id) || null;
        },
        register(element) {
            if (element?.id) {
                elements.set(element.id, element);
            }
        }
    };
}

function createToastHarness() {
    const documentRef = createFakeDocument();
    const boardWrapper = new FakeElement('div');
    boardWrapper.id = 'board-wrapper';
    documentRef.register(boardWrapper);

    const timers = [];
    const toast = new GameFeedbackToast({
        container: boardWrapper,
        durationMs: 1400,
        documentRef,
        schedule(callback, delay) {
            const timer = { callback, delay, canceled: false };
            timers.push(timer);
            return timer;
        },
        cancel(timer) {
            timer.canceled = true;
        }
    });

    const element = toast.ensureElement();
    documentRef.register(element);

    return {
        toast,
        toastElement: element,
        timers,
        boardWrapper
    };
}

function createBlockedInteractionHandler(feedback, gameState, toast) {
    return () => {
        if (
            feedback.shouldShowWaitMessage({
                isStartScreen: gameState.isStartScreen,
                gameStatus: gameState.gameStatus,
                currentPlayer: gameState.currentPlayer
            })
        ) {
            toast.show(
                t('status.waitForBotTurn'),
                { durationMs: 1400 }
            );
        }
    };
}

test('pointer akisi: bot turunda ilk dokunus toast mesajini gosterir ve onSlotClick erken donusten once feedback tetiklenir', () => {
    const previousWindow = globalThis.window;
    const previousLanguage = getLanguage();
    globalThis.window = { PointerEvent: class {} };
    setLanguage('tr');

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clickedSlots = [];
    const feedback = new BotTurnTouchFeedback();
    const toastHarness = createToastHarness();
    const blockedCalls = [];
    const gameState = {
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2
    };

    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
            onBlockedInteraction: () => {
                blockedCalls.push('blocked');
                createBlockedInteractionHandler(
                    feedback,
                    gameState,
                    toastHarness.toast
                )();
            },
            onSlotClick: slotId => clickedSlots.push(slotId)
        });

        canvas.emit('pointerdown', {
            pointerId: 10,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 72,
            clientY: 48
        });
        canvas.emit('pointerup', {
            pointerId: 10,
            clientX: 74,
            clientY: 49,
            preventDefault() {}
        });

        assert.equal(clickedSlots.length, 0);
        assert.equal(blockedCalls.length, 1);
        assert.equal(toastHarness.toastElement.textContent, t('status.waitForBotTurn'));
        assert.equal(toastHarness.toastElement.classList.contains('is-visible'), true);
        assert.equal(toastHarness.toastElement.getAttribute('role'), 'status');
        assert.equal(toastHarness.toastElement.getAttribute('aria-live'), 'polite');
        assert.equal(toastHarness.toastElement.getAttribute('aria-atomic'), 'true');
        assert.equal(toastHarness.toastElement.getAttribute('aria-hidden'), 'false');
        assert.equal(toastHarness.timers.length, 1);
        assert.equal(toastHarness.timers[0].delay, 1400);

        canvas.emit('pointerdown', {
            pointerId: 11,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 90,
            clientY: 50
        });
        canvas.emit('pointerup', {
            pointerId: 11,
            clientX: 91,
            clientY: 52,
            preventDefault() {}
        });

        assert.equal(blockedCalls.length, 2);
        assert.equal(toastHarness.timers.length, 1);
        assert.equal(toastHarness.toastElement.textContent, t('status.waitForBotTurn'));

        feedback.reset();
        gameState.currentPlayer = 1;
        canvas.emit('pointerdown', {
            pointerId: 12,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 110,
            clientY: 58
        });
        canvas.emit('pointerup', {
            pointerId: 12,
            clientX: 112,
            clientY: 60,
            preventDefault() {}
        });
        assert.equal(toastHarness.toastElement.textContent, t('status.waitForBotTurn'));
        assert.equal(toastHarness.timers.length, 1);

        feedback.reset();
        gameState.currentPlayer = 2;
        canvas.emit('pointerdown', {
            pointerId: 13,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 130,
            clientY: 65
        });
        canvas.emit('pointerup', {
            pointerId: 13,
            clientX: 131,
            clientY: 66,
            preventDefault() {}
        });
        assert.equal(toastHarness.timers.length, 2);
        assert.equal(toastHarness.toastElement.classList.contains('is-visible'), true);

        feedback.reset();
        gameState.gameStatus = 'GAME_OVER';
        canvas.emit('pointerdown', {
            pointerId: 14,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 150,
            clientY: 70
        });
        canvas.emit('pointerup', {
            pointerId: 14,
            clientX: 151,
            clientY: 71,
            preventDefault() {}
        });
        assert.equal(toastHarness.timers.length, 2);

        toastHarness.timers[toastHarness.timers.length - 1].callback();
        assert.equal(toastHarness.toastElement.classList.contains('is-visible'), false);
        assert.equal(toastHarness.toastElement.getAttribute('aria-hidden'), 'true');
    } finally {
        setLanguage(previousLanguage);
        globalThis.window = previousWindow;
    }
});

test('desktop click fallback: pointer destegi yokken click yolu toast mesajini tetikler', () => {
    const previousWindow = globalThis.window;
    const previousLanguage = getLanguage();
    globalThis.window = {};
    setLanguage('en');

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clickedSlots = [];
    const feedback = new BotTurnTouchFeedback();
    const toastHarness = createToastHarness();
    const gameState = {
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2
    };

    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
            onBlockedInteraction: createBlockedInteractionHandler(
                feedback,
                gameState,
                toastHarness.toast
            ),
            onSlotClick: slotId => clickedSlots.push(slotId)
        });

        canvas.emit('click', {
            clientX: 220,
            clientY: 120
        });

        assert.equal(clickedSlots.length, 0);
        assert.equal(toastHarness.toastElement.textContent, t('status.waitForBotTurn'));
        assert.equal(toastHarness.toastElement.classList.contains('is-visible'), true);
    } finally {
        setLanguage(previousLanguage);
        globalThis.window = previousWindow;
    }
});

