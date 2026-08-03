# Nardora private-table protocol v1

Last reviewed: **2026-08-03**  
Issue: [#16](https://github.com/MetinGames/Long-Narde/issues/16)

This document defines Nardora's provider-neutral private-table boundary. The
executable reference is `engine/privateTableProtocol.js`; the deterministic
in-memory adapter is a local development and contract-test tool, not a hosted
multiplayer service.

Nardora still exposes Friend Match and Online as unavailable. This contract
does not add accounts, networking, personal-data upload, matchmaking, chat,
voice, video, cloud persistence, or a playable online mode.

## Player outcome

Future Friend Match work can build against one stable model for creating a
table, inviting another player, joining, becoming ready, starting, losing a
connection, resuming from a snapshot, leaving, and closing. The client cannot
declare dice, legal moves, results, scores, or ratings.

## State model

### Room lifecycle

| Current state | Command | Required authority | Next state |
| --- | --- | --- | --- |
| none | `create_room` | local client identity | `lobby` |
| `lobby` | `create_invite` | authenticated host session | `lobby` |
| `lobby` | `join_room` | valid, unused, unexpired invite | `lobby` |
| `lobby` | `set_ready` | authenticated member session | `lobby` |
| `lobby` | `start_match` | host; exactly two active members ready | `active` |
| `lobby` or `active` | `close_room` | authenticated host session | `closed` |
| `closed` | any new command | none | rejected |

### Member lifecycle

An invite is a short-lived admission capability, not yet a member. A successful
`join_room` creates the member.

| Current state | Command | Next state | Notes |
| --- | --- | --- | --- |
| invited | `join_room` | `joined` | Invite is consumed once. |
| `joined` | `set_ready(true)` | `ready` | Lobby only. |
| `ready` | `set_ready(false)` | `joined` | Lobby only. |
| `joined` or `ready` | `disconnect` | `disconnected` | Previous ready value is retained. |
| `disconnected` | `resume` | `joined` or `ready` | Snapshot is returned; token and session rotate. |
| `joined`, `ready`, or `disconnected` | `leave_room` | `left` | Resume authority is removed. |

`active` is a room state. `disconnected`, `resumed`, `left`, and `closed` are
explicit events so a later realtime adapter can reproduce the same transitions
without guessing from browser presence.

## Versioned envelopes

Client commands use this shape:

```js
{
    version: 1,
    authority: 'client',
    commandId: 'unique-idempotency-key',
    type: 'set_ready',
    roomId: 'room-id',
    actorId: 'local-player-id',
    sessionId: 'current-session-id',
    expectedRevision: 3,
    payload: { ready: true }
}
```

Accepted transitions emit server-authority events:

```js
{
    version: 1,
    authority: 'server',
    eventId: 'event-id',
    eventSequence: 4,
    roomId: 'room-id',
    revision: 4,
    type: 'member_ready',
    occurredAt: 1785740000000,
    actorId: 'local-player-id',
    payload: { memberId: 'local-player-id' }
}
```

Every command after room creation carries `expectedRevision`. A command based
on an older snapshot is rejected with `stale_revision`. Event sequence and room
revision increase monotonically. Retrying the same `commandId` returns the
original result with `replayed: true` and does not mutate, emit, or notify twice.
Idempotency keys are scoped to the actor; reusing one actor's key for different
command content is rejected with `idempotency_conflict`.

## Reconnect and snapshot contract

- Every joined member receives a local resume token in their own snapshot.
- `disconnect` changes presence without destroying readiness or room state.
- `resume` requires the last valid token and a new session ID.
- A successful resume rotates both session authority and the resume token.
- Commands from the old session are rejected with `stale_session`.
- Public member snapshots exclude other members' session IDs and resume tokens.
- The returned snapshot includes the room revision and last event sequence so a
  future network client can discard stale events and request a fresh snapshot.

The local token generator is intentionally dependency-free and is not suitable
as production authentication. A hosted adapter must use secure, server-issued,
expiring credentials.

## Competitive authority boundary

The client may send only intent commands such as `request_roll` and
`request_move`. The local adapter acknowledges them as `game_intent_received`;
it does not fabricate a roll or apply a move.

These outcomes are reserved for an authoritative hosted service:

- `dice_rolled`
- `move_applied`
- `turn_passed`
- `match_finished`
- `rating_changed`

Client payloads claiming dice, legality, winners, results, scores, or ratings
are rejected with `untrusted_outcome`. A future hosted adapter must invoke the
existing Nardora rule engine on the trusted side and publish only validated
events.

## Identity and privacy boundary

The v1 local identity projection accepts only:

- stable local `id`;
- `displayName`;
- approved built-in `avatarId`.

Unknown identity fields are discarded. No email, phone number, custom photo,
location, account credential, or remote identifier is collected or uploaded.
Issue #15 owns the versioned local profile schema and reset/migration behavior.

## Immediate safety seam

`mute_member`, `block_member`, and `report_member` exist at the table boundary
before chat or media is added. Mute and block lists are actor-scoped. Reports
accept a bounded category and remain local in the test adapter. They do not
pretend that a moderation operation or sanction exists.

Before hosted communication ships, follow-up work must define rate limits,
evidence retention, reviewer access, sanctions, appeals, deletion/export, age
assumptions, and regional privacy requirements. Camera and microphone remain
out of this slice and off by default in every future media flow.

## Local adapter usage

```js
import {
    InMemoryPrivateTableAdapter,
    TABLE_COMMAND,
    createPrivateTableCommand
} from './engine/privateTableProtocol.js';

const table = new InMemoryPrivateTableAdapter();
const result = table.dispatch(createPrivateTableCommand({
    commandId: 'create-1',
    type: TABLE_COMMAND.CREATE_ROOM,
    actorId: 'local-player',
    sessionId: 'local-session',
    payload: {
        identity: {
            id: 'local-player',
            displayName: 'Metin',
            avatarId: 'avatar-anatolia'
        }
    }
}));

const stop = table.subscribe(result.snapshot.roomId, update => {
    // A future Friend Match controller renders update.snapshot.
});
```

`dispatch`, `getSnapshot`, and `subscribe` form the provider-neutral client
surface. A future network adapter should preserve these semantics while
replacing in-memory maps with authenticated transport and persistence.

## Failure codes

The reference adapter uses stable error codes including `unsupported_version`,
`stale_revision`, `stale_session`, `invalid_invite`, `invalid_resume_token`,
`host_required`, `members_not_ready`, `room_closed`, and `untrusted_outcome`.
Player-facing controllers must translate these codes into EN/TR/RU copy rather
than displaying raw protocol messages.

## Hosted follow-up gates

Provider selection remains open. Before connecting this contract to a service:

1. approve account/privacy and data-location assumptions;
2. compare managed providers for cost, limits, latency, export, and lock-in;
3. implement a local Friend Match controller against this adapter;
4. add authoritative rule validation and deterministic reconnect integration;
5. add abuse controls and operations before chat or public discovery;
6. verify browser, mobile lifecycle, offline fallback, and observability.

No paid provider, secret, or remote personal-data flow is introduced by v1.
