import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SoundManager,
    SOUND_PREFERENCE_KEY,
    SOUND_VOLUME_PREFERENCE_KEY,
    DEFAULT_SOUND_VOLUME,
    MAX_CONCURRENT_BUFFER_SOURCES,
    normalizeSoundVolume
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

class FakeBufferSourceNode {
    constructor(context) {
        this.context = context;
        this.buffer = null;
        this.playbackRate = new FakeAudioParam();
        this.connections = [];
        this.started = false;
        this.startArgs = null;
        this.onended = null;
        this.stopped = false;
    }

    connect(target) {
        this.connections.push(target);
    }

    start(when = 0, offset = 0) {
        this.started = true;
        this.startArgs = { when, offset };
        this.context.bufferSourceStarts += 1;
    }

    stop() {
        this.stopped = true;
        this.onended?.();
    }
}

class FakeDynamicsCompressorNode {
    constructor() {
        this.threshold = new FakeAudioParam();
        this.knee = new FakeAudioParam();
        this.ratio = new FakeAudioParam();
        this.attack = new FakeAudioParam();
        this.release = new FakeAudioParam();
        this.connections = [];
    }

    connect(target) {
        this.connections.push(target);
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
        this.bufferSourceNodes = [];
        this.bufferSourceStarts = 0;
        this.compressorNodes = [];
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

    createBufferSource() {
        const node = new FakeBufferSourceNode(this);
        this.bufferSourceNodes.push(node);
        return node;
    }

    createDynamicsCompressor() {
        const node = new FakeDynamicsCompressorNode();
        this.compressorNodes.push(node);
        return node;
    }

    decodeAudioData() {
        return Promise.resolve({ duration: 0.4 });
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

test('ses tercihini localStorage icinde saklar', async () => {
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

test('ses seviyesi normalize edilir, saklanir ve canli master gain uzerine uygulanir', async () => {
    const storage = new FakeStorage({ [SOUND_VOLUME_PREFERENCE_KEY]: '0.4' });
    const context = new FakeAudioContext();
    const manager = new SoundManager({ storage, audioContextFactory: () => context });

    assert.equal(manager.getVolume(), 0.4);
    await manager.ensureContextFromUserGesture();
    assert.equal(context.gainNodes[0].gain.value, 0.68 * 0.4);

    assert.equal(manager.setVolume(0.9), 0.9);
    assert.equal(storage.getItem(SOUND_VOLUME_PREFERENCE_KEY), '0.9');
    assert.equal(context.gainNodes[0].gain.value, 0.68 * 0.9);
    assert.equal(normalizeSoundVolume(-2), 0);
    assert.equal(normalizeSoundVolume(4), 1);
    assert.equal(normalizeSoundVolume('not-a-number'), DEFAULT_SOUND_VOLUME);
});

test('baslangic ekranindan once ses calmaz ve kapaliyken sessiz kalir', async () => {
    const contexts = [];
    const loaderCalls = [];
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => {
            const context = new FakeAudioContext();
            contexts.push(context);
            return context;
        },
        recordedBufferLoader: ({ soundKey, sourcePath }) => {
            loaderCalls.push({ soundKey, sourcePath });
            return Promise.resolve({ duration: 0.42 });
        }
    });

    assert.equal(manager.playDiceRoll(), false);
    assert.equal(contexts.length, 0);

    await manager.ensureContextFromUserGesture();
    assert.equal(contexts.length, 1);

    const firstContext = contexts[0];
    assert.equal(firstContext.resumeCalls, 1);
    await manager.preloadRecordedSounds();
    assert.equal(loaderCalls.length, 2);

    assert.equal(manager.playDiceRoll(), false);

    await manager.activateFromUserGesture();
    assert.equal(manager.playPiecePlace(), true);
    const playedSources = firstContext.bufferSourceStarts;
    assert.ok(playedSources > 0);
    assert.ok(firstContext.bufferSourceNodes[0].startArgs.offset > 0);

    await manager.setEnabled(false);
    assert.equal(firstContext.closed, true);
    assert.equal(manager.playDiceRoll(), false);
    assert.equal(firstContext.bufferSourceStarts, playedSources);
});

test('ayni olay icin ses iki kez ust uste calmaz', async () => {
    let now = 1000;
    const context = new FakeAudioContext();
    context.state = 'running';
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        getNow: () => now
    });

    await manager.activateFromUserGesture();

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
    const managerLoader = [];
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: ({ soundKey, sourcePath, sourceUrl }) => {
            managerLoader.push({ soundKey, sourcePath, sourceUrl });
            return Promise.resolve({ duration: 0.4 });
        }
    });

