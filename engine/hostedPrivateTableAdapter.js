import {
    PRIVATE_TABLE_PROTOCOL_VERSION,
    PrivateTableProtocolError,
    TABLE_COMMAND,
    createPrivateTableCommand
} from './privateTableProtocol.js';

function clone(value) {
    return value === undefined
        ? undefined
        : JSON.parse(JSON.stringify(value));
}

function requireObject(value, code, message) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new PrivateTableProtocolError(code, message);
    }
    return value;
}

function validateServerResult(value) {
    const result = requireObject(
        value,
        'invalid_server_response',
        'hosted private-table response must be an object'
    );
    const snapshot = requireObject(
        result.snapshot,
        'invalid_server_response',
        'hosted private-table response must include a snapshot'
    );

    if (
        snapshot.version !== PRIVATE_TABLE_PROTOCOL_VERSION ||
        snapshot.authority !== 'server' ||
        typeof snapshot.roomId !== 'string' ||
        !Number.isInteger(snapshot.revision) ||
        snapshot.revision < 0
    ) {
        throw new PrivateTableProtocolError(
            'invalid_server_response',
            'hosted snapshot failed the protocol authority checks'
        );
    }

    if (!Array.isArray(result.events)) {
        throw new PrivateTableProtocolError(
            'invalid_server_response',
            'hosted command response must include an event array'
        );
    }
    for (const event of result.events) {
        if (
            !event ||
            event.version !== PRIVATE_TABLE_PROTOCOL_VERSION ||
            event.authority !== 'server' ||
            event.roomId !== snapshot.roomId ||
            !Number.isInteger(event.eventSequence) ||
            !Number.isInteger(event.revision)
        ) {
            throw new PrivateTableProtocolError(
                'invalid_server_response',
                'hosted event failed the protocol authority checks'
            );
        }
    }

    return clone(result);
}

function normalizeTransportError(error) {
    if (error instanceof PrivateTableProtocolError) return error;
    const body = error && typeof error === 'object' ? error : {};
    return new PrivateTableProtocolError(
        typeof body.code === 'string' ? body.code : 'transport_error',
        typeof body.message === 'string'
            ? body.message
            : 'hosted private-table request failed',
        body.details && typeof body.details === 'object' ? body.details : {}
    );
}

export class HostedPrivateTableAdapter {
    constructor(options = {}) {
        if (!options.transport || typeof options.transport.dispatch !== 'function') {
            throw new TypeError('transport.dispatch must be a function');
        }
        this.transport = options.transport;
        this.resumeTokens = new Map();
        this.sessions = new Map();
    }

    async dispatch(rawCommand) {
        const command = createPrivateTableCommand(rawCommand);
        let result;
        try {
            result = validateServerResult(
                await this.transport.dispatch(clone(command))
            );
        } catch (error) {
            throw normalizeTransportError(error);
        }

        const roomId = result.snapshot.roomId;
        this.sessions.set(roomId, command.sessionId);
        this.preserveResumeToken(result);

        if (
            command.type === TABLE_COMMAND.LEAVE_ROOM ||
            command.type === TABLE_COMMAND.CLOSE_ROOM
        ) {
            this.resumeTokens.delete(roomId);
            this.sessions.delete(roomId);
            if (result.snapshot.self) result.snapshot.self.resumeToken = null;
        }

        return result;
    }

    async getSnapshot(roomId, sessionId = this.sessions.get(roomId)) {
        if (typeof this.transport.getSnapshot !== 'function') {
            throw new PrivateTableProtocolError(
                'snapshot_unavailable',
                'hosted transport does not provide snapshot recovery'
            );
        }
        if (typeof sessionId !== 'string' || !sessionId) {
            throw new PrivateTableProtocolError(
                'stale_session',
                'session is required to recover a hosted snapshot'
            );
        }

        let snapshot;
        try {
            snapshot = requireObject(
                await this.transport.getSnapshot({ roomId, sessionId }),
                'invalid_server_response',
                'hosted snapshot response must be an object'
            );
        } catch (error) {
            throw normalizeTransportError(error);
        }

        const result = validateServerResult({ events: [], snapshot });
        this.sessions.set(roomId, sessionId);
        this.preserveResumeToken(result);
        return result.snapshot;
    }

    subscribe(roomId, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }
        if (typeof this.transport.subscribe !== 'function') {
            throw new PrivateTableProtocolError(
                'subscription_unavailable',
                'hosted transport does not provide private Realtime subscriptions'
            );
        }

        return this.transport.subscribe(roomId, rawResult => {
            const result = validateServerResult(rawResult);
            this.preserveResumeToken(result);
            listener(result);
        });
    }

    preserveResumeToken(result) {
        const roomId = result.snapshot.roomId;
        const supplied = result.snapshot.self?.resumeToken;
        if (typeof supplied === 'string' && supplied) {
            this.resumeTokens.set(roomId, supplied);
            return;
        }

        const cached = this.resumeTokens.get(roomId);
        if (cached && result.snapshot.self) {
            result.snapshot.self.resumeToken = cached;
        }
    }
}

export function createSupabasePrivateTableHttpTransport(options = {}) {
    const projectUrl = typeof options.projectUrl === 'string'
        ? options.projectUrl.replace(/\/$/, '')
        : '';
    const publishableKey = options.publishableKey;
    const accessTokenProvider = options.accessTokenProvider;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;

    if (!projectUrl.startsWith('https://')) {
        throw new TypeError('projectUrl must be an HTTPS URL');
    }
    if (typeof publishableKey !== 'string' || !publishableKey) {
        throw new TypeError('publishableKey is required');
    }
    if (typeof accessTokenProvider !== 'function') {
        throw new TypeError('accessTokenProvider must be a function');
    }
    if (typeof fetchImpl !== 'function') {
        throw new TypeError('fetchImpl must be a function');
    }

    const request = async body => {
        const accessToken = await accessTokenProvider();
        if (typeof accessToken !== 'string' || !accessToken) {
            throw new PrivateTableProtocolError(
                'authentication_required',
                'a signed-in Supabase session is required'
            );
        }

        let networkResponse;
        try {
            networkResponse = await fetchImpl(
                `${projectUrl}/functions/v1/private-table`,
                {
                    method: 'POST',
                    headers: {
                        apikey: publishableKey,
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch {
            throw new PrivateTableProtocolError(
                'transport_error',
                'hosted private-table service could not be reached'
            );
        }

        let payload;
        try {
            payload = await networkResponse.json();
        } catch {
            throw new PrivateTableProtocolError(
                'invalid_server_response',
                'hosted private-table service returned invalid JSON'
            );
        }

        if (!networkResponse.ok) {
            throw normalizeTransportError(payload?.error);
        }
        return payload?.data;
    };

    return Object.freeze({
        dispatch(command) {
            return request({ action: 'command', command });
        },
        getSnapshot({ roomId, sessionId }) {
            return request({ action: 'snapshot', roomId, sessionId });
        }
    });
}
