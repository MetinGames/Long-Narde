import test from 'node:test';
import assert from 'node:assert/strict';

import {
    AUTHORITATIVE_GAME_EVENT,
    InMemoryPrivateTableAdapter,
    MEMBER_STATUS,
    PRIVATE_TABLE_PROTOCOL_VERSION,
    PrivateTableProtocolError,
    ROOM_STATUS,
    TABLE_COMMAND,
    TABLE_EVENT,
    createPrivateTableCommand
} from '../engine/privateTableProtocol.js';

function createHarness() {
    let now = 1_000;
    let idSequence = 0;
    let commandSequence = 0;
    const adapter = new InMemoryPrivateTableAdapter({
        clock: () => now,
        idFactory: prefix => `${prefix}-${++idSequence}`,
        inviteLifetimeMs: 500
    });

    const command = options => createPrivateTableCommand({
        commandId: `command-${++commandSequence}`,
        ...options
    });

    const createRoom = () => adapter.dispatch(command({
        type: TABLE_COMMAND.CREATE_ROOM,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        payload: {
            identity: {
                id: 'host',
                displayName: 'Host',
                avatarId: 'avatar-anatolia',
                rating: 9_999
            }
        }
    }));

    const createInvite = revision => adapter.dispatch(command({
        type: TABLE_COMMAND.CREATE_INVITE,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: revision
    }));

    const joinGuest = (revision, inviteToken, options = {}) =>
        adapter.dispatch(command({
            type: TABLE_COMMAND.JOIN_ROOM,
            roomId: 'room-one',
            actorId: options.actorId ?? 'guest',
            sessionId: options.sessionId ?? 'guest-session',
            expectedRevision: revision,
            payload: {
                inviteToken,
                identity: {
                    id: options.actorId ?? 'guest',
                    displayName: options.displayName ?? 'Guest',
                    avatarId: 'avatar-copper'
                }
            }
        }));

    return {
        adapter,
        command,
        createRoom,
        createInvite,
        joinGuest,
        advanceTime(milliseconds) {
            now += milliseconds;
        }
    };
}

function expectProtocolError(action, code) {
    assert.throws(action, error => {
        assert.ok(error instanceof PrivateTableProtocolError);
        assert.equal(error.code, code);
        return true;
    });
}

function setReady(harness, actorId, sessionId, revision, ready = true) {
    return harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.SET_READY,
        roomId: 'room-one',
        actorId,
        sessionId,
        expectedRevision: revision,
        payload: { ready }
    }));
}

function buildActiveRoom() {
    const harness = createHarness();
    const created = harness.createRoom();
    const invited = harness.createInvite(created.snapshot.revision);
    const joined = harness.joinGuest(
        invited.snapshot.revision,
        invited.invitation.inviteToken
    );
    const hostReady = setReady(
        harness,
        'host',
        'host-session',
        joined.snapshot.revision
    );
    const guestReady = setReady(
        harness,
        'guest',
        'guest-session',
        hostReady.snapshot.revision
    );
    const started = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.START_MATCH,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: guestReady.snapshot.revision
    }));

    return { harness, started };
}

test('room creation returns a versioned server snapshot with local identity only', () => {
    const harness = createHarness();
    const result = harness.createRoom();

    assert.equal(result.replayed, false);
    assert.equal(result.snapshot.version, PRIVATE_TABLE_PROTOCOL_VERSION);
    assert.equal(result.snapshot.authority, 'server');
    assert.equal(result.snapshot.status, ROOM_STATUS.LOBBY);
    assert.equal(result.snapshot.revision, 1);
    assert.equal(result.events[0].type, TABLE_EVENT.ROOM_CREATED);
    assert.equal(result.events[0].eventSequence, 1);
    assert.deepEqual(result.snapshot.members[0].identity, {
        id: 'host',
        displayName: 'Host',
        avatarId: 'avatar-anatolia'
    });
    assert.ok(result.snapshot.self.resumeToken);
    assert.equal('rating' in result.snapshot.members[0].identity, false);
});

test('private-table lifecycle covers invite, join, ready, active, leave, and close', () => {
    const { harness, started } = buildActiveRoom();

    assert.equal(started.snapshot.status, ROOM_STATUS.ACTIVE);
    assert.equal(started.snapshot.revision, 6);
    assert.equal(started.events[0].type, TABLE_EVENT.MATCH_STARTED);
    assert.deepEqual(
        started.snapshot.members.map(member => member.status),
        [MEMBER_STATUS.READY, MEMBER_STATUS.READY]
    );

    const left = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.LEAVE_ROOM,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session',
        expectedRevision: started.snapshot.revision
    }));
    assert.equal(left.events[0].type, TABLE_EVENT.MEMBER_LEFT);
    assert.equal(
        left.snapshot.members.find(member => member.identity.id === 'guest').status,
        MEMBER_STATUS.LEFT
    );

    const closed = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.CLOSE_ROOM,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: left.snapshot.revision,
        payload: { reason: 'host_finished' }
    }));
    assert.equal(closed.snapshot.status, ROOM_STATUS.CLOSED);
    assert.equal(closed.events[0].type, TABLE_EVENT.ROOM_CLOSED);
    assert.equal(closed.snapshot.lastEventSequence, 8);
});

