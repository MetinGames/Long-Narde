# Nardora local player profile

Last reviewed: **2026-08-03**

This document defines the on-device identity and progression boundary delivered
for Issue #15. It does not define an account, remote profile, public ranking, or
trusted online result.

## Identity schema

`engine/playerIdentity.js` stores schema version 1 under
`nardora.playerIdentity.v1`:

```js
{
    schemaVersion: 1,
    id: 'local-...',
    displayName: 'Nardora Player',
    avatarId: 'avatar-anatolia'
}
```

- `id` is generated locally and reset with the profile.
- `displayName` is whitespace-normalized and limited to 24 characters.
- `avatarId` must be one of the 15 built-in catalog IDs.
- Unknown fields such as email, phone, photo URL, rating, achievements, or
  statistics are discarded.
- Invalid or unavailable browser storage falls back to a stable in-memory
  identity so local play remains available.

The legacy `longNarde.playerProfile` shape is accepted once, sanitized into the
v1 schema, written to the current key, and removed when storage permits.

## Built-in avatar policy

The first profile release uses 15 bundled emoji-based identities. Their IDs are
stable contract values; their TR/EN/RU labels may improve without changing the
IDs. There is no custom photo upload, remote URL, moderation claim, or personal
media collection in this release.

## Private-table projection

`toPrivateTableIdentity()` and `PlayerIdentityStore.getPrivateTableIdentity()`
return exactly:

```js
{
    id,
    displayName,
    avatarId
}
```

The projection is accepted by the provider-neutral private-table v1 adapter.
Local achievements, match history, wins, ratings, dice, moves, and results do
not cross this boundary and never become authoritative.

## Progression schema and migration

`engine/playerStats.js` stores schema version 2 under
`longNarde.playerStats.v2`. Existing v1 totals migrate automatically and are
preserved. New records add:

- current and best win streak;
- average moves derived from total moves and completed matches;
- matches, wins, and losses for Easy, Medium, Master, and Champion;
- persisted achievement IDs for First Table, First Victory, Table Regular, and
  Champion Hunter.

The old v1 record has no bot-difficulty history, so migrated historical matches
remain in the overall totals without being falsely assigned to a difficulty.
New matches are classified using the active bot difficulty at game end.

## Reset and failure behavior

- **Reset Profile** requires confirmation, generates a new local ID, restores
  the default name/avatar, and leaves statistics untouched.
- **Reset Statistics** uses its existing separate confirmation and removes both
  v2 and legacy v1 progression keys.
- Malformed or denied storage never blocks the game or exposes data remotely.
- There is no network request, backend dependency, secret, or paid service.

## Accessibility and responsive behavior

The profile/progression center is a modal dialog with Escape handling, a focus
trap, focus return, visible keyboard focus, touch-sized avatar buttons, an
aria-live save/reset message, and a scrollable small-screen body. Player-facing
labels are synchronized across Turkish, English, and Russian.