    const unlocked = await manager.activateFromUserGesture();
    assert.equal(unlocked, true);
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.state, 'running');
    await manager.preloadRecordedSounds();

    const played = manager.playDiceRoll();
    assert.equal(played, true);
    assert.ok(context.bufferSourceStarts > 0);
    assert.ok(managerLoader.some(call =>
        call.soundKey === 'diceRoll' &&
        call.sourcePath.includes('dice-roll-on-wood')
    ));
    assert.ok(managerLoader.some(call =>
        call.soundKey === 'woodHit' &&
        call.sourcePath.includes('wood-hit-432148')
    ));
    assert.ok(managerLoader.every(call =>
        call.sourceUrl.includes('/assets/sounds/')
    ));

    const masterGain = context.gainNodes[0];
    assert.ok(masterGain);
    assert.ok(masterGain.gain.value >= 0.6);
    assert.ok(masterGain.gain.value <= 0.75);

    const limiter = context.compressorNodes[0];
    assert.ok(limiter);
    assert.equal(masterGain.connections[0], limiter);
    assert.equal(limiter.connections[0], context.destination);
    assert.equal(limiter.threshold.value, -9);
    assert.equal(limiter.knee.value, 12);
    assert.equal(limiter.ratio.value, 16);

    const firstPlaybackGain = context.gainNodes[1];
    const firstBufferSource = context.bufferSourceNodes[0];
    assert.equal(firstBufferSource.connections[0], firstPlaybackGain);
    assert.equal(firstPlaybackGain.connections[0], masterGain);
    assert.equal(firstBufferSource.startArgs.when, context.currentTime);
    assert.ok(firstBufferSource.startArgs.offset > 0);
    assert.ok(firstBufferSource.startArgs.offset < 0.02);

    const rateSetEvent = firstBufferSource.playbackRate.events.find(
        event => event.type === 'set'
    );
    assert.ok(rateSetEvent);
    assert.ok(rateSetEvent.value >= 0.85);
    assert.ok(rateSetEvent.value <= 1.25);
});

test('pul sesi move id bazli tek kez calar ve iptal/undo/gecersiz akislari sessiz kalir', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.4 }),
        random: () => 0.5
    });

    await manager.activateFromUserGesture();

    const played = manager.playPiecePlaceForMove({
        moveId: 42,
        isCollect: false
    });
    assert.equal(played, true);

    const afterFirst = context.bufferSourceStarts;
    assert.ok(afterFirst > 0);

    assert.equal(
        manager.playPiecePlaceForMove({ moveId: 42, isCollect: true }),
        false
    );
    assert.equal(
        manager.playPiecePlaceForMove({
            moveId: 43,
            wasCanceled: true
        }),
        false
    );
    assert.equal(
        manager.playPiecePlaceForMove({
            moveId: 44,
            wasUndo: true
        }),
        false
    );
    assert.equal(
        manager.playPiecePlaceForMove({
            moveId: 45,
            wasInvalid: true
        }),
        false
    );

    assert.equal(context.bufferSourceStarts, afterFirst);
});

test('buffer hazir degilse gecikmeli gec-calis engellenir', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';

    let resolveLoader;
    const loader = new Promise(resolve => {
        resolveLoader = resolve;
    });

    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: ({ soundKey }) => {
            if (soundKey === 'woodHit') {
                return loader;
            }
            return Promise.resolve({ duration: 0.4 });
        }
    });

    await manager.activateFromUserGesture();

    const playedImmediately = manager.playPiecePlace();
    assert.equal(playedImmediately, false);
    assert.equal(context.bufferSourceStarts, 0);

    resolveLoader({ duration: 0.25 });
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(context.bufferSourceStarts, 0);
});

test('ses acma dugmesi oyun baslamadan da context kilidini acabilir', async () => {
    const context = new FakeAudioContext();
    const manager = new SoundManager({
        storage: new FakeStorage({ [SOUND_PREFERENCE_KEY]: '0' }),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.3 })
    });

    assert.equal(manager.isEnabled(), false);
    assert.equal(manager.playPiecePlace(), false);

    await manager.toggleEnabled({ fromUserGesture: true });
    assert.equal(manager.isEnabled(), true);
    assert.equal(context.resumeCalls, 1);

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

test('ses kapaliyken kayitli ses dosyalari yuklenmez ve etkinlestirince yuklenir', async () => {
    const calls = [];
    const manager = new SoundManager({
        storage: new FakeStorage({ [SOUND_PREFERENCE_KEY]: '0' }),
        audioContextFactory: () => new FakeAudioContext(),
        recordedBufferLoader: ({ soundKey, sourcePath }) => {
            calls.push({ soundKey, sourcePath });
            return Promise.resolve({ duration: 0.4 });
        }
    });

    await manager.activateFromUserGesture();
    assert.equal(calls.length, 0);

    await manager.toggleEnabled({ fromUserGesture: true });
    await manager.preloadRecordedSounds();

    assert.equal(calls.length, 2);
    assert.ok(calls.some(call => call.soundKey === 'diceRoll'));
    assert.ok(calls.some(call => call.soundKey === 'woodHit'));
});

