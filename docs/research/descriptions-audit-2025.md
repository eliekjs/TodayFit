# Exercise descriptions audit: evidence-based standards and enrichment

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — description (user-facing text)  
**Scope:** Audit exercise description purpose and content using NSCA, ACSM, ExRx, NCSF; define standards; align stub format and wording with evidence (primary movers, movement family, equipment). Display and UX only; not used by generator.

---

## 1. Research question

What should user-facing exercise descriptions contain, and what format do reputable sources use? How should we backfill or refine machine-generated stubs so they align with evidence until curated copy exists?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **ExRx.net** — Exercise directory, exercise pages | Tier 2 | Each exercise has a short description, **primary movers** (bold) and synergists, equipment, and often execution notes. Wording is concise; "primary" vs "synergist" is explicit. Good model for: "[Name]. Primarily targets [primary muscles]. [Equipment.]" |
| **ExRx.net** — Muscle directory, movement analysis | Tier 2 | Emphasizes which muscles are primary vs assistive; descriptions that say "targets X" should distinguish primary when possible ("primarily targets"). |
| **NSCA** — Exercise technique, program design | Tier 1 | Exercise documentation includes movement pattern, key technique points, and safety/cue reminders. 1–3 sentences typical; avoid lengthy step-by-step in a single description field. |
| **ACSM** — Resistance training guidelines | Tier 1 | Exercise selection and documentation support client communication; clarity on movement and muscle focus aids adherence and safety. |
| **NCSF** — Exercise selection, cueing | Tier 2 | Reinforces concise description of movement and primary muscle focus; cues can be one short line when space allows. |
| **Project** | Internal | docs/research/exercise-descriptions-audit.md, 20250325000007_exercise_descriptions_audit.sql, EXERCISE_ONTOLOGY_DESIGN.md (description as display-only). |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Purpose:** Description is for **display and accessibility only**; not used by generator logic. When null, UI can show a derived stub until curated copy is added (ExRx/NSCA style).
- **Length:** 1–3 sentences (NSCA, ACSM). Avoid long step-by-step in one field; prefer summary + primary focus.
- **Content:** Include (1) what the exercise is (movement family / pattern), (2) **primary** muscles (ExRx: "primary movers" first), (3) equipment when helpful. **Implemented:** Stub format: "[Name] is a [family] exercise. Primarily targets [primary_muscles]. Equipment: [equipment]." (Wording "Primarily targets" aligns with ExRx primary movers.)
- **Normalize:** Trim whitespace; store empty string as NULL. **Implemented:** 20250325000007, 20250331000000.

### Context-dependent heuristics (implemented)

- **Stub vs curated:** Machine-generated stubs are identifiable (e.g. "Equipment:" in string) and can be replaced later with human copy from ExRx/NSCA. No need to add key cues in stub for every exercise; optional for flagship exercises later.
- **When primary_muscles missing:** Fall back to "Targets [muscles]" if only secondary or generic; or omit targets sentence. **Implemented:** Stub only adds "Targets …" when primary_muscles length > 0; "Primarily targets" used when we have primary_muscles.

### Speculative / deferred

- Full step-by-step instructions per exercise (e.g. NSCA technique sheets) — too long for single description field; defer to separate "instructions" or link to external resource.
- Localized descriptions — single language for now; no schema change.

---

## 4. Comparison to implementation

- **Before:** Stub used "Targets [primary_muscles]" (20250325000007, 20250331000000). All active exercises with null description got a one-liner.
- **After (this audit):** (1) Research note ties standards to ExRx (primary movers), NSCA/ACSM (1–3 sentences, technique/safety context), NCSF. (2) Stub wording updated to "Primarily targets" when primary_muscles present, to align with ExRx terminology. (3) Re-apply stub where description remains null (idempotent). No schema change; description remains optional freeform text.

---

## 5. Generator / app use

- **Generator:** Does not use description.
- **Adapter:** Passes `description` to Exercise when present (generatorExerciseAdapter.ts).
- **UI:** Can display description in exercise detail, workout cards, and for accessibility. When null, app can derive same stub client-side or rely on DB stub after backfill.

---

## 6. Validation

- Every active exercise has description either NULL or non-empty trimmed text.
- No description is only whitespace.
- Stub descriptions use "Primarily targets" when primary_muscles is set; "Targets" or omitted when not.
- Stubs are replaceable with curated copy from ExRx/NSCA when available.

---

## 7. References

- ExRx.net: Exercise directory, primary movers vs synergists, exercise pages.
- NSCA: Exercise technique, program design, documentation standards.
- ACSM: Resistance training guidelines, client communication.
- NCSF: Exercise selection, cueing.
- Project: exercise-descriptions-audit.md, 20250325000007_exercise_descriptions_audit.sql, 20250331000000 (stub in consolidated), EXERCISE_ONTOLOGY_DESIGN.md, generatorExerciseAdapter.ts.
