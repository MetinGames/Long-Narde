import test from 'node:test';
import assert from 'node:assert/strict';

import { Renderer } from '../engine/renderer.js';
import { UIManager } from '../engine/uiManager.js';
import {
    getLanguage,
    setLanguage,
    t
} from '../engine/i18n.js';

class FakeClassList {
    constructor() {
        this.set = new Set();
    }

    toggle(name, force) {
        if (force === undefined) {
            if (this.set.has(name)) {
                this.set.delete(name);
                return false;
            }
            this.set.add(name);
            return true;
        }

        if (force) {
            this.set.add(name);
            return true;
        }

        this.set.delete(name);
        return false;
    }

    contains(name) {
        return this.set.has(name);
    }
}

function createElement() {
    return {
        classList: new FakeClassList(),
        style: {},
        dataset: {},
        textContent: '',
        title: '',
        tabIndex: 0,
        disabled: false,
        attributes: new Map(),
        setAttribute(name, value) {
            this.attributes.set(name, value);
        },
        getAttribute(name) {
            return this.attributes.get(name);
        }
    };
}

function createCanvasElement() {
    const element = createElement();
    element.getContext = () => ({
        setTransform() {},
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    return element;
}

function installMockDocument(map) {
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;

    globalThis.document = {
        documentElement: {
            lang: 'en'
        },
        getElementById(id) {
            return map[id] || null;
        },
        createElement() {
            return createCanvasElement();
        }
    };
    globalThis.window = {
        devicePixelRatio: 1
    };

    return () => {
        globalThis.document = previousDocument;
        globalThis.window = previousWindow;
    };
}

test('çift zarda dört hak ışığı soldan sağa azalır ve geri gelir', () => {
    const elements = {
        'game-canvas': createCanvasElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };
    const restore = installMockDocument(elements);

    try {
        const renderer = new Renderer();
        const game = {
            dice: { values: [4, 4] },
            availableMoves: [4, 4, 4, 4]
        };

        renderer.updateDiceAvailability(game);
        assert.equal(
            elements['dice-display'].classList.contains('is-double-roll'),
            true
        );
        assert.equal(
            elements['die-right-1'].classList.contains('is-spent'),
            false
        );

        game.availableMoves = [4, 4];
        renderer.updateDiceAvailability(game);
        assert.equal(
            elements['die-right-1'].classList.contains('is-spent'),
            true
        );
        assert.equal(
            elements['die-right-2'].classList.contains('is-spent'),
            true
        );
        assert.equal(
            elements['die-right-3'].classList.contains('is-spent'),
            false
        );

        // Geri alma ile bir hak geri gelmiş gibi durum.
        game.availableMoves = [4, 4, 4];
        renderer.updateDiceAvailability(game);
        assert.equal(
            elements['die-right-1'].classList.contains('is-spent'),
            true
        );
        assert.equal(
            elements['die-right-2'].classList.contains('is-spent'),
            false
        );

        game.dice.values = [3, 5];
        game.availableMoves = [3, 5];
        renderer.updateDiceAvailability(game);
        assert.equal(
            elements['dice-display'].classList.contains('is-double-roll'),
            false
        );
    } finally {
        restore();
    }
});

test('onay düğmesi erişilebilir disabled bilgisiyle senkronlanır', () => {
    const elements = {
        'action-buttons': createElement(),
        'undo-button': createElement(),
        'confirm-button': createElement(),
        'timer-countdown': createElement()
    };
    const restore = installMockDocument(elements);

    try {
        const ui = new UIManager();

        ui.setConfirmEnabled(false);
        assert.equal(elements['confirm-button'].disabled, true);
        assert.equal(
            elements['confirm-button'].getAttribute('aria-disabled'),
            'true'
        );

        ui.setConfirmEnabled(true);
        assert.equal(elements['confirm-button'].disabled, false);
        assert.equal(
            elements['confirm-button'].getAttribute('aria-disabled'),
            'false'
        );
    } finally {
        restore();
    }
});

test('toplanan pullar için dilim düzeni hazne içinde üretilir', () => {
    const elements = {
        'game-canvas': createCanvasElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };
    const restore = installMockDocument(elements);

    try {
        const renderer = new Renderer();
        const trayRect = {
            x: 760,
            y: 42,
            width: 40,
            height: 259
        };

        const layout = renderer.getCollectedSliceLayout(
            6,
            trayRect
        );

        assert.equal(layout.length, 6);
        assert.ok(layout[0].x >= trayRect.x);
        assert.ok(layout[0].x + layout[0].width <= trayRect.x + trayRect.width);
        assert.ok(layout[0].y > layout[1].y);
    } finally {
        restore();
    }
});

test('kompakt sira seridi aktif oyuncu rengini ve erisilebilir metni gunceller', () => {
    const elements = {
        'game-canvas': createCanvasElement(),
        'turn-indicator': createElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };
    const restore = installMockDocument(elements);
    const previousLanguage = getLanguage();

    try {
        setLanguage('en');
        const renderer = new Renderer();

        renderer.updateTurnIndicator(1);
        assert.equal(
            elements['current-player'].textContent,
            t('player.white')
        );
        assert.equal(
            elements['turn-indicator'].classList.contains('is-white-turn'),
            true
        );
        assert.equal(
            elements['turn-indicator'].classList.contains('is-dark-turn'),
            false
        );
        assert.equal(
            elements['turn-indicator'].getAttribute('aria-label'),
            `${t('ui.turn')} ${t('player.white')}`
        );

        setLanguage('ru');
        renderer.updateTurnIndicator(2);
        assert.equal(
            elements['current-player'].textContent,
            t('player.black')
        );
        assert.equal(
            elements['turn-indicator'].classList.contains('is-dark-turn'),
            true
        );
        assert.equal(
            elements['turn-indicator'].classList.contains('is-white-turn'),
            false
        );
        assert.equal(
            elements['turn-indicator'].getAttribute('aria-label'),
            `${t('ui.turn')} ${t('player.black')}`
        );
    } finally {
        setLanguage(previousLanguage);
        restore();
    }
});

test('bot son hamle vurgusu ayarlanir, sure sonunda temizlenir', () => {
    const elements = {
        'game-canvas': createCanvasElement(),
        'turn-indicator': createElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };
    const restore = installMockDocument(elements);

    try {
        const renderer = new Renderer();
        renderer.setBotMoveHighlight({
            fromSlot: 13,
            targetSlot: 18,
            reducedMotion: true,
            durationMs: 500
        });

        const activeNow = renderer.resolveActiveBotMoveHighlight(100);
        assert.equal(activeNow.fromSlot, 13);
        assert.equal(activeNow.targetSlot, 18);
        assert.equal(activeNow.reducedMotion, true);

        const stateBeforeExpiry = renderer.botMoveHighlightState;
        assert.ok(stateBeforeExpiry);

        const expired = renderer.resolveActiveBotMoveHighlight(
            stateBeforeExpiry.expiresAt + 1
        );
        assert.equal(expired, null);
        assert.equal(renderer.botMoveHighlightState, null);
    } finally {
        restore();
    }
});

test('bot hamle vurgusu manuel olarak temizlenebilir', () => {
    const elements = {
        'game-canvas': createCanvasElement(),
        'turn-indicator': createElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };
    const restore = installMockDocument(elements);

    try {
        const renderer = new Renderer();
        renderer.setBotMoveHighlight({
            fromSlot: 8,
            targetSlot: 25,
            durationMs: 900
        });

        assert.ok(renderer.resolveActiveBotMoveHighlight(0));
        renderer.clearBotMoveHighlight();
        assert.equal(renderer.resolveActiveBotMoveHighlight(0), null);
    } finally {
        restore();
    }
});