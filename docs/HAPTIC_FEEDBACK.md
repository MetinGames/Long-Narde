# Haptic Feedback Boundary

Issue #67 adds a browser/native capability seam without giving vibration any game authority.

## Product behavior

- Haptic feedback is explicitly opt-in and defaults to off.
- The preference is stored only on the current device under `nardora.haptics.v1`.
- No telemetry, identity, permission loop, or remote request is involved.
- Unsupported, false-returning, and throwing platform APIs are silent no-ops.
- Audio, dice, timers, rules, bot decisions, and rendering never depend on vibration success.

## Successful events

| Event | Pattern | Trigger boundary |
|---|---:|---|
| Human checker move | 18 ms | After the rule engine accepts and applies the move |
| Human checker collection | 24 ms | After a legal bearing-off move is applied |
| Human Undo | 12 ms | After Undo succeeds and the reverse transition completes |

Bot moves, dice rolls, selection changes, rejected moves, canceled flows, manual turn confirmation, and timeout transitions do not vibrate. Stable event IDs suppress duplicate delivery without changing gameplay scheduling.

## Physical-device gate

The adapter uses `navigator.vibrate` when available and otherwise does nothing. Android Chrome/PWA and iPhone Safari/PWA feel, interruption, battery, and accessibility behavior still require physical-device notes. The preference must remain default-off until that evidence is recorded; engineering tests cannot substitute for hardware validation.
