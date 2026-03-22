# Phase 3 — Session structure: exercise role, pairing category, fatigue regions

**Subsystem:** Ontology fields that support **block-appropriate selection** (main vs prep vs mobility), **superset pairing** (`logic/workoutIntelligence/supersetPairing.ts`), and **fatigue-aware scoring** (`logic/workoutGeneration/ontologyScoring.ts`).

**Date:** 2025-03-21

## Sources (ranked)

| Source | Tier | Use in this phase |
|--------|------|-------------------|
| NSCA *Essentials of Strength Training and Conditioning* (exercise order: multijoint → single-joint; large muscle before small) | 1–2 (textbook consensus) | **High-confidence heuristic:** distinguish **main multi-joint work** (`main_compound`) from **accessory / isolation** roles for session structure—not exercise prescriptions. |
| [NSCA JSCR — Agonist–antagonist paired set resistance training](https://journals.lww.com/nsca-jscr/fulltext/2010/10000/agonist_antagonist_paired_set_resistance_training_.41.aspx) | 1 | **High-confidence (conceptual):** complementary pairing (e.g. push/pull, quads/posterior chain) is a standard programming tool; **`pairing_category`** slugs exist so the engine can score **complementary vs redundant** pairs. |
| [PubMed brief review — agonist–antagonist paired sets](https://pubmed.ncbi.nlm.nih.gov/20733520/) | 2 | Reinforces time-efficiency and use cases for paired sets; supports **fatigue_region overlap penalties** as a practical guardrail (not a claim of optimal physiology per exercise). |
| ACSM resistance-training guidelines (multi-joint, major muscle groups, individualized progression) | 1–2 | Aligns **role** taxonomy with “primary lifts vs assistance” language used in coaching without overfitting to one study. |

## Classification

### High-confidence (implemented as rules)

1. **Roles** map to `EXERCISE_ROLES` in `lib/ontology/vocabularies.ts` only.
2. **`pairing_category`** values are exactly `PAIRING_CATEGORIES` (same set as `supersetPairing.ts` `PAIRING_CATEGORIES`).
3. **`fatigue_regions`** use `FATIGUE_REGIONS`; muscle groups map like `ontologyNormalization` (`chest` → `pecs`, `forearms` → `grip`, etc.).

### Context-dependent heuristics

- **Accessory vs main** for upper-body rows/presses: name cues (`face_pull`, `y_raise`, `rear_delt`) → `accessory` even when the fine pattern is a “compound” pull/push pattern.
- **Prep vs warmup**: narrow **prep** list (activation-style slugs); **warmup** for explicit dynamic/general warm-up vocabulary, excluding obvious main-lift names.
- **Mobility vs stretch**: static-stretch vocabulary → `stretch`; otherwise `mobility` when modality is mobility/recovery-only.

### Speculative / not implemented

- Auto-assigning `cooldown` (left to curation; cooldown selection also uses modality/targets).
- Per-user periodization of role mix.

## Application policy (TodayFit)

- **Do not overwrite** non-empty DB ontology for these fields.
- **Unknown** → omit field (no random default role) except **`fatigue_regions`**, where we derive from muscles/pairing when possible so superset overlap logic has signal.
- **`conditioning`-only** modality → `exercise_role: conditioning`.
- **`MAIN_WORK_EXCLUDED_ROLES`** in `cooldownSelection.ts` remains authoritative for pool exclusion (`cooldown`, `stretch`, `mobility`, `breathing`); inferred roles avoid mis-tagging main lifts as those.

## Mapping reference

- **UI / generator:** `exercise_role` feeds `scoreRoleFit` and main-pool filters; `pairing_category` + `fatigue_regions` feed `getSupersetPairingScore` via `getEffectivePairingCategory` / `getEffectiveFatigueRegions`.
