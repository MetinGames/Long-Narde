# Nardora Roadmap

Last synchronized: **2026-08-07**

Nardora is the player-facing brand. The repository and existing GitHub Pages URL may remain `Long-Narde` to avoid breaking links.

## How this roadmap stays current

- GitHub Issues are the execution queue; this file is the high-level plan.
- Every implementation issue must have an owner, priority, status, target phase, and acceptance criteria.
- A feature is marked complete only after its tests pass and the change reaches `main`.
- The issue status and this roadmap must be updated in the same change that completes a roadmap item.
- New ideas from testing or project conversations must be recorded as an issue before implementation starts.
- Review the roadmap and open feedback at least once per week.

Status key: **Done**, **In progress**, **Queued**, **Research**.

## Verified baseline — Done

- Local human-versus-bot Long Narde gameplay.
- Core rules and regressions: maximum dice use, higher-die rule, special opening doubles, six-point prime restriction, black wraparound, bearing off, undo, and win detection.
- Multi-die one-click movement when a legal combined route exists.
- Start screen that pauses gameplay until the player starts a match.
- Persistent White (Ivory)/Black checker choice before local play; the bot uses the opposite visual color without changing rule authority or movement direction.
- Turkish, English, and Russian interface flow with synchronized selectors.
- Turn confirmation, move-by-move undo, double-dice rights indicators, active-turn feedback, collected-checker tray, and victory feedback.
- Per-turn timeout reset and two-stage timeout flow.
- Persistent Off / 30 / 60 / 90 second local bot turn-timer choice with unfinished-match continuity.
- Local player statistics, how-to-play guide, feedback modal, and GitHub issue forms.
- Engine-owned contextual rule explanations plus a dismissible, locally remembered and reopenable first-match guide.
- Runtime diagnostics export for player bug reports.
- Responsive desktop/mobile layouts, iOS safe-area handling, orientation guidance, and fullscreen/focus mode.
- Installable PWA shell with versioned updates and offline local bot play.
- Anadolu and walnut themes with a dedicated visual gallery, persistent selection, and reusable contrast-aware tokens.
- Automated GitHub Actions test workflow.
- Player-facing Nardora migration across the page title, welcome flow, TR/EN/RU copy, and splash experience.
- Optional Quick Bear-Off that acts only when the legal continuation is unambiguous.
- Optional device-persistent automatic turn confirmation with a visible two-second move-by-move Undo window and final legality revalidation.
- Champion bot mode with deterministic multi-move planning and callback safety.
- Automatic pass when no legal move exists, without starting a stale human timer.
- Licensed sampled dice and checker sounds integrated as a review baseline; final original recordings remain planned.
- Provider-neutral private-table v1 contract with deterministic in-memory room, invite, presence, reconnect, authority, and safety seams.
- Versioned, resettable on-device player identity with 15 built-in avatars, four local achievements, richer bot-difficulty statistics, and an exact private-table identity projection.
- Honest same-device Friend Match lifecycle preview with localized room/invite/join/ready/disconnect/resume/leave/close states while the real hosted mode remains disabled.
- **423 Node tests passing as of 2026-08-07** across the bot/research, archive-authentication, and helper-mascot deliveries. The 75-case Playwright browser/device matrix includes save-refresh-resume, automatic-confirm Undo/manual-confirm races, and high-value visual journeys; CI remains the release gate for installed browser execution.

## Current gaps and risks

