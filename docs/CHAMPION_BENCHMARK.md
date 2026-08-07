# Champion Bot Benchmark

Last reviewed: **2026-08-04**  
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

Run the fixed extended 16-seed, 32-match evidence sample:

```bash
npm run bot:benchmark -- --extended
```

The extended v1 list keeps the original four seeds and adds twelve seeds that
were fixed before observing their outcomes. Do not add, remove, or replace a
seed in response to a win/loss result; version the sample and explain the
selection rule instead.

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
| `321328a7`, roll 1–4 | `7 → 11`, `24 → 1` | `6 → 10`, `24 → 1` | Black wrap progress is preserved; front pressure 19 → 30; longest front prime 2 → 3; opponent first-move replies 24 → 22 |
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

## Fixed extended validation v1

The first expanded sample was fixed before observing its outcomes. It retains
the original four seeds and adds twelve monotonically listed seed IDs:
`5501`, `6607`, `7703`, `8807`, `9901`, `11003`, `12101`, `13217`, `14303`,
`15401`, `16519`, and `17609`. Each seed still runs with Champion on both
sides, producing 32 paired matches. The same list is available through
`npm run bot:benchmark -- --extended`; `--extended` and a custom `--seeds`
list are mutually exclusive so a recorded run cannot silently mix samples.

Observed local comparison on 2026-08-03:

| Strategy | Champion | Master | Draws | Decisive win rate | Champion avg | P95 | Maximum |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pre-opponent-aware control | 20 | 12 | 0 | 62.50% | 6.23 ms | 19.13 ms | 992.78 ms |
| Opponent-aware beta | 27 | 5 | 0 | 84.38% | 8.39 ms | 22.78 ms | 1,032.97 ms |

The opponent-aware boundary gains seven net wins and 21.88 percentage points
in decisive win rate. Eight individual side/seed matches change from a Master
win to a Champion win; one changes from Champion to Master. This is a stronger
signal than the original eight-match sample without claiming statistical
certainty or unbeatable play.

Opponent-aware extended traces:

| Seed | Champion as P1 | Champion as P2 |
|---:|---|---|
| 1103 | Champion, `f1fa394c` | Champion, `0cf64c86` |
| 2207 | Champion, `ecd5e920` | Champion, `4a755d8d` |
| 3301 | Champion, `780a711d` | Champion, `d2433106` |
| 4409 | Champion, `0e955a96` | Champion, `88789e23` |
| 5501 | Champion, `5b66d39d` | Champion, `f56eb4e4` |
| 6607 | Champion, `ab3cfee4` | Champion, `19f91c3a` |
| 7703 | Champion, `16c5c0d9` | Champion, `e0199c7d` |
| 8807 | Champion, `7e5756c6` | Champion, `8f70dc95` |
| 9901 | Champion, `18b2ee40` | Champion, `4631912e` |
| 11003 | Champion, `379b2584` | Champion, `b672ce98` |
| 12101 | Champion, `05bceb82` | Master, `a42d4b0a` |
| 13217 | Champion, `6f7fc7d4` | Champion, `26bf9a12` |
| 14303 | Master, `65ff75d9` | Champion, `d722ae37` |
| 15401 | Champion, `d6a56d7d` | Master, `df887f03` |
| 16519 | Champion, `05a24a47` | Master, `d213a418` |
| 17609 | Champion, `b6c56980` | Master, `f44ae9ba` |

All 32 matches finish without a turn-limit draw and retain exactly 15 checkers
per player. The 22.78 ms p95 remains inside the current responsive budget. The
slowest Champion decision is 1,032.97 ms at state `db3406da`; that isolated
double-two state is explicit follow-up evidence, not by itself justification
for moving all search into a Web Worker.

This table is retained as historical pre-fix evidence. Its player-two pip
totals used a home-board bearing-off helper outside its valid domain, so the
27–5 result is not the current runtime baseline.

## Symmetric pip-distance training

Four of the five losses in the first extended opponent-aware run occurred with
Champion as player two. The shared cause was not the dice or a Long Narde rule:
Champion and the benchmark summed every checker with
`Board.getBearOffDistance`, even though that helper is defined for bearing off
inside a player's home board. For player two it made early-board values zero or
negative and made the legal `24 → 1` wrap look like a 23-pip regression.

