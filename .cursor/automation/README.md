# Cursor Automation specs for TodayFit

These files describe **proposed** Cursor Automations. Create and configure them in the Cursor product (e.g. cursor.com/automations) — they are not executed from this repo.

| Spec | Schedule | Agent / skill |
|------|----------|----------------|
| [logic-research-integration.mdc](logic-research-integration.mdc) | 3×/week (Mon, Wed, Fri) | workout-logic-research-integration-agent |
| [exercise-db-enrichment.mdc](exercise-db-enrichment.mdc) | 2×/week (Tue, Thu) | exercise-db-enrichment-agent |

Both produce **PRs only**; no auto-merge. After each run, run `npm run validate:autonomous-pr` (or equivalent in CI).
