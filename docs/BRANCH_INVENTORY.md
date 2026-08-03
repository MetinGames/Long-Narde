# Nardora Remote Branch Inventory

Last reviewed: **2026-08-04**  
Owner: **MetinGames + Codex**  
Execution issue: [#6](https://github.com/MetinGames/Long-Narde/issues/6)  
Initial comparison base: `main` at `91f308b2b9ddb06735998cc118cbe7bcd7f8a359`  
Post-delivery reconciliation base: `main` at `dcab074be93972480ebef2bc05603313b8f39fcf`

## Purpose and safety boundary

This inventory records every non-`main` remote branch before any cleanup. It
is an archive and approval aid, not deletion authorization.

- No branch is deleted by the inventory task.
- A branch is a cleanup candidate only when it has no commits ahead of `main`,
  or its exact pull request is recorded as merged by squash.
- Open work and branches with unmatched unique commits are preserved.
- Deletion requires Metin's explicit approval of the exact candidate list.
- The full head commit is retained in each link so a deleted ref could still
  be reconstructed while GitHub retains the commit object.

## Summary

| Classification | Count | Meaning |
|---|---:|---|
| Cleanup candidate | 45 | 31 branches are fully contained in `main`; 14 are the recorded heads of squash-merged PRs |
| Active — preserve | 1 | Open Supabase trial PR #24 remains intentionally unmerged |
| Manual review — preserve | 4 | Unique commits have no matching merged PR and may contain reusable work |
| **Total non-main branches** | **50** | Inventory replaces the earlier stale count of 35 and includes its own merged delivery branch |

The initial comparison found 49 non-main branches. Publishing it created
`agent/branch-inventory`; after PR #36 merged, that branch became the 50th and
the 45th cleanup candidate. Its row is reconciled against `dcab074`; all other
`ahead/behind` values remain the reproducible initial `91f308b` snapshot.

## Active branch — preserve

| Branch | Head | Ahead/behind | Evidence |
|---|---|---:|---|
| `agent/supabase-private-table-trial` | [`1e44f31`](https://github.com/MetinGames/Long-Narde/commit/1e44f3189f1f8502c56bde1eabbd48dd275badc5) | 2/14 | Draft [#24](https://github.com/MetinGames/Long-Narde/pull/24) is open; Realtime provisioning and hosted approval gates remain unresolved |

Unique commits:

- `1e44f31` — Standardize Supabase trial configuration
- `f33860a` — Add Supabase private-table trial foundation

## Manual-review branches — preserve

| Branch | Head | Ahead/behind | Reason to preserve |
|---|---|---:|---|
| `branding/nardora-migration` | [`7418c04`](https://github.com/MetinGames/Long-Narde/commit/7418c043feac5db6d9443ce8160fff0ed5e03e4c) | 4/34 | Draft [#7](https://github.com/MetinGames/Long-Narde/pull/7) closed unmerged and was later superseded, but the original branding assets/controller need a final visual-diff review |
| `feature/champion-strategy-v2` | [`f3f82e2`](https://github.com/MetinGames/Long-Narde/commit/f3f82e2409ca4a419eee55eae984b0e7fe71242c) | 2/29 | Old large Champion experiment predates PRs #29–#35; preserve until its benchmark/task artifacts are checked for reusable evidence |
| `feature/sound-effects` | [`1546a8c`](https://github.com/MetinGames/Long-Narde/commit/1546a8c116cfe5fe2d22a98aa2d537ad4169ebd2) | 2/65 | Original sound foundation may inform queued audio Issue #12 even though the sampled review branch is in `main` |
| `fix/undo-action-lock` | [`0fc1816`](https://github.com/MetinGames/Long-Narde/commit/0fc1816c6710ab8afbffc78b29ce80447103189b) | 1/61 | The clean successor is in `main`, but this unmatched commit also touched player-stat modules and needs a focused equivalence check |

Unique commits:

- `branding/nardora-migration`: `7418c04` style splash screen; `3bb3ebf`
  add splash controller; `9ae0bb2` migrate player-facing brand; `ee7441f`
  add branding workspace.
- `feature/champion-strategy-v2`: `f3f82e2` add installable offline PWA
  foundation; `48cc88c` Champion strategy v2 checkpoint.
- `feature/sound-effects`: `1546a8c` merge main into sound effects;
  `218a86a` add sound-system foundation.
- `fix/undo-action-lock`: `0fc1816` fix undo action-button state.

## Cleanup candidates — squash-merged PR heads

These branches appear ahead because squash merging creates a new commit on
`main`. The linked merged PR is the authoritative delivery record.

| Branch | Head | Ahead/behind | Delivery evidence |
|---|---|---:|---|
| `agent/champion-benchmark-baseline` | [`58c1c08`](https://github.com/MetinGames/Long-Narde/commit/58c1c087edd299d35f17c018e0f8ab3838a95d9f) | 11/12 | [#29](https://github.com/MetinGames/Long-Narde/pull/29) merged by squash |
| `agent/champion-extended-benchmark` | [`bef0d0f`](https://github.com/MetinGames/Long-Narde/commit/bef0d0f5b7b827387e4259a16e37a54e32b2122e) | 2/4 | [#34](https://github.com/MetinGames/Long-Narde/pull/34) merged by squash |
| `agent/champion-opponent-aware-strategy` | [`971e315`](https://github.com/MetinGames/Long-Narde/commit/971e31571c5d66c0ccd90f8cc1ba01de32e64461) | 3/6 | [#33](https://github.com/MetinGames/Long-Narde/pull/33) merged by squash |
| `agent/champion-rule-cache-experiment` | [`ef3c71a`](https://github.com/MetinGames/Long-Narde/commit/ef3c71a535a3104fe626f04cdec2fc19908d421f) | 8/10 | [#31](https://github.com/MetinGames/Long-Narde/pull/31) merged by squash |
| `agent/champion-runtime-rule-cache` | [`2b88709`](https://github.com/MetinGames/Long-Narde/commit/2b887093a2f1dd611b64cbc2be2a2dffc1810b9c) | 9/8 | [#32](https://github.com/MetinGames/Long-Narde/pull/32) merged by squash |
| `agent/champion-slow-state-profile` | [`b042898`](https://github.com/MetinGames/Long-Narde/commit/b0428983f3d91223ca420f6f8b56e1822470bdd6) | 7/11 | [#30](https://github.com/MetinGames/Long-Narde/pull/30) merged by squash |
| `agent/champion-symmetric-pip-training` | [`d066278`](https://github.com/MetinGames/Long-Narde/commit/d06627803dc930c4e66900a7a81cc926051a748f) | 2/2 | [#35](https://github.com/MetinGames/Long-Narde/pull/35) merged by squash |
| `agent/branch-inventory` | [`72b12a9`](https://github.com/MetinGames/Long-Narde/commit/72b12a9df8bd33dfa8cd20a09f4a6c70121ca270) | 2/2 | [#36](https://github.com/MetinGames/Long-Narde/pull/36) merged by squash; post-delivery reconciliation |
| `agent/code-health-guardrails` | [`d8ced5d`](https://github.com/MetinGames/Long-Narde/commit/d8ced5d1134996aacc00a9dcabdd56c086269d25) | 10/13 | [#28](https://github.com/MetinGames/Long-Narde/pull/28) merged by squash |
| `agent/local-friend-match` | [`6de7b8f`](https://github.com/MetinGames/Long-Narde/commit/6de7b8f308d282c039f5a22b0751bdf48ab0f1b3) | 2/16 | [#22](https://github.com/MetinGames/Long-Narde/pull/22) merged by squash |
| `agent/local-identity-foundation` | [`e579ea7`](https://github.com/MetinGames/Long-Narde/commit/e579ea7a14eaff655ad8cc6abf19b24e06957d75) | 3/17 | [#21](https://github.com/MetinGames/Long-Narde/pull/21) merged by squash |
| `agent/private-table-contract` | [`25fdc5f`](https://github.com/MetinGames/Long-Narde/commit/25fdc5ffc639c21fd677349248f199e84356fdc1) | 3/18 | [#17](https://github.com/MetinGames/Long-Narde/pull/17) merged by squash |
| `agent/private-table-provider-research` | [`0793032`](https://github.com/MetinGames/Long-Narde/commit/0793032c5d296c38f5c65c2cb5dfe777da3acabc) | 1/15 | [#23](https://github.com/MetinGames/Long-Narde/pull/23) merged by squash |
| `agent/rule-explanations-tutorial` | [`e71814d`](https://github.com/MetinGames/Long-Narde/commit/e71814db949647ff948e1778c4905f1d87f9474d) | 23/14 | [#27](https://github.com/MetinGames/Long-Narde/pull/27) merged by squash |

## Cleanup candidates — fully contained in main

Every branch in this table is zero commits ahead of `main`. Its head is an
ancestor of the recorded comparison base.

| Branch | Head | Ahead/behind | Evidence |
|---|---|---:|---|
| `branding/nardora-migration-clean` | [`2fb30bc`](https://github.com/MetinGames/Long-Narde/commit/2fb30bc1e4f5aa3c5c332d3c55c5b0f170846473) | 0/31 | Fully contained in `main` |
| `chore/github-actions-tests` | [`3eb7e2d`](https://github.com/MetinGames/Long-Narde/commit/3eb7e2d3f9c6df98aca507dcbf9a8c0d4ec1de1a) | 0/46 | Fully contained in `main` |
| `docs/project-readme` | [`c1e4d8c`](https://github.com/MetinGames/Long-Narde/commit/c1e4d8c590d2ab08b3df315556c79a7872c097b3) | 0/55 | Fully contained in `main` |
| `feature/auto-bear-off` | [`6332c45`](https://github.com/MetinGames/Long-Narde/commit/6332c457970d5ca02edbc0250e4d4d85643eb245) | 0/44 | Fully contained in `main` |
| `feature/champion-bot-strategy` | [`8964778`](https://github.com/MetinGames/Long-Narde/commit/8964778637f3e7112f1b39e65348530324cf377a) | 0/33 | Fully contained in `main` |
| `feature/compact-turn-indicator` | [`d2f8a6e`](https://github.com/MetinGames/Long-Narde/commit/d2f8a6e1c591b5f89968360d664a7b0897a2dff6) | 0/64 | Fully contained in `main` |
| `feature/fullscreen-game` | [`c71a873`](https://github.com/MetinGames/Long-Narde/commit/c71a873c234a7f335bf1618e0aeb48245b35fb3c) | 0/49 | Fully contained in `main` |
| `feature/game-feedback` | [`26b9714`](https://github.com/MetinGames/Long-Narde/commit/26b9714562ff7a6f2f276f84f152ec054968293d) | 0/65 | Fully contained in `main` |
| `feature/gameplay-feedback-refinement` | [`a1b14e2`](https://github.com/MetinGames/Long-Narde/commit/a1b14e215abab5eaaf72d434e3d5a47be8726448) | 0/58 | Fully contained in `main` |
| `feature/how-to-play` | [`8d6331f`](https://github.com/MetinGames/Long-Narde/commit/8d6331fbde86a6708301f440db8c6c326f9b9ae5) | 0/61 | Fully contained in `main` |
| `feature/language-preference` | [`58ac90f`](https://github.com/MetinGames/Long-Narde/commit/58ac90fbd880e0fe9d1dc8735332b04e4bef0bb4) | 0/69 | Fully contained in `main` |
| `feature/local-player-stats-clean` | [`3e8f4ba`](https://github.com/MetinGames/Long-Narde/commit/3e8f4badd588248b1a64fc98c8c86563ed3bf282) | 0/57 | Fully contained in `main` |
| `feature/player-feedback` | [`11196df`](https://github.com/MetinGames/Long-Narde/commit/11196df7c806f18fffa84bbbb52f6301037131db) | 0/54 | Fully contained in `main` |
| `feature/runtime-diagnostics` | [`36ee873`](https://github.com/MetinGames/Long-Narde/commit/36ee873e0886345ac4ac2592dac2ea265074fe1f) | 0/50 | Fully contained in `main` |
| `feature/russian-language` | [`527a86e`](https://github.com/MetinGames/Long-Narde/commit/527a86e9ba54d8eea53ff871bc3522b6dba459c0) | 0/66 | Fully contained in `main` |
| `feature/sampled-sound-review` | [`ec9347c`](https://github.com/MetinGames/Long-Narde/commit/ec9347c24c5c112ed67116c1b81883c6e9483efc) | 0/30 | Fully contained in `main` |
| `feature/start-language-selector` | [`91d2c8d`](https://github.com/MetinGames/Long-Narde/commit/91d2c8d6acaed6c578422e986c03ddc98ed9cb2a) | 0/56 | Fully contained in `main` |
| `feature/start-screen` | [`b35286d`](https://github.com/MetinGames/Long-Narde/commit/b35286df2846b7bf1e6a1f5f703581b6407d3044) | 0/70 | Fully contained in `main` |
| `feature/victory-moment` | [`27d3241`](https://github.com/MetinGames/Long-Narde/commit/27d3241b1d0e563bd93ed47a778c30af7e58d198) | 0/64 | Fully contained in `main` |
| `fix/auto-pass-no-legal-moves` | [`984bb3a`](https://github.com/MetinGames/Long-Narde/commit/984bb3af5e2f46e01abd33d4138e599ad460d1c6) | 0/29 | Fully contained in `main` |
| `fix/background-timer` | [`3407674`](https://github.com/MetinGames/Long-Narde/commit/3407674a0ee66c354a1d8f67f3e91fdfd6d1e8f7) | 0/68 | Fully contained in `main` |
| `fix/bug-report-form` | [`2eacbae`](https://github.com/MetinGames/Long-Narde/commit/2eacbae006c17c90f3ef8563e4d2505c01233120) | 0/53 | Fully contained in `main` |
| `fix/core-rules` | [`074954b`](https://github.com/MetinGames/Long-Narde/commit/074954b7688b078ffa4dfe43e4b71b2c2550bf8b) | 0/76 | Fully contained in `main` |
| `fix/game-over-flow` | [`114c7b2`](https://github.com/MetinGames/Long-Narde/commit/114c7b23b8a0f8f69a863b03b413fafc49cdb469) | 0/73 | Fully contained in `main` |
| `fix/ios-mobile-layout` | [`39c6d90`](https://github.com/MetinGames/Long-Narde/commit/39c6d90daa8ab7d6e61d5d4e09443175c0e47e2e) | 0/71 | Fully contained in `main` |
| `fix/legal-six-move-selection` | [`fa822ff`](https://github.com/MetinGames/Long-Narde/commit/fa822ff1c1de9df1763fc120d54eb850cd6f5393) | 0/32 | Fully contained in `main` |
| `fix/mobile-layout` | [`8a41ab0`](https://github.com/MetinGames/Long-Narde/commit/8a41ab05511ba60ae62b0930bb10c0d7227e7b76) | 0/72 | Fully contained in `main` |
| `fix/per-turn-timeout-reset` | [`f626c21`](https://github.com/MetinGames/Long-Narde/commit/f626c2191b6457ccc432cdbb6b2dba0962887387) | 0/45 | Fully contained in `main` |
| `fix/renderer-storage-safety` | [`f6f1cc2`](https://github.com/MetinGames/Long-Narde/commit/f6f1cc2fa62a280624ae7e45bba32e92e4ffac10) | 0/59 | Fully contained in `main` |
| `fix/undo-action-lock-clean` | [`1e64b63`](https://github.com/MetinGames/Long-Narde/commit/1e64b63aa2a348b2b55c0ebc594f58dbef6ed741) | 0/60 | Fully contained in `main` |
| `refactor/app-runtime-state` | [`6a7ac18`](https://github.com/MetinGames/Long-Narde/commit/6a7ac1882476fdd90cfd03d2fb0c24b8fb46523f) | 0/51 | Fully contained in `main` |

## Proposed cleanup gate

If Metin later approves deletion of the exact 45 cleanup candidates above:

1. Re-run the inventory against the then-current `main`.
2. Stop if any candidate becomes active, gains a new commit, or opens a PR.
3. Preserve the active Supabase branch and all four manual-review branches.
4. Delete only the still-matching 45 named refs.
5. Re-list remote branches and record the result in Issue #6 or a dedicated
   cleanup Issue.

This proposal deliberately separates evidence gathering from deletion.
