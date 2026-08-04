import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    ONGOING_MATCH_MAX_AGE_MS,
    ONGOING_MATCH_SCHEMA_VERSION,
    ONGOING_MATCH_STORAGE_KEY,
    OngoingMatchStore
} from '../engine/ongoingMatch.js';

class FakeStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }

    removeItem(key) {
        this.values.delete(key);
    }
}

function createMidTurnGame() {
    const game = new NardeGame();
    game.initGame();
    game.gameStatus = 'PLAYING';
    game.dice.values = [3, 4];
    game.availableMoves = [3, 4];
    assert.equal(game.executeMove(1, 3), true);
    return game;
}

test('yarim mac surumlu olarak kaydedilir ve ayni kurallı duruma doner', () => {
    const storage = new FakeStorage();
    const now = 100000;
    const sourceGame = createMidTurnGame();
    const store = new OngoingMatchStore({
        storage,
        now: () => now
    });

    const saved = store.save({
        gameState: sourceGame.exportState(),
        totalMoves: 1,
        difficulty: 'champion',
        autoBearOffEnabled: true,
        humanCheckerColor: 'black'
    });
    assert.ok(saved);
    assert.ok(storage.getItem(ONGOING_MATCH_STORAGE_KEY));

    const loaded = store.load();
    const restoredGame = new NardeGame();
    assert.equal(restoredGame.restoreState(loaded.gameState), true);
    assert.equal(restoredGame.getSearchStateKey(), sourceGame.getSearchStateKey());
    assert.equal(restoredGame.moveHistory.length, 1);
    assert.deepEqual(restoredGame.moveHistory[0].move, {
        fromSlot: 1,
        targetSlot: 4,
        player: 1,
        diceValue: 3
    });
    assert.equal(loaded.totalMoves, 1);
    assert.equal(loaded.difficulty, 'champion');
    assert.equal(loaded.autoBearOffEnabled, true);
    assert.equal(loaded.humanCheckerColor, 'black');
});

test('bozuk pul korunumlu kayit reddedilir ve depodan temizlenir', () => {
    const storage = new FakeStorage();
    const game = createMidTurnGame();
    const raw = {
        schemaVersion: ONGOING_MATCH_SCHEMA_VERSION,
        savedAt: 500,
        gameState: game.exportState(),
        totalMoves: 1,
        difficulty: 'medium',
        autoBearOffEnabled: false,
        humanCheckerColor: 'white'
    };
    raw.gameState.board.slots[4].count = 14;
    storage.setItem(ONGOING_MATCH_STORAGE_KEY, JSON.stringify(raw));

    const store = new OngoingMatchStore({ storage, now: () => 500 });
    assert.equal(store.load(), null);
    assert.equal(storage.getItem(ONGOING_MATCH_STORAGE_KEY), null);
});

test('suresi gecmis kayit acilmaz', () => {
    const storage = new FakeStorage();
    const game = createMidTurnGame();
    const store = new OngoingMatchStore({ storage, now: () => 1000 });
    store.save({
        gameState: game.exportState(),
        totalMoves: 1,
        difficulty: 'medium'
    });

    const laterStore = new OngoingMatchStore({
        storage,
        now: () => 1000 + ONGOING_MATCH_MAX_AGE_MS + 1
    });
    assert.equal(laterStore.load(), null);
});

test('bitmis gibi gorunen aktif kayit ve hamle metadatasi eksik kayit reddedilir', () => {
    const storage = new FakeStorage();
    const game = createMidTurnGame();
    const base = {
        schemaVersion: ONGOING_MATCH_SCHEMA_VERSION,
        savedAt: 700,
        gameState: game.exportState(),
        totalMoves: 1,
        difficulty: 'medium',
        autoBearOffEnabled: false,
        humanCheckerColor: 'not-a-color'
    };

    const completed = structuredClone(base);
    completed.gameState.board.borneOff[1] = 15;
    completed.gameState.board.slots[1] = { count: 0, player: null };
    completed.gameState.board.slots[4] = { count: 0, player: null };
    storage.setItem(ONGOING_MATCH_STORAGE_KEY, JSON.stringify(completed));
    const store = new OngoingMatchStore({ storage, now: () => 700 });
    assert.equal(store.load(), null);

    const missingMove = structuredClone(base);
    missingMove.gameState.moveHistory[0].move = null;
    storage.setItem(ONGOING_MATCH_STORAGE_KEY, JSON.stringify(missingMove));
    assert.equal(store.load(), null);

    storage.setItem(ONGOING_MATCH_STORAGE_KEY, JSON.stringify(base));
    assert.equal(store.load().humanCheckerColor, 'white');

    const legacyWithoutColor = structuredClone(base);
    delete legacyWithoutColor.humanCheckerColor;
    storage.setItem(
        ONGOING_MATCH_STORAGE_KEY,
        JSON.stringify(legacyWithoutColor)
    );
    assert.equal(store.load().humanCheckerColor, 'white');
});

test('localStorage hatalari oyun akisina yansitilmaz', () => {
    const throwingStorage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); }
    };
    const game = createMidTurnGame();
    const store = new OngoingMatchStore({
        storage: throwingStorage,
        now: () => 100
    });

    assert.doesNotThrow(() => store.save({
        gameState: game.exportState(),
        totalMoves: 1,
        difficulty: 'hard'
    }));
    assert.equal(store.load(), null);
    assert.doesNotThrow(() => store.clear());
});
