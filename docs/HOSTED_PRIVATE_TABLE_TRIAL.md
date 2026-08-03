# Hosted private-table synthetic trial

**Issue:** [#20](https://github.com/MetinGames/Long-Narde/issues/20)  
**Provider:** Supabase Free, isolated trial project  
**Region:** `eu-central-1` (Frankfurt)  
**Project ref:** `stwkylopnsohxqnvzrci`  
**Player availability:** disabled

## Approved boundary

Metin approved a disposable Supabase trial using only generated identities and
gameplay data. The approval does not cover real players, email, phone, social
login, billing, a paid plan, public matchmaking, or an availability claim.

The trial stores only:

- generated Auth UUIDs;
- bounded synthetic display names and built-in avatar IDs;
- private room membership, revisions and lifecycle events;
- hashed invite/resume tokens and actor-scoped command IDs;
- synthetic safety-action records needed to test access boundaries.

Closed rooms receive a 24-hour deletion deadline. The purge RPC is deliberately
service-only and must be exercised during the deletion/exit drill. Provider
request logs may still contain infrastructure metadata; no application table
copies IP addresses or request headers.

## Authority boundary

The browser receives a publishable key and a user JWT only. The Edge Function:

1. requires a platform-verified JWT;
2. asks Supabase Auth for the current user;
3. rejects a mismatched client `actorId` and overwrites it with the verified UUID;
4. calls a service-only Postgres RPC with the secret key from the managed function
   environment;
5. returns the committed server snapshot or a structured protocol error.

The database transaction owns lifecycle changes, room revision, event sequence,
idempotency and session rotation. Invite and resume tokens are derived inside the
trusted boundary; only their SHA-256 digests are stored. Safe command results are
cached for retry, while raw tokens are reconstructed only for the requesting
actor and are never broadcast.

`request_roll` and `request_move` intentionally fail with
`trusted_gameplay_not_ready`. This is the most important honesty boundary in the
trial: the hosted room cannot become playable until dice generation, legal-move
validation and results run on the server.

## Realtime boundary

- Every client channel must use the topic `private-table:<room UUID>` with
  `{ private: true }`.
- Authenticated members may receive server Broadcast and member Presence only for
  a room containing their own active membership.
- Clients may publish Presence only. There is no client Broadcast-write policy.
- Actor-scoped mute, block and report events are returned only to the actor and
  are not broadcast.
- The Supabase dashboard **Allow public access** switch must be disabled before
  any authenticated channel test. This remains a manual launch gate.
- The first Frankfurt trial project reported a provider-side Realtime tenant
  migration failure during provisioning, so `realtime.messages` and
  `realtime.send` were absent even after one controlled pause/restore. Canonical
  transactions therefore fail safe without broadcasting when the managed
  function is missing. Realtime authorization remains a failed/open gate; it
  must not be replaced by client authority or hand-built provider internals.
- A secret-free provider handoff is maintained in
  [SUPABASE_REALTIME_INCIDENT.md](SUPABASE_REALTIME_INCIDENT.md).

Realtime is a notification path, not canonical state. On every accepted event or
reconnect, the client recovers its actor-scoped snapshot through the Edge
Function.

## Repository components

| Component | Responsibility |
|---|---|
| `engine/hostedPrivateTableAdapter.js` | Provider-neutral async adapter, response authority checks, local resume-token custody, HTTP transport injection |
| `supabase/functions/private-table/index.ts` | Authenticated command/snapshot front door; verified actor projection; managed secret use |
| `supabase/schemas/private_table_trial.sql` | Declarative schema with explicit grants, RLS, private data, lifecycle transaction, private Realtime policies and purge RPC |
| `supabase/config.toml` | Standard declarative-schema path and explicit JWT-required function configuration |
| `tests/hosted-private-table-adapter.test.js` | Adapter, secret-boundary and provider-error contract tests |
| `tests/supabase-private-table-trial.test.js` | Static RLS, grants, token-storage, Realtime and Edge authority checks |

Nothing imports the hosted adapter from `app.js`. The existing same-device preview
and offline bot game remain the active fallback.

## Remote verification evidence

The Frankfurt trial was migrated and exercised on 2026-08-03. The deployed Edge
Function is `private-table` version 1 with status `ACTIVE` and
`verify_jwt: true`. The repository adapter is still not imported by the app, so
this deployment does not make Friend Match available to players.

| Scenario | Remote result |
|---|---|
| Duplicate command ID, same body | Passed: `replayed: true`, revision/event count unchanged |
| Duplicate command ID, changed body/session | Passed: `idempotency_conflict` |
| Stale expected revision | Passed: `stale_revision`, no mutation |
| Wrong actor/session | Passed: `identity_mismatch` / `stale_session` before mutation |
| Actor-scoped authenticated read | Passed: host saw one room and only its own membership row |
| Non-member authenticated read | Passed: zero rooms and zero membership rows |
| Reused/expired invite | Passed: both rejected as `invalid_invite` |
| Disconnect then resume | Passed: session and resume token rotated; revision 8 snapshot recovered |
| Replayed old resume token | Passed: `invalid_resume_token` |
| Client dice/result fields | Passed: `untrusted_outcome` |
| Hosted roll/move request | Passed: `trusted_gameplay_not_ready` |
| Close then purge | Passed: cascade left zero rows in every trial table |
| Private Realtime topic | **Blocked:** provider-owned Realtime schema/function is absent |

The Supabase Security Advisor returned no lints. The Performance Advisor's two
missing foreign-key index notices were fixed with
`private_table_trial_fk_indexes`; the remaining informational notices say that
retention and foreign-key indexes are unused, which is expected after the trial
purged all data. The table inspector also emits a generic "RLS disabled" warning
for the non-exposed `private_table_private` schema. That schema is deliberately
outside the API surface, has zero `anon`/`authenticated` grants, and the public
RLS tables expose only actor-scoped reads; therefore the warning has no reachable
client access path. Enabling private-table RLS without a service policy was not
applied automatically.

The applied remote migration history is:

- `private_table_trial_core`
- `private_table_trial_dispatch`
- `private_table_trial_rpc_access`
- `private_table_trial_realtime_guard`
- `private_table_trial_comments`
- `private_table_trial_dispatch_scope_fix`
- `private_table_trial_member_row_fix`
- `private_table_trial_fk_indexes`

No Auth users were created for the synthetic transaction drill. Platform JWT
enforcement and the function's second Auth lookup are deployed, but an actual
two-user authenticated Edge/Realtime browser test remains a separate gate.

## Remaining gates

This PR is only the hosted lifecycle foundation. Issue #20 remains open until the
full provider-conformance, anonymous-auth abuse controls, private Realtime,
multi-client Playwright, real-device, chaos/load, latency, metering, export/restore
and deletion tests pass. Real Friend Match remains disabled until server-owned
Long Narde gameplay also passes and Metin separately approves launch/privacy.

## Rollback and exit

The schema is isolated under `private_table_*` names plus two named Realtime
policies. Rollback for the synthetic project is deletion of the disposable project
after exporting the migration and synthetic verification report. The local
in-memory adapter, offline game and same-device preview do not depend on Supabase,
so provider rejection does not remove any shipped capability.