The engine now owns a general all-board measure:
`Board.getPipDistance(player, slot) = 24 - getProgress(player, slot)`. Both the
Champion evaluator and benchmark reporter use this same method. Initial pip
totals are therefore 360 for both sides, and player-two distance changes
continuously from 13 at slot 24 to 12 at slot 1. Move legality, dice generation,
and rule weights are unchanged.

Representative regression fixture:

| Fixture | Asymmetric metric | Symmetric metric | Measured change |
|---|---|---|---|
| `a200798a`, P2 roll 6–3 | −52 pips; `13 → 16`, `16 → 22` | 284 pips; `22 → 4`, `24 → 3` | Advances both rear checkers across the wrap; opponent first-move replies 32 → 30 |

The fixed 16-seed/32-match sample separates the pip correction from the
opponent-aware layer:

| Strategy | Pip metric | Champion | Master | Draws | Decisive win rate | Champion avg | P95 | Maximum |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Pre-opponent-aware control | Asymmetric historical | 20 | 12 | 0 | 62.50% | 6.23 ms | 19.13 ms | 992.78 ms |
| Pre-opponent-aware control | Symmetric | 26 | 6 | 0 | 81.25% | 9.64 ms | 28.76 ms | 957.80 ms |
| Opponent-aware beta | Asymmetric historical | 27 | 5 | 0 | 84.38% | 8.39 ms | 22.78 ms | 1,032.97 ms |
| Opponent-aware beta | Symmetric | 31 | 1 | 0 | 96.88% | 9.86 ms | 26.17 ms | 1,096.10 ms |

The symmetry correction gains six wins in the control and four in the live
opponent-aware strategy. With the same corrected metric, opponent awareness
still adds five wins, so the two improvements have independent evidence. All
16 player-two matches now finish as Champion wins. The one remaining loss is
seed `14303` with Champion as player one; it is preserved as evidence rather
than tuned away without a representative real-match weakness.

Symmetric opponent-aware traces before the opponent-prime refinement:

| Seed | Champion as P1 | Champion as P2 |
|---:|---|---|
| 1103 | Champion, `f1fa394c` | Champion, `1d6e2d08` |
| 2207 | Champion, `ecd5e920` | Champion, `f7ca2a21` |
| 3301 | Champion, `780a711d` | Champion, `57206081` |
| 4409 | Champion, `0e955a96` | Champion, `7e584e7e` |
| 5501 | Champion, `5b66d39d` | Champion, `90f0d01d` |
| 6607 | Champion, `ab3cfee4` | Champion, `e5724e12` |
| 7703 | Champion, `16c5c0d9` | Champion, `b00d5076` |
| 8807 | Champion, `7e5756c6` | Champion, `7ec7a37f` |
| 9901 | Champion, `18b2ee40` | Champion, `923b5e3d` |
| 11003 | Champion, `379b2584` | Champion, `5520319b` |
| 12101 | Champion, `05bceb82` | Champion, `909c0c42` |
| 13217 | Champion, `6f7fc7d4` | Champion, `1373b10a` |
| 14303 | Master, `65ff75d9` | Champion, `aeca676b` |
| 15401 | Champion, `d6a56d7d` | Champion, `d21562ef` |
| 16519 | Champion, `05a24a47` | Champion, `339cc3c1` |
| 17609 | Champion, `b6c56980` | Champion, `a0963372` |

All 32 matches finish without a turn-limit draw and retain exactly 15 checkers
per player. Trace hashes are unchanged across repeated final runs; timing is
device-dependent. The same `db3406da` double-two state remains the slowest
decision. The PWA cache advances from `v10` to `v11` so offline clients receive
the board, evaluator, and reporting change coherently.

## Opponent-prime threat awareness

