import test from 'node:test';
import assert from 'node:assert/strict';

import { Renderer } from '../engine/renderer.js';
import { UIManager } from '../engine/uiManager.js';

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