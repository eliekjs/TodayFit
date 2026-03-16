# Primary/secondary muscles audit — ExRx-style, canonical slugs

**Date:** 2025-03-25  
**Scope:** Normalize `primary_muscles` and `secondary_muscles` on `public.exercises` to canonical muscle slugs; apply ExRx-style primary vs secondary roles where evidence-based.  
**Run type:** Exercise DB enrichment (one category: muscles).

---

## 1. Purpose

- Replace legacy **movement-style** values (`push`, `pull`) in muscle columns with **canonical muscle slugs** so body-part focus and scoring use actual muscles (chest, triceps, shoulders, lats, biceps, upper_back).
- Apply **ExRx-style** primary vs secondary: primary = main movers; secondary = synergists/assistive (ExRx.net muscular analysis, NSCA, ACSM).

---

## 2. Canonical muscle slugs (ontology)

From `docs/EXERCISE_ONTOLOGY_DESIGN.md` § C.4:

**Allowed:**  
`legs`, `quads`, `glutes`, `hamstrings`, `calves`, `core`, `chest`, `back`, `lats`, `upper_back`, `shoulders`, `triceps`, `biceps`, `forearms`.

**Not allowed as muscles:**  
`push`, `pull` (those are movement-family; use chest/shoulders/triceps and lats/biceps/upper_back instead).

---

## 3. Research basis

| Source | Use |
|--------|-----|
| **ExRx.net** — Barbell Bench Press, Squat, Deadlift, Pull-up, Lat Pulldown, muscular analyses | Primary vs secondary by exercise. |
| **NSCA** — movement patterns, kinetic select | Squat = quads dominant; deadlift = posterior chain (glutes, hamstrings). |
| **ACSM** — multi-joint exercises, major muscle groups | Align with 8–10 multi-joint exercises, major muscle groups. |

### 3.1 ExRx-style mappings (summary)

- **Horizontal push (bench, push-up, dip):** Primary = chest; secondary = triceps, shoulders (anterior deltoid).
- **Vertical push (OH press, shoulder press):** Primary = shoulders; secondary = triceps, core.
- **Vertical pull (pull-up, lat pulldown):** Primary = lats; secondary = biceps, upper_back (teres major, rhomboids, traps).
- **Horizontal pull (row):** Primary = upper_back, lats; secondary = biceps.
- **Squat:** Primary = quads, glutes; secondary = hamstrings, core.
- **Hinge (deadlift, RDL):** Primary = glutes, hamstrings; secondary = quads, core, upper_back (erector spinae).
- **Isolation (curl, tricep extension, fly, lateral raise):** Primary = the target muscle; secondary = assistive as needed.

---

## 4. Implementation

### 4.1 Bulk normalization (migration)

- **Replace `push`** in `primary_muscles` and `secondary_muscles` with canonical push muscles: `chest`, `triceps`, `shoulders`. (So any exercise that had only `push` now has at least those three for filter overlap.)
- **Replace `pull`** with: `lats`, `biceps`, `upper_back`.
- **Keep `legs`** as valid; optionally add more specific lower-body slugs (quads, glutes, hamstrings) for key lower-body exercises in the override set.
- **Dedupe** and preserve order where practical.

### 4.2 ExRx overrides (migration)

Explicit `UPDATE ... SET primary_muscles = ..., secondary_muscles = ... WHERE slug = ?` for a representative set so primary vs secondary matches ExRx:

- **Bench / horizontal push:** primary = chest; secondary = triceps, shoulders.
- **OH press / vertical push:** primary = shoulders; secondary = triceps, core.
- **Pull-up / lat pulldown:** primary = lats; secondary = biceps, upper_back.
- **Rows:** primary = upper_back, lats; secondary = biceps, core (where applicable).
- **Squat:** primary = quads, glutes; secondary = hamstrings, core.
- **Deadlift / RDL:** primary = glutes, hamstrings; secondary = quads, core, upper_back.
- **Curls:** primary = biceps (forearms optional); secondary = [].
- **Tricep isolation:** primary = triceps; secondary = [].
- **Lateral/front raise:** primary = shoulders; secondary = [].
- **Core:** primary = core; secondary as needed.

### 4.3 App filter alignment

- **`lib/generator.ts`** `bodyPartFocusToMuscles()`: map UI "Push" → `['chest','triceps','shoulders']`, "Pull" → `['lats','biceps','upper_back']`, "Lower body" → `['legs']` (or add quads, glutes, hamstrings for stricter match). So `listExercises({ primaryMuscles })` continues to return the right exercises.

---

## 5. Validation

- Body-part focus (Push / Pull / Lower / Core) still returns correct exercises after migration.
- No `push` or `pull` left in `primary_muscles` or `secondary_muscles`.
- All values in muscle columns are from the canonical list (legs, quads, glutes, hamstrings, calves, core, chest, back, lats, upper_back, shoulders, triceps, biceps, forearms).
- Generator and scoring still receive merged `muscle_groups` from adapter (primary + secondary); no breaking change.

---

## 6. References

- ExRx.net: Barbell Bench Press, Squat, Deadlift, Pull-up, Cable Pulldown, muscular analyses.
- NSCA: movement patterns, kinetic select (squat vs deadlift emphasis).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.4, lib/ontology/vocabularies.ts (pairing/fatigue use similar slugs).
