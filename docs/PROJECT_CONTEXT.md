# Nardora Project Context

Last reviewed: **2026-08-03**
Status: **Active project charter**

This is Nardora's durable product context. It explains what we are building, for whom, how decisions are evaluated, what quality means, and how Metin and Codex work together. Implementation status and dates live in [ROADMAP.md](../ROADMAP.md); active execution lives in GitHub Issues; durable decisions live in [DECISION_LOG.md](DECISION_LOG.md).

## 1. North star

**Nardora will turn Long Narde into a polished, trustworthy and welcoming digital game: easy to enter, deep enough to master, satisfying against a strong bot, and eventually warm and safe to play with friends and family at private online tables.**

Nardora should earn preference through:

- rule accuracy and perceived fairness;
- premium Anatolian craft and atmosphere;
- excellent touch/mobile play;
- a bot that teaches, challenges and ultimately defeats skilled players;
- clear feedback instead of hidden or confusing state;
- safe social play that feels like sharing a real table.

## Studio operating standard

Nardora is managed with the discipline of a world-class game studio while preserving the speed and cost awareness of a focused team.

- Product, gameplay, engineering, art, audio, security, data, distribution, community, live operations and monetization are considered as one system.
- Every scheduled feature has a player outcome, owner, acceptance criteria, test plan, release path and rollback/fallback.
- Every external service has a purpose, data-access boundary, cost threshold and removal trigger.
- High tempo is measured by verified value delivered and regressions avoided, not by hours spent awake.
- Core quality gates cannot be traded away for visible feature count.

## 2. Product promise

Every Nardora release should make the player feel:

1. **I trust the rules.** Legal moves, dice use, timing and results are deterministic and explainable.
2. **The board responds to me.** Touch, mouse, rotation, fullscreen and small screens behave predictably.
3. **My choices remain mine.** Automation acts automatically only when the legal continuation is unambiguous.
4. **This feels crafted.** Visuals, sounds, movement and language are coherent rather than generic.
5. **I can improve.** Difficulty, onboarding, feedback and statistics support mastery.
6. **I remain in control socially.** Camera and microphone are off by default; mute, leave, block and report are easy to reach.

## 3. Target players

### Primary

- Long Narde players in Türkiye, the Caucasus and CIS/BDT markets.
- Mobile-first players who want a reliable local match against a bot.
- Friends, partners and family members who will later use private tables as a social meeting place.

### Secondary

- People who know backgammon but need a concise explanation of Long Narde differences.
- Competitive players who care about stronger bots, ratings, history and leaderboards.

English is the default interface for international reach. Turkish and Russian remain first-class and synchronized.

## 4. Product stages and parallel tracks

1. **Trusted game foundation:** accurate rules, premium board, strong bot, onboarding, statistics and reliable mobile/PWA play.
2. **Social-ready local product:** honest mode entry, local identity/profile seams, and provider-neutral room/invite/reconnect contracts.
3. **Distribution and private-table delivery:** Yandex/mobile packaging progresses in parallel with an authoritative invite-only table vertical slice.
4. **Social Nardora:** accounts, presence, text/emoji, opt-in voice/video, rankings, groups/clans, moderation, privacy and operational hardening.

A later capability must not destabilize an earlier quality gate. This is no longer a strictly serial plan: safe, provider-neutral social foundations start before distribution packaging is complete, while hosted services and personal-data flows remain explicitly gated.

## 5. Current strategic focus

The Phase 0 product exit gate is met. The current priorities are:

