# Nardora local Friend Match preview

Last reviewed: **2026-08-03**  
Issue: [#18](https://github.com/MetinGames/Long-Narde/issues/18)

The **Local Table Preview** is a same-device client vertical slice for Nardora's
private-table contract. It proves that local identity, room commands, snapshots,
subscriptions, reconnect authority, localization, and modal lifecycle can work
together before a backend or account provider is approved.

It is not an online match. The real Friend Match and Online buttons remain
disabled. The preview sends no network request, creates no account or shareable
invite link, uploads no personal data, and never creates dice, moves, winners,
scores, ratings, or other trusted game outcomes.

## Player flow

The host is the current device-only profile projected through the exact v1
private-table identity boundary. The second member is a fixed built-in simulated
friend on the same device.

| Step | Protocol behavior | Player-facing result |
| --- | --- | --- |
| Create | `create_room` | Local lobby and host snapshot appear |
| Invite | `create_invite` | One-use local simulation invite appears |
| Join | `join_room` | Simulated friend enters the lobby |
| Ready | two `set_ready` commands | Both local members become ready |
| Start | `start_match` | Room enters local preview-active state |
| Drop | `disconnect` | Friend presence becomes disconnected |
| Resume | `resume` | Latest snapshot returns; session and token rotate |
| Leave | `leave_room` | Friend loses active membership/resume authority |
| Close | `close_room` | Host closes the local room |

The UI exposes the table code, status, revision, invite state, protocol version,
member states, current step, and a compact lifecycle timeline. EN/TR/RU copy is
rendered through the shared i18n system and refreshes while the dialog is open.

## Ownership and safety

`engine/friendMatchPreviewController.js` owns:

- protocol dispatch, latest-snapshot reads, and exactly one room subscription;
- revision-aware idempotent command IDs and current session authority;
- resume-token rotation and recovery of the latest snapshot;
- dialog open/close state, Escape, Tab focus containment, and focus return;
- explicit `start()`/`stop()` listener lifecycle and subscription cleanup;
- lifecycle-version guards that ignore callbacks from a stopped/reset session;
- stable EN/TR/RU error-key mapping without exposing raw adapter messages;
- optional sanitized diagnostic events containing stage, protocol event,
  revision, and localized error key only.

`app.js` remains the composition root. It supplies the identity store,
translation function, DOM elements, and diagnostics callback; it does not own
the preview's protocol or listener state.

## Verification

Focused unit tests cover the complete lifecycle, reconnect token rotation,
latest-snapshot recovery, localized protocol errors, one-time listener
ownership, keyboard focus behavior, cleanup, stale subscription callbacks,
language refresh, and missing-identity fallback.

The Playwright smoke flow runs on desktop Chromium and iPhone portrait. It
confirms the real Friend Match entry stays disabled, the disclosure is visible,
all local states complete in order, revision 10 is reached, the dialog closes
without starting a match, and no local runtime request/page error is observed.

The service worker precaches the controller as part of the coherent local app
shell. The preview itself remains memory-only and resets on page reload.

## Hosted follow-up boundary

Issue [#19](https://github.com/MetinGames/Long-Narde/issues/19) must compare
provider cost, privacy, data location, regional latency, limits, export, and
lock-in without committing to a paid service. Issue
[#20](https://github.com/MetinGames/Long-Narde/issues/20) remains blocked until
Metin explicitly approves the provider and data model.

A hosted implementation must preserve the current adapter semantics while
adding authenticated, server-issued authority and server-side rule validation.
Only a working end-to-end hosted invite/reconnect/game flow can change the real
Friend Match availability state.
