import test from 'node:test';
import assert from 'node:assert/strict';

import { Renderer } from '../engine/renderer.js';

function createTheme() {
    return {
        checkers: {
            white: {
                gradient: ['white-0', 'white-1', 'white-2'],
                collectedGradient: ['white-c0', 'white-c1'],
                stroke: 'white-stroke',
                insetStroke: 'white-inset'
            },
            black: {
                gradient: ['black-0', 'black-1', 'black-2'],
                collectedGradient: ['black-c0', 'black-c1'],
                stroke: 'black-stroke',
                insetStroke: 'black-inset'
            },
            shadow: 'shadow'
        }
    };
}

function createGradientRecorder(records) {
    return {
        addColorStop(offset, color) {
            records.push({ offset, color });
        }
    };
}

test('insan siyahı seçince oyuncu kimlikleri karşıt görsel renklere eşlenir', () => {
    const renderer = Object.create(Renderer.prototype);
    renderer.humanCheckerColor = 'white';

    assert.equal(renderer.getCheckerColorForPlayer(1), 'white');
    assert.equal(renderer.getCheckerColorForPlayer(2), 'black');
    assert.equal(renderer.setHumanCheckerColor('black'), 'black');
    assert.equal(renderer.getCheckerColorForPlayer(1), 'black');
    assert.equal(renderer.getCheckerColorForPlayer(2), 'white');
    assert.equal(renderer.setHumanCheckerColor('invalid'), 'white');
});

test('sıra göstergesi motor oyuncusu yerine seçilen görsel rengi açıklar', () => {
    const classes = new Map();
    const renderer = Object.create(Renderer.prototype);
    renderer.humanCheckerColor = 'black';
    renderer.currentPlayerText = {
        textContent: '',
        dataset: {}
    };
    renderer.turnIndicator = {
        classList: {
            toggle(name, value) {
                classes.set(name, value);
            }
        },
        dataset: {},
        setAttribute(name, value) {
            this[name] = value;
        }
    };

    renderer.updateTurnIndicator(1);
    assert.equal(renderer.currentPlayerText.dataset.i18n, 'player.black');
    assert.equal(renderer.turnIndicator.dataset.activePlayer, 'black');
    assert.equal(classes.get('is-dark-turn'), true);

    renderer.updateTurnIndicator(2);
    assert.equal(renderer.currentPlayerText.dataset.i18n, 'player.white');
    assert.equal(renderer.turnIndicator.dataset.activePlayer, 'white');
    assert.equal(classes.get('is-white-turn'), true);
});

test('tahta pulu ve toplanan dilim aynı seçilmiş renk tokenlarını kullanır', () => {
    const pieceStops = [];
    const trayStops = [];
    const renderer = Object.create(Renderer.prototype);
    renderer.humanCheckerColor = 'black';
    renderer.theme = createTheme();
    renderer.victoryMomentState = null;
    renderer.getCollectedSliceLayout = () => [{
        x: 1,
        y: 2,
        width: 12,
        height: 4
    }];
    renderer.ctx = {
        beginPath() {},
        arc() {},
        fill() {},
        stroke() {},
        fillRect() {},
        strokeRect() {},
        createRadialGradient() {
            return createGradientRecorder(pieceStops);
        },
        createLinearGradient() {
            return createGradientRecorder(trayStops);
        }
    };

    renderer.drawCheckerBody({
        centerX: 20,
        centerY: 20,
        radius: 10,
        player: 1
    });
    renderer.drawCollectedSlices(1, 1, {
        x: 0,
        y: 0,
        width: 20,
        height: 30
    });

    assert.deepEqual(pieceStops.map(stop => stop.color), [
        'black-0',
        'black-1',
        'black-2'
    ]);
    assert.deepEqual(trayStops.map(stop => stop.color), [
        'black-c0',
        'black-c1'
    ]);
});
