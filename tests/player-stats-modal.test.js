import test from 'node:test';
import assert from 'node:assert/strict';

import { PlayerStatsModal } from '../engine/playerStatsModal.js';
import { PlayerIdentityStore } from '../engine/playerIdentity.js';
import { PlayerStatsStore } from '../engine/playerStats.js';

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

class FakeDocument {
    constructor() {
        this.activeElement = null;
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    emitKeydown(event) {
        const listener = this.listeners.get('keydown');
        if (listener) listener(event);
    }
}

class FakeElement {
    constructor(doc) {
        this.ownerDocument = doc;
        this.style = {};
        this.hidden = false;
        this.disabled = false;
        this.textContent = '';
        this.value = '';
        this.dataset = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.focusables = [];
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type, event = {}) {
        const listener = this.listeners.get(type);
        if (listener) listener(event);
    }

    click() {
        this.dispatch('click', { currentTarget: this });
    }

    focus() {
        this.ownerDocument.activeElement = this;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    querySelectorAll(selector) {
        if (selector.includes('button')) {
            return this.focusables;
        }
        return [];
    }
}

function createProfileFixture(doc) {
    const displayNameInput = new FakeElement(doc);
    const previewGlyph = new FakeElement(doc);
    const previewName = new FakeElement(doc);
    const saveButton = new FakeElement(doc);
    const resetButton = new FakeElement(doc);
    const status = new FakeElement(doc);
    const avatarAnatolia = new FakeElement(doc);
    avatarAnatolia.dataset.avatarId = 'avatar-anatolia';
    const avatarEagle = new FakeElement(doc);
    avatarEagle.dataset.avatarId = 'avatar-eagle';

    return {
        displayNameInput,
        previewGlyph,
        previewName,
        saveButton,
        resetButton,
        status,
        avatarButtons: [avatarAnatolia, avatarEagle]
    };
}

function createFixture() {
    const doc = new FakeDocument();
    const modal = new FakeElement(doc);
    const openButton = new FakeElement(doc);
    const closeTop = new FakeElement(doc);
    const closeFooter = new FakeElement(doc);
    const resetButton = new FakeElement(doc);
    const empty = new FakeElement(doc);
    const cards = new FakeElement(doc);

    const values = {
        totalMatches: new FakeElement(doc),
        wins: new FakeElement(doc),
        losses: new FakeElement(doc),
        winRate: new FakeElement(doc),
        totalMoves: new FakeElement(doc),
        bestWinMoves: new FakeElement(doc),
        normalLosses: new FakeElement(doc),
        timeoutLosses: new FakeElement(doc)
    };

    modal.focusables = [closeTop, resetButton, closeFooter];

    return {
        doc,
        modal,
        openButton,
        closeTop,
        closeFooter,
        resetButton,
        empty,
        cards,
        values
    };
}

test('stats modal acilir, kapanir ve erisilebilirlik nitelikleri guncellenir', () => {
    const fixture = createFixture();
    const storage = new FakeStorage();
    const store = new PlayerStatsStore({ storage });

    new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop, fixture.closeFooter],
        resetButton: fixture.resetButton,
        statsStore: store,
        valueElements: fixture.values,
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        confirmReset: () => true
    });

    fixture.openButton.click();
    assert.equal(fixture.modal.style.display, 'flex');
    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'false');

    fixture.closeTop.click();
    assert.equal(fixture.modal.style.display, 'none');
    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
});

test('bos durumda kartlar yerine acik mesaj gosterilir', () => {
    const fixture = createFixture();
    const storage = new FakeStorage();
    const store = new PlayerStatsStore({ storage });

    const modal = new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        resetButton: fixture.resetButton,
        statsStore: store,
        valueElements: fixture.values,
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        confirmReset: () => true
    });

    modal.render();
    assert.equal(fixture.empty.hidden, false);
    assert.equal(fixture.cards.hidden, true);
});

