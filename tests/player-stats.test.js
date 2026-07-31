import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MatchStatsRecorder,
    PLAYER_STATS_STORAGE_KEY,
    PlayerStatsStore,
    createDefaultPlayerStats
} from '../engine/playerStats.js';

class FakeStorage {
    constructor(initial = {}) {
        this.store = { ...initial };
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }
}

class ThrowingGetStorage extends FakeStorage {
    getItem() {
        throw new Error('getItem failed');
    }
}

class ThrowingSetStorage extends FakeStorage {
    setItem() {
        throw new Error('setItem failed');
    }
}

function createStoreWith(initial) {
    const storage = new FakeStorage(initial);
    const store = new PlayerStatsStore({ storage });
    return { store, storage };
}

test('localStorage anahtari surumlu ve sabittir', () => {
    assert.equal(PLAYER_STATS_STORAGE_KEY, 'longNarde.playerStats.v1');
});

test('ilk galibiyet dogru sekilde kaydedilir', () => {
    const { store } = createStoreWith();

    const summary = store.recordMatch({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 42,
        humanPlayer: 1
    });

    assert.equal(summary.totalMatches, 1);
    assert.equal(summary.wins, 1);
    assert.equal(summary.losses, 0);
    assert.equal(summary.totalMoves, 42);
    assert.equal(summary.bestWinMoves, 42);
    assert.equal(summary.winRate, 100);
});

test('normal ve timeout maglubiyetleri ayri siniflandirilir', () => {
    const { store } = createStoreWith();

    store.recordMatch({
        winner: 2,
        endReason: 'black_win',
        totalMoves: 50,
        humanPlayer: 1
    });
    const summary = store.recordMatch({
        winner: 2,
        endReason: 'timeout',
        totalMoves: 12,
        humanPlayer: 1
    });

    assert.equal(summary.totalMatches, 2);
    assert.equal(summary.losses, 2);
    assert.equal(summary.normalLosses, 1);
    assert.equal(summary.timeoutLosses, 1);
});

test('ayni mac sonucu iki kez kaydedilmez', () => {
    const { store } = createStoreWith();
    const recorder = new MatchStatsRecorder({ store, humanPlayer: 1 });

    recorder.beginMatch();
    const first = recorder.recordIfGameOver({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 30,
        gameStatus: 'GAME_OVER'
    });
    const second = recorder.recordIfGameOver({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 30,
        gameStatus: 'GAME_OVER'
    });

    assert.equal(first.recorded, true);
    assert.equal(second.recorded, false);
    assert.equal(store.getSummary().totalMatches, 1);
});

test('yarim kalan mac sayilmaz', () => {
    const { store } = createStoreWith();
    const recorder = new MatchStatsRecorder({ store, humanPlayer: 1 });

    recorder.beginMatch();
    recorder.recordIfGameOver({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 20,
        gameStatus: 'PLAYING'
    });

    assert.equal(store.getSummary().totalMatches, 0);
});

test('yeni oyun onceki sonucu ikinci kez yazmaz ve yeni mac kayda acilir', () => {
    const { store } = createStoreWith();
    const recorder = new MatchStatsRecorder({ store, humanPlayer: 1 });

    recorder.beginMatch();
    recorder.recordIfGameOver({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 35,
        gameStatus: 'GAME_OVER'
    });

    recorder.beginMatch();
    const duplicateOldResult = recorder.recordIfGameOver({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 35,
        gameStatus: 'PLAYING'
    });
    const secondMatch = recorder.recordIfGameOver({
        winner: 2,
        endReason: 'black_win',
        totalMoves: 55,
        gameStatus: 'GAME_OVER'
    });

    assert.equal(duplicateOldResult.recorded, false);
    assert.equal(secondMatch.recorded, true);
    assert.equal(store.getSummary().totalMatches, 2);
});

test('galibiyet yuzdesi ve en iyi galibiyet hamlesi hesaplanir', () => {
    const { store } = createStoreWith();

    store.recordMatch({ winner: 1, endReason: 'white_win', totalMoves: 48, humanPlayer: 1 });
    store.recordMatch({ winner: 1, endReason: 'white_win', totalMoves: 40, humanPlayer: 1 });
    const summary = store.recordMatch({ winner: 2, endReason: 'black_win', totalMoves: 60, humanPlayer: 1 });

    assert.equal(summary.totalMatches, 3);
    assert.equal(summary.wins, 2);
    assert.equal(summary.losses, 1);
    assert.equal(summary.winRate, 66.7);
    assert.equal(summary.bestWinMoves, 40);
});

test('bozuk localStorage verisinden guvenli sekilde varsayilana doner', () => {
    const brokenJson = {
        [PLAYER_STATS_STORAGE_KEY]: '{not-valid-json'
    };
    const { store } = createStoreWith(brokenJson);

    assert.deepEqual(store.load(), createDefaultPlayerStats());
});

test('localStorage olmadiginda oyun akisi bozulmaz', () => {
    const store = new PlayerStatsStore({ storage: null });

    const loaded = store.load();
    const summary = store.recordMatch({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 18,
        humanPlayer: 1
    });

    assert.equal(loaded.totalMatches, 0);
    assert.equal(summary.totalMatches, 1);
    assert.equal(summary.wins, 1);
});

test('localStorage getItem exception durumunda varsayilana doner', () => {
    const store = new PlayerStatsStore({ storage: new ThrowingGetStorage() });

    assert.deepEqual(store.load(), createDefaultPlayerStats());
});

test('localStorage setItem exception durumunda oyun akisi bozulmaz', () => {
    const store = new PlayerStatsStore({ storage: new ThrowingSetStorage() });

    const summary = store.recordMatch({
        winner: 2,
        endReason: 'timeout',
        totalMoves: 14,
        humanPlayer: 1
    });

    assert.equal(summary.totalMatches, 1);
    assert.equal(summary.losses, 1);
    assert.equal(summary.timeoutLosses, 1);
});

test('eski veya eksik veri yuklenirken guvenli varsayilanlarla tamamlanir', () => {
    const initial = {
        [PLAYER_STATS_STORAGE_KEY]: JSON.stringify({
            wins: 2,
            losses: 1,
            totalMatches: 9,
            timeoutLosses: 99
        })
    };
    const { store } = createStoreWith(initial);

    const loaded = store.load();
    assert.equal(loaded.totalMatches, 3);
    assert.equal(loaded.timeoutLosses, 1);
    assert.equal(loaded.normalLosses, 0);
    assert.equal(loaded.totalMoves, 0);
});
