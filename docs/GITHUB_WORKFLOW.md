# GitHub workflow and roadmap ownership

`ROADMAP.md` is the phase-level product plan. GitHub Issues are the executable
work units. The repository Project, when enabled by the owner, is a filtered
view of those Issues and must not become a competing source of scope.

## Required metadata

- Priority: `priority:p0` blocker, `p1` current phase, `p2` planned next, `p3` backlog.
- Status: `triage`, `ready`, `in-progress`, `blocked`, or closed/`done`.
- Type: `implementation` or evidence-first `research` when helpful.
- `external-gate` means implementation can progress but closure needs named
  owner, provider, device, legal, recording, or store evidence.

Issue titles start with `[P0]` through `[P3]`; bodies name target phase,
status, scope, exclusions, acceptance tests, and external gates. One Issue owns
one bounded outcome. PRs link that Issue and update both its evidence and the
roadmap when phase-level truth changes.

## Automation

`issue-metadata.yml` creates/repairs the canonical labels, applies priority
from the title on open/reopen, assigns triage, and moves closed Issues to done.
The structured templates make acceptance tests mandatory. `active-issues.json`
is the small synchronization catalog; `npm run roadmap:check` fails when an
active catalog Issue is missing from `ROADMAP.md`.

After merging the initial workflow, run **Issue metadata** once manually to
seed labels, then apply ready/in-progress/blocked and external-gate labels to
the current Issues. A GitHub Project can then group by status and filter by
priority/phase. Project creation and milestone dates remain owner-facing GitHub
settings and are not claimed complete by repository code alone.
