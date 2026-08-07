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

    add(name) {
        this.set.add(name);
    }

    remove(name) {
        this.set.delete(name);
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

test('Kapalı sayaç açıkça gösterilir ve süre seçilince yeniden etkinleşir', () => {
    const elements = {
        'action-buttons': createElement(),
        'undo-button': createElement(),
        'confirm-button': createElement(),
        'timer-container': createElement(),
        'timer-countdown': createElement()
    };
    const restore = installMockDocument(elements);
    const previousLanguage = getLanguage();

    try {
        setLanguage('tr');
        const ui = new UIManager();

        ui.updateTimerDisabled();
        assert.equal(elements['timer-countdown'].textContent, 'Kapalı');
        assert.equal(
            elements['timer-container'].classList.contains('is-disabled'),
            true
        );

        ui.updateTimerText(60);
        assert.equal(elements['timer-countdown'].textContent, '60 sn');
        assert.equal(
            elements['timer-container'].classList.contains('is-disabled'),
            false
        );
    } finally {
        setLanguage(previousLanguage);
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
        assert.ok(layout[0].width >= 24);
        assert.ok(layout[0].width > layout[0].height * 3);
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

test('pul animasyonu hedefteki son pulu gecici olarak hareket katmanina ayirir', () => {
    const renderer = Object.create(Renderer.prototype);
    renderer.checkerMoveAnimationState = null;

    renderer.startCheckerMoveAnimation({
        fromSlot: 1,
        targetSlot: 4,
        player: 1,
        sourceCountBefore: 15,
        targetCountAfter: 3,
        liftPx: 24
    });

    assert.equal(renderer.checkerMoveAnimationState.progress, 0);
    assert.deepEqual(
        renderer.getAnimatedSlotData(4, { count: 3, player: 1 }),
        { count: 2, player: 1 }
    );
    assert.equal(renderer.getAnimatedCollectedCount(1, 6), 6);

    renderer.setCheckerMoveAnimationProgress(0.5);
    assert.equal(renderer.checkerMoveAnimationState.progress, 0.5);
    renderer.clearCheckerMoveAnimation();
    assert.equal(renderer.checkerMoveAnimationState, null);
});

test('toplama animasyonu son hazne dilimini gecici olarak gizler', () => {
    const renderer = Object.create(Renderer.prototype);
    renderer.startCheckerMoveAnimation({
        fromSlot: 24,
        targetSlot: 25,
        player: 1,
        sourceCountBefore: 1,
        targetCountAfter: 15,
        liftPx: 24
    });

    assert.equal(renderer.getAnimatedCollectedCount(1, 15), 14);
    assert.equal(renderer.getAnimatedCollectedCount(2, 5), 5);
});

test('orta kasnak yanındaki pul animasyonu normal pul çapını ve merkezini korur', () => {
    const renderer = Object.create(Renderer.prototype);
    const boardLayout = {
        width: 800,
        height: 600,
        border: 20,
        bar: 30,
        tray: 55,
        slotCountPerRow: 12,
        slotHeight: 220,
        leftField: { x: 43, width: 331 },
        rightField: { x: 423, width: 331 },
        centerPointInset: 7
    };
    const layout = {
        boardLayout,
        playfield: { top: 42, bottom: 566 }
    };

    const normal = renderer.getCheckerAnimationAnchor(8, 1, 1, layout);
    const leftInner = renderer.getCheckerAnimationAnchor(7, 1, 1, layout);
    const rightInner = renderer.getCheckerAnimationAnchor(6, 1, 1, layout);

    assert.equal(leftInner.radius, normal.radius);
    assert.equal(rightInner.radius, normal.radius);
    assert.ok(
        Math.abs(
            leftInner.x -
            (boardLayout.leftField.x + ((5.5 * boardLayout.leftField.width) / 6))
        ) < 1e-9
    );
    assert.ok(
        Math.abs(
            rightInner.x -
            (boardLayout.rightField.x + (boardLayout.rightField.width / 12))
        ) < 1e-9
    );
});

test('orta kasnak yanındaki dört pul yığını tam hane genişliğiyle çizilir', () => {
    const pieceCalls = [];
    const renderer = Object.create(Renderer.prototype);
    const boardLayout = {
        width: 800,
        height: 600,
        border: 20,
        bar: 30,
        tray: 55,
        slotCountPerRow: 12,
        slotHeight: 220,
        leftField: { x: 43, width: 331 },
        rightField: { x: 423, width: 331 },
        centerPointInset: 7
    };
    Object.assign(renderer, {
        ctx: {
            clearRect() {},
            drawImage() {}
        },
        canvas: {
            width: 800,
            height: 600,
            dataset: {
                logicalWidth: '800',
                logicalHeight: '600',
                pixelRatio: '1'
            }
        },
        boardWidth: 800,
        boardHeight: 600,
        pixelRatio: 1,
        borderSize: 20,
        trayWidth: 55,
        slotHeight: 220,
        theme: { pointHeight: 178 },
        staticBoardDirty: false,
        staticBoardCanvas: {},
        highlightedSlots: [],
        checkerMoveAnimationState: null,
        die1Text: null,
        die2Text: null,
        calculateHighlights() {},
        getPlayfieldEdges() {
            return { top: 42, bottom: 566 };
        },
        getBoardLayout() {
            return boardLayout;
        },
        resolveActiveBotMoveHighlight() {
            return null;
        },
        drawMastermindPieces(x, y, width, slotData, isTop) {
            pieceCalls.push({ x, y, width, slotData, isTop });
        },
        drawBearOffTrays() {},
        updateTurnIndicator() {},
        updateDoubleMoveRights() {}
    });

    const slots = Array.from({ length: 26 }, () => ({
        player: null,
        count: 0
    }));
    for (const slotId of [6, 7, 18, 19]) {
        slots[slotId] = { player: 1, count: 1 };
    }

    renderer.render({
        board: { slots },
        currentPlayer: 1,
        dice: { values: [] },
        availableMoves: []
    });

    const slotWidth = boardLayout.leftField.width / 6;
    for (const callIndex of [5, 6, 17, 18]) {
        assert.equal(pieceCalls[callIndex].width, slotWidth);
    }
    assert.equal(pieceCalls[5].x, boardLayout.leftField.x + (5 * slotWidth));
    assert.equal(pieceCalls[6].x, boardLayout.rightField.x);
    assert.equal(pieceCalls[17].x, boardLayout.leftField.x + (5 * slotWidth));
    assert.equal(pieceCalls[18].x, boardLayout.rightField.x);
});

test('bot hamle vurgusu statik tahta çizildikten sonra ve pullardan önce görünür katmana çizilir', () => {
    const calls = [];
    const renderer = Object.create(Renderer.prototype);
    Object.assign(renderer, {
        ctx: {
            clearRect() {
                calls.push('clear');
            },
            drawImage() {
                calls.push('board');
            }
        },
        canvas: {
            width: 800,
            height: 600,
            dataset: {
                logicalWidth: '800',
                logicalHeight: '600',
                pixelRatio: '1'
            }
        },
        boardWidth: 800,
        boardHeight: 600,
        pixelRatio: 1,
        borderSize: 20,
        trayWidth: 55,
        slotHeight: 220,
        theme: { pointHeight: 178 },
        staticBoardDirty: false,
        staticBoardCanvas: {},
        highlightedSlots: [],
        die1Text: null,
        die2Text: null,
        calculateHighlights() {},
        getPlayfieldEdges() {
            return { top: 42, bottom: 566 };
        },
        getBoardLayout() {
            return {
                width: 800,
                height: 600,
                border: 20,
                bar: 30,
                tray: 55,
                slotCountPerRow: 12,
                slotHeight: 220
            };
        },
        resolveActiveBotMoveHighlight() {
            return { fromSlot: 13, targetSlot: 18 };
        },
        drawBotMoveHighlight() {
            calls.push('bot-highlight');
        },
        drawMastermindPieces() {
            calls.push('piece');
        },
        drawBearOffTrays() {},
        updateTurnIndicator() {},
        updateDoubleMoveRights() {}
    });

    const slots = Array.from({ length: 26 }, () => ({
        player: 0,
        count: 0
    }));
    renderer.render({
        board: { slots },
        currentPlayer: 1,
        dice: { values: [] },
        availableMoves: []
    });

    assert.ok(calls.indexOf('board') < calls.indexOf('bot-highlight'));
    assert.ok(calls.indexOf('bot-highlight') < calls.indexOf('piece'));
});
