# Autonomous PR validation

Script `validate-autonomous-pr.js` enforces policy from root `AGENTS.md` for agent-generated PRs.

## What is checked

| Check | Blocking condition |
|-------|--------------------|
| **Logic changes without tests** | Any change under `logic/workoutIntelligence/` or `logic/workoutGeneration/` (non-test files) must have at least one changed or new `*.test.ts` file in the same areas. |
| **Autonomous changes without research note** | If any file under `logic/workoutIntelligence/` or `logic/workoutGeneration/` is changed (non-test), there must be at least one new or changed file under `docs/research/` (`.md`/`.mdx`). |
| **Mixed broad rewrites** | More than 2 distinct subsystems touched in one diff (constraints, scoring, prescription, superset, weekly, dailyGenerator, sessionAssembler) → fail unless `--allow-multi-subsystem` is set. |
| **New exercise records** | SQL migrations that INSERT into exercise-related tables are checked for presence of id, name, movement family/pattern, and equipment per ontology. |

**Not automated (manual review):** “Metadata additions that claim behavior change but are not wired into generation” — reviewers should confirm that new ontology/DB fields referenced in the PR description are actually used in filtering, scoring, or prescription.

## Usage

```bash
# From repo root (e.g. on branch before pushing)
node scripts/validate-autonomous-pr.js

# Allow multiple subsystems in one run (use sparingly)
node scripts/validate-autonomous-pr.js --allow-multi-subsystem

# See what would be checked without failing
node scripts/validate-autonomous-pr.js --dry-run
```

Optional npm script (add to `package.json` if desired):

```json
"validate:autonomous-pr": "node scripts/validate-autonomous-pr.js"
```

## CI / hooks

- **CI:** Run `validate-autonomous-pr.js` in the branch only when the diff touches `logic/workoutIntelligence/`, `logic/workoutGeneration/`, or `supabase/migrations/*exercise*` (or always for agent branches).
- **Pre-push (optional):** Add a hook that runs the script when pushing branches whose name contains `agent/` or `autonomous/`.

## Merge base

The script uses `git merge-base HEAD origin/main` (fallback `main`) to get the diff. Ensure `origin/main` or `main` is updated so the comparison is correct.
