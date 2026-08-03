export const PRIVATE_TABLE_PROTOCOL_VERSION = 1;

export const ROOM_STATUS = Object.freeze({
    LOBBY: 'lobby',
    ACTIVE: 'active',
    CLOSED: 'closed'
});

export const MEMBER_STATUS = Object.freeze({
    JOINED: 'joined',
    READY: 'ready',
    DISCONNECTED: 'disconnected',
    LEFT: 'left'
});

export const TABLE_COMMAND = Object.freeze({
    CREATE_ROOM: 'create_room',
    CREATE_INVITE: 'create_invite',
    JOIN_ROOM: 'join_room',
    SET_READY: 'set_ready',
    START_MATCH: 'start_match',
    DISCONNECT: 'disconnect',
    RESUME: 'resume',
    LEAVE_ROOM: 'leave_room',
    CLOSE_ROOM: 'close_room',
    MUTE_MEMBER: 'mute_member',
    BLOCK_MEMBER: 'block_member',
    REPORT_MEMBER: 'report_member',
    REQUEST_ROLL: 'request_roll',
    REQUEST_MOVE: 'request_move'
});

export const TABLE_EVENT = Object.freeze({
    ROOM_CREATED: 'room_created',
    INVITE_CREATED: 'invite_created',
    MEMBER_JOINED: 'member_joined',
    MEMBER_READY: 'member_ready',
    MEMBER_UNREADY: 'member_unready',
    MATCH_STARTED: 'match_started',
    MEMBER_DISCONNECTED: 'member_disconnected',
    MEMBER_RESUMED: 'member_resumed',
    MEMBER_LEFT: 'member_left',
    ROOM_CLOSED: 'room_closed',
    MEMBER_MUTED: 'member_muted',
    MEMBER_BLOCKED: 'member_blocked',
    MEMBER_REPORTED: 'member_reported',
    GAME_INTENT_RECEIVED: 'game_intent_received'
});

export const AUTHORITATIVE_GAME_EVENT = Object.freeze({
    DICE_ROLLED: 'dice_rolled',
    MOVE_APPLIED: 'move_applied',
    TURN_PASSED: 'turn_passed',
    MATCH_FINISHED: 'match_finished',
    RATING_CHANGED: 'rating_changed'
});

const ACTIVE_MEMBER_STATUSES = new Set([
    MEMBER_STATUS.JOINED,
    MEMBER_STATUS.READY
]);
const REPORT_CATEGORIES = new Set([
    'harassment',
    'spam',
    'cheating',
    'unsafe_profile',
    'other'
]);
const TRUSTED_OUTCOME_FIELDS = new Set([
    'accepted',
    'dice',
    'diceValues',
    'legal',
    'rating',
    'result',
    'score',
    'winnerId'
]);

function clone(value) {
    return value === undefined
        ? undefined
        : JSON.parse(JSON.stringify(value));
}