- `app.js` is 1,840 lines; `engine/renderer.js` is 1,405 lines and `style.css` is 3,504 lines. `index.html` and `engine/i18n.js` have also crossed the 1,000-line split-candidate threshold. Automatic-confirm and mascot-helper state/presentation live in focused JS/CSS files; further extraction remains evidence-driven.
- The repository has 50 non-main remote branches. The verified [branch inventory](docs/BRANCH_INVENTORY.md) classifies 45 cleanup candidates, one active branch, and four manual-review branches; no deletion is authorized.
- Phase 0 and priority Phase 1 work now exists as measurable GitHub Issues; the unified Project view and milestones remain queued in [#8](https://github.com/MetinGames/Long-Narde/issues/8).
- Community-sourced sample sounds are integrated and licensed. Persistent mute and master-volume controls are implemented locally with safe blocked-storage/audio fallbacks; Metin's final original dice/checker recordings and device-level listening review remain open in [#12](https://github.com/MetinGames/Long-Narde/issues/12).
- Every `main` push produces a checksum-backed 30-day GitHub archive artifact. Durable Google Drive upload now supports user OAuth or a service account inside a Shared Drive; the repository still needs one of those valid credential routes before the Drive copy can succeed.
- Friend Match and Online have honest entry points, local identity, a provider-neutral contract, and a player-facing same-device lifecycle preview, but no network adapter, approved account model, hosted backend, or playable online table.
- A capability-gated Yandex SDK adapter now owns ready/gameplay/ad lifecycle and blocks the complete game surface during fullscreen ads; platform debug-panel and real ad-placement validation remain external release gates.
- Capacitor configuration, a reproducible native web bundle, asset/store-copy/privacy drafts, and explicit Android/iOS handoff gates exist. There is still no signed store package, backend, account system, online room, chat, ranking, or moderation layer.

## Dependency and approval gates

Waiting on one item must not idle the project. Work continues on the highest-value independent Issue while the dependency remains visible here.

| Class | Item | Needed from Metin | Parallel action |
|---|---|---|---|
| Evidence pending | [#12](https://github.com/MetinGames/Long-Narde/issues/12) original dice/checker audio | Clean source recordings and final device listening feedback | Keep mute, volume, preload, timing, provenance, and synthetic regression coverage green |
| Evidence pending | [#13](https://github.com/MetinGames/Long-Narde/issues/13) physical device release gate | Corrected-build screenshots/recordings from representative iPhone, Android, and tablet devices | Keep Playwright geometry, touch, overflow, safe-area, and accessibility checks green |
| Evidence pending | [#11](https://github.com/MetinGames/Long-Narde/issues/11) real-match Champion refinement | New real match positions only when a concrete weakness is observed | Continue deterministic fixtures, profiling, benchmarks, and rule-preserving strategy work |
| Credential pending | Durable Google Drive archive | `GDRIVE_RCLONE_CONFIG` for user OAuth, or a Shared Drive ID plus service-account membership | Keep the checksum, manifest, exact-name verification, and 30-day GitHub artifact recovery path green |
| Explicit approval gate | [#20](https://github.com/MetinGames/Long-Narde/issues/20) hosted private table | Provider, EU region, minimal data map, retention, spend ceiling, and trial approval | Preserve the provider-neutral contract and synthetic local preview; do not collect real-player data |
| Explicit approval gate | Branch cleanup | Exact deletion approval for the verified cleanup set | Preserve the branch inventory; do not delete branches |
| Explicit approval gate | Public/store release | Release target, store submission, disclosures, and any spend | Prepare testable web/PWA/package assets without submitting externally |
| Explicit approval gate | Rules, brand, privacy, monetization | Product-owner decision for any material change | Research and document options without silently changing the approved contract |
| No approval needed | [#8](https://github.com/MetinGames/Long-Narde/issues/8), [#41](https://github.com/MetinGames/Long-Narde/issues/41), local quality and maintenance | None within the accepted scope | Proceed through small tested changes and synchronized Issues/ROADMAP updates |

## Active 14-day worklist — 2026-08-03 to 2026-08-16

1. **Research completed — [#19](https://github.com/MetinGames/Long-Narde/issues/19):** compared Supabase, Firebase, and Cloudflare Durable Objects across authority, privacy, cost, regional latency, limits, export, and lock-in. Supabase is the preferred synthetic-trial candidate; no project, spend, personal data, or provider commitment is authorized.
2. **Completed — [#15](https://github.com/MetinGames/Long-Narde/issues/15):** delivered the versioned local profile, 15 built-in avatars, achievements, richer difficulty statistics, migration/reset behavior, and exact private-table identity projection.
3. **Completed — [#16](https://github.com/MetinGames/Long-Narde/issues/16):** delivered the provider-neutral private-table v1 contract, deterministic in-memory adapter, reconnect snapshots, authoritative outcome boundary, and safety seams.
4. **Completed — [#18](https://github.com/MetinGames/Long-Narde/issues/18):** connected local identity and the v1 in-memory adapter to an honest, localized, lifecycle-safe same-device Friend Match preview while preserving the disabled hosted entry.
5. **Completed — [#10](https://github.com/MetinGames/Long-Narde/issues/10):** replaced the single start action with an honest, responsive mode entry; Quick Play and Bot Match work, while Friend Match and Online remain visibly disabled until real flows exist.
6. **Completed — [#9](https://github.com/MetinGames/Long-Narde/issues/9):** added engine-owned contextual explanations for common Long Narde restrictions and a dismissible, reopenable first-visit guide with keyboard, touch, responsive, offline and localization coverage.
7. **Completed — [#25](https://github.com/MetinGames/Long-Narde/issues/25):** established evidence-driven file-health thresholds, an informational CI report, red-zone growth justification, and a staged `style.css` extraction plan without changing visuals.
8. **Completed — [#14](https://github.com/MetinGames/Long-Narde/issues/14):** added a responsive visual theme gallery on the start screen and in-game panel, synchronized it with the compact selector and local persistence, centralized board/checker/panel/focus tokens, and added contrast, keyboard, mobile, PWA, and visual-regression coverage.
9. **In progress — [#11](https://github.com/MetinGames/Long-Narde/issues/11):** the deterministic baseline, profiling, request-scoped cache, opponent-aware fixtures, fixed 16-seed/32-match validation, symmetric player-two pip correction, and deterministic opponent-prime threat fixture are complete. The general threat refinement preserves the 31–1 sample while improving the sole loss from 2/15 to 7/15 collected checkers and from 29 to 11 remaining pips; additional real-match fixtures remain next.
10. **In progress — [#13](https://github.com/MetinGames/Long-Narde/issues/13):** the desktop-Chrome cycle is complete through [#40](https://github.com/MetinGames/Long-Narde/pull/40). Physical iPhone Safari evidence then exposed compact portrait control collisions, a blocking rotation notice, and an overflowing landscape dice card; [#43](https://github.com/MetinGames/Long-Narde/pull/43) adds deterministic portrait/landscape grids plus WebKit geometry regression coverage. Physical iPhone recheck, Android, and tablet validation remain open without changing Long Narde rules.
11. **Parallel support — [#8](https://github.com/MetinGames/Long-Narde/issues/8) and completed [#6](https://github.com/MetinGames/Long-Narde/issues/6):** project metadata remains queued; merged [#36](https://github.com/MetinGames/Long-Narde/pull/36) records the complete 50-branch inventory with 45 exact cleanup candidates, one active branch, and four preserved for manual review. No branch has been deleted.
12. **Hosted approval gate:** [#20](https://github.com/MetinGames/Long-Narde/issues/20) remains blocked until Metin explicitly approves the candidate provider, EU region, minimal data map, retention, and any spend after reviewing [#19](https://github.com/MetinGames/Long-Narde/issues/19).
13. **Completed — [#44](https://github.com/MetinGames/Long-Narde/issues/44):** delivered a versioned, device-only unfinished-match snapshot with checker-conservation validation, localized Continue Match entry, safe bot/human resume, fresh local deadline, and fail-closed cleanup.
14. **Completed — [#45](https://github.com/MetinGames/Long-Narde/issues/45):** classified a bearing-off victory as two-point Mars only when the loser has borne off zero checkers; timeout remains separate.
15. **Completed — [#46](https://github.com/MetinGames/Long-Narde/issues/46):** delivered human, bot, Quick Bear-Off, bearing-off, and reverse Undo Canvas transitions without changing board authority or legal choices.
16. **Completed — [#47](https://github.com/MetinGames/Long-Narde/issues/47):** preserved move-by-move Undo while aligning multi-die move counts, reverse-transition metadata, action buttons, and the persisted post-Undo state.
17. **Completed — [#49](https://github.com/MetinGames/Long-Narde/issues/49):** kept the inset 6–7/18–19 triangle shapes clear of the centre hinge while restoring full-size checkers, original slot centres, and matching animation anchors.
18. **Completed — [#51](https://github.com/MetinGames/Long-Narde/issues/51):** delivered a persistent White (Ivory)/Black start-screen choice, opposite bot color, renderer-wide checker mapping, and unfinished-match continuity without changing rule authority or movement direction.
19. **Completed — [PR #54](https://github.com/MetinGames/Long-Narde/pull/54):** replaced the fixed local bot turn deadline with a persistent Off / 30 / 60 / 90 second pre-match choice; disabled mode creates no timeout penalty and unfinished matches restore their saved duration.
20. **Completed — [#55](https://github.com/MetinGames/Long-Narde/issues/55):** locked the existing six-point-prime restriction across both player directions, first/last windows, the physical 24 → 1 wrap, opponent boundary positions, source-stack simulation, invalid reasons, and legal-move enumeration without changing rule behavior.
21. **Completed — [#57](https://github.com/MetinGames/Long-Narde/issues/57):** added an off-by-default automatic turn-confirm preference with a visible two-second Undo grace period, immediate manual Confirm, stale-callback cancellation, final legality revalidation, unfinished-match continuity, and a compact shared helper surface.
22. **In progress — [#12](https://github.com/MetinGames/Long-Narde/issues/12):** added accessible persistent mute and master-volume controls, live Web Audio gain updates, TR/EN/RU labels, mobile styling, and PWA precache coverage. Original recordings and physical phone/desktop listening validation remain open.
23. **Completed in PR #60 — [#59](https://github.com/MetinGames/Long-Narde/issues/59):** successful Undo now plays one normal checker-placement sound after the reverse animation lands; blocked or unsuccessful Undo remains silent and the existing mute preference is respected.
24. **Completed in PR #62 — [#61](https://github.com/MetinGames/Long-Narde/issues/61):** replaced fixed bot step timing with a deterministic visible-complexity pacing profile so simple turns stay brisk while doubles, multi-step turns, collections, and reduced-motion transitions remain readable.
25. **Implemented in PR #63 and refined in this delivery — [#41](https://github.com/MetinGames/Long-Narde/issues/41) bot-naturalness subtasks:** replaced arbitrary Easy/Medium move scores with short-horizon evaluation and bounded suboptimal selection, then replaced fixed rank weights with score-aware softmax so equal scores have equal probability while clearly inferior moves stay excluded.
26. **Research completed — [#41](https://github.com/MetinGames/Long-Narde/issues/41):** documented the separate 3/5/7 series boundary, classic-backgammon mini-intro test, bot profile/identity experiments, Web Worker rejection evidence, Yandex adapter map, Sentry and privacy-analytics gates, language-market queue, online authority, and provably-fair trade-offs in [Issue #41 research decisions](docs/ISSUE_41_RESEARCH.md). Physical-device, real-player, original-audio, native-Russian, and hosted-provider evidence remains explicitly open.
27. **Completed — [#26](https://github.com/MetinGames/Long-Narde/issues/26):** replaced the plain start-screen feedback entry with a deterministic Nardora helper that routes bug reports, feedback, and the existing guide; it is minimized by default, persists only its local UI state, supports keyboard/Escape and reduced motion, and never claims to be live AI or human support.
28. **Ready — [#67](https://github.com/MetinGames/Long-Narde/issues/67):** add an optional, default-off haptic capability adapter with no-op/error regressions before physical-device feel validation.
29. **Ready — [#68](https://github.com/MetinGames/Long-Narde/issues/68):** lock DPR 1/2/3 Canvas backing-store and touch-coordinate geometry before any Retina-specific renderer correction.
30. **Ready — [#69](https://github.com/MetinGames/Long-Narde/issues/69):** measure static rebuild, render, animation, and idle-frame invalidation before considering render-on-demand architecture.

Completed in this synchronization cycle:

- [#2](https://github.com/MetinGames/Long-Narde/issues/2) Issue/ROADMAP synchronization workflow established and closed.
- [#3](https://github.com/MetinGames/Long-Narde/issues/3) Playwright cross-browser/mobile coverage verified and closed.
- [#5](https://github.com/MetinGames/Long-Narde/issues/5) installable/offline PWA foundation delivered with focused lifecycle and offline-play tests.
- [#4](https://github.com/MetinGames/Long-Narde/issues/4) two focused `app.js` lifecycle/listener slices delivered with explicit ownership and cleanup tests.
- [#10](https://github.com/MetinGames/Long-Narde/issues/10) honest, localized and responsive mode entry delivered with working local choices and native-disabled social previews.
- [#16](https://github.com/MetinGames/Long-Narde/issues/16) versioned room/invite/presence/reconnect contract delivered with idempotency, ordering, stale-session and trusted-outcome tests.
- [#15](https://github.com/MetinGames/Long-Narde/issues/15) device-only identity, built-in avatars, progression v2 migration, achievements, reset controls, and private-table projection delivered.
- [#18](https://github.com/MetinGames/Long-Narde/issues/18) local Friend Match preview delivered with controller-owned listeners/subscriptions, full local lifecycle, stale-callback protection, reconnect recovery, honest copy, and responsive TR/EN/RU UI.
- [#19](https://github.com/MetinGames/Long-Narde/issues/19) provider research completed with a weighted comparison, cost model, minimal data map, exit paths, synthetic-trial plan, and measurable rejection criteria; provider commitment remains open.
- [#9](https://github.com/MetinGames/Long-Narde/issues/9) contextual rule explanations and the first-match guide delivered with engine reason codes, TR/EN/RU copy, local-only seen state, reopen behavior, and cross-browser keyboard/touch coverage.
- [#61](https://github.com/MetinGames/Long-Narde/issues/61) adaptive bot pacing delivered in [PR #62](https://github.com/MetinGames/Long-Narde/pull/62) and the completed issue status synchronized here.
- [#14](https://github.com/MetinGames/Long-Narde/issues/14) visual theme gallery delivered with reusable renderer/UI tokens, persistent synchronized selection, enhanced-contrast text/focus gates, responsive keyboard/touch behavior, PWA coverage, and a dedicated visual baseline.
- [#44](https://github.com/MetinGames/Long-Narde/issues/44), [#45](https://github.com/MetinGames/Long-Narde/issues/45), [#46](https://github.com/MetinGames/Long-Narde/issues/46), [#47](https://github.com/MetinGames/Long-Narde/issues/47), and [#49](https://github.com/MetinGames/Long-Narde/issues/49) reached `main` through [#48](https://github.com/MetinGames/Long-Narde/pull/48) and [#50](https://github.com/MetinGames/Long-Narde/pull/50), covering match resume, Mars, checker motion, Undo consistency, and stable hinge-adjacent checker geometry.
- [#51](https://github.com/MetinGames/Long-Narde/issues/51) adds the persistent pre-match checker-color choice, opposite bot appearance, resume continuity, and cross-browser visual coverage through [#52](https://github.com/MetinGames/Long-Narde/pull/52).
- [PR #54](https://github.com/MetinGames/Long-Narde/pull/54) adds the persistent local bot turn-timer choice, explicit disabled state, and unfinished-match timer continuity. GitHub Issue [#41](https://github.com/MetinGames/Long-Narde/issues/41) remains the separate external-AI improvement inventory.
- [#55](https://github.com/MetinGames/Long-Narde/issues/55) adds deterministic six-point-prime edge fixtures for both directions, route boundaries, source-stack simulation, and rule-reason/move-list consistency without changing Long Narde legality.
- [#57](https://github.com/MetinGames/Long-Narde/issues/57) adds optional automatic turn confirmation without weakening mandatory dice use or move-by-move Undo, and keeps the default helper card visually compact.
- [#26](https://github.com/MetinGames/Long-Narde/issues/26) adds the localized, accessible, locally persistent Nardora helper without analytics, remote data, or browser-side AI.

## Phase 0 — Product exit gate met; maintenance continues

Target: **2026-08-14**

- **Done:** Complete the player-facing Nardora migration without changing the repository or GitHub Pages URL.
- **Done:** Establish and run the Issue/ROADMAP synchronization workflow; recurring weekly review continues under the documented operating loop.
- **In progress:** [#8](https://github.com/MetinGames/Long-Narde/issues/8) now has canonical priority/status/type labels, structured Issue templates, automatic opened/closed metadata, a checked active-Issue catalog, and documented ROADMAP/Issue/Project ownership. Creating the repository Project and choosing milestone dates remain owner-facing GitHub settings.
- **Done:** Inventory all 50 non-main branches in [#6](https://github.com/MetinGames/Long-Narde/issues/6); preserve one active and four manual-review branches, and remove none of the 45 exact cleanup candidates without Metin's explicit deletion approval.
- **Done:** Complete the focused [#4](https://github.com/MetinGames/Long-Narde/issues/4) checkpoint: resume and mobile-theme event ownership are idempotent, removable and test-backed.
- **Done:** Playwright CI covers Chromium, Firefox, WebKit, iPhone 16e portrait, iPhone 17 Pro Max landscape, fullscreen/focus fallback, orientation transitions, and stable high-value visual baselines.
- **Done:** Added a small PWA foundation with app manifest, original Nardora icons, conservative versioned updates, installability metadata, and offline local bot play.
- **Research:** Move-search, memoization, JSON state-copy, Web Worker, platform, observability, analytics, and future fairness decisions are recorded in [Champion benchmark evidence](docs/CHAMPION_BENCHMARK.md) and [Issue #41 research decisions](docs/ISSUE_41_RESEARCH.md). Rendering and physical-device evidence remains open before optimization.

Exit criteria:

- Nardora is the visible product name everywhere.
- The active work queue exists as GitHub Issues and matches this roadmap.
- Unit tests and cross-browser smoke tests pass in CI.
- The game is installable as a basic PWA and remains playable offline against the bot.

All four product exit criteria are met. Project/milestone configuration and branch inventory remain useful maintenance work, not blockers on Phase 1 delivery.

## Social-platform critical path

1. **Entry — Done:** [#10](https://github.com/MetinGames/Long-Narde/issues/10) gives every current and future mode an honest place in the product journey.
2. **Identity seam — Done:** [#15](https://github.com/MetinGames/Long-Narde/issues/15) establishes local, resettable identity and built-in avatars without collecting remote personal data.
3. **Private-table contract — Done:** [#16](https://github.com/MetinGames/Long-Narde/issues/16) defines room lifecycle, invites, presence, authoritative commands/events and reconnect snapshots with an in-memory test adapter.
4. **Client vertical slice — Done:** [#18](https://github.com/MetinGames/Long-Narde/issues/18) connects the proven contract and device identity to an honest local Friend Match controller without presenting it as online play.
5. **Hosted evidence — Done; approval gated:** [#19](https://github.com/MetinGames/Long-Narde/issues/19) records provider/privacy/cost evidence and recommends Supabase only as the first synthetic-trial candidate. Only after explicit provider/data/region/spend approval may [#20](https://github.com/MetinGames/Long-Narde/issues/20) connect the contract to managed auth/realtime infrastructure.
6. **Safe communication and community:** add text/emoji with leave, mute, block, report and rate limits; voice/video, rankings and groups follow only after the safety and operations layer is proven.

Distribution and local-game quality proceed in parallel. No social milestone may weaken rule authority, mobile reliability, privacy defaults or honest availability states.

## Phase 1 — Active: social-ready local game and launch candidate

Target: **2026-09-30**

- **Done:** Replaced the single start action with the honest mode entry in [#10](https://github.com/MetinGames/Long-Narde/issues/10); Quick Play/Bot Match work now, while Friend Match/Online expose accurate future availability.
- **Done:** Defined and tested the provider-neutral private-table foundation in [#16](https://github.com/MetinGames/Long-Narde/issues/16), including lifecycle, invites, idempotency, ordering, reconnect snapshots, actor-scoped safety seams, and authoritative command/event boundaries.
- **Done:** Built local identity/profile seams in [#15](https://github.com/MetinGames/Long-Narde/issues/15) without remote personal-data collection, using the v1 table identity projection and a separately resettable progression v2 store.
- **Done:** Built the local Friend Match client vertical slice in [#18](https://github.com/MetinGames/Long-Narde/issues/18), including the full same-device lifecycle, disconnect/resume recovery, honest availability boundary, and accessible responsive copy in all three languages.
- **Done:** Evaluated provider, privacy, cost, regional latency, limits, export, and lock-in evidence in [#19](https://github.com/MetinGames/Long-Narde/issues/19). Supabase leads only the synthetic trial; Cloudflare Durable Objects is the fallback and no provider is committed.
- **Approval gated:** Keep the hosted adapter [#20](https://github.com/MetinGames/Long-Narde/issues/20) blocked until Metin explicitly approves the provider, EU region, minimal data map, retention, and any spend.
- Integrate the user's original high-quality dice and checker recordings, with volume controls and safe preload behavior ([#12](https://github.com/MetinGames/Long-Narde/issues/12)).
- **In progress:** Benchmark and refine the shipped Champion bot against representative positions and Metin's real matches; move heavy calculation to a Web Worker only if measurements justify it ([#11](https://github.com/MetinGames/Long-Narde/issues/11)).
- **Done:** delivered the local game-feel and continuity slice: responsive checker transitions [#46](https://github.com/MetinGames/Long-Narde/issues/46), consistent move-by-move Undo [#47](https://github.com/MetinGames/Long-Narde/issues/47), Mars results [#45](https://github.com/MetinGames/Long-Narde/issues/45), and safe unfinished-match resume [#44](https://github.com/MetinGames/Long-Narde/issues/44).
- **Done:** kept the four centre-hinge points visually inset without shrinking or shifting their checker stacks ([#49](https://github.com/MetinGames/Long-Narde/issues/49)).
- **Done:** added an accessible, persistent start-screen White (Ivory)/Black checker choice with opposite bot color and unfinished-match continuity ([#51](https://github.com/MetinGames/Long-Narde/issues/51)).
- **Done:** expanded the six-point-prime release contract with mirrored route-boundary, wraparound, source-stack, invalid-reason, and legal-move regressions ([#55](https://github.com/MetinGames/Long-Narde/issues/55)).
- **Done:** added optional, device-persistent automatic turn confirmation with a two-second Undo grace period, immediate manual confirmation, lifecycle cancellation, and final legality revalidation ([#57](https://github.com/MetinGames/Long-Narde/issues/57)).
- **Done:** Built a contextual **Rule Explanation System** that explains common blocked, mandatory, bearing-off, prime and automatic-pass states from engine-owned reasons ([#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- **Done:** Added a dismissible and reopenable **Interactive First-Match Tutorial** using the existing localized guide, with a local-only versioned seen flag and keyboard/touch/small-screen coverage ([#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- **Done:** Replaced the plain feedback entry with a minimizable deterministic **Nardora Helper** that exposes bug report, feedback, and how-to-play actions while preserving honest non-AI copy and local-only state ([#26](https://github.com/MetinGames/Long-Narde/issues/26)).
- **Done:** Built the visual theme-management screen in [#14](https://github.com/MetinGames/Long-Narde/issues/14), preserving the approved Anadolu and walnut families while adding persistent selection, reusable contrast-aware tokens, responsive access, and visual regression coverage.
- **In progress:** recheck the corrected compact iPhone Safari layout on hardware, then validate touch targets, safe areas, overflow, and accessibility on Android and tablet ([#13](https://github.com/MetinGames/Long-Narde/issues/13)).
- **Done:** Added maintainability guardrails and staged large-file plans without turning refactoring into an open-ended substitute for player value ([#25](https://github.com/MetinGames/Long-Narde/issues/25)).
- Keep competitor/rival analysis as a research input for clarity, onboarding, retention, and monetization patterns; do not copy protected art or branding.
- Continue the real-device matrix after the first physical iPhone Safari evidence/fix cycle: iPhone recheck plus representative Android and tablet sizes remain ([#13](https://github.com/MetinGames/Long-Narde/issues/13)).
- Define release quality gates: no known critical rule bug, no layout overflow, tests green, diagnostics available, and asset licenses recorded.

## Phase 2 — Distribution

Targets: **Yandex candidate 2026-11-30; Android beta 2027-01-31; iOS beta 2027-03-31**

- Add Yandex Games SDK integration, pause/focus behavior, localization, save policy, and submission assets.
- Reserve and test advertising-safe responsive zones so monetization never covers the board, dice, timer, confirmation, undo, or accessibility controls.
- Package the existing web game with Capacitor for Android and iOS rather than rewriting the game.
- Add app icons, splash screens, privacy disclosures, store screenshots, descriptions, age rating, and release notes.
- Test Android lifecycle/back-button behavior and iOS foreground/background, safe-area, rotation, audio, and WKWebView behavior.
- Prepare Google Play testing and App Store/TestFlight delivery. iOS publishing requires a supported Mac/Xcode environment and Apple Developer access.

## Phase 3 — Online private tables

Target: **2027-05-31**

- Add accounts, authenticated profiles, and cloud-synced statistics.
- Implement private rooms, invite links, presence, reconnect/resume, and deterministic game-state synchronization.
- Validate all online moves with an authoritative service; never trust client-reported wins, scores, or dice.
- Add written chat and quick emojis with blocking, reporting, and rate limits.
- Add observability, backups, abuse controls, and load tests before public matchmaking.

## Phase 4 — Social Nardora

Target: **2027-09-30**

- Add opt-in voice and video rooms; camera and microphone remain off by default.
- Keep mute, camera-off, leave-table, block, and report controls immediately accessible.
- Add ranking, rating, country/group/clan leaderboards, seasons, and match history.
- Add privacy controls for profile sharing, avatar/photo moderation, chat moderation, and sanctions/appeals.
- Harden reconnect, anti-cheat, account recovery, deletion/export requests, and operational monitoring.

## Schedule range

- Strong Nardora web/PWA release: **2026-09-30**.
- Provider-neutral private-table contract and local vertical slice: **2026-09-30**.
- Yandex submission candidate: **2026-11-30**.
- Hosted invite-only private-table alpha: **2027-01-31**, subject to provider and privacy approval.
- Android beta: **2027-01-31**.
- iOS beta: **2027-03-31**.
- Online private-table beta: **2027-05-31**.
- Full social roadmap target: **2027-09-30**.
- Safety buffer for store review, real-device defects, networking, and moderation: **2027-12-31**.

These dates assume focused weekly execution, small pull requests, automated tests, and use of managed services for hosting, authentication, realtime messaging, and media rather than building those systems from zero.

## Tooling decisions

### Use now

- **GitHub Projects + Issues:** the synchronized execution board and roadmap timeline.
- **GitHub Actions:** keep unit tests mandatory; add browser smoke tests and scheduled security checks.
- **Playwright:** cross-browser, touch/mobile emulation, and screenshot regression coverage.
- **Dependabot + CodeQL:** dependency and JavaScript/security scanning.
- **Sentry or equivalent, at the external-tester gate:** evaluate production JavaScript error monitoring only after the privacy/data map is approved; avoid duplicating the existing local diagnostics report.

### Use when external testing grows

- **PostHog or equivalent:** privacy-conscious product analytics, funnels, and carefully masked session replay.
- **Preview deployments:** a separate URL for each pull request so testers do not have to wait for changes to reach the production GitHub Pages link.
- **Real-device cloud testing:** only after Playwright emulation no longer covers device-specific failures.

### Use for online and social phases

- **Supabase or equivalent managed backend:** authentication, Postgres, presence, room metadata, and realtime events.
- **Server/edge validation:** authoritative dice, legal moves, results, ratings, and anti-cheat checks.
- **LiveKit or equivalent managed WebRTC service:** optional voice/video instead of operating raw WebRTC infrastructure ourselves.
- **Capacitor:** one web-first codebase packaged for Android and iOS.

### Do not add yet

- A JavaScript framework rewrite, custom game server, custom video infrastructure, or AI API calls from the browser. They add risk without solving the current bottlenecks; secrets must never be shipped in client code.