1. keep ROADMAP, Issues, code and tests synchronized while cross-browser/mobile and offline PWA gates stay green;
2. ship the honest mode-entry journey in [#10](https://github.com/MetinGames/Long-Narde/issues/10) as the player-facing doorway to local and future social modes;
3. define and test the provider-neutral private-table, invite, presence and reconnect contract in [#16](https://github.com/MetinGames/Long-Narde/issues/16);
4. use the device-only identity and private-table foundations delivered in [#15](https://github.com/MetinGames/Long-Narde/issues/15) and [#16](https://github.com/MetinGames/Long-Narde/issues/16) to build the local Friend Match client slice in [#18](https://github.com/MetinGames/Long-Narde/issues/18);
5. run provider/privacy research, distribution, Project configuration and branch inventory as parallel supporting work rather than blockers on the social critical path.

The player-facing Nardora migration is complete. Champion mode, optional Quick Bear-Off,
sampled audio review assets, and no-legal-move auto-pass have also reached `main`; their
remaining work is refinement and real-device validation rather than initial delivery.

New ideas are captured, classified and scheduled; they do not silently displace these priorities. Further internal extraction is evidence-driven and must not become an open-ended substitute for player-facing progress.

## 6. Decision filters

Every feature, tool or redesign is evaluated in this order:

1. **Player value:** Which real player problem or desire does it serve?
2. **Strategic fit:** Does it strengthen the current product stage?
3. **Rule and trust risk:** Could it create illegal, unfair or confusing play?
4. **Mobile impact:** Does it improve or endanger touch and small-screen use?
5. **Testability:** Can acceptance criteria and regression tests prove it?
6. **Complexity cost:** What code, service, moderation and maintenance burden remains?
7. **Delivery leverage:** Does a managed tool save meaningful time without fragile lock-in?
8. **Evidence:** Is it supported by testing, analytics, feedback or a clear hypothesis?

The result is one of: **Now**, **Next**, **Later**, **Research**, or **Reject/Archive**.

## 7. Definition of done

A feature is complete only when:

- acceptance criteria are met;
- relevant automated tests pass;
- no known critical rule regression exists;
- representative desktop and mobile flows are verified;
- TR/EN/RU text remains aligned where applicable;
- errors and fallbacks are understandable;
- no secret or trusted game decision is shipped in client code;
- Issue and ROADMAP status are synchronized;
- the deployed build is checked after release.

Release-level gates also require zero known critical rule/data-loss bug, no blocking overflow in the agreed device matrix, predictable cache/update behavior, recorded asset provenance and usable diagnostics.

## 8. Architecture guardrails

- Preserve the current web-first JavaScript/Canvas engine while it remains effective.
- Prefer small test-backed modules over a framework rewrite.
- Package the proven web game with Capacitor unless evidence later requires another route.
- Use an authoritative service for online dice, moves, results and ratings.
- Never expose API keys or privileged credentials in client code.
- Prefer managed authentication, realtime/database and media services when they shorten delivery, after cost, privacy, limits and exit risk are checked.
- Move bot work to a Web Worker only after profiling proves the need.

## 9. Experience guardrails

- Nardora is the product name; Long Narde explains the game type.
- Anatolian identity should feel refined, warm and international.
- Active state, used dice and remaining rights must be visible.
- Automation must never remove a meaningful legal choice.
- Audio should use convincing dice/checker recordings with volume control.
- Social features are opt-in and safety controls remain immediately accessible.

## 10. Success measurement

Before analytics exists, use tests, diagnostics and structured tester feedback. Later, with privacy masking, track:

- start-to-first-match completion;
- match completion and restart rates;
- rule, crash and layout failures by device/browser;
- time to first legal move and places where players stall;
- bot difficulty selection and win/loss balance;
- 1-day and 7-day return behavior;
- feedback severity and resolution time;
- release frequency and regression rate.

Numeric growth targets will be set after a real baseline exists.

## 11. Main risks

| Risk | Control |
|---|---|
| Feature sprawl | Phase focus and Now/Next/Later/Research classification |
| Roadmap drift | Same-cycle Issue, test and ROADMAP synchronization |
| Rule regressions | Rule tests plus authoritative validation later |
| Large-file change risk | Small extractions with explicit ownership and tests |
| Mobile fragmentation | Playwright first, then a representative real-device matrix |
| Weak or unfair bot | Benchmarks, position tests and measured search |
| Online cheating/state divergence | Authoritative server and reconnect protocol |
| Social abuse/privacy | Default-off media, blocking/reporting and moderation |
| Service cost/lock-in | Usage budgets, export paths and provider review |
| Brand/asset uncertainty | Provenance and trademark/name review before stores |

## 12. Working relationship and authority

**Metin is Product Owner:** final authority over identity, rules, player promise, spending, monetization and major scope.

**Codex acts as technical product lead and execution partner:** maintains context, challenges contradictions, proposes higher-leverage options, detects risks, converts ideas into executable work, implements authorized scope, verifies results and synchronizes project records.

Codex proactively investigates code/tools, recommends priorities, archives weak ideas with reasons, improves tests and delivery safety within active scope, and surfaces the next best action.

Explicit confirmation remains required before:

- spending money or opening paid services;
- destructive branch/data deletion;
- changing a game rule or approved brand direction;
- collecting new personal data or changing privacy/moderation policy;
- publishing to an app store or contacting third parties;
- making a high-risk architectural migration.

## 13. Operating loop

1. **Observe:** code, tests, feedback, metrics and current phase.
2. **Frame:** problem, player impact, alternatives, dependencies and risk.
3. **Decide:** Now, Next, Later, Research or Reject/Archive.
4. **Record:** Issue with priority, estimate and acceptance criteria.
5. **Build:** the smallest coherent, reviewable change.
6. **Verify:** tests, browser/device checks and deployed behavior.
7. **Synchronize:** Issue, ROADMAP, decision log and relevant docs.
8. **Learn:** feed evidence into the next priority.

## 14. Source-of-truth order

When sources disagree:

1. tests and current code describe actual behavior;
2. this context and decision log describe approved intent;
3. ROADMAP describes phase and timing;
4. GitHub Issues describe active execution;
5. conversation ideas become durable after being recorded above.

Contradictions must be surfaced and resolved, never silently guessed.

## 15. Context maintenance

- Review this document when strategy, target player, quality gates or authority boundaries change.
- Amend the decision log whenever a durable product or architecture decision changes.
- Synchronize ROADMAP and Issues at least weekly and in the same cycle as completed work.
- Date every material update.