test('a match cannot start until exactly two active members are ready', () => {
    const harness = createHarness();
    const created = harness.createRoom();

    expectProtocolError(() => harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.START_MATCH,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: created.snapshot.revision
    })), 'members_not_ready');

    assert.equal(harness.adapter.getSnapshot('room-one').revision, 1);
});

test('idempotent command retry returns the original result without a second event', () => {
    const harness = createHarness();
    const created = harness.createRoom();
    const notifications = [];
    harness.adapter.subscribe('room-one', result => notifications.push(result));
    const inviteCommand = harness.command({
        type: TABLE_COMMAND.CREATE_INVITE,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: created.snapshot.revision
    });

    const first = harness.adapter.dispatch(inviteCommand);
    const retry = harness.adapter.dispatch(inviteCommand);

    assert.equal(first.replayed, false);
    assert.equal(retry.replayed, true);
    assert.deepEqual(retry.invitation, first.invitation);
    assert.deepEqual(retry.events, first.events);
    assert.equal(harness.adapter.getSnapshot('room-one').revision, 2);
    assert.equal(notifications.length, 1);
});

test('idempotency keys are actor-scoped and reject conflicting reuse', () => {
    const harness = createHarness();
    const firstCommand = createPrivateTableCommand({
        commandId: 'shared-key',
        type: TABLE_COMMAND.CREATE_ROOM,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        payload: {
            identity: {
                id: 'host',
                displayName: 'Host',
                avatarId: 'avatar-anatolia'
            }
        }
    });
    harness.adapter.dispatch(firstCommand);

    expectProtocolError(() => harness.adapter.dispatch({
        ...firstCommand,
        roomId: 'room-different'
    }), 'idempotency_conflict');

    const otherActor = harness.adapter.dispatch(createPrivateTableCommand({
        commandId: 'shared-key',
        type: TABLE_COMMAND.CREATE_ROOM,
        roomId: 'room-two',
        actorId: 'guest',
        sessionId: 'guest-session',
        payload: {
            identity: {
                id: 'guest',
                displayName: 'Guest',
                avatarId: 'avatar-copper'
            }
        }
    }));
    assert.equal(otherActor.replayed, false);
    assert.equal(otherActor.snapshot.roomId, 'room-two');
});

test('stale room revisions are rejected before state can diverge', () => {
    const harness = createHarness();
    const created = harness.createRoom();
    setReady(harness, 'host', 'host-session', created.snapshot.revision);

    expectProtocolError(() => harness.createInvite(created.snapshot.revision), 'stale_revision');
    assert.equal(harness.adapter.getSnapshot('room-one').revision, 2);
});

test('expired and already-used invites cannot create another membership', () => {
    const expiredHarness = createHarness();
    const created = expiredHarness.createRoom();
    const invitation = expiredHarness.createInvite(created.snapshot.revision);
    expiredHarness.advanceTime(501);

    expectProtocolError(() => expiredHarness.joinGuest(
        invitation.snapshot.revision,
        invitation.invitation.inviteToken
    ), 'invalid_invite');

    const usedHarness = createHarness();
    const usedCreated = usedHarness.createRoom();
    const usedInvitation = usedHarness.createInvite(usedCreated.snapshot.revision);
    const joined = usedHarness.joinGuest(
        usedInvitation.snapshot.revision,
        usedInvitation.invitation.inviteToken
    );

    expectProtocolError(() => usedHarness.joinGuest(
        joined.snapshot.revision,
        usedInvitation.invitation.inviteToken,
        {
            actorId: 'third-player',
            sessionId: 'third-session',
            displayName: 'Third'
        }
    ), 'invalid_invite');
});

