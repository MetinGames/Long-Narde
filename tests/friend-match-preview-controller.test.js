import test from 'node:test';
import assert from 'node:assert/strict';

import {
    FRIEND_PREVIEW_ACTION,
    FRIEND_PREVIEW_STAGE,
    FriendMatchPreviewController,
    getFriendPreviewErrorKey
} from '../engine/friendMatchPreviewController.js';
import {
    InMemoryPrivateTableAdapter,
    PrivateTableProtocolError
} from '../engine/privateTableProtocol.js';

function createAdapter() {
    let idSequence = 0;
    let now = 1_000;
    return new InMemoryPrivateTableAdapter({
        clock: () => now++,
        idFactory: prefix => `${prefix}-${++idSequence}`
    });
}

function createController(options = {}) {
    let sessionSequence = 0;
    const adapter = options.adapter || createAdapter();
    const controller = new FriendMatchPreviewController({
        adapter,
        identityStore: options.identityStore || {
            getPrivateTableIdentity() {
                return {
                    id: 'local-host-player',
                    displayName: 'Metin Usta',
                    avatarId: 'avatar-eagle'
                };
            }
        },
        sessionIdFactory: prefix => `${prefix}-${++sessionSequence}`,
        translate: options.translate || (key => `translated:${key}`),
        elements: options.elements || {},
        onStateChange: options.onStateChange
    });
    controller.start();
    return { adapter, controller };
}

test('local preview drives the complete room, reconnect, leave, and close lifecycle', () => {
    const { adapter, controller } = createController();

    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.EMPTY);
    assert.equal(controller.getState().nextAction, FRIEND_PREVIEW_ACTION.CREATE_ROOM);

    const expectedStages = [
        FRIEND_PREVIEW_STAGE.ROOM_CREATED,
        FRIEND_PREVIEW_STAGE.INVITE_CREATED,
        FRIEND_PREVIEW_STAGE.FRIEND_JOINED,
        FRIEND_PREVIEW_STAGE.HOST_READY,
        FRIEND_PREVIEW_STAGE.BOTH_READY,
        FRIEND_PREVIEW_STAGE.ACTIVE,
        FRIEND_PREVIEW_STAGE.DISCONNECTED,
        FRIEND_PREVIEW_STAGE.RESUMED,
        FRIEND_PREVIEW_STAGE.FRIEND_LEFT,
        FRIEND_PREVIEW_STAGE.CLOSED
    ];

    for (const expectedStage of expectedStages) {
        assert.equal(controller.advance(), true);
        assert.equal(controller.getState().stage, expectedStage);
    }

    const { roomId, snapshot } = controller.getState();
    assert.equal(snapshot.status, 'closed');
    assert.equal(snapshot.revision, 10);
    assert.equal(snapshot.authority, 'server');
    assert.deepEqual(snapshot.members[0].identity, {
        id: 'local-host-player',
        displayName: 'Metin Usta',
        avatarId: 'avatar-eagle'
    });
    assert.deepEqual(snapshot.members[1].identity, {
        id: 'local-preview-friend',
        displayName: 'Nardora Friend',
        avatarId: 'avatar-robot'
    });
    assert.equal('rating' in snapshot.members[0].identity, false);
    assert.equal(adapter.getSnapshot(roomId).lastEventSequence, 10);

    assert.equal(controller.advance(), true);
    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.EMPTY);
    assert.equal(controller.advance(), true);
    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.ROOM_CREATED);
    assert.notEqual(controller.getState().roomId, roomId);
});

test('reconnect rotates friend authority and recovers the latest snapshot', () => {
    const { adapter, controller } = createController();

    for (let step = 0; step < 6; step += 1) controller.advance();
    const roomId = controller.getState().roomId;
    const firstResumeToken = adapter
        .getSnapshot(roomId, 'local-preview-friend')
        .self.resumeToken;

    controller.advance();
    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.DISCONNECTED);
    assert.equal(controller.recoverLatestSnapshot().revision, 7);

    controller.advance();
    const resumed = adapter.getSnapshot(roomId, 'local-preview-friend');
    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.RESUMED);
    assert.notEqual(resumed.self.resumeToken, firstResumeToken);
    assert.equal(resumed.members[1].status, 'ready');
});

test('protocol failures map to localized keys without exposing raw adapter messages', () => {
    const liveStatus = new FakeElement();
    const adapter = {
        dispatch() {
            throw new PrivateTableProtocolError(
                'stale_session',
                'raw internal session detail'
            );
        },
        getSnapshot() {
            throw new Error('not reached');
        },
        subscribe() {
            return () => {};
        }
    };
    const { controller } = createController({
        adapter,
        elements: { liveStatus }
    });

    assert.equal(controller.createRoom(), false);
    assert.equal(
        controller.getState().lastErrorKey,
        'friendPreview.error.staleSession'
    );
    assert.equal(
        liveStatus.textContent,
        'translated:friendPreview.error.staleSession'
    );
    assert.equal(liveStatus.textContent.includes('raw internal'), false);

    assert.equal(
        getFriendPreviewErrorKey(
            new PrivateTableProtocolError('invalid_invite', 'raw')
        ),
        'friendPreview.error.invalidInvite'
    );
    assert.equal(
        getFriendPreviewErrorKey(new Error('unexpected')),
        'friendPreview.error.generic'
    );
});

class FakeDocument {
    constructor() {
        this.listeners = new Map();
        this.activeElement = null;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type, event) {
        for (const listener of this.listeners.get(type) || []) listener(event);
    }
}

