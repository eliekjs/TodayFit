# Exercise descriptions audit — purpose and guidelines

**Date:** 2025-03-25  
**Scope:** Define purpose and standards for the `description` column on `public.exercises`; normalize existing values and backfill where null with a derived stub so every active exercise has display-ready text until human copy is added.  
**Run type:** Exercise DB enrichment (one category: descriptions).

---

## 1. Purpose

- **description** = optional user-facing text that explains what the exercise is and, when present, how to perform it or key cues. Used for in-app display (exercise detail, workout cards) and accessibility.
- Not used by generator logic; display and UX only. When null, UI can show a derived one-liner from ontology (name + movement family + muscles + equipment) until curated copy is added.
- **Sources for curated copy:** ExRx.net, NSCA guidelines, and other reputable exercise references. Prefer 1–3 sentences; avoid marketing language.

---

## 2. Standards (no canonical list)

- **Format:** Freeform text. No controlled vocabulary.
- **Guidelines:**
  - Concise: one to three sentences.
  - Include what the exercise is (movement pattern / family), primary muscles, and equipment when helpful.
  - Trim leading/trailing whitespace; store empty string as NULL.
- **Derived stub (for backfill):** When description is null, a one-line stub can be generated from `name`, `primary_movement_family`, `primary_muscles`, and `equipment` so every exercise has *some* text. Stub format: “[Name] is a [family] exercise targeting [muscles]. Equipment: [equipment].” Clearly machine-generated; replace with human copy when available.

---

## 3. Derivation rules (for backfill stub)

- **Family label:** Map primary_movement_family to readable label (upper_push → “upper-body push”, upper_pull → “upper-body pull”, lower_body → “lower-body”, core → “core”, mobility → “mobility”, conditioning → “conditioning”).
- **Muscles:** Join primary_muscles (up to 4) with “, ”; if none, omit “targeting …”.
- **Equipment:** Join equipment (up to 4) with “, ”; if none or bodyweight-only, “Bodyweight” or “None”.
- **Fallback:** If primary_movement_family and primary_muscles are null, use: “[Name]. Equipment: [equipment].”

---

## 4. Implementation

- **Normalize:** TRIM(description); set description = NULL where description = '' or TRIM(description) = ''.
- **Backfill:** For active exercises where description IS NULL, set description to a derived one-liner from name, primary_movement_family, primary_muscles, equipment (per derivation rules above).
- **Wiring:** Include `description` in generator exercise select and adapter so UI can display it when present.

---

## 5. Validation

- Every active exercise has description either NULL or non-empty trimmed text.
- No description is only whitespace.
- Stub descriptions are identifiable (e.g. “Equipment:” in the string) and can be replaced later with curated copy.

---

## 6. References

- **Evidence-based audit (same sources):** docs/research/descriptions-audit-2025.md (NSCA, ACSM, ExRx, NCSF; stub format "Primarily targets", 1–3 sentences, display-only).
- Project: docs/research/exercise-table-full-audit.md (description as optional, ExRx/NSCA), supabase/migrations/20250325000007_exercise_descriptions_audit.sql, 20250331000002_descriptions_evidence_enrichment.sql, lib/db/exerciseRepository.ts, lib/db/generatorExerciseAdapter.ts.
