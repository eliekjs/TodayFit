# Exercise aliases audit — search and discovery

**Date:** 2025-03-25  
**Scope:** Define purpose and standards for the `aliases` column on `public.exercises`; normalize existing values (trim, dedupe, remove canonical name) and backfill common alternate names for search/discovery.  
**Run type:** Exercise DB enrichment (one category: aliases).

---

## 1. Purpose

- **aliases** = array of alternate names and abbreviations users might type when searching or referring to an exercise (e.g. "OHP", "overhead press" for oh_press; "RDL", "Romanian deadlift" for barbell_rdl). Used for search/discovery and display.
- Not used by generator logic; search and UX only. When present, search or autocomplete can match against name + aliases.
- **Ontology:** docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17 — "Alternate names (e.g. OHP, overhead press)." Cardinality: multi (text[]). Storage: DB `aliases` (text[]).

---

## 2. Standards (no canonical list)

- **Format:** Array of non-empty strings. No controlled vocabulary; freeform alternate names and abbreviations.
- **Guidelines:**
  - Include common abbreviations (OHP, BP, RDL, DL, BSS, WGS, KB).
  - Include alternate spellings or forms (pull-up vs pull up, push-up vs pushup, farmer's carry vs farmers carry).
  - Include shortened or colloquial names (bench, squat, leg press, hip thrust).
  - Do **not** include the exercise's canonical `name` in aliases (redundant).
  - Trim whitespace; store no empty strings; deduplicate (case-insensitive where sensible).
- **Normalize:** Trim each element; remove empty; dedupe; remove any element that equals (case-insensitive) the exercise name.

---

## 3. Derivation rules (for backfill)

- **By slug/name:** Known alternate names and acronyms per exercise (see 20250320000001 and extension list). Examples: oh_press → OHP, overhead press, strict press; barbell_deadlift → conventional deadlift, DL; pullup → pull-up, pull up.
- **No automatic derivation from slug alone** (e.g. "barbell_back_squat" → "barbell back squat") unless that form is a common search term; prefer curating high-value aliases.
- **Extend backfill** for common exercises that lack aliases: dips, rows, presses, stretches, etc., where a well-known alternate exists.

---

## 4. Implementation

- **Normalize:** For every exercise with non-empty aliases: trim each element, remove empty strings, remove element if it equals (case-insensitive) the exercise name, deduplicate, set to '{}' if result is empty.
- **Backfill:** Add or extend aliases for exercises where we have a clear, common alternate (extend 20250320000001 list with additional slugs/aliases pairs). Do not overwrite existing aliases for the same slug; only set where aliases are currently null or empty, or merge new entries into existing array.

---

## 5. Validation

- Every aliases array has no empty strings; no element equals the exercise name (case-insensitive). GIN index on aliases supports containment queries for search.

---

## 6. References

- **Evidence-based audit (same sources):** docs/research/aliases-audit-2025.md (NSCA, ACSM, ExRx, NCSF; abbreviations, alternate spellings, common names; search/discovery only).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17, supabase/migrations/20250325000009_exercise_aliases_audit.sql, 20250331000000 (consolidated), 20250331000004_aliases_evidence_enrichment.sql, lib/db/generatorExerciseAdapter.ts, logic/workoutGeneration/types.ts.
