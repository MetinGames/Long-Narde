import { getBuiltInAvatar } from './playerIdentity.js';
import {
    InMemoryPrivateTableAdapter,
    MEMBER_STATUS,
    PRIVATE_TABLE_PROTOCOL_VERSION,
    PrivateTableProtocolError,
    ROOM_STATUS,
    TABLE_COMMAND,
    createPrivateTableCommand
} from './privateTableProtocol.js';

export const FRIEND_PREVIEW_STAGE = Object.freeze({
    EMPTY: 'empty',
    ROOM_CREATED: 'room-created',
    INVITE_CREATED: 'invite-created',
    FRIEND_JOINED: 'friend-joined',
    HOST_READY: 'host-ready',
    FRIEND_READY: 'friend-ready',
    BOTH_READY: 'both-ready',
    ACTIVE: 'active',
    DISCONNECTED: 'disconnected',
    RESUMED: 'resumed',
    FRIEND_LEFT: 'friend-left',
    CLOSED: 'closed'
});

export const FRIEND_PREVIEW_ACTION = Object.freeze({
    CREATE_ROOM: 'create-room',
    CREATE_INVITE: 'create-invite',
    JOIN_FRIEND: 'join-friend',
    READY_HOST: 'ready-host',
    READY_FRIEND: 'ready-friend',
    START_MATCH: 'start-match',
    DISCONNECT_FRIEND: 'disconnect-friend',
    RESUME_FRIEND: 'resume-friend',
    LEAVE_FRIEND: 'leave-friend',
    CLOSE_ROOM: 'close-room',
    RESET: 'reset'
});

export const LOCAL_PREVIEW_FRIEND_IDENTITY = Object.freeze({
    id: 'local-preview-friend',
    displayName: 'Nardora Friend',
    avatarId: 'avatar-robot'
});

const ERROR_KEY_BY_CODE = Object.freeze({
    host_required: 'friendPreview.error.hostRequired',
    identity_unavailable: 'friendPreview.error.identityUnavailable',
    invalid_invite: 'friendPreview.error.invalidInvite',
    invalid_resume_token: 'friendPreview.error.invalidResume',
    invalid_transition: 'friendPreview.error.invalidTransition',
    member_not_active: 'friendPreview.error.memberNotActive',
    members_not_ready: 'friendPreview.error.membersNotReady',
    room_closed: 'friendPreview.error.roomClosed',
    room_not_found: 'friendPreview.error.roomNotFound',
    stale_revision: 'friendPreview.error.staleRevision',
    stale_session: 'friendPreview.error.staleSession'
});

const TIMELINE_INDEX_BY_STAGE = Object.freeze({
    [FRIEND_PREVIEW_STAGE.EMPTY]: -1,
    [FRIEND_PREVIEW_STAGE.ROOM_CREATED]: 0,
    [FRIEND_PREVIEW_STAGE.INVITE_CREATED]: 1,
    [FRIEND_PREVIEW_STAGE.FRIEND_JOINED]: 2,
    [FRIEND_PREVIEW_STAGE.HOST_READY]: 3,
    [FRIEND_PREVIEW_STAGE.FRIEND_READY]: 3,
    [FRIEND_PREVIEW_STAGE.BOTH_READY]: 3,
    [FRIEND_PREVIEW_STAGE.ACTIVE]: 4,
    [FRIEND_PREVIEW_STAGE.DISCONNECTED]: 5,
    [FRIEND_PREVIEW_STAGE.RESUMED]: 6,
    [FRIEND_PREVIEW_STAGE.FRIEND_LEFT]: 7,
    [FRIEND_PREVIEW_STAGE.CLOSED]: 8
});

function createSessionIdFactory() {
    let sequence = 0;
    return prefix => {
        sequence += 1;
        return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
    };
}

function copy(value) {
    return value == null
        ? value
        : JSON.parse(JSON.stringify(value));
}

function setText(element, value) {
    if (element) element.textContent = String(value ?? '');
}

function setDataState(element, value) {
    if (!element) return;
    if (element.dataset) element.dataset.state = value;
    element.setAttribute?.('data-state', value);
}

