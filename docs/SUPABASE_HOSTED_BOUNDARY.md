# Supabase hosted-adapter safety boundary

This is a pre-deployment contract for Issue #20, not a production availability
claim. The browser continues to use the in-memory provider-neutral adapter and
Friend Match/Online remain non-networked.

## Schema and authority

- Nardora-owned tables/functions live in an application schema such as
  `nardora`; migrations never create, alter, truncate, or drop objects in the
  provider-managed `auth`, `storage`, or `realtime` schemas.
- Supabase locked the `realtime` schema against object modification on
  2026-07-17. Authorization policies on `realtime.messages` remain the intended
  customization path. `npm run supabase:safety` enforces this boundary before
  any future migration is accepted.
- Every application table declares grants and RLS explicitly. New tables must
  not rely on historical automatic Data API exposure behavior.
- Realtime Broadcast/Presence transports accepted events; it is not the game
  referee. A trusted transaction or Edge Function owns dice, legal moves, turn
  order, result, monotonic revision, idempotency, and session rotation.

## Deployment gate

Before a real project is connected: approve provider/region/spend and data map;
use synthetic identities first; prove anonymous-auth abuse controls, RLS
membership isolation, private channel authorization, reconnect/reorder
convergence, rate limits, logs without secrets, export/restore, purge, and
rollback. Then run two authenticated browsers plus physical devices. No URL,
key, real-player record, or availability wording belongs in the client before
those gates pass.

Primary references:

- https://supabase.com/changelog?types=breaking-change
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/database/postgres/row-level-security
