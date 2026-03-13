---
name: exercise-db-enrichment-agent
description: Audits exercise schema and data for gaps and enriches one category per run (aliases, swap candidates, movement families, contraindications, sports tags, fatigue regions, progressions/regressions, warmup/cooldown relevance, grip/stability/impact). Normalizes to existing ontology; avoids schema drift. Opens PRs with machine-readable diffs and validation notes. Use when autonomously enriching the exercise database.
---

# Exercise DB Enrichment Agent

You audit and enrich the **exercise database and metadata** only. You do **not** change workout generator logic. One **enrichment category** per run.

## When to use this skill

- Autonomous enrichment of exercise data (scheduled or on-demand).
- Filling gaps in aliases, swap candidates, movement families, contraindications, sports tags, fatigue regions, progressions/regressions, warmup/cooldown relevance, grip/stability/impact, or similar categories.

## Per-run workflow (mandatory)

### 1. Audit current schema and data

- Review exercise schema: `supabase/migrations/*exercise*`, `lib/types.ts` (`ExerciseDefinition`), adapter types in `logic/workoutIntelligence/types.ts` and `lib/db/generatorExerciseAdapter.ts`.
- Review ontology: `docs/EXERCISE_ONTOLOGY_DESIGN.md`, `lib/ontology/vocabularies.ts`, `lib/ontology/index.ts`.
- Identify **gaps** in the chosen category (e.g. missing fatigue_regions, sparse progression links).

### 2. Choose exactly one enrichment category per run

Pick **one** per run, e.g.:

- **Aliases** — search/display aliases for exercises
- **Swap candidates** — exercises that can substitute for each other
- **Movement families / patterns** — primary_movement_family, movement_patterns (canonical slugs)
- **Contraindications** — contraindication_tags, joint_stress_tags
- **Sports tags** — sport-specific relevance
- **Fatigue regions** — fatigue_regions (canonical slugs)
- **Progressions / regressions** — progressions[], regressions[] (exercise IDs)
- **Warmup / cooldown relevance** — exercise_role, mobility_targets, stretch_targets
- **Grip demand** — tags or canonical field if in ontology
- **Stability demand** — tags or ontology field
- **Impact level** — low/medium/high for conditioning or joint load

Do **not** mix multiple categories in one run (e.g. do not do fatigue regions + progressions in the same PR).

### 3. Enrich data

- Add or backfill only within the chosen category.
- Use **canonical slugs** from `docs/EXERCISE_ONTOLOGY_DESIGN.md` and `lib/ontology/` (movement families, movement patterns, joint_stress_tags, contraindication_tags, fatigue_regions, pairing_category, mobility_targets, stretch_targets, etc.).
- Prefer **existing columns**; avoid new schema unless explicitly proposed and documented.

### 4. Normalize to ontology

- All new values must match the ontology’s allowed values (see EXERCISE_ONTOLOGY_DESIGN.md sections C.2–C.14).
- If a slug is missing from the doc, add it to the ontology design first (as a proposed change) or use the closest existing slug and note in PR.

### 5. Avoid schema drift

- Do not add new DB columns or TypeScript types for exercise metadata unless the run brief explicitly asks for a schema change.
- If you propose a new field, document it and ensure it is optional so existing code and data remain valid.

### 6. Validation

- New or updated exercise records must not omit **required** ontology fields (e.g. where the schema or generator expects movement family or equipment).
- Run any existing validation or seed scripts (e.g. generator seed test) to ensure no breakage.

### 7. Open a PR

PR must include:

- **Category** — Which single category was enriched.
- **Machine-readable diffs** — SQL migrations or data file changes (not only prose).
- **Validation notes** — What was checked (e.g. slug set, FK consistency, generator still runs).

## Data and schema locations

| Concern | Location |
|--------|----------|
| Ontology design & slugs | `docs/EXERCISE_ONTOLOGY_DESIGN.md` |
| Vocabularies / canonical lists | `lib/ontology/vocabularies.ts`, `lib/ontology/index.ts` |
| Migrations (exercise tables) | `supabase/migrations/*exercise*`, `*exercise_tag*`, `*exercise_structured*` |
| Types | `lib/types.ts`, `logic/workoutIntelligence/types.ts` |
| Adapter (DB → generator) | `lib/db/generatorExerciseAdapter.ts` |
| Seed / backfill examples | `supabase/migrations/*.sql` (seed files) |

## Policy

- Repo policy: root `AGENTS.md`.
- Validation: new exercise records must include required ontology fields; no logic changes in this agent. See `scripts/validate-autonomous-pr.js` and `scripts/README-autonomous-validation.md`.
