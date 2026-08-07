# GitHub workflow and roadmap ownership

`ROADMAP.md` is the phase-level product plan. GitHub Issues are the executable
work units. The linked [Nardora Roadmap Project](https://github.com/users/MetinGames/projects/2)
is a filtered operational view of those Issues and must not become a competing
source of scope.

## Required metadata

- Priority: `priority:p0` blocker, `p1` current phase, `p2` planned next, `p3` backlog.
- Status: `triage`, `ready`, `in-progress`, `blocked`, or closed/`done`.
- Phase: `Phase 0`, `Phase 1`, `Phase 2`, `Hosted Alpha`, or `Research`.
- Effort: a compact size or focused-workday estimate copied from the Issue body.
- Target window: `Now`, `Next`, `Later`, or `External Gate`.
- Type: `implementation` or evidence-first `research` when helpful.
- `external-gate` means implementation can progress but closure needs named
  owner, provider, device, legal, recording, or store evidence.

Issue titles start with `[P0]` through `[P3]`; bodies name target phase,
status, scope, exclusions, acceptance tests, and external gates. One Issue owns
one bounded outcome. PRs link that Issue and update both its evidence and the
roadmap when phase-level truth changes.

## Project views and milestones

The repository-linked Project contains every open Issue. Its canonical views are:

- **Active Work:** `is:open`; closed Issues disappear automatically.
- **Blocked:** `is:open status:blocked`; only named external gates are shown.

The Project uses structured Status, Priority, and Phase fields. Effort and Target
Window remain required completion fields for Issue #8; do not close #8 until
those columns are present and populated.

Repository milestones provide stable timeline grouping without replacing the
roadmap:

- **Phase 0 — Foundation**
- **Phase 1 — Release Quality**
- **Hosted Alpha — Private Table**

Phase 2 and Research remain Project field values until a dated delivery milestone
is useful. Issue #67 belongs to Phase 2 even though it has no repository milestone.

## Automation

`issue-metadata.yml` creates/repairs the canonical labels, applies priority
from the title on open/reopen, assigns triage, and moves closed Issues to done.
The structured templates make acceptance tests mandatory. `active-issues.json`
is the small synchronization catalog; `npm run roadmap:check` fails when an
active catalog Issue is missing from `ROADMAP.md`.

After a new Issue opens, add it to the linked Project and set Status, Priority,
Phase, Effort, and Target Window from the Issue metadata. The Active Work filter
removes closed Issues without manual board cleanup. Project scope must always be
derived from Issues and `ROADMAP.md`, never invented only in a Project cell.

When every executable engineering child is complete, keep the parent Issue open
only for a specifically named external gate. Mark both the Issue and
`active-issues.json` as `blocked`/`externalGate`; do not leave an owner setting,
physical-device check, recording, provider approval, or real-player observation
misrepresented as active coding work.
