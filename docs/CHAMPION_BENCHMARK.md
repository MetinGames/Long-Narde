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

## Next evidence-driven slices

1. Profile state `addb3dba`, especially double-dice branching, memo misses and
   snapshot copying, without changing legal-move behavior.
2. Convert Metin's reported checker-stacking weakness into one or more board
   fixtures with explicit desired trade-offs.
3. Change one evaluation boundary at a time and compare the same seeds.
4. Expand to a larger agreed sample only after the harness is stable.
5. Consider a Web Worker only if profiling shows player-visible blocking.
