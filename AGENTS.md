# TodayFit — Autonomous Agent Policy

This document defines repo-wide policy for **autonomous improvement** of workout logic and the exercise database. All agent-driven changes must follow it.

---

## 1. Scope and principles

- **Two agent types only:** (1) **Workout Logic Research Integration** — research → evidence → implementation through to workout/week output; (2) **Exercise DB Enrichment** — schema-aware metadata enrichment, one category per run.
- **Incremental and narrow:** One narrow subsystem or one enrichment category per run. No broad "improve everything" runs.
- **Evidence-first for logic:** Prefer systematic reviews, meta-analyses, consensus statements, and reputable sports science sources. Classify findings as high-confidence rules, context-dependent heuristics, or speculative ideas.
- **No auto-merge:** All changes are proposed via pull requests. Humans review and merge.
- **Alignment:** All outputs must align with the current workout generator (`logic/workoutGeneration/dailyGenerator.ts`, `logic/workoutIntelligence/`), types (`lib/types.ts`, `logic/workoutIntelligence/types.ts`), and ontology (`docs/EXERCISE_ONTOLOGY_DESIGN.md`).

---

## 2. Workout Logic Research Integration Agent

**Owns:** Full chain from research to generated workout and weekly plan output.

**Per run:**

1. **Choose exactly one narrow subsystem** (e.g. superset pairing, hinge cap, prescription for hypertrophy, cooldown selection, weekly day naming).
2. **Research** current exercise science on the web for that subsystem.
3. **Classify findings** into:
   - **High-confidence rules** — implement as code/constraints.
   - **Context-dependent heuristics** — implement with clear comments and optional toggles.
   - **Speculative ideas** — document only; do not implement unless explicitly allowed.
4. **Compare** current implementation to evidence; identify gaps and required metadata (ontology/DB).
5. **Implement** the smallest justified end-to-end change across:
   - Exercise metadata / ontology usage
   - Filtering and constraint resolution
   - Scoring and ranking
   - Block assembly and prescription
   - Daily workout output
   - Weekly plan output and naming
6. **Wire new DB/ontology fields** into generation so they actually influence workouts when the PR claims behavior changes.
7. **Add or update** tests, fixtures, and snapshots.
8. **Write a research note** in `/docs/research/` (see templates there).
9. **Open a PR** with: summary, evidence links, risks, rollback notes.

**Constraints:** Do not mix multiple subsystems in one run unless explicitly allowed. Do not stop at research or metadata only — changes must reach workout and week generation.

---

## 3. Exercise DB Enrichment Agent

**Owns:** Auditing and enriching exercise schema and data; no logic changes.

**Per run:**

1. **Audit** current exercise schema and data for gaps in one chosen category.
2. **Enrich one category per run**, e.g.:
   - Aliases, swap candidates, movement families
   - Contraindications, sports tags, fatigue regions
   - Progression/regression links, warmup/cooldown relevance
   - Grip demand, stability demand, impact level
3. **Normalize** all additions to the existing ontology (canonical slugs in `docs/EXERCISE_ONTOLOGY_DESIGN.md` and `lib/ontology/`).
4. **Avoid schema drift** unless explicitly proposed (prefer filling existing columns).
5. **Open a PR** with machine-readable data diffs and validation notes.

**Constraints:** Do not change generator logic. Do not add ontology fields that are never used by the generator unless documented as future use.

---

## 4. Validation gates

The following are **blocking** (CI or pre-commit checks where implemented):

- **Logic changes without tests** — Any change under `logic/workoutIntelligence/` or `logic/workoutGeneration/` that alters behavior must include or update tests.
- **Autonomous changes without a research note** — PRs from the logic research agent must link to a research note in `/docs/research/`.
- **Metadata without wiring** — If a PR claims behavior change from new exercise/ontology fields, those fields must be used in filtering, scoring, or prescription (traceable in code).
- **Mixed broad rewrites** — A single run must not touch multiple unrelated subsystems (e.g. constraints + weekly naming + prescription) unless explicitly allowed in the run brief.
- **New exercise records missing required ontology** — New exercises must include required fields per ontology (e.g. movement family or derived fallback, equipment, contraindications where applicable).

Scripts: `scripts/validate-autonomous-pr.js` (and optionally pre-push hook). See `scripts/README-autonomous-validation.md`.

---

## 5. File and doc locations

| Purpose | Location |
|--------|----------|
| Research notes | `/docs/research/` |
| Source ranking, evidence template, decision log | `/docs/research/source-ranking.md`, `evidence-review-template.md`, `decision-log-template.md` |
| Validation scripts | `scripts/validate-autonomous-pr.js`, `scripts/README-autonomous-validation.md` |
| Cursor skills | `.cursor/skills/workout-logic-research-integration-agent/`, `.cursor/skills/exercise-db-enrichment-agent/` |
| Cursor Automation specs | `.cursor/automation/` (see specs for logic 3×/week, enrichment 2×/week) |
| Improvement targets (audit) | `/docs/research/top-20-improvement-targets.md` |
| Product / workout intent (who the app serves; agent alignment) | `/docs/WORKOUT_INTENT.md` |

---

## 6. Automation schedule (proposed)

- **Logic research + integration agent:** 3 times per week (see `.cursor/automation/logic-research-integration.mdc`).
- **Exercise DB enrichment agent:** 2 times per week (see `.cursor/automation/exercise-db-enrichment.mdc`).

Runs produce PRs only; no automatic merge.