class FakeElement {
    constructor(ownerDocument = null) {
        this.ownerDocument = ownerDocument;
        this.listeners = new Map();
        this.attributes = new Map();
        this.dataset = {};
        this.style = {};
        this.disabled = false;
        this.hidden = false;
        this.textContent = '';
        this.focusables = [];
        this.focusCalls = 0;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    click() {
        for (const listener of this.listeners.get('click') || []) {
            listener({ target: this, preventDefault() {} });
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    querySelectorAll() {
        return this.focusables;
    }

    focus() {
        this.focusCalls += 1;
        if (this.ownerDocument) this.ownerDocument.activeElement = this;
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

test('controller owns listeners once, traps focus, closes on Escape, and cleans up', () => {
    const doc = new FakeDocument();
    const modal = new FakeElement(doc);
    const openButton = new FakeElement(doc);
    const closeButton = new FakeElement(doc);
    const nextButton = new FakeElement(doc);
    const resetButton = new FakeElement(doc);
    modal.focusables = [closeButton, nextButton, resetButton];

    const controller = new FriendMatchPreviewController({
        adapter: createAdapter(),
        identityStore: {
            getPrivateTableIdentity: () => ({
                id: 'local-host-player',
                displayName: 'Host',
                avatarId: 'avatar-anatolia'
            })
        },
        elements: {
            modal,
            openButton,
            closeButtons: [closeButton],
            nextButton,
            resetButton
        }
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(openButton.listenerCount('click'), 1);

    openButton.click();
    assert.equal(modal.getAttribute('aria-hidden'), 'false');
    assert.equal(closeButton.focusCalls, 1);

    doc.activeElement = nextButton;
    let tabPrevented = false;
    doc.dispatch('keydown', {
        key: 'Tab',
        preventDefault() {
            tabPrevented = true;
        }
    });
    assert.equal(tabPrevented, true);
    assert.equal(closeButton.focusCalls, 2);

    let escapePrevented = false;
    doc.dispatch('keydown', {
        key: 'Escape',
        preventDefault() {
            escapePrevented = true;
        }
    });
    assert.equal(escapePrevented, true);
    assert.equal(modal.getAttribute('aria-hidden'), 'true');
    assert.equal(openButton.focusCalls, 1);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(openButton.listenerCount('click'), 0);
    assert.equal(nextButton.listenerCount('click'), 0);
});

test('stale subscription callbacks are ignored after controller stop', () => {
    const adapter = createAdapter();
    let capturedListener = null;
    const originalSubscribe = adapter.subscribe.bind(adapter);
    adapter.subscribe = (roomId, listener) => {
        capturedListener = listener;
        const unsubscribe = originalSubscribe(roomId, listener);
        return () => unsubscribe();
    };
    const changes = [];
    const { controller } = createController({
        adapter,
        onStateChange: state => changes.push(state)
    });

    controller.advance();
    const snapshotBeforeStop = controller.getState().snapshot;
    controller.stop();
    const changeCount = changes.length;

    capturedListener({
        snapshot: { ...snapshotBeforeStop, revision: 999 },
        events: []
    });

    assert.equal(controller.getState().snapshot.revision, 1);
    assert.equal(changes.length, changeCount);
});

test('controller restores exactly one room subscription after restart', () => {
    const adapter = createAdapter();
    const originalSubscribe = adapter.subscribe.bind(adapter);
    let activeSubscriptions = 0;
    let maxActiveSubscriptions = 0;

    adapter.subscribe = (roomId, listener) => {
        activeSubscriptions += 1;
        maxActiveSubscriptions = Math.max(
            maxActiveSubscriptions,
            activeSubscriptions
        );
        const unsubscribe = originalSubscribe(roomId, listener);
        return () => {
            activeSubscriptions -= 1;
            unsubscribe();
        };
    };

    const { controller } = createController({ adapter });
    controller.advance();
    assert.equal(activeSubscriptions, 1);

    controller.stop();
    assert.equal(activeSubscriptions, 0);
    controller.start();
    assert.equal(activeSubscriptions, 1);
    assert.equal(maxActiveSubscriptions, 1);

    controller.stop();
    assert.equal(activeSubscriptions, 0);
});

test('language refresh rerenders dynamic stage and action copy', () => {
    const stageTitle = new FakeElement();
    const nextButton = new FakeElement();
    let prefix = 'en';
    const { controller } = createController({
        elements: { stageTitle, nextButton },
        translate: key => `${prefix}:${key}`
    });

    assert.equal(
        stageTitle.textContent,
        'en:friendPreview.stage.empty.title'
    );
    assert.equal(
        nextButton.textContent,
        'en:friendPreview.action.create-room'
    );

    prefix = 'tr';
    controller.refreshForLanguage();
    assert.equal(
        stageTitle.textContent,
        'tr:friendPreview.stage.empty.title'
    );
    assert.equal(
        nextButton.textContent,
        'tr:friendPreview.action.create-room'
    );
});

test('missing local identity fails safely before any room is created', () => {
    const { controller } = createController({
        identityStore: {
            getPrivateTableIdentity() {
                return null;
            }
        }
    });

    assert.equal(controller.createRoom(), false);
    assert.equal(controller.getState().stage, FRIEND_PREVIEW_STAGE.EMPTY);
    assert.equal(
        controller.getState().lastErrorKey,
        'friendPreview.error.identityUnavailable'
    );
});
