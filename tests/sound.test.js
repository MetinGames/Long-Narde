import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SoundManager,
    SOUND_PREFERENCE_KEY
} from '../engine/sound.js';

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
}

class FakeAudioParam {
    constructor() {
        this.events = [];
    }

    setValueAtTime(value, at) {
        this.events.push({ type: 'set', value, at });
    }

    linearRampToValueAtTime(value, at) {
        this.events.push({ type: 'linear', value, at });
    }

    exponentialRampToValueAtTime(value, at) {
        this.events.push({ type: 'expo', value, at });
    }
}

class FakeGainNode {
    constructor() {
        this.gain = new FakeAudioParam();
        this.connections = [];
    }

    connect(target) {
        this.connections.push(target);
    }
}

class FakeOscillatorNode {
    constructor(context) {
        this.context = context;
        this.type = 'sine';
        this.frequency = new FakeAudioParam();
        this.connections = [];
    }

    connect(target) {
        this.connections.push(target);
    }

    start(at) {
        this.context.started.push(at);
    }

    stop(at) {
        this.context.stopped.push(at);
    }
}

class FakeAudioContext {
    constructor() {
        this.state = 'suspended';
        this.currentTime = 1;
        this.destination = {};
        this.started = [];
        this.stopped = [];
        this.oscillatorCount = 0;
        this.closed = false;
        this.resumeCalls = 0;
        this.gainNodes = [];
        this.oscillatorNodes = [];
    }

    createGain() {
        const node = new FakeGainNode();
        this.gainNodes.push(node);
        return node;
    }

    createOscillator() {
        this.oscillatorCount += 1;
        const node = new FakeOscillatorNode(this);
        this.oscillatorNodes.push(node);
        return node;
    }

    resume() {
        this.resumeCalls += 1;
        this.state = 'running';
        return Promise.resolve();
    }

    close() {
        this.closed = true;
        this.state = 'closed';
        return Promise.resolve();
    }
}

test('ses tercihini localStorage içinde saklar', async () => {
    const storage = new FakeStorage();
    const manager = new SoundManager({
        storage,
        audioContextFactory: () => new FakeAudioContext()
    });

    assert.equal(manager.isEnabled(), true);

    await manager.setEnabled(false);
    assert.equal(storage.getItem(SOUND_PREFERENCE_KEY), '0');

    await manager.setEnabled(true);
    assert.equal(storage.getItem(SOUND_PREFERENCE_KEY), '1');
});

test('başlangıç ekranından önce ses çalmaz ve kapalıyken sessiz kalır', async () => {
    const contexts = [];
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => {
            const context = new FakeAudioContext();
            contexts.push(context);
            return context;
        }
    });

    assert.equal(manager.playDiceRoll(), false);
    assert.equal(contexts.length, 0);

    await manager.activateFromUserGesture();
    assert.equal(contexts.length, 1);

    const firstContext = contexts[0];
    assert.equal(firstContext.resumeCalls, 1);
    assert.equal(manager.playDiceRoll(), true);
    const playedOscillators = firstContext.oscillatorCount;
    assert.ok(playedOscillators > 0);

    await manager.setEnabled(false);
    assert.equal(firstContext.closed, true);
    assert.equal(manager.playDiceRoll(), false);
    assert.equal(firstContext.oscillatorCount, playedOscillators);
});

test('aynı olay için ses iki kez üst üste çalmaz', () => {
    let now = 1000;
    const context = new FakeAudioContext();
    context.state = 'running';
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        getNow: () => now
    });

    manager.activateFromUserGesture();

    assert.equal(manager.playInvalidMove(), true);
    const afterFirstPlay = context.oscillatorCount;
    assert.ok(afterFirstPlay > 0);

    assert.equal(manager.playInvalidMove(), false);
    assert.equal(context.oscillatorCount, afterFirstPlay);

    now += 150;
    assert.equal(manager.playInvalidMove(), true);
    assert.ok(context.oscillatorCount > afterFirstPlay);
});

test('suspended context user gesture ile resume edilir ve ses zinciri destinationa baglanir', async () => {
    const context = new FakeAudioContext();
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context
    });

    const unlocked = await manager.activateFromUserGesture();
    assert.equal(unlocked, true);
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.state, 'running');

    const played = manager.playDiceRoll();
    assert.equal(played, true);
    assert.ok(context.oscillatorNodes.length > 0);

    const masterGain = context.gainNodes[0];
    assert.ok(masterGain);
    assert.equal(masterGain.connections[0], context.destination);
    assert.ok(masterGain.gain.value >= 0.18);
    assert.ok(masterGain.gain.value <= 0.2);

    const firstPulseGain = context.gainNodes[1];
    const firstOscillator = context.oscillatorNodes[0];
    assert.equal(firstOscillator.connections[0], firstPulseGain);
    assert.equal(firstPulseGain.connections[0], masterGain);

    const linearEvents = firstPulseGain.gain.events.filter(
        event => event.type === 'linear'
    );
    assert.ok(linearEvents.length > 0);
    assert.ok(linearEvents[0].value > 0.05);
});

test('ses acma dugmesi oyun baslamadan da context kilidini acabilir', async () => {
    const context = new FakeAudioContext();
    const manager = new SoundManager({
        storage: new FakeStorage({ [SOUND_PREFERENCE_KEY]: '0' }),
        audioContextFactory: () => context
    });

    assert.equal(manager.isEnabled(), false);
    assert.equal(manager.playPiecePlace(), false);

    await manager.toggleEnabled({ fromUserGesture: true });
    assert.equal(manager.isEnabled(), true);
    assert.equal(context.resumeCalls, 1);

    // Oyun daha baslamadigi icin hala sessiz olmali.
    assert.equal(manager.playPiecePlace(), false);

    await manager.activateFromUserGesture();
    assert.equal(manager.playPiecePlace(), true);
});

test('localStorage string false degeri sesi kapali olarak yorumlanir', () => {
    const manager = new SoundManager({
        storage: new FakeStorage({ [SOUND_PREFERENCE_KEY]: 'false' }),
        audioContextFactory: () => new FakeAudioContext()
    });

    assert.equal(manager.isEnabled(), false);
});

test('ses acma dogrulama sesi belirgin ve 150-200 ms araligindadir', async () => {
    const context = new FakeAudioContext();
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context
    });

    await manager.activateFromUserGesture();

    const played = manager.playToggleOnConfirm();
    assert.equal(played, true);
    assert.ok(context.started.length >= 2);
    assert.ok(context.stopped.length >= 2);

    const totalDuration = Math.max(...context.stopped) - Math.min(...context.started) - 0.02;
    assert.ok(totalDuration >= 0.15);
    assert.ok(totalDuration <= 0.2);

    const pulseGains = context.gainNodes.slice(1);
    const peakValues = pulseGains
        .flatMap(node => node.gain.events)
        .filter(event => event.type === 'linear')
        .map(event => event.value);
    assert.ok(peakValues.some(value => value >= 0.25));
});
