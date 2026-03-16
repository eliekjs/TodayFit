# Primary/secondary muscles audit: ExRx-style, canonical slugs, and muscle priority

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — primary_muscles / secondary_muscles  
**Scope:** Audit and enrich primary/secondary muscles (ExRx-style, canonical slugs); order by contribution (most→least); add muscle priority logic to workout generation for better focus matching.

---

## 1. Research question

Which muscles are primary vs secondary for each exercise (ExRx-style), in what order of contribution? How should the generator use primary vs secondary for body-part focus scoring?

---

## 2. Sources

| Source | Type (Tier) | Link / key claim(s) |
|--------|-------------|----------------------|
| **ExRx.net** — Muscle Directory, Exercise Directory, muscular analyses | Tier 2 | [ExRx Muscle Directory](https://exrx.net/Lists/Muscle), [Exercise Directory](https://exrx.net/Lists/Directory). Bold = primary movers; regular = assistive/synergists. Pectoralis major primary in bench press; anterior deltoid and triceps synergists. |
| **ExRx.net** — Bench Press, Squat, Deadlift, Pull-up analyses | Tier 2 | [Bench Press](https://exrx.net/Kinesiology/BenchPress): Pectoralis major primary; anterior deltoid, triceps synergists. Vertical pull: lats primary; biceps, teres major, rhomboids assist. |
| **ACSM's Health & Fitness Journal** — The Bench Press Exercise | Tier 1 | [ACSM HFJ](https://journals.lww.com/acsm-healthfitness/fulltext/2018/11000/the_bench_press_exercise.12.aspx): Primary movers and synergists align with ExRx. |
| **NSCA** — Movement patterns, kinetic select | Tier 1 | Squat = quads/glutes dominant; deadlift = posterior chain (glutes, hamstrings); row = upper back, lats. |
| **NCSF** — Contraindicated exercises / movement patterns | Tier 2 | Same audit sources; reinforces push = chest/triceps/shoulders, pull = lats/biceps/upper_back for classification. |
| **NASM** — Biomechanics of the Bench Press | Tier 2 | [NASM blog](https://blog.nasm.org/biomechanics-of-the-bench-press): Primary vs synergist muscle activation. |
| **Project** — docs/EXERCISE_ONTOLOGY_DESIGN.md § C.4, exercise-muscles-exrx-canonical-audit.md | Internal | Canonical slugs: legs, quads, glutes, hamstrings, calves, core, chest, back, lats, upper_back, shoulders, triceps, biceps, forearms. No push/pull in muscle columns. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Horizontal push (bench, push-up, dip):** Primary = chest (pectorals); secondary = triceps, shoulders (anterior deltoid). Order: chest first, then triceps, then shoulders (ExRx, ACSM).
- **Vertical push (OH press):** Primary = shoulders; secondary = triceps, core. Order: shoulders, triceps, core.
- **Vertical pull (pull-up, lat pulldown):** Primary = lats; secondary = biceps, upper_back. Order: lats, biceps, upper_back.
- **Horizontal pull (row):** Primary = upper_back, lats; secondary = biceps, core (when applicable). Order: upper_back, lats, biceps, core.
- **Squat:** Primary = quads, glutes; secondary = hamstrings, core. Order: quads, glutes, hamstrings, core (NSCA).
- **Hinge (deadlift, RDL):** Primary = glutes, hamstrings; secondary = quads, core, upper_back (erector spinae). Order: glutes, hamstrings, then quads, core, upper_back.
- **Isolation:** Primary = target muscle; secondary = assistive (e.g. biceps curl: biceps primary, forearms secondary). Order: single primary first, then secondary by contribution.
- **Canonical slugs only:** No `push` or `pull` in primary_muscles or secondary_muscles; use chest/triceps/shoulders and lats/biceps/upper_back (ExRx-style, ontology C.4).
- **Muscle priority in generation:** When body-part focus is set, prefer exercises whose **primary** muscles match the focus (ExRx primary movers) over those where only secondary muscles match. Implemented: focusBodyPartToMuscles returns canonical muscle slugs; scoring adds bonus when match is in primary (derived from muscle_groups minus secondary_muscle_groups).

### Context-dependent heuristics (implemented)

- **Dips:** Chest and triceps both primary (ExRx: pectorals and triceps); shoulders secondary. Order: chest, triceps, shoulders.
- **Carry:** Core primary; legs or shoulders secondary by variant. Order: core first.
- **Rower / ski erg:** Legs and core primary; lats, upper_back secondary. Order: legs, core, lats, upper_back.

### Speculative / deferred

- Finer ExRx subdivisions (e.g. sternal vs clavicular head of pec) stay as single slug `chest` per ontology; no schema change.

---

## 4. Comparison to previous implementation

- **Before:** primary_muscles and secondary_muscles were normalized in 20250325000001 (push→chest/triceps/shoulders, pull→lats/biceps/upper_back) with ExRx overrides. Body-part scoring used focusBodyPartToMuscles returning "push"/"pull"/"legs"/"core", which did not match canonical muscle_groups (chest, lats, etc.), so focus scoring could under-match. No "primary match" bonus.
- **After:** (1) focusBodyPartToMuscles returns canonical muscle slugs (upper_push→chest, triceps, shoulders; upper_pull→lats, biceps, upper_back; lower→legs, quads, glutes, hamstrings, calves; core→core; full_body→all). (2) Enrichment migration adds missing secondary muscles and ensures order within primary_muscles and secondary_muscles is most→least contribution where needed. (3) Scoring: when focus matches and the match is in the exercise’s primary set (muscle_groups minus secondary_muscle_groups), add a primary_muscle_match_bonus so exercises that **primarily** target the focus score higher.

---

## 5. Metadata / ontology impact

- **DB:** primary_muscles and secondary_muscles remain text[]; order within each array is **most→least contribution** (first = main mover). Enrichment adds missing muscles and fixes order for key exercises.
- **Ontology:** No new slugs; existing C.4 slugs used. Doc updated to state that array order = contribution order.
- **Generation:** focusBodyPartToMuscles returns canonical muscles; scoreExercise uses primary vs secondary for body-part bonus (primary match gets extra bonus).

---

## 6. Validation

- Body-part focus (Upper Push, Pull, Lower, Core) returns correct exercises and scores higher when exercise primarily targets that focus.
- All muscle values are from canonical list (legs, quads, glutes, hamstrings, calves, core, chest, back, lats, upper_back, shoulders, triceps, biceps, forearms).
- Generator receives muscle_groups (merged) and secondary_muscle_groups; primary set derived for scoring when needed.
