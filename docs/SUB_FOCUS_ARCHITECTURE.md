# Sub-focus architecture

Reusable sub-focus handling across goals: intent vs overlay, conflict resolution by user priority, and a shared resolver that produces a normalized profile for selection, scoring, and templates.

---

## 1. Classifications

Sub-focuses are classified into two classes:

- **Intent sub-focuses** — training intent / energy-system / modality (e.g. `zone2_aerobic_base`, `intervals_hiit`, `threshold_tempo`, `hills`, `squat`, `deadlift_hinge`).
- **Overlay sub-focuses** — body/session scope (e.g. `upper`, `lower`, `core`, `full_body`).

Per-goal classification is in `data/goalSubFocus/subFocusClassifications.ts` (`getSubFocusClass`, `getSubFocusClassMap`).

---

## 2. Conflict handling

- **Different classes** (e.g. one intent + one overlay): combined **additively**. Both contribute to tag weights and profile.
- **Same class** (e.g. multiple intents or multiple overlays): resolved by **user priority**. The user’s ranked order (first selected = highest priority) drives weights: first gets highest weight, then decay (e.g. 0.55^rank, normalized).
- **Overlay filter**: if exactly one overlay is selected, it is set as `overlayFilter`; if multiple and `preferFullBodyWhenMultipleOverlays`, `overlayFilter` becomes `"full_body"`; otherwise the first by rank is used.

Optional **conflict groups** per goal (in `subFocusClassifications.ts`) document which slugs compete within a class; weighting is still by user rank order.

---

## 3. Shared resolver

**Input:** `SubFocusResolverInput`

- `goalSlug`
- `rankedSubFocusSlugs` (ordered by user)
- optional `rankWeights` (e.g. `[0.5, 0.3, 0.2]`)
- optional `preferences` (e.g. `preferFullBodyWhenMultipleOverlays`)

**Output:** `SubFocusProfile`

- `goalSlug`
- `requiredAttributes`: tag slugs that must be present (hard filter); currently empty.
- `preferredAttributes`: `Record<tag_slug, weight>` for scoring (from intent + overlay, rank-weighted).
- `excludedAttributes`: tag slugs to exclude; currently empty.
- `overlayFilter`: resolved overlay when applicable (`upper` | `lower` | `core` | `full_body`).
- `templateHints`: e.g. `zone2_block`, `hiit_intervals`, `threshold_tempo` (from intent slugs).
- `resolvedWeights`: `Record<sub_focus_slug, number>` (0–1) for tag-map lookups.
- `effectiveSubFocusSlugs`: ordered list of sub-focus slugs that contributed (intent then overlay).

**API:** `resolveSubFocusProfile(input)` in `data/goalSubFocus/subFocusResolver.ts`, exported from `data/goalSubFocus/index.ts`.

---

## 4. Data structures (summary)

| Type | Location | Purpose |
|------|----------|--------|
| `SubFocusClass` | `types.ts` | `"intent" \| "overlay"` |
| `SubFocusClassMap` | `types.ts` | `Record<subFocusSlug, SubFocusClass>` per goal |
| `SubFocusConflictConfig` | `types.ts` | Optional conflict groups per class |
| `SubFocusProfile` | `types.ts` | Normalized profile from resolver |
| `SubFocusResolverInput` | `types.ts` | Resolver input |
| `GoalSubFocusWeightsInput` | `logic/.../types.ts` | `Record<goalSlug, number[]>` in same order as `goal_sub_focus[goalSlug]` |

---

## 5. Files changed

| File | Change |
|------|--------|
| `data/goalSubFocus/types.ts` | Added `SubFocusClass`, `SubFocusClassMap`, `SubFocusConflictConfig`, `SubFocusConflictGroup`, `SubFocusProfile`, `SubFocusResolverInput`. |
| `data/goalSubFocus/subFocusClassifications.ts` | **New.** Per-goal class maps and optional conflict groups. |
| `data/goalSubFocus/subFocusResolver.ts` | **New.** `resolveSubFocusProfile`, `getTagWeightsFromProfile`. |
| `data/goalSubFocus/index.ts` | Exports new types, resolver, and classification helpers. |
| `logic/workoutGeneration/types.ts` | `GoalSubFocusWeightsInput`; `GenerateWorkoutInput.goal_sub_focus_weights`. |
| `lib/dailyGeneratorAdapter.ts` | Builds `goal_sub_focus_weights` via `resolveSubFocusProfile` after merging sub-focuses per goal. |
| `logic/workoutGeneration/dailyGenerator.ts` | `buildPreferredTagWeightsFromSubFocus` uses `goal_sub_focus_weights` when calling `getExerciseTagsForGoalSubFocuses`. |

---

## 6. How this is consumed

- **Selection / filtering:** `requiredAttributes` and `excludedAttributes` can be used for hard filters; `overlayFilter` can drive body-region filters. (Currently selection still uses `focus_body_parts` and tag-based scoring; overlay/profile can be wired in later.)
- **Scoring:** Preferred tag weights come from the profile’s `preferredAttributes` or, in the generator, from `getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs, weights)` where `weights` are from the resolver. So rank and intent/overlay combination directly affect exercise scores.
- **Templates:** `templateHints` (e.g. `zone2_block`, `hiit_intervals`) can drive block type or duration templates for conditioning/endurance. Not yet wired into block assembly; structure is in place for future use.

---

## 7. Adding a new goal

1. Add sub-focus options in `goalSubFocusOptions.ts` and tag map entries in `goalSubFocusTagMap.ts`.
2. In `subFocusClassifications.ts`, add an entry to `SUB_FOCUS_CLASS_BY_GOAL` (and optionally `SUB_FOCUS_CONFLICT_BY_GOAL`).
3. Optionally add intent → template hint mapping in `subFocusResolver.ts` (`templateHintsFromIntentSlugs`).

