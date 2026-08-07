# Renderer Invalidation Evidence

Issue #69 is an evidence gate, not approval for a Canvas architecture rewrite.

## Development counters

Open the local or Pages build with `?renderMetrics=1`. The renderer then exposes a development-only `window.__NARDORA_RENDER_METRICS__` object with `snapshot()` and `reset()` functions. It counts full renders, static-board rebuilds, animation frames, duplicate idle frames, and state frames by scenario. The flag is off by default; counters do not schedule frames, persist state, transmit telemetry, or include player identity.

## Repeatable profile

Run:

```bash
npm run renderer:profile
npm run renderer:profile -- --json
```

The deterministic representative trace covers start, roll, checker movement, bot turn, resize, theme change, and victory animation. JSON is the machine-readable contract; Markdown is the review summary.

## Decision budget

A bounded render-on-demand experiment is justified only when all of the following evidence rules are respected:

- at least 30 full renders are sampled;
- duplicate idle frames exceed 5% of full renders, or static-board rebuilds exceed 10%;
- any proposed experiment preserves game state and scheduling authority;
- CI and physical-device evidence demonstrate a player-visible or budget-relevant benefit.

The current representative trace records 39 full renders, 34 intentional animation frames, two static-board rebuilds, and one duplicate resize render. The 2.56% idle ratio and 5.13% static rebuild ratio remain below budget. The current event-driven rendering should therefore remain in place; no production architecture change is justified by this evidence.
