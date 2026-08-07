# Issue #41 research decisions and evidence gates

Last reviewed: **2026-08-07**
Execution inventory: [GitHub Issue #41](https://github.com/MetinGames/Long-Narde/issues/41)

This document closes research questions only where the current code, existing
measurements, or a bounded product experiment supports a decision. It does not
substitute automated emulation for physical-device evidence, internal opinion
for real-player testing, or documentation for a shipped feature.

## Decision summary

| Topic | Research result | Next gate |
|---|---|---|
| 3/5/7 match series | Keep single-game play as the default and design series as a separate pre-match mode. Do not implement until Mars scoring and series victory semantics receive explicit product approval. | Open a focused implementation Issue after scoring approval. |
| Classic-backgammon mini intro | Test an optional three-topic path for players who already know classic backgammon; reuse engine-owned explanations and never replace the full guide. | Validate exact TR/EN/RU copy with players before shipping. |
| Easy/Medium tie handling | Replace fixed rank weights with temperature-controlled softmax inside the existing plausible shortlist. Equal scores receive equal probability; score windows still exclude clearly inferior moves. | Keep seeded distribution and legality regressions green. |
| Bot behavior profiles | Keep strength and personality orthogonal. A future defensive/blocking/balanced experiment may vary documented evaluation weights, never dice, rules, or legal-move authority. | Convert one repeated player-observed style weakness into fixtures before exposing a selector. |
| Bot name/avatar/personality | Treat this as a presentation experiment using bundled assets and honest “bot” language, not a claim of a human opponent. | Structured tester comparison; no analytics or remote profile data before approval. |
| Web Worker | Do not add one now. Request-scoped caching reduced the measured search cost, the fixed benchmark p95 is responsive, and the remaining isolated maximum is not evidence of player-visible freezing. | Reconsider only after a reproducible visible long task on supported hardware. |
| Haptic feedback | Defer implementation. The Vibration API has limited browser availability and is a no-op when unsupported; adding another setting before device evidence would increase control density without a proven benefit. | Android physical-device test plus default-off preference design; iOS must remain a supported no-op. |
| Visual polish | Preserve theme tokens, checker identity, contrast, focus visibility, and board readability. Evaluate one tokenized layer at a time rather than adding unmeasured shadows or motion to the red-zone stylesheet. | Screenshot comparison plus representative device review for each slice. |
| Yandex Games | Schedule as a Phase 2 adapter: SDK initialization, ready/gameplay events, save policy, ad pause/resume, and safe responsive zones must be integrated behind platform seams. | Separate Yandex candidate Issue and moderation checklist; no submission without release approval. |
| Sentry | Keep local diagnostics as the current baseline. Evaluate Sentry at the first stable external-tester build with default PII disabled, URL/text filtering, source maps, release tags, sampling, retention, deletion, and server-side scrubbing reviewed first. | Privacy/data-map approval and an external-testing volume that manual diagnostics no longer serves. |
| Privacy analytics funnel | The minimal proposed funnel is `app_opened → first_match_started → match_completed → second_match_started`. Events contain a schema version, coarse platform/language, bot difficulty, result class, and elapsed bucket only—no name, local profile ID, invite, board trace, free text, precise timestamp, IP enrichment, or session replay. | Explicit data-map, consent, retention, deletion, vendor, and regional-processing approval before collection. |
| Caucasus language research | Keep Azerbaijani, Georgian, and Armenian in Research. Do not add runtime strings until demand, reviewer availability, support cost, typography, and acquisition evidence justify a language. | Market evidence plus a native reviewer for every shipped language. |
| Online authority | Preserve server-authoritative dice, move legality, turn order, results, and ratings. Device-local profile/progression remains presentation-only and outcome-neutral. | Hosted adapter acceptance and abuse tests in Issue #20. |
| Provably fair dice | Research supports a later commit-reveal spike, not immediate integration. The first hosted slice should use trusted server CSPRNG plus immutable turn audit records; commit-reveal adds reveal timeouts, recovery and griefing paths that must be threat-modeled. | Threat model and deterministic protocol tests before online beta. |

## 3/5/7 series boundary

The existing game has a one-game lifecycle and D-025 assigns two match points
to Mars. “Best of 3/5/7 games” and “first to 3/5/7 points” therefore produce
different outcomes. The safe product direction is:

- retain **Single Game** as the default and snapshot-compatible mode;
- expose a series only as an explicit pre-match choice;
- decide whether the target counts game wins or Mars-aware match points;
- persist series score separately from the current per-game board snapshot;
- reset turn timers and Undo history at each game boundary;
- record statistics once per game plus one series result, without double count;
- keep future online series server-authoritative.

No scoring behavior changes in this research cycle because rules and scoring
policy require explicit product-owner approval.

## Optional classic-backgammon path

The test concept is a small “I know classic backgammon” action beside the full
guide. It opens three concise topics—starting layout/head movement, blocking
and the absence of hitting, and Long Narde dice/head restrictions—each linked
to the existing engine-owned explanation. It is dismissible, reopenable,
device-local, keyboard/touch accessible, and never auto-starts a match.

The exact wording remains unshipped until a Long Narde rules review and
TR/EN/RU player test confirm that three short explanations clarify rather than
oversimplify the approved rule contract.

## Bot probability and personality boundary

Easy and Medium keep their current shortlist sizes and score windows. Within
that shortlist the probability of move `i` is:

`P(i) = exp((score_i - best_score) / temperature) / Σ exp((score_j - best_score) / temperature)`

Subtracting the best score keeps the calculation numerically stable. Equal
scores produce equal weights, near scores remain plausible, and moves outside
the score window receive zero probability. Injected random sources keep tests
repeatable; legality stays entirely owned by the game engine.

A later personality experiment must not hide strength changes behind names.
Use a small matrix such as balanced versus blocking-oriented presentation on a
single agreed strength, label every opponent as a bot, and compare structured
player feedback on predictability, enjoyment, perceived fairness, and rematch
intent. Bundled names/avatars remain cosmetic and carry no remote identity.

## Web Worker decision

The Champion benchmark currently documents a 31–1 fixed 32-match sample, p95
decision time around 23 ms in the recorded threat-aware run, and one isolated
sub-second maximum after request-scoped cache work. Timing varies by hardware,
but the evidence does not establish persistent main-thread freezing. Moving
the search now would add state serialization, cancellation, stale-result, PWA
cache, and fallback complexity without a measured player benefit.

The review trigger is a repeatable supported-device long task that blocks
input or animation after the existing cache/profile path is active. Any worker
spike must preserve exact moves, dice, rules, request cancellation, and the
no-worker fallback.

## Yandex Phase 2 mapping

| Platform requirement | Nardora seam |
|---|---|
| SDK initialization and `LoadingAPI.ready()` | Call only after the local shell, translations, board assets, and interactive start screen are ready. |
| `GameplayAPI.start()` / `stop()` | Map start/resume to active local play; stop on menu, game end, hidden tab, and before ads; resume only when interaction really resumes. |
| Progress save | Adapt the versioned local profile, statistics, and unfinished-match envelopes; define merge/migration before any cloud write. |
| iOS-safe storage | Select platform storage before current stores initialize; never silently split one match across two stores. |
| Ads | Stop gameplay/audio and timers before fullscreen/rewarded ads, keep controls unobscured, then resume through the existing lifecycle controller. |
| Responsive/ad-safe layout | Reserve tested zones outside the board, dice, timer, Confirm, Undo, collected checkers, focus paths, and safe areas. |
| Moderation/submission | Run SDK debug tooling, refresh/orientation/save tests, TR/EN/RU review, and platform asset/legal checks before submission. |

The platform currently requires correct SDK initialization, a ready signal
when the game is interactive, gameplay start/stop markup, and immediate
progress continuity across refresh/orientation for games with records or
achievements. These requirements justify an adapter and focused release Issue,
not direct calls scattered across `app.js`.

## Observability and analytics data gate

Local runtime diagnostics already capture bounded crash/stall evidence and
export a scrubbed report without a remote processor. A Sentry trial becomes
useful only when external test volume makes manual reports insufficient. The
trial plan must set `sendDefaultPii` to false, remove query/hash/full URL and
free-text fields before transport, disable replay, use bounded error and trace
sampling, document retention and deletion, and verify both client-side and
server-side scrubbing with synthetic canary values.

Analytics is a separate decision from error monitoring. The four-step funnel
above is a proposed data contract, not authorization to collect. Device-local
statistics remain the source until Metin approves the exact events, lawful
basis/consent, processor, region, retention, deletion/export path, sampling,
and public disclosure.

## Online fairness boundary

The provider-neutral protocol already rejects client-claimed dice, moves,
results, and ratings, scopes idempotency to the actor, rejects stale revisions,
and models reconnect/session rotation. A future hosted service must add rate
limits, audit trails, moderation operations, load evidence, and authoritative
Long Narde execution before Online becomes playable.

For a later commit-reveal experiment, bind every commitment to match ID, turn
revision, participant, and a fresh nonce. Combine all timely revealed seeds
with a server seed through a documented cryptographic hash/HMAC, map output to
dice with rejection sampling, and publish enough audit material to verify the
turn without exposing future seeds. Missing or conflicting reveals need a
server-authoritative timeout/forfeit policy; otherwise a losing participant
can abort selectively. This operational cost is why commit-reveal remains a
researched option rather than the first private-table implementation.

## Evidence that still cannot be closed internally

The following Issue #41 items require external evidence and remain open:

- real-player testing of contextual explanations and disabled/future modes;
- physical-device control-density, Friend Preview, dense-stack, HiDPI, haptic,
  audio, rendering, and visual-polish checks;
- Metin's original dice/checker source recordings;
- native-Russian review;
- hosted-provider provisioning plus end-to-end authority, reconnect, abuse,
  rate-limit, moderation, and launch evidence.

## Primary references

- [Yandex SDK loading and gameplay markup](https://yandex.com/dev/games/doc/en/sdk/sdk-game-events)
- [Yandex progress-saving requirements](https://yandex.com/dev/games/doc/en/requirements/1/9)
- [Yandex player data and safe storage](https://yandex.com/dev/games/doc/en/sdk/sdk-player)
- [Sentry server-side data scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/)
- [Sentry advanced data scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/advanced-datascrubbing/)
- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [OWASP guidance on verifiable randomness and commit-reveal](https://scs.owasp.org/SCWE/SCSVS-BLOCK/SCWE-153/)