test('preload cache tekrar kullaniminda ayni kayitli buffer icin ikinci kez decode istemez', async () => {
    let loadCount = 0;
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => new FakeAudioContext(),
        recordedBufferLoader: ({ soundKey }) => {
            loadCount += 1;
            return Promise.resolve({ soundKey, duration: 0.4 });
        }
    });

    await manager.activateFromUserGesture();
    assert.equal(loadCount, 2);
    const firstBuffer = await manager.loadRecordedSoundBuffer('woodHit');
    const secondBuffer = await manager.loadRecordedSoundBuffer('woodHit');

    assert.equal(loadCount, 2);
    assert.equal(firstBuffer, secondBuffer);
});

test('aynı roll tokeni zar sesini tekrar tetiklemez', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';
    let now = 1000;
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.4 }),
        random: () => 0.5,
        getNow: () => now
    });

    await manager.activateFromUserGesture();

    assert.equal(manager.playDiceRollForRoll({ rollId: 101 }), true);
    const firstStarts = context.bufferSourceStarts;
    assert.ok(firstStarts > 0);

    assert.equal(manager.playDiceRollForRoll({ rollId: 101 }), false);
    assert.equal(context.bufferSourceStarts, firstStarts);

    now += 130;
    assert.equal(manager.playDiceRollForRoll({ rollId: 102 }), true);
    assert.ok(context.bufferSourceStarts > firstStarts);
});

test('tek roll olayi icinde ses motoru iki zarin birlesik darbesini uretir', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';
    let now = 800;
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.4 }),
        random: () => 0.5,
        getNow: () => now
    });

    await manager.activateFromUserGesture();

    const played = manager.playDiceRollForRoll({ rollId: 901 });
    assert.equal(played, true);
    assert.equal(context.bufferSourceStarts, 2);

    const [firstHit, secondHit] = context.bufferSourceNodes;
    assert.ok(firstHit);
    assert.ok(secondHit);
    assert.ok(secondHit.startArgs.when > firstHit.startArgs.when);
    assert.ok(secondHit.startArgs.when - firstHit.startArgs.when <= 0.05);

    const firstRate = firstHit.playbackRate.events.find(event => event.type === 'set')?.value;
    const secondRate = secondHit.playbackRate.events.find(event => event.type === 'set')?.value;
    assert.notEqual(firstRate, undefined);
    assert.notEqual(secondRate, undefined);
    assert.notEqual(firstRate, secondRate);
});

test('pul sesi trim offseti leading silence bolgesini atlar', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.5 }),
        random: () => 0.5
    });

    await manager.activateFromUserGesture();

    const played = manager.playPiecePlace();
    assert.equal(played, true);

    const source = context.bufferSourceNodes.at(-1);
    assert.ok(source);
    assert.ok(source.startArgs.offset >= 0.15);
    assert.ok(source.startArgs.offset <= 0.19);
});

test('Safari interrupted context yalnız kullanıcı hareketiyle güvenli biçimde devam eder', async () => {
    const context = new FakeAudioContext();
    context.state = 'interrupted';
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.4 })
    });

    assert.equal(await manager.activateFromUserGesture(), true);
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.state, 'running');
});

test('eşzamanlı kayıtlı sesler sınırlanır ve kapatmada kaynaklar durdurulur', async () => {
    const context = new FakeAudioContext();
    context.state = 'running';
    let now = 0;
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => context,
        recordedBufferLoader: () => Promise.resolve({ duration: 0.4 }),
        random: () => 0.5,
        getNow: () => now
    });

    await manager.activateFromUserGesture();
    await manager.preloadRecordedSounds();
    for (let index = 0; index < 20; index += 1) {
        now += 100;
        manager.playPiecePlace();
    }

    assert.equal(context.bufferSourceNodes.length, MAX_CONCURRENT_BUFFER_SOURCES);
    await manager.setEnabled(false);
    assert.ok(context.bufferSourceNodes.every(source => source.stopped));
});

test('preload hata senaryosu başarılı sesleri korur ve çağıranı reddetmez', async () => {
    const manager = new SoundManager({
        storage: new FakeStorage(),
        audioContextFactory: () => new FakeAudioContext(),
        recordedBufferLoader: ({ soundKey }) => {
            if (soundKey === 'woodHit') return Promise.reject(new Error('decode'));
            return Promise.resolve({ duration: 0.4 });
        }
    });

    await manager.activateFromUserGesture();
    await assert.doesNotReject(() => manager.preloadRecordedSounds());
    assert.ok(manager.recordedBuffers.has('diceRoll'));
    assert.equal(manager.recordedBuffers.has('woodHit'), false);
});