test('sifirlama onayi reddedilirse veri korunur, kabul edilirse silinir', () => {
    const fixture = createFixture();
    const storage = new FakeStorage();
    const store = new PlayerStatsStore({ storage });

    store.recordMatch({
        winner: 1,
        endReason: 'white_win',
        totalMoves: 22,
        humanPlayer: 1
    });

    let confirmed = false;
    const modal = new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        resetButton: fixture.resetButton,
        statsStore: store,
        valueElements: fixture.values,
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        confirmReset: () => confirmed
    });

    fixture.resetButton.click();
    assert.equal(store.getSummary().totalMatches, 1);

    confirmed = true;
    fixture.resetButton.click();
    assert.equal(store.getSummary().totalMatches, 0);
    assert.equal(fixture.empty.hidden, false);

    modal.close({ returnFocus: false });
});

test('Escape kapatir ve Tab focus trap uygular', () => {
    const fixture = createFixture();
    const store = new PlayerStatsStore({ storage: new FakeStorage() });

    new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        resetButton: fixture.resetButton,
        statsStore: store,
        valueElements: fixture.values,
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        confirmReset: () => true
    });

    fixture.openButton.click();

    fixture.closeFooter.focus();
    let prevented = false;
    fixture.doc.emitKeydown({
        key: 'Tab',
        shiftKey: false,
        preventDefault() {
            prevented = true;
        }
    });

    assert.equal(prevented, true);
    assert.equal(fixture.doc.activeElement, fixture.closeTop);

    fixture.doc.emitKeydown({
        key: 'Escape',
        preventDefault() {}
    });

    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
});

test('profil adi ve yerlesik avatar kaydedilir, sifirlama onay ister', () => {
    const fixture = createFixture();
    const profile = createProfileFixture(fixture.doc);
    const storage = new FakeStorage();
    const identityStore = new PlayerIdentityStore({
        storage,
        idFactory: () => 'local-modal-player'
    });
    let resetConfirmed = false;

    new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        resetButton: fixture.resetButton,
        statsStore: new PlayerStatsStore({ storage }),
        valueElements: fixture.values,
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        identityStore,
        profileElements: profile,
        avatarButtons: profile.avatarButtons,
        confirmReset: () => resetConfirmed
    });

    profile.displayNameInput.value = 'Metin Usta';
    profile.avatarButtons[1].click();
    assert.equal(profile.avatarButtons[1].getAttribute('aria-pressed'), 'true');
    profile.saveButton.click();

    assert.equal(identityStore.load().displayName, 'Metin Usta');
    assert.equal(identityStore.load().avatarId, 'avatar-eagle');
    assert.equal(profile.previewGlyph.textContent, '🦅');

    profile.resetButton.click();
    assert.equal(identityStore.load().displayName, 'Metin Usta');

    resetConfirmed = true;
    profile.resetButton.click();
    assert.equal(identityStore.load().displayName, 'Nardora Player');
    assert.equal(identityStore.load().avatarId, 'avatar-anatolia');
});

test('zorluk kayitlari ve basarim durumlari modalda guncellenir', () => {
    const fixture = createFixture();
    const storage = new FakeStorage();
    const store = new PlayerStatsStore({ storage });
    store.recordMatch({
        winner: 1,
        totalMoves: 35,
        difficulty: 'champion'
    });
    const championRecord = new FakeElement(fixture.doc);
    const achievementCard = new FakeElement(fixture.doc);
    const achievementState = new FakeElement(fixture.doc);

    const modal = new PlayerStatsModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        resetButton: fixture.resetButton,
        statsStore: store,
        valueElements: {
            ...fixture.values,
            byDifficulty: { champion: championRecord }
        },
        emptyState: fixture.empty,
        cardsContainer: fixture.cards,
        achievementElements: {
            'champion-win': {
                card: achievementCard,
                state: achievementState
            }
        },
        confirmReset: () => true
    });

    modal.render();
    assert.match(championRecord.textContent, /1/);
    assert.equal(achievementCard.getAttribute('data-unlocked'), 'true');
    assert.equal(achievementState.getAttribute('data-unlocked'), 'true');
});
