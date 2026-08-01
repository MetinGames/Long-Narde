import test from 'node:test';
import assert from 'node:assert/strict';

import { createRuntimeDiagnostics } from '../engine/runtimeDiagnostics.js';

class FakeStorage {
    constructor({ throwOnGet = false, throwOnSet = false, throwOnRemove = false } = {}) {
        this.store = new Map();
        this.throwOnGet = throwOnGet;
        this.throwOnSet = throwOnSet;
        this.throwOnRemove = throwOnRemove;
        this.writes = 0;
    }

    getItem(key) {
        if (this.throwOnGet) {
            throw new Error('getItem blocked');
        }

        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        if (this.throwOnSet) {
            throw new Error('setItem blocked');
        }

        this.writes += 1;
        this.store.set(key, String(value));
    }

    removeItem(key) {
        if (this.throwOnRemove) {
            throw new Error('removeItem blocked');
        }

        this.store.delete(key);
    }
}

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
        this.style = {};
        this.attributes = new Map();
        this.removed = false;
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        this.lastAppended = child;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter(candidate => candidate !== child);
        child.parentNode = null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    focus() {}

    select() {}

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
        this.removed = true;
    }
}

class FakeDocument {
    constructor() {
        this.visibilityState = 'visible';
        this.listeners = new Map();
        this.body = new FakeElement('body');
        this.documentElement = new FakeElement('html');
        this.execCommandResult = true;
    }

    createElement(tagName) {
        return new FakeElement(tagName);
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    emit(type, event = {}) {
        this.listeners.get(type)?.(event);
    }

    execCommand(command) {
        return command === 'copy' ? this.execCommandResult : false;
    }
}

class FakeWindow {
    constructor() {
        this.listeners = new Map();
        this.innerWidth = 1280;
        this.innerHeight = 720;
        this.onLine = true;
        this.sessionStorage = new FakeStorage();
        this.clipboard = {
            writeText: async () => {
                throw new Error('clipboard blocked');
            }
        };
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    emit(type, event = {}) {
        this.listeners.get(type)?.(event);
    }
}

class FakePerformanceObserver {
    constructor(callback) {
        this.callback = callback;
        FakePerformanceObserver.instances.push(this);
    }

    observe(options) {
        this.options = options;
    }

    disconnect() {
        this.disconnected = true;
    }

