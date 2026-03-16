# Exercise aliases audit: evidence-based standards and enrichment

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — aliases (alternate names for search and discovery)  
**Scope:** Audit alias purpose and content using NSCA, ACSM, ExRx, NCSF; define standards (abbreviations, alternate spellings, common names); normalize and backfill high-value aliases. Display and search only; not used by generator.

---

## 1. Research question

What should count as an exercise alias, and which alternate names/abbreviations do reputable sources use so users can find exercises when searching or logging?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **ExRx.net** — Exercise directory, exercise names | Tier 2 | Uses standard English names: "Overhead Press", "Bench Press", "Romanian Deadlift", "Pull-Up", "Lat Pulldown", "Leg Press", "Goblet Squat". Alternate spellings and hyphenation (pull-up vs pull up) appear in literature. Good source for **canonical alternate names** to add as aliases. |
| **NSCA** — Essentials of Strength Training, exercise lists | Tier 1 | Exercise terminology aligns with ExRx (overhead press, bench press, squat, deadlift, RDL, hip thrust, pull-up, row). Programming shorthand (OHP, BP, DL, RDL) common in logs and programs. |
| **ACSM** — Resistance training guidelines | Tier 1 | Uses standard exercise names; no separate "alias" concept but names match ExRx/NSCA. Abbreviations (e.g. 1RM, reps) and exercise short names used in prescriptions. |
| **NCSF** — Program design, exercise selection | Tier 2 | Same exercise naming conventions; pull-up, chin-up, lat pulldown, leg curl, leg extension, etc. Reinforces **common alternate forms** (with/without hyphen, abbreviated). |
| **Project** | Internal | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17, exercise-aliases-audit.md, 20250325000009, 20250331000000 (consolidated alias backfill). |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Purpose:** Aliases support **search and discovery** (and optional display). Users may type "OHP", "overhead press", "pull-up", "RDL", "leg press". Not used by generator; search/UX only.
- **Content:** Include (1) **common abbreviations** (OHP, BP, RDL, DL, BSS, WGS, BPA, GM); (2) **alternate spellings/forms** (pull-up / pull up, push-up / pushup, lat pulldown / lat pull-down); (3) **short or colloquial names** (bench, squat, leg press, hip thrust, goblet, dead bug, bird dog). **Implemented:** Backfill in 20250325000009, 20250331000000, 20250331000004.
- **Do not include** the exercise's canonical `name` in aliases (redundant). **Implemented:** Normalize step removes any element that equals (case-insensitive) the exercise name.
- **Normalize:** Trim each element; remove empty strings; deduplicate; remove canonical name. **Implemented:** 20250325000009; re-apply in enrichment migration for consistency.
- **High-value aliases by category:** Presses (OHP, BP, incline press, push press); pulls (RDL, DL, lat pulldown, cable row, pull-up, chin-up); lower (BSS, leg press, goblet squat, hip thrust, KB swing); core/mobility (dead bug, bird dog, WGS, cat cow, band pull-apart). **Implemented:** Spread across 20250320000001, 20250325000009, 20250331000000, 20250331000004.

### Context-dependent heuristics (implemented)

- **No automatic derivation from slug alone** (e.g. "barbell_back_squat" → "barbell back squat") unless that form is a common search term; prefer curating known alternates from ExRx/NSCA naming.
- **Merge vs overwrite:** When backfilling, only set aliases where currently null or empty so we don't overwrite curated lists; optional merge of new entries into existing array in future.

### Speculative / deferred

- Localized aliases (e.g. Spanish, French) — single language for now.
- Synonym rings (e.g. "tricep extension" ↔ "tricep pushdown") — covered by swap_candidates; aliases stay per-exercise.

---

## 4. Comparison to implementation

- **Before:** Normalize (trim, dedupe, remove canonical name); backfill for dips, push press, good morning, cat cow, front squat, cable row, skull crusher, barbell curl, hack squat, back extension, seated calf, dead bug, bird dog, thread the needle, hip 90/90, band pull-apart (20250325000009). Consolidated migration added OHP, BP, RDL, DL, BSS, WGS, lat pulldown, leg press, goblet squat, hip thrust, KB swing (20250331000000).
- **After (this audit):** (1) Research note ties alias types to ExRx/NSCA/ACSM/NCSF naming and programming shorthand. (2) Additional high-value aliases for pull-up, chin-up, leg curl, leg extension, and other common terms (20250331000004). (3) No schema change; validation and comments reference evidence doc.

---

## 5. Generator / app use

- **Generator:** Does not use aliases.
- **Adapter:** Passes `aliases` to Exercise when present (generatorExerciseAdapter.ts).
- **Search/UX:** Can match user input against name + aliases for exercise search or autocomplete.

---

## 6. Validation

- No empty strings in aliases array; no element equals the exercise name (case-insensitive).
- All entries trimmed; deduplicated.
- GIN index on aliases (if present) supports containment queries.

---

## 7. References

- ExRx.net: Exercise directory (standard names: Overhead Press, Bench Press, Romanian Deadlift, Pull-Up, Lat Pulldown, etc.).
- NSCA: Essentials of Strength Training (exercise terminology, programming shorthand OHP, BP, DL, RDL).
- ACSM: Resistance training guidelines (standard exercise names).
- NCSF: Program design (common names and forms).
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.17, exercise-aliases-audit.md, 20250325000009, 20250331000000, 20250331000004.
