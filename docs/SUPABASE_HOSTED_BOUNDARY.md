# Supabase hosted-adapter safety boundary

This document records the controlled synthetic-provider checkpoint for Issue #20,
not a production availability claim. The browser continues to use the in-memory
provider-neutral adapter and Friend Match/Online remain unavailable.

## Schema and authority

- Nardora-owned application data stays outside the provider-managed `auth`,
  `storage`, and `realtime` schemas.
- Supabase restricts provider-managed schema mutation. Authorization policies on
  `realtime.messages` remain the intended customization path.
  `npm run supabase:safety` enforces this boundary before any future migration
  is accepted.
- Every application table declares grants and RLS explicitly. New tables must
  not rely on historical automatic Data API exposure behavior.
- Realtime Broadcast/Presence transports accepted events; it is not the game
  referee. A trusted transaction or Edge Function owns dice, legal moves, turn
  order, result, monotonic revision, idempotency, and session rotation.
- Private-schema tables currently deny schema/table access to `anon` and
  `authenticated` roles while `service_role` retains the required access.
  Enabling RLS there remains a separately reviewed defense-in-depth migration;
  it must not be applied as an unreviewed production change.

## Verified synthetic-provider checkpoint — 2026-08-07

- The isolated Supabase project is `ACTIVE_HEALTHY` on the Free plan in
  Frankfurt (`eu-central-1`); no paid upgrade was made.
- Provider-owned `realtime.messages` and
  `realtime.send(jsonb,text,text,boolean)` are provisioned.
- The JWT-required `private-table` Edge Function is active and revalidates the
  caller before invoking service-only commands.
- A generated-data lifecycle completed create → invite → join → both ready →
  start → disconnect → resume → close with monotonic revisions 1–9 and rotated
  resume credentials.
- The exact synthetic room was deleted after the proof. Rooms, members, events,
  and processed-command tables returned to zero rows.
- Supabase Security Advisor reports zero lints. Two unused retention-index
  notices are expected informational results on the empty trial.
- No Supabase URL, key, generated credential, or real-player record was added to
  the Nardora client or repository.

## Remaining launch gates

- Run the authenticated two-browser Edge/Realtime lifecycle.
- Move Long Narde dice, legal moves, turns, and results behind trusted authority.
- Prove anonymous-auth abuse controls, private-channel isolation, rate limits,
  reconnect/reorder convergence, logs without secrets, load/latency/metering,
  export/restore, purge, rollback, and physical-device behavior.
- Approve the production region, minimal data map, retention, spend ceiling,
  privacy text, and launch separately. The Frankfurt synthetic trial does not
  decide the production region.
- Keep Friend Match and Online disabled until every gate passes.

Primary references:

- https://supabase.com/changelog?types=breaking-change
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/database/postgres/row-level-security
