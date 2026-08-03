# Supabase Realtime provisioning incident

**Project:** `nardora-private-table-trial`  
**Project ref:** `stwkylopnsohxqnvzrci`  
**Region:** `eu-central-1` (Frankfurt)  
**Plan/data:** Free, disposable, generated synthetic data only  
**Database:** PostgreSQL 17 (`17.6.1.155`)  
**First observed:** 2026-08-03

## Summary

The project reports `ACTIVE_HEALTHY`, and its Database, Auth, REST and Edge
Function surfaces respond. The provider-owned Realtime tenant did not finish its
database migration. The `realtime` schema contains no tables or functions, so
private Broadcast/Presence authorization cannot be installed or verified.

This is not an application migration failure. Supabase documentation says the
managed Realtime service creates `realtime.schema_migrations`,
`realtime.subscription`, `realtime.messages`, `realtime.send` and
`realtime.broadcast_changes`:

- [Realtime database resources](https://supabase.com/docs/guides/realtime/concepts#database-resources)
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)

## Evidence

The first tenant migration attempt failed while creating
`realtime.schema_migrations`:

```text
MigrationsFailedToRun
PostgreSQL 57P01 / admin_shutdown
terminating connection due to administrator command
```

Subsequent Realtime requests return HTTP 200 at the outer service while logging:

```text
Database supervisor not found for tenant stwkylopnsohxqnvzrci
```

Read-only catalog checks show:

- zero relations in schema `realtime`;
- no `realtime.messages` table;
- no `realtime.send(jsonb,text,text,boolean)` function;
- no application Auth users or remaining synthetic room data.

## Safe recovery already attempted

1. Confirmed the main project and Postgres were healthy.
2. Waited and retried the Realtime health path.
3. Performed one controlled pause/restore because the project was disposable and
   contained no real users or room data.
4. Rechecked the catalog and Realtime logs after restore.

The provider-owned objects remained absent. No Supabase internal table, function,
migration record or tenant setting was created manually.

## Requested provider action

Please reprovision or rerun the managed Realtime tenant migrations for project
`stwkylopnsohxqnvzrci`, then confirm that the database supervisor is attached.
The expected completion signal is the presence of the documented managed tables
and functions, followed by a successful private-channel authorization test.

## Application containment

- Canonical room transactions do not depend on Realtime delivery.
- The dispatcher checks for the managed `realtime.send` signature and fails safe
  without Broadcast when it is absent.
- The client has no Broadcast-write authority.
- Hosted dice/moves remain disabled with `trusted_gameplay_not_ready`.
- Friend Match and Online remain unavailable to players.

No secret key, database password, access token, invite token, resume token,
personal information or real-player data is included in this report.