    emit(entry) {
        this.callback({
            getEntries: () => [entry]
        });
    }
}

FakePerformanceObserver.instances = [];

function createClock(startAt = 0) {
    let current = startAt;
    return {
        now: () => current,
        wallClockNow: () => current,
        advance(ms) {
            current += ms;
        },
        set(value) {
            current = value;
        }
    };
}

function createTimerHarness() {
    const timeouts = [];
    const intervals = [];

    return {
        timeouts,
        intervals,
        setTimeoutRef(callback, delay) {
            const timer = { callback, delay, canceled: false };
            timeouts.push(timer);
            return timer;
        },
        clearTimeoutRef(timer) {
            timer.canceled = true;
        },
        setIntervalRef(callback, delay) {
            const timer = { callback, delay, canceled: false };
            intervals.push(timer);
            return timer;
        },
        clearIntervalRef(timer) {
            timer.canceled = true;
        }
    };
}

function createDiagnostics(options = {}) {
    const clock = createClock(options.startAt ?? 0);
    const documentRef = options.documentRef || new FakeDocument();
    const windowRef = options.windowRef || new FakeWindow();
    const timerHarness = createTimerHarness();
    const storage = options.storage ?? windowRef.sessionStorage;

    windowRef.sessionStorage = storage;

    const diagnostics = createRuntimeDiagnostics({
        storageKey: 'diagnostics-test',
        maxRecords: options.maxRecords ?? 150,
        maxReportBytes: options.maxReportBytes ?? 64 * 1024,
        now: clock.now,
        wallClockNow: clock.wallClockNow,
        setTimeoutRef: timerHarness.setTimeoutRef,
        clearTimeoutRef: timerHarness.clearTimeoutRef,
        setIntervalRef: timerHarness.setIntervalRef,
        clearIntervalRef: timerHarness.clearIntervalRef,
        documentRef,
        windowRef,
        navigatorRef: windowRef,
        performanceObserverFactory: options.performanceObserverFactory ?? null,
        getContext: options.getContext ?? (() => ({
            gameStatus: 'PLAYING',
            currentPlayer: 1,
            language: 'en',
            theme: 'walnut'
        })),
        appVersion: '1.2.3'
    });

    return {
        diagnostics,
        clock,
        documentRef,
        windowRef,
        storage,
        timerHarness
    };
}

test('runtime diagnostics uses a 150-record ring buffer', () => {
    const { diagnostics, clock } = createDiagnostics();

    for (let index = 0; index < 200; index += 1) {
        diagnostics.record('tick', { index }, {
            gameStatus: 'PLAYING',
            currentPlayer: 1,
            language: 'en',
            theme: 'walnut'
        });
        clock.advance(1);
    }

    assert.equal(diagnostics.getRecordCount(), 150);
    const records = diagnostics.getRecords();
    assert.equal(records[0].detail.includes('index=0'), false);
    assert.equal(records[records.length - 1].detail.includes('index=199'), true);
});

test('runtime diagnostics keeps exported reports under 64 KB', () => {
    const { diagnostics, clock } = createDiagnostics();
    const longDetail = 'x'.repeat(1000);

    for (let index = 0; index < 150; index += 1) {
        diagnostics.record('bulk', { index, longDetail }, {
            gameStatus: 'PLAYING',
            currentPlayer: 1,
            language: 'tr',
            theme: 'anatolian'
        });
        clock.advance(1);
    }

    const report = diagnostics.buildReport();
    assert.ok(Buffer.byteLength(report, 'utf8') <= 64 * 1024);
    assert.ok(report.includes('appVersion'));
});

test('runtime diagnostics falls back to memory when sessionStorage throws', () => {
    const storage = new FakeStorage({ throwOnGet: true, throwOnSet: true, throwOnRemove: true });
    const { diagnostics } = createDiagnostics({ storage });

    assert.doesNotThrow(() => {
        diagnostics.record('memory-only', 'ok');
    });

    assert.equal(diagnostics.getRecordCount(), 1);
    assert.ok(diagnostics.buildReport().includes('memory-only'));
});

test('runtime diagnostics debounces storage writes', () => {
    const storage = new FakeStorage();
    const { diagnostics, clock, timerHarness } = createDiagnostics({ storage });

    diagnostics.record('first', 'one');
    diagnostics.record('second', 'two');

    assert.equal(timerHarness.timeouts.length, 1);
    assert.equal(storage.writes, 0);

    clock.advance(1000);
    timerHarness.timeouts[0].callback();

    assert.equal(storage.writes, 1);

    diagnostics.record('third', 'three');
    assert.equal(timerHarness.timeouts.length, 2);
});

test('runtime diagnostics records a long stall when visible', () => {
    const { diagnostics, clock, timerHarness, documentRef } = createDiagnostics({
        performanceObserverFactory: FakePerformanceObserver
    });

    diagnostics.start();
    assert.equal(timerHarness.intervals.length, 1);
    assert.equal(FakePerformanceObserver.instances.length, 1);

    clock.advance(4001);
    timerHarness.intervals[0].callback();

    const records = diagnostics.getRecords();
    assert.equal(records.some(record => record.eventType === 'long-stall'), true);

    const before = diagnostics.getRecordCount();
    clock.advance(4001);
    timerHarness.intervals[0].callback();
    assert.equal(diagnostics.getRecordCount(), before);

    documentRef.visibilityState = 'hidden';
    clock.advance(5000);
    timerHarness.intervals[0].callback();
    assert.equal(diagnostics.getRecordCount(), before);

    diagnostics.stop();
    assert.equal(FakePerformanceObserver.instances[0].disconnected, true);
});

test('runtime diagnostics captures error and unhandled rejection events safely', () => {
    const { diagnostics, documentRef, windowRef } = createDiagnostics();

    diagnostics.start();
    documentRef.emit('visibilitychange');
    windowRef.emit('error', {
        message: 'Crash at https://example.com/app.js?token=secret',
        filename: 'https://example.com/app.js?token=secret',
        lineno: 12,
        colno: 8
    });
    windowRef.emit('unhandledrejection', {
        reason: new Error('Rejected from user@example.com')
    });

    const report = diagnostics.buildReport();
    assert.ok(report.includes('window-error'));
    assert.ok(report.includes('unhandledrejection'));
    assert.equal(report.includes('https://example.com/app.js?token=secret'), false);
    assert.equal(report.includes('user@example.com'), false);
});

test('runtime diagnostics report export does not leak full URLs or sensitive text', () => {
    const { diagnostics } = createDiagnostics();

    diagnostics.record('exportable', {
        url: 'https://example.com/path?x=1&y=2',
        email: 'test@example.com',
        note: 'safe-text'
    });

    const report = diagnostics.buildReport();
    assert.equal(report.includes('https://example.com/path?x=1&y=2'), false);
    assert.equal(report.includes('test@example.com'), false);
    assert.equal(report.includes('safe-text'), true);
});

test('runtime diagnostics does not duplicate an identical event with the same timestamp', () => {
    const { diagnostics } = createDiagnostics({ startAt: 1234 });

    diagnostics.record('focus', 'focus', {
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        language: 'en',
        theme: 'walnut'
    });
    diagnostics.record('focus', 'focus', {
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        language: 'en',
        theme: 'walnut'
    });

    assert.equal(diagnostics.getRecordCount(), 1);
});

test('runtime diagnostics clears records and copy fallback uses textarea selection', async () => {
    const { diagnostics, documentRef } = createDiagnostics();
    const clipboard = {
        writeText: async () => {
            throw new Error('clipboard unavailable');
        }
    };

    diagnostics.record('exportable', { url: 'https://example.com/path?x=1', email: 'test@example.com' });
    const beforeClear = diagnostics.getRecordCount();
    assert.equal(beforeClear, 1);

    const copied = await diagnostics.copyReportToClipboard({
        clipboard,
        documentRef,
        execCommand: command => command === 'copy'
    });

    assert.equal(copied, true);
    assert.equal(documentRef.body.children.length, 0);
    assert.equal(documentRef.body.lastAppended.removed, true);

    diagnostics.clearRecords();
    assert.equal(diagnostics.getRecordCount(), 0);
});

