# Champion Bot Benchmark

Last reviewed: **2026-08-03**  
Owner: **MetinGames + Codex**  
Execution issue: [#11](https://github.com/MetinGames/Long-Narde/issues/11)

## Purpose

Champion should become stronger through measurable play, never hidden dice or
rule advantages. This benchmark creates a repeatable baseline before strategy
weights, search depth, caching, or Web Worker architecture changes.

The engine difficulty named `hard` is the player-facing **Master** level. Each
seed runs twice: Champion as player one and Champion as player two. The pair
uses the same deterministic dice seed so side advantage is visible instead of
being confused with a different roll sample.

## Safety boundary

- The benchmark calls the same `NardeGame` and `NardeBot` code used by play.
- It does not alter legal moves, dice values after generation, or difficulty
  weights.
- Every executed move must still pass the live rule engine.
- Checker conservation is verified after moves and at match end.
- Matches stop at a configurable turn limit instead of hanging indefinitely.
- Results are informational; a weak baseline is evidence for the next small
  strategy change, not a reason to hide or rewrite the result.

## Commands

Run the default four-seed, eight-match paired sample:

```bash
npm run bot:benchmark
```

Run a smaller smoke sample:

```bash
npm run bot:benchmark -- --seeds 1103 --max-turns 120
```

Produce machine-readable evidence:

```bash
npm run bot:benchmark -- --json
```

Reproduce the pre-opponent-aware strategy as a development control:

```bash
npm run bot:benchmark -- --legacy-strategy
```

Reproduce and profile the known double-four slow state against the live
Champion engine:

```bash
npm run bot:profile
```

Use `npm run bot:profile -- --json` for the complete state, call counts, and
inclusive timing evidence. `--samples N` changes only the number of
uninstrumented timing samples.

Compare the live request-scoped cache with an uncached control:

```bash
npm run bot:cache-experiment
```

The comparison command must stop with an error if any outcome, move trace, dice
trace, final checker state, move count, or the profiled `3 → 7` choice changes.

## Recorded metrics

- Champion wins, Master wins, and turn-limit draws;
- Champion side for every paired match;
- turns played and a deterministic trace hash;
- decision count, average time, p95 time, and maximum time per difficulty;
- final borne-off counts, pip totals, and checker conservation in JSON output.

Wall-clock timings vary by device and runner. Win/loss and trace hashes are the
reproducible evidence; timings are used to spot regressions and decide whether
profiling justifies a worker or a narrower optimization.

## First baseline

Local baseline command: `npm run bot:benchmark`

| Sample | Champion | Master | Draws |
|---|---:|---:|---:|
| 4 seeds / 8 paired matches | 5 wins | 3 wins | 0 |

| Bot | Decisions | Average | P95 | Observed maximum |
|---|---:|---:|---:|---:|
| Champion | 858 | 23.26 ms | 69.02 ms | 2,015–2,271 ms across reruns |
| Master | 812 | 1.28 ms | 4.84 ms | 38.53 ms |

Paired outcomes and deterministic traces:

| Seed | Champion side | Winner | Turns | Trace |
|---:|---|---|---:|---|
| 1103 | P1 | Master | 82 | `b867a88d` |
| 1103 | P2 | Champion | 80 | `074b8818` |
| 2207 | P1 | Champion | 91 | `23210155` |
| 2207 | P2 | Master | 89 | `b89f40b8` |
| 3301 | P1 | Champion | 91 | `a9992998` |
| 3301 | P2 | Master | 91 | `644d68fa` |
| 4409 | P1 | Champion | 103 | `078b0822` |
| 4409 | P2 | Champion | 98 | `0ec76117` |

The worst repeatable state is seed `1103`, Champion as player two, turn 50,
with double fours. State hash `addb3dba` produced 38,736 memo hits and 75,786
memo misses before selecting `3 → 7`. The full state key is present in JSON
output so the next profiling slice can reconstruct it exactly.

Interpretation: Champion leads this small baseline, but eight matches are not
enough to close the strength gate. Typical decision time is within the current
responsive budget, while the repeatable two-second outlier needs targeted
search/state-copy profiling. This evidence does not yet justify a Web Worker.
Issue #11 remains open until a larger repeatable sample and real-match weakness
fixtures confirm an improvement.

## Targeted slow-state profile

The `bot:profile` command reconstructs state `addb3dba` directly from its
canonical search key. It verifies checker conservation, the exact restored
state, and the same `3 → 7` Champion choice before reporting any timings. The
profiler is development-only under `scripts/`; the player-facing engine and PWA
shell use the same request-scoped cache boundary, while the profiler adds only
development-time counters and timings.

Observed pre-integration local profile on 2026-08-03:

| Evidence | Result |
|---|---:|
| Uninstrumented decision average (3 samples) | 2,106.14 ms |
| Memo lookups | 114,522 |
| Memo hits / misses | 38,736 / 75,786 |
| Memo hit rate | 33.82% |
| Maximum-search calls | 843,956 |
| Raw legal-move scans | 89,467 |
| Rule-sequence queries | 120,091 |
| State keys built | 114,523 |
| Snapshots created / restored | 1,780,388 / 1,780,388 |
| Move execution attempts | 1,782,635 |
| Terminal plans scored | 9,520 |

Inclusive timing attributed roughly 2.36 seconds to
`getRuleCompliantDiceSequences`, while terminal plan scoring used about 31 ms.
The timings overlap because the measured methods are nested, but the
deterministic counts identify the dominant shape: repeated legal-move analysis
and snapshot copying, not Champion's position scoring.

This evidence did **not** justify changing a rule or strategy weight. It also
did not make a Web Worker the first response: a worker could hide main-thread
blocking while preserving almost two million copies and move attempts. The
request-scoped reuse experiment below proved a narrower optimization first.

## Runtime request-scoped rule-analysis cache

The live Champion engine now reuses two results during one decision:

1. rule-compliant dice sequences keyed by the complete search state and source
   slot;
2. maximum playable move counts keyed by the complete search state.

Each decision starts with empty caches and discards them in a `finally` block
before returning or throwing. Nested scopes share the same request and release
it only after the outer scope ends. Dice values and first-turn metadata remain
constant inside that request, while the key includes current player, head
moves, available dice, borne-off counts, and every occupied slot. Cached
sequence arrays are cloned before returning so a caller cannot mutate stored
evidence. Champion also falls back to the original uncached path when the scope
API is unavailable.

Observed local four-seed/eight-match runtime comparison on 2026-08-03:

| Slow state | Uncached control | Live runtime | Change |
|---|---:|---:|---:|
| Average decision | 2,599.27 ms | 385.32 ms | 6.75× faster |
| Memo lookups | 114,522 | 261 | 99.77% fewer |
| Maximum-search calls | 843,956 | 24,682 | 97.08% fewer |
| Snapshots created | 1,780,388 | 76,946 | 95.68% fewer |
| Move attempts | 1,782,635 | 78,333 | 95.61% fewer |

| Eight-match Champion timing | Uncached control | Live runtime | Change |
|---|---:|---:|---:|
| Average | 30.88 ms | 5.88 ms | 5.25× faster |
| P95 | 89.50 ms | 19.69 ms | 4.54× faster |
| Maximum | 2,690.30 ms | 364.56 ms | 7.38× faster |

The slow-state sequence cache hit 92.97% of 120,091 queries. The maximum-move
cache hit 96.97% of 24,682 queries and needed only 747 unique entries. Champion
still won 5–3, all eight move traces remained `b867a88d`, `074b8818`,
`23210155`, `b89f40b8`, `a9992998`, `644d68fa`, `078b0822`, and `0ec76117`,
and every match preserved 15 checkers per player.

Interpretation: request-scoped reuse is a substantially narrower and more
effective first response than a Web Worker. The live integration preserves the
same evidence, keeps strategy and rules unchanged, and advances the PWA cache
from `v8` to `v9` so offline players receive a coherent engine version.

## Opponent-aware beta strategy

Two representative positions now turn Metin's observed checker-stacking
weakness into deterministic trade-offs:

| Fixture | Immediate control | Opponent-aware choice | Measured change |
|---|---|---|---|
| `321328a7`, roll 1–4 | `7 → 11`, `11 → 12` | `2 → 3`, `6 → 10` | Maximum stack 6 → 5; front pressure 19 → 30; longest front prime 2 → 3; opponent first-move replies 21 → 19 |
| `6ae6c047`, roll 6–4 | `1 → 7`, `4 → 8` | `9 → 15`, `1 → 5` | Opponent first-move replies 34 → 32 |

The first evaluation boundary rewards occupied points only when they are ahead
of the opponent's rearmost checker, weights nearer blocking points more heavily,
and increases the existing penalty for stacks above four checkers. A prime
behind every opposing checker no longer receives a blocking bonus.

The second boundary applies a bounded one-move reply check to the best 12
immediate plans. For each hypothetical result it counts the opponent's legal
first moves for possible die faces 1 through 6, rewards fully blocked die faces,
and prefers fewer replies. This is intentionally a beta approximation: it does
not predict the next roll or search a complete two-dice opponent turn. Every
hypothetical move still uses the live rule engine, and the original board,
current player, dice, available moves, head-move count, and game status are
restored after analysis.

Observed local four-seed/eight-match comparison on 2026-08-03:

| Strategy | Champion | Master | Draws | Champion avg | P95 | Maximum |
|---|---:|---:|---:|---:|---:|---:|
| Pre-opponent-aware control | 5 | 3 | 0 | 5.89 ms | 19.74 ms | 380.18 ms |
| Opponent-aware beta | 8 | 0 | 0 | 7.86 ms | 20.99 ms | 538.17 ms |

Opponent-aware deterministic traces:

| Seed | Champion side | Winner | Turns | Trace |
|---:|---|---|---:|---|
| 1103 | P1 | Champion | 91 | `f1fa394c` |
| 1103 | P2 | Champion | 82 | `0cf64c86` |
| 2207 | P1 | Champion | 91 | `ecd5e920` |
| 2207 | P2 | Champion | 90 | `4a755d8d` |
| 3301 | P1 | Champion | 91 | `780a711d` |
| 3301 | P2 | Champion | 92 | `d2433106` |
| 4409 | P1 | Champion | 103 | `0e955a96` |
| 4409 | P2 | Champion | 98 | `88789e23` |

Both sides retain exactly 15 checkers in every match. The deterministic dice
generator and seeds are unchanged; changed play can change match length, so
each comparison consumes the same roll-sequence prefix rather than promising
identical full-match dice hashes. Eight wins are encouraging evidence, not a
claim that Champion is unbeatable. The PWA cache advances from `v9` to `v10`
with the engine change.

## Next evidence-driven slices

1. **Completed:** profiled state `addb3dba`; repeated rule-sequence analysis,
   memo misses, and snapshot copying dominate the two-second outlier.
2. **Completed:** prototyped request-scoped rule-analysis reuse outside the live
   engine; it preserved all eight traces and reduced the slow state to roughly
   0.45 seconds in the recorded run.
3. **Completed:** integrated the proven cache boundary into the runtime engine
   with exact legality, trace, lifecycle, PWA version, and fallback coverage.
4. **Completed:** converted Metin's checker-stacking report into front-block and
   opponent-reply fixtures with explicit, state-restoring trade-offs.
5. **Completed:** changed the opponent-aware evaluation boundary and compared
   the same four seeds; Champion moved from 5–3 to 8–0 in the paired sample.
6. Expand to a larger agreed sample only after the harness is stable.
7. Consider a Web Worker only if optimized profiling still shows
   player-visible blocking.