The remaining seed `14303` loss exposed a general position weakness rather
than a seed-specific exception. At deterministic state `3e9b409d`, the
opponent already had a growing five-point blocking structure in front of
Champion's rear checkers. The previous evaluator rewarded Champion's own
blocking structure and opponent reply mobility, but did not assign a direct
cost to the opponent's prime pressure. With roll 2–3 it therefore chose
`15 → 18`, `16 → 18` while a safer `3 → 5`, `5 → 8` plan achieved the same
five-pip reduction and reduced measured opponent pressure from 29 to 23.

Champion now evaluates the opponent's blocking structure with the same
general pressure/prime model used for its own structure and applies a small
15% defensive cost. The deterministic fixture compares the old and current
plans, proves equal pip progress, verifies the lower resulting threat, and
confirms that planning restores the live state exactly. Dice, legality,
Long Narde rules, and Master behavior are unchanged.

The fixed 16-seed/32-match sample deliberately keeps the loss rather than
tuning it away:

The versioned loss-evidence replay is available separately as
`npm run bot:loss-evidence`. It runs seed `14303` with Champion on both sides,
uses a 160-turn bound, and locks the current `cd389e42` (P1 loss, 7/15 borne
off) and `aeca676b` (P2 win) traces. New player-observed losses are appended to
this set; an unfavorable seed is never removed to improve a headline rate.

| Strategy | Champion | Master | Draws | Champion avg | P95 | Maximum |
|---|---:|---:|---:|---:|---:|---:|
| Symmetric opponent-aware baseline | 31 | 1 | 0 | 8.45 ms | 22.24 ms | 906.85 ms |
| Opponent-prime threat aware | 31 | 1 | 0 | 8.43 ms | 23.30 ms | 876.28 ms |

All 31 wins remain wins. In the sole seed `14303` player-one loss, Champion
improves from 2/15 to 7/15 collected checkers and from 29 to 11 remaining
pips. That is evidence of a smaller losing margin, not a claim that one fixed
sample proves universal strength. Timing remains device-dependent.

Current threat-aware extended traces:

| Seed | Champion as P1 | Champion as P2 |
|---:|---|---|
| 1103 | Champion, `f1fa394c` | Champion, `a0dd5b70` |
| 2207 | Champion, `ecd5e920` | Champion, `f7ca2a21` |
| 3301 | Champion, `780a711d` | Champion, `57206081` |
| 4409 | Champion, `0e955a96` | Champion, `7e584e7e` |
| 5501 | Champion, `5b66d39d` | Champion, `90f0d01d` |
| 6607 | Champion, `ab3cfee4` | Champion, `e5724e12` |
| 7703 | Champion, `16c5c0d9` | Champion, `b00d5076` |
| 8807 | Champion, `7e5756c6` | Champion, `7ec7a37f` |
| 9901 | Champion, `18b2ee40` | Champion, `04369fc0` |
| 11003 | Champion, `379b2584` | Champion, `9d45ca4d` |
| 12101 | Champion, `05a24a47` | Champion, `909c0c42` |
| 13217 | Champion, `7b9e6d66` | Champion, `1373b10a` |
| 14303 | Master, `cd389e42` | Champion, `aeca676b` |
| 15401 | Champion, `d6a56d7d` | Champion, `d21562ef` |
| 16519 | Champion, `05a24a47` | Champion, `339cc3c1` |
| 17609 | Champion, `2d5df6a4` | Champion, `a0963372` |

The PWA cache advances from `v15` to `v16` so installed/offline clients
receive the evaluator and regression-tested behavior together.

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
6. **Completed:** fixed the extended v1 sample before observing outcomes and
   ran both strategies over 16 seeds/32 matches; opponent-aware Champion moved
   from 20–12 to 27–5 while retaining exact legality and checker conservation.
7. **Completed:** traced four of the five losses to an asymmetric player-two
   pip metric, centralized the symmetric distance in `Board`, and raised the
   fixed sample from 27–5 to 31–1 with direct and match-level regressions.
8. **Completed:** traced seed `14303` to the general risk of letting an
   opponent prime close in front of rear checkers, added deterministic state
   `3e9b409d`, and preserved 31–1 while reducing the remaining loss margin.
9. Convert additional real Metin match weaknesses into explicit strategy
   fixtures; do not tune solely to erase benchmark losses.
10. Consider a Web Worker only if optimized profiling still shows
   player-visible blocking.