No changes are required in the resolver algorithm; it is goal-agnostic and uses the classification and tag map.

---

## 8. Conditioning path: direct sub-focus matching (reversible)

For **conditioning** and **endurance** goals, sub-focus slugs are first-class canonical signals. We avoid a large hidden conditioning ontology; exercises match directly on slugs.

### 8.1 Direct sub-focus matching

- **Canonical slugs** (intent): `zone2_aerobic_base`, `intervals_hiit`, `threshold_tempo`, `hills` (plus power intents: `lower_body_power_plyos`, `sprint`, etc.).
- **Overlay slugs**: `upper`, `lower`, `core`, `full_body`.
- **Match rule**: An exercise matches a slug if `attribute_tags` contains that slug (normalized). Minimal legacy fallbacks: `zone2_aerobic_base` also matches `stimulus: aerobic_zone2`; `intervals_hiit` also matches `stimulus: anaerobic` or `plyometric`.
- **Scoring**: Direct slug match (intent) in `scoreExercise` gets a strong bonus (+3). Legacy tag-based sub-focus score uses coefficient 0.25 for conditioning/endurance (vs 0.5 for other goals), so tags like `conditioning`, `compound`, `energy_high` are weaker than direct slug match.

### 8.2 How overlays work

- **Overlay filter** from the resolved profile (`overlayFilter`: `upper` | `lower` | `core` | `full_body`) filters the **main-work pool** (strength/conditioning exercises) by body region using `primary_movement_family` and `muscle_groups`. `full_body` = no filter.
- Overlays do **not** drive template structure (only intent does).
- In general scoring, overlay slugs still contribute via the tag map and `preferredAttributes`, but in the conditioning **block** path, overlay is used only for filtering the pool.

### 8.3 Conditioning block flow (reversible)

1. **Resolve profile** when primary is `conditioning` or `endurance` and `goal_sub_focus[primary]` is set → `resolveSubFocusProfile(...)`.
2. **buildEnduranceMain** receives optional `conditioningProfile`.
   - **Overlay**: Filter strength pool by `profile.overlayFilter` (upper/lower/core/full_body).
   - **Main pairs**: Prefer exercises that have a direct intent slug match (`filterPoolByDirectSubFocus(pool, intentSlugs)`); if that pool has ≥2 exercises, use it for superset pairing; else use full pool.
   - **Cardio**: `pickConditioningExercise(pool, preferredZone2, rng, intentSlugs)` prefers exercises with direct intent slug match, then preferred modalities.
   - **Template**: Primary intent drives structure via `getConditioningStructureByIntent(totalMinutes, primaryIntent, equipment, goal)`:
     - `zone2_aerobic_base` → sustained (1 set, long time, straight_sets).
     - `intervals_hiit` → interval/rounds (circuit, work/rest).
     - `threshold_tempo` → medium sustained (1–2 blocks).
     - `hills` → existing interval logic (bias is in exercise selection, not structure).

### 8.4 Minimal helper tags

- **Canonical:** Use the **sub-focus slugs themselves** in `attribute_tags` (e.g. `zone2_aerobic_base`, `intervals_hiit`). No extra ontology layer.
- **Legacy (minimal):** Only where truly needed for backward compatibility:
  - `zone2_aerobic_base`: exercise may have `stimulus: aerobic_zone2` without `attribute_tags` → still counts as zone2 match.
  - `intervals_hiit`: exercise may have `stimulus: anaerobic` or `plyometric` without `attribute_tags` → still counts as intervals match.
- Generic tags (`conditioning`, `compound`, `energy_high`) remain in the tag map for non-conditioning goals and for conditioning as a **weaker** signal (0.25 coefficient when primary is conditioning/endurance).

### 8.5 Reversibility

- **buildEnduranceMain** accepts `conditioningProfile` as an optional last argument; when `null` or omitted, behavior matches the previous implementation (no overlay filter, no intent-based pool, no intent-based cardio pick, existing interval structure).
- **pickConditioningExercise**’s fourth parameter `preferredSubFocusSlugs` is optional; callers that don’t pass it get the previous behavior.
- **getConditioningStructureByIntent** is used only when `primaryIntent` is set; otherwise `getConditioningIntervalStructure` is used as before.
- To revert: stop resolving/passing the profile, remove the conditioning-only scoring branch and restore the previous subFocusCoeff, and remove the intent/overlay logic from buildEnduranceMain and pickConditioningExercise.

### 8.6 Files changed (conditioning path)

| File | Change |
|------|--------|
| `data/goalSubFocus/conditioningSubFocus.ts` | **New.** Direct slug match helpers, overlay filter, intent/overlay slug lists. |
| `data/goalSubFocus/index.ts` | Export conditioning helpers. |
| `lib/generation/prescriptionRules.ts` | `getConditioningStructureByIntent(totalMinutes, intent, equipment, goal)` for zone2 / intervals / threshold / hills. |
| `logic/workoutGeneration/dailyGenerator.ts` | Resolve profile for conditioning/endurance; pass to `buildEnduranceMain`; overlay filter and intent-based pool in `buildEnduranceMain`; intent-based cardio pick and structure-by-intent; direct sub-focus bonus and lower legacy coefficient in `scoreExercise`; `pickConditioningExercise(..., preferredSubFocusSlugs?)`. |
| `logic/workoutGeneration/exerciseStub.ts` | Add `attribute_tags: ["zone2_aerobic_base"]` (and similar) to zone2/rower conditioning exercises for direct match. |