function stableSerialize(value) {
    if (value === undefined) return 'undefined';
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(',')}]`;
    }

    return `{${Object.keys(value)
        .sort()
        .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
        .join(',')}}`;
}

function isPlainObject(value) {
    return Boolean(value) &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function requireString(value, field, options = {}) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    const maximum = options.maximum ?? 128;

    if (!normalized || normalized.length > maximum) {
        throw new PrivateTableProtocolError(
            'invalid_command',
            `${field} must be a non-empty string of at most ${maximum} characters`,
            { field }
        );
    }

    return normalized;
}

function normalizeIdentity(identity, actorId) {
    if (!isPlainObject(identity)) {
        throw new PrivateTableProtocolError(
            'invalid_identity',
            'identity is required'
        );
    }

    const id = requireString(identity.id, 'identity.id', { maximum: 64 });
    if (id !== actorId) {
        throw new PrivateTableProtocolError(
            'identity_mismatch',
            'identity.id must match actorId'
        );
    }

    return {
        id,
        displayName: requireString(
            identity.displayName,
            'identity.displayName',
            { maximum: 40 }
        ),
        avatarId: requireString(
            identity.avatarId,
            'identity.avatarId',
            { maximum: 64 }
        )
    };
}

function assertClientPayloadIsNotAuthoritative(payload) {
    if (!isPlainObject(payload)) return;

    for (const field of Object.keys(payload)) {
        if (TRUSTED_OUTCOME_FIELDS.has(field)) {
            throw new PrivateTableProtocolError(
                'untrusted_outcome',
                `clients cannot submit trusted outcome field: ${field}`,
                { field }
            );
        }
    }
}

function normalizeCommand(command) {
    if (!isPlainObject(command)) {
        throw new PrivateTableProtocolError(
            'invalid_command',
            'command envelope is required'
        );
    }

    if (command.version !== PRIVATE_TABLE_PROTOCOL_VERSION) {
        throw new PrivateTableProtocolError(
            'unsupported_version',
            `protocol version ${command.version} is not supported`,
            { supportedVersion: PRIVATE_TABLE_PROTOCOL_VERSION }
        );
    }

    if (command.authority !== undefined && command.authority !== 'client') {
        throw new PrivateTableProtocolError(
            'invalid_authority',
            'clients may dispatch only client command envelopes'
        );
    }

    const normalized = {
        version: PRIVATE_TABLE_PROTOCOL_VERSION,
        authority: 'client',
        commandId: requireString(
            command.commandId,
            'commandId',
            { maximum: 96 }
        ),
        type: requireString(command.type, 'type', { maximum: 64 }),
        actorId: requireString(command.actorId, 'actorId', { maximum: 64 }),
        roomId: command.roomId
            ? requireString(command.roomId, 'roomId', { maximum: 96 })
            : null,
        sessionId: command.sessionId
            ? requireString(command.sessionId, 'sessionId', { maximum: 128 })
            : null,
        expectedRevision: command.expectedRevision,
        payload: isPlainObject(command.payload) ? clone(command.payload) : {}
    };

    if (
        normalized.expectedRevision !== undefined &&
        normalized.expectedRevision !== null &&
        (!Number.isInteger(normalized.expectedRevision) ||
            normalized.expectedRevision < 0)
    ) {
        throw new PrivateTableProtocolError(
            'invalid_command',
            'expectedRevision must be a non-negative integer'
        );
    }

    assertClientPayloadIsNotAuthoritative(normalized.payload);
    return normalized;
}

export function createPrivateTableCommand(options) {
    return normalizeCommand({
        version: PRIVATE_TABLE_PROTOCOL_VERSION,
        authority: 'client',
        ...options
    });
}

export class PrivateTableProtocolError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'PrivateTableProtocolError';
        this.code = code;
        this.details = details;
    }
}

export class InMemoryPrivateTableAdapter {
    constructor(options = {}) {
        this.clock = options.clock ?? (() => Date.now());
        this.idFactory = options.idFactory ?? this.createDefaultIdFactory();
        this.inviteLifetimeMs = options.inviteLifetimeMs ?? (15 * 60 * 1000);
        this.rooms = new Map();
        this.processedCommands = new Map();
        this.listeners = new Map();
    }

    createDefaultIdFactory() {
        let sequence = 0;
        return prefix => {
            sequence += 1;
            return `${prefix}-${this.clock().toString(36)}-${sequence.toString(36)}`;
        };
    }

    dispatch(rawCommand) {
        const command = normalizeCommand(rawCommand);
        const commandCacheKey = `${command.actorId}:${command.commandId}`;
        const commandFingerprint = stableSerialize(command);
        const prior = this.processedCommands.get(commandCacheKey);

        if (prior) {
            if (prior.fingerprint !== commandFingerprint) {
                throw new PrivateTableProtocolError(
                    'idempotency_conflict',
                    'commandId was already used for a different command'
                );
            }
            return {
                ...clone(prior.result),
                replayed: true
            };
        }

        const result = command.type === TABLE_COMMAND.CREATE_ROOM
            ? this.createRoom(command)
            : this.applyRoomCommand(command);
        const storedResult = clone({ ...result, replayed: false });

        this.processedCommands.set(commandCacheKey, {
            fingerprint: commandFingerprint,
            result: storedResult
        });
        this.notify(result.snapshot.roomId, storedResult);
        return clone(storedResult);
    }

    subscribe(roomId, listener) {
        requireString(roomId, 'roomId', { maximum: 96 });
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }

        const roomListeners = this.listeners.get(roomId) ?? new Set();
        roomListeners.add(listener);
        this.listeners.set(roomId, roomListeners);

        return () => {
            roomListeners.delete(listener);
            if (roomListeners.size === 0) {
                this.listeners.delete(roomId);
            }
        };
    }

    getSnapshot(roomId, actorId = null) {
        const room = this.requireRoom(roomId);
        return this.buildSnapshot(room, actorId);
    }

    notify(roomId, result) {
        for (const listener of this.listeners.get(roomId) ?? []) {
            listener(clone(result));
        }
    }

    createRoom(command) {
        if (command.roomId && this.rooms.has(command.roomId)) {
            throw new PrivateTableProtocolError(
                'room_exists',
                'room already exists'
            );
        }

        const sessionId = requireString(
            command.sessionId,
            'sessionId',
            { maximum: 128 }
        );
        const identity = normalizeIdentity(command.payload.identity, command.actorId);
        const roomId = command.roomId ?? this.idFactory('room');
        const member = this.createMember(identity, sessionId);
        const room = {
            protocolVersion: PRIVATE_TABLE_PROTOCOL_VERSION,
            roomId,
            status: ROOM_STATUS.LOBBY,
            revision: 0,
            lastEventSequence: 0,
            hostId: command.actorId,
            members: new Map([[command.actorId, member]]),
            invites: new Map(),
            reports: []
        };

        this.rooms.set(roomId, room);
        const event = this.emit(room, TABLE_EVENT.ROOM_CREATED, command.actorId, {
            hostId: command.actorId
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    createMember(identity, sessionId) {
        return {
            identity,
            status: MEMBER_STATUS.JOINED,
            ready: false,
            sessionId,
            resumeToken: this.idFactory('resume'),
            lastSeenAt: this.clock(),
            mutedActorIds: [],
            blockedActorIds: []
        };
    }

    applyRoomCommand(command) {
        const room = this.requireRoom(command.roomId);

        if (room.status === ROOM_STATUS.CLOSED) {
            throw new PrivateTableProtocolError(
                'room_closed',
                'room is closed'
            );
        }

        this.assertRevision(room, command.expectedRevision);

        switch (command.type) {
        case TABLE_COMMAND.CREATE_INVITE:
            return this.createInvite(room, command);
        case TABLE_COMMAND.JOIN_ROOM:
            return this.joinRoom(room, command);
        case TABLE_COMMAND.SET_READY:
            return this.setReady(room, command);
        case TABLE_COMMAND.START_MATCH:
            return this.startMatch(room, command);
        case TABLE_COMMAND.DISCONNECT:
            return this.disconnect(room, command);
        case TABLE_COMMAND.RESUME:
            return this.resume(room, command);
        case TABLE_COMMAND.LEAVE_ROOM:
            return this.leaveRoom(room, command);
        case TABLE_COMMAND.CLOSE_ROOM:
            return this.closeRoom(room, command);
        case TABLE_COMMAND.MUTE_MEMBER:
            return this.applySafetyAction(room, command, 'mute');
        case TABLE_COMMAND.BLOCK_MEMBER:
            return this.applySafetyAction(room, command, 'block');
        case TABLE_COMMAND.REPORT_MEMBER:
            return this.reportMember(room, command);
        case TABLE_COMMAND.REQUEST_ROLL:
        case TABLE_COMMAND.REQUEST_MOVE:
            return this.receiveGameIntent(room, command);
        default:
            throw new PrivateTableProtocolError(
                'unknown_command',
                `unknown private-table command: ${command.type}`
            );
        }
    }

    createInvite(room, command) {
        const host = this.requireAuthenticatedMember(room, command);
        this.assertHost(room, host.identity.id);

        if (room.status !== ROOM_STATUS.LOBBY) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'invites can be created only while the room is in the lobby'
            );
        }

        const inviteId = this.idFactory('invite');
        const inviteToken = this.idFactory('invite-token');
        const expiresAt = this.clock() + this.inviteLifetimeMs;
        room.invites.set(inviteId, {
            inviteId,
            inviteToken,
            expiresAt,
            usedBy: null
        });
        const event = this.emit(room, TABLE_EVENT.INVITE_CREATED, command.actorId, {
            inviteId,
            expiresAt
        });

        return {
            events: [event],
            invitation: { inviteId, inviteToken, expiresAt },
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    joinRoom(room, command) {
        if (room.status !== ROOM_STATUS.LOBBY) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'members can join only while the room is in the lobby'
            );
        }

        if (room.members.has(command.actorId)) {
            throw new PrivateTableProtocolError(
                'member_exists',
                'member already belongs to this room'
            );
        }

        const invitation = [...room.invites.values()].find(
            item => item.inviteToken === command.payload.inviteToken
        );
        if (!invitation || invitation.usedBy || invitation.expiresAt <= this.clock()) {
            throw new PrivateTableProtocolError(
                'invalid_invite',
                'invite is missing, expired, or already used'
            );
        }

        for (const member of room.members.values()) {
            if (member.blockedActorIds.includes(command.actorId)) {
                throw new PrivateTableProtocolError(
                    'member_blocked',
                    'member cannot join this room'
                );
            }
        }

        const identity = normalizeIdentity(command.payload.identity, command.actorId);
        const sessionId = requireString(
            command.sessionId,
            'sessionId',
            { maximum: 128 }
        );
        room.members.set(
            command.actorId,
            this.createMember(identity, sessionId)
        );
        invitation.usedBy = command.actorId;
        const event = this.emit(room, TABLE_EVENT.MEMBER_JOINED, command.actorId, {
            memberId: command.actorId
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    setReady(room, command) {
        if (room.status !== ROOM_STATUS.LOBBY) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'readiness can change only while the room is in the lobby'
            );
        }

        const member = this.requireAuthenticatedMember(room, command);
        const ready = command.payload.ready === true;
        member.ready = ready;
        member.status = ready ? MEMBER_STATUS.READY : MEMBER_STATUS.JOINED;
        member.lastSeenAt = this.clock();
        const event = this.emit(
            room,
            ready ? TABLE_EVENT.MEMBER_READY : TABLE_EVENT.MEMBER_UNREADY,
            command.actorId,
            { memberId: command.actorId }
        );

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    startMatch(room, command) {
        const host = this.requireAuthenticatedMember(room, command);
        this.assertHost(room, host.identity.id);

        if (room.status !== ROOM_STATUS.LOBBY) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'match can start only from the lobby'
            );
        }

        const activeMembers = [...room.members.values()].filter(
            member => ACTIVE_MEMBER_STATUSES.has(member.status)
        );
        if (
            activeMembers.length !== 2 ||
            activeMembers.some(member => !member.ready)
        ) {
            throw new PrivateTableProtocolError(
                'members_not_ready',
                'exactly two joined members must be ready'
            );
        }

        room.status = ROOM_STATUS.ACTIVE;
        const event = this.emit(room, TABLE_EVENT.MATCH_STARTED, command.actorId, {
            memberIds: activeMembers.map(member => member.identity.id)
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    disconnect(room, command) {
        const member = this.requireAuthenticatedMember(room, command);
        member.status = MEMBER_STATUS.DISCONNECTED;
        member.lastSeenAt = this.clock();
        const event = this.emit(
            room,
            TABLE_EVENT.MEMBER_DISCONNECTED,
            command.actorId,
            { memberId: command.actorId }
        );

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    resume(room, command) {
        const member = this.requireMember(room, command.actorId, {
            allowDisconnected: true
        });
        if (member.status !== MEMBER_STATUS.DISCONNECTED) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'only a disconnected member can resume'
            );
        }

        if (command.payload.resumeToken !== member.resumeToken) {
            throw new PrivateTableProtocolError(
                'invalid_resume_token',
                'resume token is invalid'
            );
        }

        member.sessionId = requireString(
            command.sessionId,
            'sessionId',
            { maximum: 128 }
        );
        member.resumeToken = this.idFactory('resume');
        member.status = member.ready
            ? MEMBER_STATUS.READY
            : MEMBER_STATUS.JOINED;
        member.lastSeenAt = this.clock();
        const event = this.emit(room, TABLE_EVENT.MEMBER_RESUMED, command.actorId, {
            memberId: command.actorId
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    leaveRoom(room, command) {
        const member = this.requireAuthenticatedMember(room, command);
        member.status = MEMBER_STATUS.LEFT;
        member.ready = false;
        member.sessionId = null;
        member.resumeToken = null;
        member.lastSeenAt = this.clock();
        const event = this.emit(room, TABLE_EVENT.MEMBER_LEFT, command.actorId, {
            memberId: command.actorId
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    closeRoom(room, command) {
        const host = this.requireAuthenticatedMember(room, command);
        this.assertHost(room, host.identity.id);
        room.status = ROOM_STATUS.CLOSED;
        const event = this.emit(room, TABLE_EVENT.ROOM_CLOSED, command.actorId, {
            reason: requireString(
                command.payload.reason ?? 'host_closed',
                'payload.reason',
                { maximum: 64 }
            )
        });

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    applySafetyAction(room, command, action) {
        const member = this.requireAuthenticatedMember(room, command);
        const targetId = requireString(
            command.payload.targetId,
            'payload.targetId',
            { maximum: 64 }
        );
        this.requireMember(room, targetId, { allowDisconnected: true });
        if (targetId === command.actorId) {
            throw new PrivateTableProtocolError(
                'invalid_target',
                `a member cannot ${action} themselves`
            );
        }

        const field = action === 'mute' ? 'mutedActorIds' : 'blockedActorIds';
        if (!member[field].includes(targetId)) {
            member[field].push(targetId);
        }
        const event = this.emit(
            room,
            action === 'mute'
                ? TABLE_EVENT.MEMBER_MUTED
                : TABLE_EVENT.MEMBER_BLOCKED,
            command.actorId,
            { targetId, audience: command.actorId }
        );

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    reportMember(room, command) {
        this.requireAuthenticatedMember(room, command);
        const targetId = requireString(
            command.payload.targetId,
            'payload.targetId',
            { maximum: 64 }
        );
        this.requireMember(room, targetId, { allowDisconnected: true });
        const category = requireString(
            command.payload.category,
            'payload.category',
            { maximum: 32 }
        );
        if (!REPORT_CATEGORIES.has(category)) {
            throw new PrivateTableProtocolError(
                'invalid_report_category',
                'report category is not supported'
            );
        }

        const reportId = this.idFactory('report');
        room.reports.push({
            reportId,
            reporterId: command.actorId,
            targetId,
            category,
            createdAt: this.clock()
        });
        const event = this.emit(
            room,
            TABLE_EVENT.MEMBER_REPORTED,
            command.actorId,
            { reportId, targetId, category, audience: command.actorId }
        );

        return {
            events: [event],
            reportId,
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    receiveGameIntent(room, command) {
        if (room.status !== ROOM_STATUS.ACTIVE) {
            throw new PrivateTableProtocolError(
                'invalid_transition',
                'game intents require an active match'
            );
        }
        this.requireAuthenticatedMember(room, command);

        const event = this.emit(
            room,
            TABLE_EVENT.GAME_INTENT_RECEIVED,
            command.actorId,
            {
                intentType: command.type,
                clientIntentId: command.payload.clientIntentId ?? command.commandId
            }
        );

        return {
            events: [event],
            snapshot: this.buildSnapshot(room, command.actorId)
        };
    }

    emit(room, type, actorId, payload) {
        room.revision += 1;
        room.lastEventSequence += 1;

        return {
            version: PRIVATE_TABLE_PROTOCOL_VERSION,
            authority: 'server',
            eventId: this.idFactory('event'),
            eventSequence: room.lastEventSequence,
            roomId: room.roomId,
            revision: room.revision,
            type,
            occurredAt: this.clock(),
            actorId,
            payload: clone(payload)
        };
    }

    buildSnapshot(room, actorId) {
        const self = actorId ? room.members.get(actorId) : null;

        return {
            version: PRIVATE_TABLE_PROTOCOL_VERSION,
            authority: 'server',
            roomId: room.roomId,
            revision: room.revision,
            lastEventSequence: room.lastEventSequence,
            status: room.status,
            hostId: room.hostId,
            members: [...room.members.values()].map(member => ({
                identity: clone(member.identity),
                status: member.status,
                ready: member.ready,
                lastSeenAt: member.lastSeenAt
            })),
            self: self ? {
                resumeToken: self.resumeToken,
                mutedActorIds: [...self.mutedActorIds],
                blockedActorIds: [...self.blockedActorIds]
            } : null
        };
    }

    assertRevision(room, expectedRevision) {
        if (!Number.isInteger(expectedRevision)) {
            throw new PrivateTableProtocolError(
                'revision_required',
                'expectedRevision is required for room commands',
                { actualRevision: room.revision }
            );
        }

        if (expectedRevision !== room.revision) {
            throw new PrivateTableProtocolError(
                'stale_revision',
                'command was based on a stale room revision',
                {
                    expectedRevision,
                    actualRevision: room.revision
                }
            );
        }
    }

    requireRoom(roomId) {
        const normalizedRoomId = requireString(
            roomId,
            'roomId',
            { maximum: 96 }
        );
        const room = this.rooms.get(normalizedRoomId);
        if (!room) {
            throw new PrivateTableProtocolError(
                'room_not_found',
                'room does not exist'
            );
        }
        return room;
    }

    requireMember(room, actorId, options = {}) {
        const member = room.members.get(actorId);
        const allowed = member &&
            member.status !== MEMBER_STATUS.LEFT &&
            (options.allowDisconnected ||
                member.status !== MEMBER_STATUS.DISCONNECTED);

        if (!allowed) {
            throw new PrivateTableProtocolError(
                'member_not_active',
                'member is not active in this room'
            );
        }
        return member;
    }

    requireAuthenticatedMember(room, command) {
        const member = this.requireMember(room, command.actorId);
        if (!command.sessionId || command.sessionId !== member.sessionId) {
            throw new PrivateTableProtocolError(
                'stale_session',
                'session is missing or stale'
            );
        }
        return member;
    }

    assertHost(room, actorId) {
        if (room.hostId !== actorId) {
            throw new PrivateTableProtocolError(
                'host_required',
                'only the room host can perform this command'
            );
        }
    }
}
