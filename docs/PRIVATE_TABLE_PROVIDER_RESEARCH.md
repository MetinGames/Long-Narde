# Private-table provider research

**Date:** 2026-08-03  
**Issue:** [#19](https://github.com/MetinGames/Long-Narde/issues/19)  
**Decision state:** Research complete; provider commitment still requires product-owner approval.

## Executive recommendation

Use **Supabase as the preferred controlled-trial candidate**, keep **Cloudflare Durable Objects as the technical fallback**, and do not choose Firebase for the first trial.

This is a direction, not permission to create a hosted project, enable billing, collect personal data, or expose Friend Match as available. The local preview and the provider-neutral contract remain the working fallback until a synthetic-data trial passes the gates below and Metin explicitly approves the provider and minimal data model.

Why Supabase leads:

- Auth, private Realtime channels, presence, Postgres, row-level security, backups, and usage reporting cover the first private-table slice with fewer separate services.
- Standard Postgres plus `pg_dump` gives the clearest exit path. Supabase also documents restoration from its managed platform to a self-hosted deployment.
- A single EU project region can be chosen close to the initial Türkiye/Europe audience.
- The free quotas can support a small synthetic trial, while the paid plan exposes spend caps for covered usage items.

The main caution is authority: Supabase Realtime is transport, not the rules referee. Clients must send commands to a trusted transaction/function layer; only that layer may roll dice, validate moves, advance revisions, and publish accepted events.

## Product and traffic assumptions

These assumptions make the comparison reproducible. They are not launch forecasts.

| Model | Synthetic trial | Private beta model |
|---|---:|---:|
| Monthly active players | 100 | 5,000 |
| Completed two-player rooms/month | 500 | 50,000 |
| Peak connected players | 40 | 500 |
| Authoritative commands/room | 100 | 100 |
| Commands/month | 50,000 | 5,000,000 |
| Event deliveries/month, two recipients | about 100,000 | about 10,000,000 |
| Event payload budget | at most 2 KB | at most 2 KB |
| Realtime payload egress | under 0.2 GB | about 20 GB |

Presence joins/leaves, reconnects, auth calls, logs, backups, and rejected commands add overhead. The trial must measure provider meters instead of treating these estimates as an invoice.

## Decision matrix

Scores are 1 (weak) to 5 (strong) for Nardora's current private-table slice.

| Criterion | Weight | Supabase | Firebase / Firestore | Cloudflare Durable Objects |
|---|---:|---:|---:|---:|
| Trusted command/event boundary | 25% | 4 | 3 | 5 |
| Delivery speed and operational simplicity | 20% | 5 | 4 | 3 |
| Private-room authorization and data minimization | 15% | 4 | 4 | 4 |
| Small-scale cost predictability | 15% | 4 | 3 | 5 |
| Export and provider exit | 15% | 5 | 2 | 2 |
| Regional latency and reconnect fit | 10% | 4 | 4 | 5 |
| **Weighted result** | **100%** | **4.35** | **3.25** | **4.00** |

## Candidate findings

### 1. Supabase — preferred controlled trial

**Fit**

- Supabase supports anonymous users that receive normal authenticated JWT/RLS treatment while remaining recoverable only on the same retained session. CAPTCHA or another abuse control is recommended for anonymous sign-up. This fits a guest-first trial but does not remove the need for an approved recovery and deletion policy. See [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).
- Private Broadcast and Presence channels can be authorized with RLS against room membership; public channel access must be disabled. RLS complexity can affect channel-join latency, so policies must be small and indexed. See [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
- Presence is appropriate for slow-changing online/offline state, not high-frequency game state. Accepted commands/events should use Broadcast, while canonical room state remains persisted. See [Realtime Presence](https://supabase.com/docs/guides/realtime/presence).
- Each project has one primary region; Frankfurt is available and should be the first synthetic measurement region. See [available regions](https://supabase.com/docs/guides/platform/regions).

**Authority design**

1. An authenticated guest joins only a private room for which a membership row exists.
2. The client submits `{ commandId, roomId, actorId, expectedRevision, type, payload }` to a trusted RPC/Edge Function.
3. A database transaction verifies membership, idempotency, revision, turn, and Long Narde legality; trusted code generates dice and outcomes.
4. The transaction stores the next snapshot/event before a private Broadcast notifies both clients.
5. Reconnect reads the canonical snapshot and rotates the resume token. Client Broadcast must never be the authoritative write path.

**Cost and limits**

- Current Free quotas include 200 peak Realtime connections and 2 million messages. Pro includes 500 peak connections and 5 million messages; overage is currently $10 per 1,000 peak connections and $2.50 per million messages. See [Realtime connection usage](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections) and [Realtime message usage](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages).
- Under the private-beta model, 500 peak connections fit the listed Pro allowance and roughly 5 million message deliveries exceed the included message allowance, an order-of-magnitude overage of about $12.50. If every command invokes an Edge Function, 5 million calls also exceed the listed 2 million Pro allowance by about $6. Compute, egress, auth, logs, backups, tax, and project base cost remain additional. See [billing](https://supabase.com/docs/guides/platform/billing-on-supabase) and [Edge Function invocation usage](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations).
- Pro's spend cap can block covered overages rather than silently charging them; production availability under a hard cap still needs a graceful capacity response. See [cost control](https://supabase.com/docs/guides/platform/cost-control).

**Operations and exit**

- Paid projects receive daily backups; PITR is an add-on. Logical backups can also be produced with the CLI. See [database backups](https://supabase.com/docs/guides/platform/backups).
- Postgres schema/data can be dumped, and Supabase documents restoring a managed project into a self-hosted instance. Storage objects, Edge Functions, Auth configuration, and Realtime policies still require a separate migration plan. See [restore to self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform).
- Realtime reports expose connections, message volume, execution time, and lag. See [Realtime reports](https://supabase.com/docs/guides/realtime/reports).

**Current-change warning**

Supabase's 2026 changelog introduces safer explicit exposure defaults: new public tables are moving to explicit `GRANT` requirements, and schema enumeration through an anonymous key has been removed. Any trial migrations must declare grants and RLS explicitly and use current publishable/secret key guidance. See the [Supabase changelog](https://supabase.com/changelog) and [table exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

### 2. Cloudflare Durable Objects — technical fallback

**Fit**

- One Durable Object per room provides a naturally single-threaded authority, private strongly consistent storage, and a direct WebSocket coordinator. This is an excellent match for ordered commands, revisions, idempotency, reconnect snapshots, and server-owned dice.
- The Hibernation WebSocket API keeps clients connected while an idle object leaves memory, removing duration charges during hibernation. In-memory state is lost on hibernation, so canonical state must be stored. See [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
- EU jurisdiction restriction is available. Location hints are best-effort and existing objects do not currently relocate, so room creation placement must be measured for players far apart. See [data location](https://developers.cloudflare.com/durable-objects/reference/data-location/).

**Cost and limits**

- Durable Objects are available on the Workers Free and Paid plans. The Paid allowance currently includes 1 million requests and 400,000 GB-s per month; incoming WebSocket messages receive a 20:1 billing ratio, outgoing messages are not request-charged, and the paid floor is documented as $5/month. See [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).
- With hibernation and compact SQLite writes, the private-beta command count could remain close to the paid floor: 5 million incoming messages are about 250,000 billed request equivalents before connections/other Worker requests, and 5 million row writes remain inside the listed 50 million paid allowance. This is only a model; duration, Worker-front-door requests, indexes, alarms, logs, and extra services must be measured.
- A SQLite-backed object has a 10 GB paid storage limit and a soft limit around 1,000 requests/second per object, far above a two-player turn-based room. See [Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

**Operations and exit**

- SQLite-backed objects have 30-day point-in-time recovery, but Durable Objects are Workers-only and lower-level; Cloudflare explicitly notes that teams may need to build database tooling that D1 provides. See [Durable Object storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/).
- There is no integrated Nardora end-user account model in this candidate. A separate identity/token system, abuse controls, deletion index, cross-room reporting store, and export process would be required.
- Room authority is the cleanest of the three choices, but the Worker/Object APIs and per-object export tooling create a larger exit and implementation burden. Keep it as fallback if the Supabase transaction/Broadcast path misses correctness or latency gates.

### 3. Firebase / Firestore — not the first trial

**Fit**

- Firebase supports temporary anonymous accounts and later credential linking. See [anonymous Firebase Authentication](https://firebase.google.com/docs/auth/web/anonymous-auth).
- Firestore snapshot listeners provide low-latency updates and automatically reconnect, but each result change is a billed document read. Reconnects can repeat query reads depending on offline-persistence behavior. See [realtime queries](https://firebase.google.com/docs/firestore/real-time_queries_at_scale) and [Firestore pricing](https://cloud.google.com/firestore/pricing).
- Frankfurt and a European multi-region are available, but a database location cannot be changed after provisioning. See [Firestore locations](https://firebase.google.com/docs/firestore/locations).

**Why it ranks third**

- The direct-client document model is convenient, but Nardora still needs trusted Cloud Functions/Admin code and transactions for dice, legality, ordering, and results; Security Rules alone are not the game authority.
- Cost is usage-sensitive across reads, listener reconnects, writes, rule-dependent reads, Functions, Auth, storage, and egress. The documented free database quota is 50,000 reads/day and 20,000 writes/day; paid rates depend on region. A compact beta can be inexpensive, but accidental fan-out and reconnect patterns are less predictable than a room-message quota.
- Managed export requires billing and Cloud Storage, charges document reads, and produces Firestore-specific export data rather than a standard relational dump. See [Firestore export/import](https://firebase.google.com/docs/firestore/manage-data/export-import). Moving the room/event model to another database would therefore require more transformation than Postgres.

## Minimal data map for a trial

All remote identifiers below are pseudonymous but may still be personal data when linkable to a device/session. A legal/privacy review remains required before real-player collection.

| Data | Purpose | Proposed retention | Explicitly excluded from trial |
|---|---|---|---|
| Hosted guest actor ID + built-in avatar ID + bounded nickname | room membership and display | until guest deletion or 30 days inactive | email, phone, social identity, custom photo |
| Room ID, hashed invite secret, membership, status | private join and lifecycle | active room plus 24 hours | public room directory, contacts, precise location |
| Canonical snapshot, revision, command IDs, accepted events | authority, reconnect, idempotency | snapshot plus 24 hours; event trace 7 days during synthetic trial | client-reported dice, win, score or rating |
| Presence state | online/offline and reconnect UX | live channel only; last-seen not retained | cursor/mouse telemetry, background activity |
| Security/operational logs | abuse detection and diagnosis | provider default must be documented before real-player trial | chat, voice, video, advertising ID |

Provider infrastructure may process IP addresses and request metadata in service logs. The application must not copy them into gameplay tables. Before a real-player trial, the privacy notice must name the provider/region, purposes, retention, deletion/export path, subprocessors, and contact route.

## Controlled-trial plan

No provider project is created by this research change.

1. **Local harness:** keep the existing in-memory adapter as the contract oracle. Add provider conformance tests without importing a provider SDK into the game engine.
2. **Approval gate:** Metin approves the preferred provider, EU region, synthetic-only dataset, free-tier boundary, and deletion schedule before any console/account action.
3. **Synthetic Supabase trial:** create an isolated free project with no real player data, explicit grants/RLS, private channels, a trusted command transaction, and disposable test identities.
4. **Correctness/chaos:** run duplicate, stale-revision, reordered, unauthorized, disconnect, token-replay, room-close, and service-restart scenarios.
5. **Regional/load measurement:** measure Türkiye and representative EU/RU routes with 20 then 250 concurrent rooms; record p50/p95/p99 command-to-event and reconnect times plus provider meter deltas.
6. **Exit drill:** export schema/data, restore into local Postgres, disable the remote project, and prove the local preview still works.
7. **Decision review:** only then propose #20 implementation scope, paid budget, real-player privacy text, and account transition.

## Pass and rejection criteria

The Supabase candidate passes only if all of these are demonstrated:

- zero cross-room reads/writes and zero client-authoritative dice/move/result paths in automated adversarial tests;
- 10,000 mixed commands with no duplicate application, revision regression, or unrecoverable state divergence;
- command-to-accepted-event p95 at or below 350 ms and p99 at or below 750 ms on the agreed Türkiye/EU test routes;
- reconnect-to-canonical-snapshot p95 below 2 seconds;
- the beta-model projection remains at or below **$50/month before tax** with a documented hard/operational cap; this is an evaluation ceiling, not spending approval;
- app-owned data deletion completes within 24 hours, and an export/restore drill completes within one working day;
- provider code remains behind the #16 adapter so local play, tests, and the no-provider fallback remain operational.

Reject or pause the candidate if any authority/privacy test fails, the region cannot meet the latency gate, metering cannot be explained, a required security control needs an unapproved paid feature, export cannot reproduce canonical state, or implementation leaks into the core rules engine.

## Approval assumptions still open

The research recommends but does not approve:

- pseudonymous anonymous guest accounts for the invite-only alpha;
- EU/Frankfurt as the first data region;
- no email/phone/social login, public profile, matchmaking, chat, ranking, voice, or video in the first hosted slice;
- 24-hour closed-room snapshot retention and seven-day synthetic event traces;
- a $50/month beta evaluation ceiling and any paid subscription;
- Supabase as the committed production provider.

Until these are explicitly approved and #20 passes end to end, the real Friend Match and Online buttons remain disabled and the same-device preview remains clearly labelled as not online.