export function getFriendPreviewErrorKey(error) {
    if (error instanceof PrivateTableProtocolError) {
        return ERROR_KEY_BY_CODE[error.code] || 'friendPreview.error.generic';
    }
    return 'friendPreview.error.generic';
}

export class FriendMatchPreviewController {
    constructor({
        adapter = null,
        adapterFactory = () => new InMemoryPrivateTableAdapter(),
        identityStore,
        translate = key => key,
        elements = {},
        friendIdentity = LOCAL_PREVIEW_FRIEND_IDENTITY,
        sessionIdFactory = createSessionIdFactory(),
        onStateChange = () => {}
    } = {}) {
        this.adapterFactory = adapter ? null : adapterFactory;
        this.adapter = adapter || adapterFactory();
        this.identityStore = identityStore;
        this.translate = translate;
        this.elements = elements;
        this.friendIdentity = Object.freeze({ ...friendIdentity });
        this.sessionIdFactory = sessionIdFactory;
        this.onStateChange = onStateChange;

        this.active = false;
        this.isOpen = false;
        this.busy = false;
        this.lifecycleVersion = 0;
        this.commandSequence = 0;
        this.listeners = [];
        this.unsubscribe = null;
        this.lastFocusedElement = null;
        this.lastRenderSignature = null;

        this.clearSessionState();

        this.boundKeyDown = event => this.handleKeyDown(event);
        this.boundBackdropClick = event => {
            if (event.target === this.elements.modal) this.close();
        };
    }

    clearSessionState() {
        this.roomId = null;
        this.snapshot = null;
        this.invitation = null;
        this.hostIdentity = null;
        this.hostSessionId = null;
        this.friendSessionId = null;
        this.friendResumeToken = null;
        this.hasDisconnected = false;
        this.hasResumed = false;
        this.lastEventType = null;
        this.lastErrorKey = null;
    }

    bind(element, type, listener) {
        if (
            typeof element?.addEventListener !== 'function' ||
            typeof element?.removeEventListener !== 'function'
        ) {
            return;
        }

        element.addEventListener(type, listener);
        this.listeners.push({ element, type, listener });
    }

    start() {
        if (this.active) return false;

        this.bind(this.elements.openButton, 'click', event => {
            event?.preventDefault?.();
            this.open(this.elements.openButton);
        });
        for (const closeButton of this.elements.closeButtons || []) {
            this.bind(closeButton, 'click', event => {
                event?.preventDefault?.();
                this.close();
            });
        }
        this.bind(this.elements.nextButton, 'click', event => {
            event?.preventDefault?.();
            this.advance();
        });
        this.bind(this.elements.resetButton, 'click', event => {
            event?.preventDefault?.();
            this.resetPreview();
        });
        this.bind(this.elements.modal, 'click', this.boundBackdropClick);

        this.active = true;
        if (this.roomId) this.subscribeToRoom();
        this.render();
        return true;
    }

    stop() {
        if (!this.active) return false;

        this.close({ returnFocus: false });
        for (const { element, type, listener } of this.listeners.splice(0)) {
            element.removeEventListener(type, listener);
        }
        this.unsubscribeFromRoom();
        this.lifecycleVersion += 1;
        this.active = false;
        return true;
    }

    getDocument() {
        return this.elements.modal?.ownerDocument ||
            (typeof document !== 'undefined' ? document : null);
    }

    getFocusableElements() {
        const modal = this.elements.modal;
        if (typeof modal?.querySelectorAll !== 'function') return [];

        return Array.from(modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(element =>
            !element.disabled &&
            element.hidden !== true &&
            element.getAttribute?.('aria-hidden') !== 'true'
        );
    }

    open(triggerElement = null) {
        if (!this.active) return false;

        const doc = this.getDocument();
        this.lastFocusedElement = triggerElement || doc?.activeElement || null;
        this.isOpen = true;
        if (!this.hostIdentity) this.ensureHostIdentity();
        if (this.roomId) this.recoverLatestSnapshot();

        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
            this.elements.modal.setAttribute('aria-hidden', 'false');
        }
        doc?.addEventListener?.('keydown', this.boundKeyDown);
        this.render();

        const focusTarget = this.getFocusableElements()[0] || this.elements.modal;
        focusTarget?.focus?.();
        return true;
    }

