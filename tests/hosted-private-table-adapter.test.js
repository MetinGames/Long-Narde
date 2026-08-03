import test from 'node:test';
import assert from 'node:assert/strict';

import {
    HostedPrivateTableAdapter,
    createSupabasePrivateTableHttpTransport
} from '../engine/hostedPrivateTableAdapter.js';
import {
    PRIVATE_TABLE_PROTOCOL_VERSION,
    PrivateTableProtocolError,
    TABLE_COMMAND
} from '../engine/privateTableProtocol.js';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const ROOM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function serverResult(options = {}) {
    const revision = options.revision ?? 1;
    return {
        replayed: options.replayed ?? false,
        events: options.events ?? [{
            version: PRIVATE_TABLE_PROTOCOL_VERSION,
            authority: 'server',
            eventId: `event-${revision}`,
            eventSequence: revision,
            roomId: ROOM_ID,
            revision,
            type: options.eventType ?? 'room_created',
            occurredAt: 1_000 + revision,
            actorId: ACTOR_ID,
            payload: {}
        }],
        snapshot: {
            version: PRIVATE_TABLE_PROTOCOL_VERSION,
            authority: 'server',
            roomId: ROOM_ID,
            revision,
            lastEventSequence: revision,
            status: options.status ?? 'lobby',
            hostId: ACTOR_ID,
            members: [],
            self: {
                resumeToken: options.resumeToken ?? null,
                mutedActorIds: [],
                blockedActorIds: []
            }
        }
    };
}

function command(options = {}) {
    return {
        commandId: options.commandId ?? 'command-one',
        type: options.type ?? TABLE_COMMAND.CREATE_ROOM,
        actorId: ACTOR_ID,
        roomId: options.roomId ?? ROOM_ID,
        sessionId: options.sessionId ?? 'session-one',
        expectedRevision: options.expectedRevision,
        payload: options.payload ?? {
            identity: {
                id: ACTOR_ID,
                displayName: 'Synthetic Host',
                avatarId: 'avatar-anatolia'
            }
        }
    };
}

test('hosted adapter validates commands and preserves a hash-only resume token locally', async () => {
    const calls = [];
    const adapter = new HostedPrivateTableAdapter({
        transport: {
            async dispatch(value) {
                calls.push(value);
                return calls.length === 1
                    ? serverResult({ resumeToken: 'resume-token-one' })
                    : serverResult({
                        revision: 2,
                        eventType: 'member_ready'
                    });
            },
            async getSnapshot() {
                return serverResult({ revision: 2 }).snapshot;
            }
        }
    });

    const created = await adapter.dispatch(command());
    assert.equal(created.snapshot.self.resumeToken, 'resume-token-one');
    assert.equal(calls[0].version, PRIVATE_TABLE_PROTOCOL_VERSION);
    assert.equal(calls[0].authority, 'client');

    const ready = await adapter.dispatch(command({
        commandId: 'ready-one',
        type: TABLE_COMMAND.SET_READY,
        expectedRevision: 1,
        payload: { ready: true }
    }));
    assert.equal(ready.snapshot.self.resumeToken, 'resume-token-one');

    const recovered = await adapter.getSnapshot(ROOM_ID);
    assert.equal(recovered.self.resumeToken, 'resume-token-one');
});

test('hosted adapter clears local session authority after leave', async () => {
    const adapter = new HostedPrivateTableAdapter({
        transport: {
            async dispatch(value) {
                return value.type === TABLE_COMMAND.CREATE_ROOM
                    ? serverResult({ resumeToken: 'resume-token-one' })
                    : serverResult({ revision: 2, eventType: 'member_left' });
            },
            async getSnapshot() {
                throw new Error('should not be called');
            }
        }
    });

    await adapter.dispatch(command());
    const left = await adapter.dispatch(command({
        commandId: 'leave-one',
        type: TABLE_COMMAND.LEAVE_ROOM,
        expectedRevision: 1,
        payload: {}
    }));

    assert.equal(left.snapshot.self.resumeToken, null);
    await assert.rejects(
        () => adapter.getSnapshot(ROOM_ID),
        error => error instanceof PrivateTableProtocolError &&
            error.code === 'stale_session'
    );
});

test('hosted adapter rejects client-authored outcomes before transport', async () => {
    let dispatched = false;
    const adapter = new HostedPrivateTableAdapter({
        transport: {
            async dispatch() {
                dispatched = true;
                return serverResult();
            }
        }
    });

    await assert.rejects(
        () => adapter.dispatch(command({
            type: TABLE_COMMAND.REQUEST_ROLL,
            expectedRevision: 1,
            payload: { diceValues: [6, 6] }
        })),
        error => error instanceof PrivateTableProtocolError &&
            error.code === 'untrusted_outcome'
    );
    assert.equal(dispatched, false);
});

test('hosted adapter rejects responses that do not prove server authority', async () => {
    const forged = serverResult();
    forged.snapshot.authority = 'client';
    const adapter = new HostedPrivateTableAdapter({
        transport: { async dispatch() { return forged; } }
    });

    await assert.rejects(
        () => adapter.dispatch(command()),
        error => error instanceof PrivateTableProtocolError &&
            error.code === 'invalid_server_response'
    );
});

test('Supabase HTTP transport sends only publishable key and user JWT from client', async () => {
    const requests = [];
    const transport = createSupabasePrivateTableHttpTransport({
        projectUrl: 'https://trial.supabase.co/',
        publishableKey: 'sb_publishable_synthetic',
        accessTokenProvider: async () => 'user-jwt',
        fetchImpl: async (url, init) => {
            requests.push({ url, init });
            return {
                ok: true,
                async json() {
                    return { data: serverResult() };
                }
            };
        }
    });

    const result = await transport.dispatch(command());
    assert.equal(result.snapshot.authority, 'server');
    assert.equal(
        requests[0].url,
        'https://trial.supabase.co/functions/v1/private-table'
    );
    assert.deepEqual(requests[0].init.headers, {
        apikey: 'sb_publishable_synthetic',
        Authorization: 'Bearer user-jwt',
        'Content-Type': 'application/json'
    });
    assert.equal(JSON.stringify(requests[0]).includes('sb_secret_'), false);
});

test('Supabase HTTP transport maps structured provider errors to protocol errors', async () => {
    const transport = createSupabasePrivateTableHttpTransport({
        projectUrl: 'https://trial.supabase.co',
        publishableKey: 'sb_publishable_synthetic',
        accessTokenProvider: async () => 'user-jwt',
        fetchImpl: async () => ({
            ok: false,
            async json() {
                return {
                    error: {
                        code: 'stale_revision',
                        message: 'command was stale',
                        details: { actualRevision: 3 }
                    }
                };
            }
        })
    });

    await assert.rejects(
        () => transport.dispatch(command()),
        error => error instanceof PrivateTableProtocolError &&
            error.code === 'stale_revision' &&
            error.details.actualRevision === 3
    );
});