test('disconnect and resume restore a snapshot while rotating session authority', () => {
    const { harness, started } = buildActiveRoom();
    const oldResumeToken = harness.adapter
        .getSnapshot('room-one', 'guest')
        .self.resumeToken;
    const disconnected = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.DISCONNECT,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session',
        expectedRevision: started.snapshot.revision
    }));
    assert.equal(
        disconnected.snapshot.members.find(
            member => member.identity.id === 'guest'
        ).status,
        MEMBER_STATUS.DISCONNECTED
    );

    const resumed = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.RESUME,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session-2',
        expectedRevision: disconnected.snapshot.revision,
        payload: { resumeToken: oldResumeToken }
    }));

    assert.equal(resumed.events[0].type, TABLE_EVENT.MEMBER_RESUMED);
    assert.equal(resumed.snapshot.status, ROOM_STATUS.ACTIVE);
    assert.equal(resumed.snapshot.lastEventSequence, 8);
    assert.equal(
        resumed.snapshot.members.find(member => member.identity.id === 'guest').status,
        MEMBER_STATUS.READY
    );
    assert.notEqual(resumed.snapshot.self.resumeToken, oldResumeToken);

    expectProtocolError(() => harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.REQUEST_ROLL,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session',
        expectedRevision: resumed.snapshot.revision
    })), 'stale_session');
});

test('invalid resume tokens are rejected without changing the room', () => {
    const { harness, started } = buildActiveRoom();
    const disconnected = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.DISCONNECT,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session',
        expectedRevision: started.snapshot.revision
    }));

    expectProtocolError(() => harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.RESUME,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session-2',
        expectedRevision: disconnected.snapshot.revision,
        payload: { resumeToken: 'wrong-token' }
    })), 'invalid_resume_token');
    assert.equal(harness.adapter.getSnapshot('room-one').revision, 7);
});

test('only the host can create invites, start matches, and close rooms', () => {
    const harness = createHarness();
    const created = harness.createRoom();
    const invited = harness.createInvite(created.snapshot.revision);
    const joined = harness.joinGuest(
        invited.snapshot.revision,
        invited.invitation.inviteToken
    );

    expectProtocolError(() => harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.CREATE_INVITE,
        roomId: 'room-one',
        actorId: 'guest',
        sessionId: 'guest-session',
        expectedRevision: joined.snapshot.revision
    })), 'host_required');
    assert.equal(harness.adapter.getSnapshot('room-one').revision, 3);
});

test('game commands remain intents and cannot claim dice, results, or ratings', () => {
    const { harness, started } = buildActiveRoom();

    expectProtocolError(() => createPrivateTableCommand({
        commandId: 'forged-roll',
        type: TABLE_COMMAND.REQUEST_ROLL,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: started.snapshot.revision,
        payload: { diceValues: [6, 6] }
    }), 'untrusted_outcome');

    const intent = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.REQUEST_MOVE,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: started.snapshot.revision,
        payload: { clientIntentId: 'move-intent-one' }
    }));

    assert.equal(intent.events[0].type, TABLE_EVENT.GAME_INTENT_RECEIVED);
    assert.equal(intent.events[0].authority, 'server');
    assert.equal(intent.events[0].payload.intentType, TABLE_COMMAND.REQUEST_MOVE);
    assert.equal(
        Object.values(AUTHORITATIVE_GAME_EVENT).includes(intent.events[0].type),
        false
    );
});

test('mute, block, and report stay actor-scoped in the local safety seam', () => {
    const harness = createHarness();
    const created = harness.createRoom();
    const invited = harness.createInvite(created.snapshot.revision);
    const joined = harness.joinGuest(
        invited.snapshot.revision,
        invited.invitation.inviteToken
    );
    const muted = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.MUTE_MEMBER,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: joined.snapshot.revision,
        payload: { targetId: 'guest' }
    }));
    const blocked = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.BLOCK_MEMBER,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: muted.snapshot.revision,
        payload: { targetId: 'guest' }
    }));
    const reported = harness.adapter.dispatch(harness.command({
        type: TABLE_COMMAND.REPORT_MEMBER,
        roomId: 'room-one',
        actorId: 'host',
        sessionId: 'host-session',
        expectedRevision: blocked.snapshot.revision,
        payload: { targetId: 'guest', category: 'harassment' }
    }));

    assert.deepEqual(reported.snapshot.self.mutedActorIds, ['guest']);
    assert.deepEqual(reported.snapshot.self.blockedActorIds, ['guest']);
    assert.deepEqual(
        harness.adapter.getSnapshot('room-one', 'guest').self,
        {
            resumeToken: harness.adapter
                .getSnapshot('room-one', 'guest')
                .self.resumeToken,
            mutedActorIds: [],
            blockedActorIds: []
        }
    );
    assert.equal(reported.events[0].type, TABLE_EVENT.MEMBER_REPORTED);
    assert.ok(reported.reportId);
});

test('subscriptions can be removed and receive no replay notifications', () => {
    const harness = createHarness();
    const created = harness.createRoom();
    let notifications = 0;
    const unsubscribe = harness.adapter.subscribe('room-one', () => {
        notifications += 1;
    });
    const invite = harness.createInvite(created.snapshot.revision);
    unsubscribe();
    harness.joinGuest(
        invite.snapshot.revision,
        invite.invitation.inviteToken
    );

    assert.equal(notifications, 1);
});