    close({ returnFocus = true } = {}) {
        if (!this.isOpen && !this.elements.modal) return false;

        this.isOpen = false;
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
            this.elements.modal.setAttribute('aria-hidden', 'true');
        }
        this.getDocument()?.removeEventListener?.('keydown', this.boundKeyDown);

        if (returnFocus) this.lastFocusedElement?.focus?.();
        return true;
    }

    handleKeyDown(event) {
        if (!this.isOpen) return;
        if (event.key === 'Escape') {
            event.preventDefault?.();
            this.close();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusables = this.getFocusableElements();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeElement = this.getDocument()?.activeElement;

        if (event.shiftKey && activeElement === first) {
            event.preventDefault?.();
            last.focus?.();
        } else if (!event.shiftKey && activeElement === last) {
            event.preventDefault?.();
            first.focus?.();
        }
    }

    ensureHostIdentity() {
        try {
            const identity = this.identityStore?.getPrivateTableIdentity?.();
            if (!identity?.id || !identity?.displayName || !identity?.avatarId) {
                throw new PrivateTableProtocolError(
                    'identity_unavailable',
                    'local identity is unavailable'
                );
            }
            this.hostIdentity = { ...identity };
            return this.hostIdentity;
        } catch (error) {
            this.lastErrorKey = getFriendPreviewErrorKey(error);
            return null;
        }
    }

    nextCommandId() {
        this.commandSequence += 1;
        return `friend-preview-command-${this.commandSequence}`;
    }

    unsubscribeFromRoom() {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    subscribeToRoom() {
        this.unsubscribeFromRoom();
        if (!this.roomId) return;

        const roomId = this.roomId;
        const lifecycleVersion = this.lifecycleVersion;
        this.unsubscribe = this.adapter.subscribe(roomId, result => {
            if (
                !this.active ||
                lifecycleVersion !== this.lifecycleVersion ||
                roomId !== this.roomId
            ) {
                return;
            }
            this.applyResult(result);
        });
    }

    applyResult(result) {
        if (result?.snapshot) {
            this.snapshot = copy(result.snapshot);
            this.roomId = result.snapshot.roomId;
        }
        if (result?.invitation) this.invitation = copy(result.invitation);

        const latestEvent = result?.events?.at?.(-1) ||
            result?.events?.[result.events.length - 1];
        if (latestEvent) {
            this.lastEventType = latestEvent.type;
            if (
                latestEvent.actorId === this.friendIdentity.id &&
                result.snapshot?.self?.resumeToken
            ) {
                this.friendResumeToken = result.snapshot.self.resumeToken;
            }
        }
        this.lastErrorKey = null;
        this.render();
    }

    recoverLatestSnapshot() {
        if (!this.roomId || !this.hostIdentity?.id) return null;

        try {
            this.snapshot = this.adapter.getSnapshot(
                this.roomId,
                this.hostIdentity.id
            );
            this.lastErrorKey = null;
            this.render();
            return copy(this.snapshot);
        } catch (error) {
            this.lastErrorKey = getFriendPreviewErrorKey(error);
            this.render();
            return null;
        }
    }

    run(action) {
        if (this.busy) return false;
        this.busy = true;
        this.lastErrorKey = null;

        try {
            action();
            return true;
        } catch (error) {
            this.lastErrorKey = getFriendPreviewErrorKey(error);
            return false;
        } finally {
            this.busy = false;
            this.render();
        }
    }

    dispatchRoomCommand({ type, actorId, sessionId, payload = {} }) {
        const recovered = this.adapter.getSnapshot(
            this.roomId,
            this.hostIdentity.id
        );
        this.snapshot = recovered;
        return this.adapter.dispatch(createPrivateTableCommand({
            commandId: this.nextCommandId(),
            type,
            roomId: this.roomId,
            actorId,
            sessionId,
            expectedRevision: recovered.revision,
            payload
        }));
    }

    createRoom() {
        return this.run(() => {
            const hostIdentity = this.ensureHostIdentity();
            if (!hostIdentity) {
                throw new PrivateTableProtocolError(
                    'identity_unavailable',
                    'local identity is unavailable'
                );
            }

            this.hostSessionId = this.sessionIdFactory('preview-host-session');
            const result = this.adapter.dispatch(createPrivateTableCommand({
                commandId: this.nextCommandId(),
                type: TABLE_COMMAND.CREATE_ROOM,
                actorId: hostIdentity.id,
                sessionId: this.hostSessionId,
                payload: { identity: hostIdentity }
            }));
            this.applyResult(result);
            this.subscribeToRoom();
        });
    }

    createInvite() {
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.CREATE_INVITE,
                actorId: this.hostIdentity.id,
                sessionId: this.hostSessionId
            });
            this.applyResult(result);
        });
    }

    joinFriend() {
        return this.run(() => {
            this.friendSessionId = this.sessionIdFactory('preview-friend-session');
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.JOIN_ROOM,
                actorId: this.friendIdentity.id,
                sessionId: this.friendSessionId,
                payload: {
                    inviteToken: this.invitation?.inviteToken,
                    identity: this.friendIdentity
                }
            });
            this.applyResult(result);
        });
    }

    setReady(actorId) {
        const isFriend = actorId === this.friendIdentity.id;
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.SET_READY,
                actorId,
                sessionId: isFriend
                    ? this.friendSessionId
                    : this.hostSessionId,
                payload: { ready: true }
            });
            this.applyResult(result);
        });
    }

    startMatch() {
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.START_MATCH,
                actorId: this.hostIdentity.id,
                sessionId: this.hostSessionId
            });
            this.applyResult(result);
        });
    }

    disconnectFriend() {
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.DISCONNECT,
                actorId: this.friendIdentity.id,
                sessionId: this.friendSessionId
            });
            this.hasDisconnected = true;
            this.applyResult(result);
        });
    }

    resumeFriend() {
        return this.run(() => {
            const nextSessionId = this.sessionIdFactory('preview-friend-session');
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.RESUME,
                actorId: this.friendIdentity.id,
                sessionId: nextSessionId,
                payload: { resumeToken: this.friendResumeToken }
            });
            this.friendSessionId = nextSessionId;
            this.hasResumed = true;
            this.applyResult(result);
        });
    }

    leaveFriend() {
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.LEAVE_ROOM,
                actorId: this.friendIdentity.id,
                sessionId: this.friendSessionId
            });
            this.applyResult(result);
        });
    }

    closeRoom() {
        return this.run(() => {
            const result = this.dispatchRoomCommand({
                type: TABLE_COMMAND.CLOSE_ROOM,
                actorId: this.hostIdentity.id,
                sessionId: this.hostSessionId,
                payload: { reason: 'local_preview_complete' }
            });
            this.applyResult(result);
        });
    }

    resetPreview() {
        if (this.busy) return false;
        this.unsubscribeFromRoom();
        this.lifecycleVersion += 1;
        if (this.adapterFactory) {
            this.adapter = this.adapterFactory();
            this.commandSequence = 0;
        }
        this.clearSessionState();
        this.render();
        return true;
    }

    getStage() {
        if (!this.snapshot) return FRIEND_PREVIEW_STAGE.EMPTY;
        if (this.snapshot.status === ROOM_STATUS.CLOSED) {
            return FRIEND_PREVIEW_STAGE.CLOSED;
        }

        const host = this.snapshot.members.find(
            member => member.identity.id === this.hostIdentity?.id
        );
        const friend = this.snapshot.members.find(
            member => member.identity.id === this.friendIdentity.id
        );

        if (friend?.status === MEMBER_STATUS.LEFT) {
            return FRIEND_PREVIEW_STAGE.FRIEND_LEFT;
        }
        if (friend?.status === MEMBER_STATUS.DISCONNECTED) {
            return FRIEND_PREVIEW_STAGE.DISCONNECTED;
        }
        if (this.snapshot.status === ROOM_STATUS.ACTIVE) {
            return this.hasResumed
                ? FRIEND_PREVIEW_STAGE.RESUMED
                : FRIEND_PREVIEW_STAGE.ACTIVE;
        }
        if (!friend) {
            return this.invitation
                ? FRIEND_PREVIEW_STAGE.INVITE_CREATED
                : FRIEND_PREVIEW_STAGE.ROOM_CREATED;
        }
        if (host?.ready && friend.ready) return FRIEND_PREVIEW_STAGE.BOTH_READY;
        if (host?.ready) return FRIEND_PREVIEW_STAGE.HOST_READY;
        if (friend.ready) return FRIEND_PREVIEW_STAGE.FRIEND_READY;
        return FRIEND_PREVIEW_STAGE.FRIEND_JOINED;
    }

    getNextAction() {
        const stage = this.getStage();
        const actionByStage = {
            [FRIEND_PREVIEW_STAGE.EMPTY]: FRIEND_PREVIEW_ACTION.CREATE_ROOM,
            [FRIEND_PREVIEW_STAGE.ROOM_CREATED]: FRIEND_PREVIEW_ACTION.CREATE_INVITE,
            [FRIEND_PREVIEW_STAGE.INVITE_CREATED]: FRIEND_PREVIEW_ACTION.JOIN_FRIEND,
            [FRIEND_PREVIEW_STAGE.FRIEND_JOINED]: FRIEND_PREVIEW_ACTION.READY_HOST,
            [FRIEND_PREVIEW_STAGE.HOST_READY]: FRIEND_PREVIEW_ACTION.READY_FRIEND,
            [FRIEND_PREVIEW_STAGE.FRIEND_READY]: FRIEND_PREVIEW_ACTION.READY_HOST,
            [FRIEND_PREVIEW_STAGE.BOTH_READY]: FRIEND_PREVIEW_ACTION.START_MATCH,
            [FRIEND_PREVIEW_STAGE.ACTIVE]: FRIEND_PREVIEW_ACTION.DISCONNECT_FRIEND,
            [FRIEND_PREVIEW_STAGE.DISCONNECTED]: FRIEND_PREVIEW_ACTION.RESUME_FRIEND,
            [FRIEND_PREVIEW_STAGE.RESUMED]: FRIEND_PREVIEW_ACTION.LEAVE_FRIEND,
            [FRIEND_PREVIEW_STAGE.FRIEND_LEFT]: FRIEND_PREVIEW_ACTION.CLOSE_ROOM,
            [FRIEND_PREVIEW_STAGE.CLOSED]: FRIEND_PREVIEW_ACTION.RESET
        };
        return actionByStage[stage];
    }

    advance() {
        const action = this.getNextAction();
        switch (action) {
        case FRIEND_PREVIEW_ACTION.CREATE_ROOM:
            return this.createRoom();
        case FRIEND_PREVIEW_ACTION.CREATE_INVITE:
            return this.createInvite();
        case FRIEND_PREVIEW_ACTION.JOIN_FRIEND:
            return this.joinFriend();
        case FRIEND_PREVIEW_ACTION.READY_HOST:
            return this.setReady(this.hostIdentity.id);
        case FRIEND_PREVIEW_ACTION.READY_FRIEND:
            return this.setReady(this.friendIdentity.id);
        case FRIEND_PREVIEW_ACTION.START_MATCH:
            return this.startMatch();
        case FRIEND_PREVIEW_ACTION.DISCONNECT_FRIEND:
            return this.disconnectFriend();
        case FRIEND_PREVIEW_ACTION.RESUME_FRIEND:
            return this.resumeFriend();
        case FRIEND_PREVIEW_ACTION.LEAVE_FRIEND:
            return this.leaveFriend();
        case FRIEND_PREVIEW_ACTION.CLOSE_ROOM:
            return this.closeRoom();
        case FRIEND_PREVIEW_ACTION.RESET:
            return this.resetPreview();
        default:
            return false;
        }
    }

    getMemberStatusKey(member) {
        if (!member) return 'friendPreview.memberStatus.pending';
        return `friendPreview.memberStatus.${member.status}`;
    }

    renderMember(prefix, member, fallbackIdentity) {
        const identity = member?.identity || fallbackIdentity;
        const avatar = getBuiltInAvatar(identity?.avatarId);
        setText(this.elements[`${prefix}Avatar`], avatar?.glyph || '•');
        setText(this.elements[`${prefix}Name`], identity?.displayName || '—');
        setText(
            this.elements[`${prefix}Status`],
            this.translate(this.getMemberStatusKey(member))
        );
        setDataState(
            this.elements[`${prefix}Card`],
            member?.status || 'pending'
        );
    }

    renderTimeline(stage) {
        const currentIndex = TIMELINE_INDEX_BY_STAGE[stage] ?? -1;
        for (const step of this.elements.timelineSteps || []) {
            const stepIndex = Number(step.dataset?.stepIndex ?? -1);
            const state = stepIndex < currentIndex
                ? 'complete'
                : stepIndex === currentIndex
                    ? 'active'
                    : 'pending';
            setDataState(step, state);
        }
    }

    formatRoomCode() {
        if (!this.roomId) return this.translate('friendPreview.value.notCreated');
        return this.roomId
            .replace(/^room-/, '')
            .slice(-8)
            .toUpperCase();
    }

    render() {
        const stage = this.getStage();
        const nextAction = this.getNextAction();
        const host = this.snapshot?.members?.find(
            member => member.identity.id === this.hostIdentity?.id
        );
        const friend = this.snapshot?.members?.find(
            member => member.identity.id === this.friendIdentity.id
        );

        setText(
            this.elements.stageTitle,
            this.translate(`friendPreview.stage.${stage}.title`)
        );
        setText(
            this.elements.stageDetail,
            this.translate(`friendPreview.stage.${stage}.detail`)
        );
        setText(this.elements.roomCode, this.formatRoomCode());
        setText(
            this.elements.roomStatus,
            this.snapshot
                ? this.translate(`friendPreview.roomStatus.${this.snapshot.status}`)
                : this.translate('friendPreview.value.notCreated')
        );
        setText(
            this.elements.revision,
            this.snapshot?.revision ?? '—'
        );
        setText(
            this.elements.inviteStatus,
            this.translate(
                this.invitation
                    ? 'friendPreview.invite.ready'
                    : 'friendPreview.invite.pending'
            )
        );

        this.renderMember('host', host, this.hostIdentity);
        this.renderMember('friend', friend, this.friendIdentity);
        this.renderTimeline(stage);

        if (this.elements.nextButton) {
            this.elements.nextButton.disabled = this.busy;
            this.elements.nextButton.setAttribute?.(
                'aria-disabled',
                this.busy ? 'true' : 'false'
            );
            setText(
                this.elements.nextButton,
                this.translate(`friendPreview.action.${nextAction}`)
            );
        }
        if (this.elements.resetButton) {
            const disabled = this.busy || stage === FRIEND_PREVIEW_STAGE.EMPTY;
            this.elements.resetButton.disabled = disabled;
            this.elements.resetButton.setAttribute?.(
                'aria-disabled',
                disabled ? 'true' : 'false'
            );
        }

        const liveKey = this.lastErrorKey ||
            `friendPreview.stage.${stage}.detail`;
        setText(this.elements.liveStatus, this.translate(liveKey));
        setDataState(
            this.elements.liveStatus,
            this.lastErrorKey ? 'error' : 'ok'
        );
        setText(
            this.elements.protocolVersion,
            `v${PRIVATE_TABLE_PROTOCOL_VERSION}`
        );

        const signature = [
            stage,
            this.lastErrorKey || '',
            this.lastEventType || '',
            this.snapshot?.revision ?? 0
        ].join(':');
        if (signature !== this.lastRenderSignature) {
            this.lastRenderSignature = signature;
            this.onStateChange({
                stage,
                errorKey: this.lastErrorKey,
                eventType: this.lastEventType,
                revision: this.snapshot?.revision ?? 0
            });
        }
    }

    refreshForLanguage() {
        this.render();
        return this.isOpen;
    }

    getState() {
        return {
            active: this.active,
            isOpen: this.isOpen,
            stage: this.getStage(),
            nextAction: this.getNextAction(),
            roomId: this.roomId,
            snapshot: copy(this.snapshot),
            invitationCreated: Boolean(this.invitation),
            lastErrorKey: this.lastErrorKey,
            hasDisconnected: this.hasDisconnected,
            hasResumed: this.hasResumed
        };
    }
}
