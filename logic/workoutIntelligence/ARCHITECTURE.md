# Workout Intelligence System — Architecture

This document describes the design for TodayFit’s **workout intelligence**: the layers that turn user goals and sport demands into concrete, well-composed workouts. The system supports two **modes** that differ mainly by **filter type**; both can generate either a single day or a full week of workouts, with similar logic scaling from day to week.

- **Build My Workout** — Uses **session-focused filters**: duration, primary/secondary/tertiary goal, equipment, energy, injuries, body focus. User can generate one session or a week; the same generation pipeline runs per session.
- **Adaptive / Sports Prep** — Uses **sport- and plan-focused filters**: sports, ranked goals, gym days, sport days, events, phase, recent load, injury status. User can generate one session or a week; the same generation pipeline runs per session, with inputs derived from the chosen filters.

---

## A. Recommended System Architecture

### High-level layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WORKOUT INTELLIGENCE                              │
├─────────────────────────────────────────────────────────────────────────┤
│  1. GOAL MODELING          User goals → weighted TrainingQualities       │
│  2. SPORT DEMAND MODELING   Sports → weighted TrainingQualities           │
│  3. EXERCISE CAPABILITY     Exercises → quality vector + metadata        │
├─────────────────────────────────────────────────────────────────────────┤
│  COMBINED TARGET VECTOR    (goal + sport weights merged for session)    │
├─────────────────────────────────────────────────────────────────────────┤
│  4. SESSION COMPOSITION    Templates + block types + formats            │
│  5. SCORING                 Multi-factor exercise/block scoring          │
│  6. MOVEMENT BALANCE        Guardrails (hinge cap, grip, push/pull)      │
│  7. SUPERSET LOGIC          Intentional pairing heuristics               │
│  8. PRESCRIPTION LOGIC     Reps/rest/tempo by stimulus                  │
│  9. FATIGUE AWARENESS       Per-pattern/muscle/joint/sport-structure     │
├─────────────────────────────────────────────────────────────────────────┤
│  10. SESSION GENERATOR      Shared pipeline (day or week, per session)  │
│  11. WEEKLY DISTRIBUTION    Optional: day intents + emphasis (any mode)  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Goal modeling** and **sport demand** produce a **target vector** of training qualities (weights 0–1) for the session or week.
- **Exercise capability** describes each exercise as a vector over the same qualities; scoring is dot-product–style alignment plus other factors.
- **Session composition** chooses a template (e.g. strength, hypertrophy, sport-mixed), then fills blocks using the scorer and balance/superset rules.
- **Prescription** and **fatigue** are applied when building blocks and when planning the week.

### Where things live

| Concern | Location | Rationale |
|--------|----------|-----------|
| **Training qualities taxonomy** | Static config (`trainingQualities.ts`) + DB table `training_qualities` | Canonical list in code; DB mirrors it for FKs and admin. |
| **Goal → qualities weights** | Static config (`goalQualityWeights.ts`) and/or DB `goal_training_demand` | Config for app logic; DB seeded in Phase 1 for persistence and future admin. |
| **Sport → qualities weights** | Static config (`sportQualityWeights.ts`) and/or DB `sport_training_demand` | Same. |
| **Exercise → qualities vector** | DB table `exercise_training_quality` + fallback derivation | Primary: load from DB (Phase 1 schema + seed). For stub exercises or when an exercise has no DB rows: derive from tags (`tagToQualityMap.ts`) and optional overrides (`adapters.ts`). |
| **Session templates & block rules** | Static config (`sessionTemplates.ts`, `blockRules.ts`) | Logic is in code; templates are data. |
| **Scoring, balance, superset, prescription** | Logic (`scoring/`, `balance/`, `supersetPairing.ts`, prescription in `lib/generation/`) | Pure functions; testable. |
| **Fatigue state** | Extend `lib/generation/fatigueRules.ts` + optional `FatigueAccumulator` | Keep one place for fatigue; extend to patterns/joints/sport-structures. |
| **Session generator** | Extend `logic/workoutGeneration/dailyGenerator.ts` | Shared by both modes (day or week); reuse flow, quality-based scoring, templates. |
| **Weekly distribution** | Optional in either mode | When generating a week, assign per-day intent/emphasis; then run session generator per day. |

### Separation of modes (by filter type)

- **Build My Workout**: **Filters** = duration, primary (and optional secondary/tertiary) goal, equipment, energy, injuries, body focus. Can generate one session or a week; each session uses the same generator and target vector (goal + optional sport).
- **Sports Prep**: **Filters** = sports, ranked goals, gym days, sport days, events, phase, recent load, injury status. Can generate one session or a week; each session uses the same generator, with inputs derived from these filters (and, when building a week, optional weekly distribution for per-day intent/emphasis).

---

## B. Core Data Model / Schema Recommendations

### 1. Training qualities (canonical list)

Defined in code/config as a fixed taxonomy. Each quality has a `slug` and optional `group` (e.g. strength, energy_system, resilience). See `trainingQualities.ts`.

Example slugs (extensible):

- **Strength / power**: `max_strength`, `hypertrophy`, `power`, `rate_of_force_development`, `unilateral_strength`, `eccentric_strength`, `pulling_strength`, `pushing_strength`, `lockoff_strength`
- **Upper / grip**: `grip_strength`, `forearm_endurance`, `scapular_stability`, `core_tension`, `trunk_anti_flexion`, `trunk_anti_rotation`
- **Lower / trunk**: `hip_stability`, `trunk_endurance`, `posterior_chain_endurance`
- **Energy / conditioning**: `aerobic_base`, `anaerobic_capacity`, `aerobic_power`, `lactate_tolerance`, `work_capacity`
- **Movement / resilience**: `mobility`, `thoracic_mobility`, `balance`, `rotational_power`, `rotational_control`, `tendon_resilience`, `recovery`
- **Sport-specific**: `paddling_endurance`, `pop_up_power`, etc.

Static config (`trainingQualities.ts`) is the single source of truth for slugs and categories; DB table `training_qualities` mirrors it (Phase 1) for foreign keys and optional admin UI.

### 2. Goal → qualities (config and/or DB)

- **Source**: `goalQualityWeights.ts` (static) and/or DB table `goal_training_demand` (Phase 1).
- **Shape**: `Record<GoalSlug, Partial<Record<TrainingQualitySlug, number>>>` (0–1 weights).
- **Usage**: Merge primary + secondary + tertiary with priority weights (e.g. 0.6, 0.3, 0.1) into one target vector for the session.

### 3. Sport → qualities (config)

- **Source**: `sportQualityWeights.ts` (or extend `sport_tag_profile` with a `quality_weights` jsonb).
- **Shape**: `Record<SportSlug, Partial<Record<TrainingQualitySlug, number>>>`.
- **Usage**: For Sports Prep or when “training for sport” is selected, merge sport weights with goal weights (e.g. 50% goal, 50% sport, or configurable).

### 4. Exercise capability

- **DB (primary)**: Table `exercise_training_quality (exercise_id, training_quality_slug, weight)` stores per-exercise quality weights. Seeded in Phase 1; load via `lib/db/trainingQualitiesRepository.ts` (`getExerciseQualityScoreMapBySlug`) when using the DB exercise pool.
- **Fallback**: When an exercise has no rows in `exercise_training_quality` (e.g. stub data, or new exercises not yet backfilled), derive `training_quality_weights` from existing tags via `tagToQualityMap.ts` and optional exercise-level overrides in `adapters.ts`. The generator type `ExerciseWithQualities` expects a `training_quality_weights` map either way.

### 5. Session structure (existing + extensions)

- **Block types** (already in `lib/types`): `warmup`, `main_strength`, `main_hypertrophy`, `conditioning`, `skill`, `cooldown`. Add if needed: `accessory`, `core`.
- **Block formats**: `straight_sets`, `superset`, `circuit`, `emom`, `amrap`.
- **Session template**: list of block specs (type, format, min/max exercises, quality focus). Stored in config, not DB.

### 6. Weekly plan (existing)

- Keep `PlannedDay`, `PlanWeekResult`, day intents (e.g. strength, aerobic, mobility). Add per-day **quality emphasis** (which qualities to prioritize that day) so the session generator can target them when building that day.

---

## C. Scoring Framework

### Factors (first-pass MVP)

1. **Goal/sport alignment** — Dot product of exercise quality vector with session target vector (normalized). Primary driver.
2. **Movement balance** — Bonus for adding a missing pattern, penalty for exceeding pattern cap (reuse existing movement balance).
3. **Fatigue appropriateness** — Penalty for hitting already-fatigued patterns/muscles/joints; optional penalty for high fatigue-cost exercises when user is fatigued.
4. **Variety / novelty** — Penalty for exercise used in last N sessions (already in place).
5. **Equipment fit** — Hard filter first; optional small bonus for “uses available equipment well” (e.g. no waste).
6. **Session type fit** — Bonus when exercise modality/format matches block type (e.g. strength exercise in main_strength).
7. **Energy fit** — Bonus for energy_fit tag matching user energy (already in place).
8. **Injury / limitations** — Hard filter; no score component.

### Weights (tunable constants)

- `w_goal_alignment`: 3.0  
- `w_balance`: 1.0  
- `w_fatigue`: -0.5 to -1.0 (penalty)  
- `w_variety`: -1.0 to -3.0 (penalty for recent use)  
- `w_session_fit`: 0.5  
- `w_energy_fit`: 1.0  

### Algorithm (single exercise)

- Compute `target_vector` from goal + sport for this session.
- For each candidate exercise:  
  - `alignment = dot(exercise.training_quality_weights, target_vector)` (normalize so max ≈ 1).  
  - `score = w_goal * alignment + balance_bonus + fatigue_penalty + variety_penalty + session_fit + energy_fit`.  
- Sort by score; apply diversity/balance when selecting (e.g. category-fill then top-N).

### Block-level scoring (optional)

- Score a *block* (set of exercises) by: sum of exercise alignment + balance of the block (push/pull, pattern spread) + superset compatibility if applicable.

---

## D. Fatigue Framework

### MVP extension (in `lib/generation/fatigueRules.ts`)

- **Existing**: `FatigueState`: `volumeScaleFactor`, `fatiguedMuscleGroups`, `consecutiveHeavySessions`, `suggestRecovery`. Built from `RecentSessionSummary[]` (exercise_ids, muscle_groups, modality).
- **Add**:
  - **Fatigued movement patterns**: From last 1–2 sessions, record which patterns were used (e.g. hinge, grip). Apply a small penalty when selecting an exercise that re-hits the same pattern.
  - **Fatigued “structures”** (optional): e.g. grip, shoulders, quads, trunk. Derive from exercise tags (e.g. `grip`, `shoulder_overhead`) and optionally from sport (e.g. climbing → grip). Track per structure; penalty for re-hitting next day.
- **Input**: Same `recent_history`; optionally `recent_load` string (e.g. “Heavy Lower”) to bias which structures are considered fatigued.

### Lightweight accumulator (optional)

- **FatigueAccumulator**: For each of `movement_pattern`, `muscle_group`, `joint_stress`, `grip|shoulders|trunk|quads`, maintain a decayed count (e.g. sessions in last 7 days weighted by recency). Use for:
  - Back-to-back day: avoid same pattern/structure.
  - Weekly distribution: prefer spreading quality emphasis across days.

Decay: e.g. day 0 = 1.0, day 1 = 0.6, day 2 = 0.3, day 3+ = 0. No new DB table needed; compute from workout history when generating.

---

## E. Generator Pipeline

### Session generation (shared by both modes)

1. **Input**: Derived from the active mode’s filters. Build = duration, goal(s), equipment, energy, injuries, etc. Sports Prep = same shape but filled from sports, ranked goals, gym profile, recent load, etc. Optional: when building a week, a “weekly distribution” step can assign per-day intent/emphasis first, then each day’s input reflects that.
2. **Resolve target vector**: Merge goal weights + sport weights → `SessionTargetVector`.
3. **Filter pool**: Equipment, injuries, contraindications, avoid tags, energy (hard filters). Optionally filter by sport_tag_profile tags.
4. **Choose session template**: From primary goal + duration (e.g. strength 60 min → “Strength 60” template: warmup, main_strength x2, accessory superset, optional conditioning, cooldown).
5. **For each block in template**:
   - Determine block type and format (and quality sub-focus if any).
   - Build candidate list (filter by block type / modality where relevant).
   - Score candidates (alignment + balance + fatigue + variety + session fit + energy).
   - Select exercises (category-fill for balance, then top by score; respect pattern cap and superset rules).
   - If superset: run superset pairing on selected or on a shortlist, then assign prescriptions.
   - Apply prescription (sets/reps/rest/tempo) from block type + goal + energy + fatigue volume scale.
6. **Assemble blocks**: warmup → main → accessory → conditioning (optional) → cooldown.
7. **Output**: `WorkoutSession` (title, blocks, estimated_duration_minutes, debug optional).

### Day vs week (both modes)

- **Single session**: Generator is called once with the current mode’s filter-derived input.
- **Week**: Optional “weekly distribution” step assigns intent/quality emphasis per day (e.g. climbing + hypertrophy → 2 pulling days, 1 lower, 1 aerobic). Then for each day, the same session generator runs with that day’s intent and target vector. Persistence: weekly plan instance + workouts per day (same for either mode when saving a week).

---

## F. Recommended Implementation Phases

### Phase 1 — Foundation (no breaking changes)

- Add **training qualities taxonomy** (slug list + optional groups) in config.
- Add **goal → quality weights** and **sport → quality weights** config.
- Add **Exercise** shape with `training_quality_weights`; build **tag-to-quality** map + stub overrides for a few exercises (stub or from DB adapter).
- Implement **target vector merge** (goal + sport → one vector) and **alignment score** (dot product).
- Unit tests: target merge, alignment for a few exercises.

### Phase 2 — Scoring and session composition

- Implement full **exercise scorer** (alignment + balance + fatigue + variety + session fit + energy). Keep existing hard filters.
- Add **session templates** (e.g. strength 45/60, hypertrophy 45/60, sport-mixed 60) and **block rules** (min/max exercises, format).
- Integrate scorer into **session generator**: replace or complement current goal tag scoring with quality alignment; keep movement balance and fatigue from existing code.
- Add **movement balance guardrails** (hinge cap, grip cap, push/pull balance) in config; enforce in selection.

### Phase 3 — Superset and prescription

- Implement **superset pairing heuristics** (push+pull, lower+upper, compound+accessory, avoid grip+grip, hinge+hinge). Call from block builder when format is superset.
- Connect **prescription** to **stimulus** (strength vs hypertrophy vs power vs endurance) in block type and goal; ensure tempo/rest/rep ranges come from one place (`prescriptionRules` + optional quality-based overrides).

### Phase 4 — Fatigue and weekly

- Extend **fatigue** to movement patterns and optional structures (grip, shoulders, trunk). Optional: FatigueAccumulator from history.
- Implement **weekly distribution** (day intents + quality emphasis) and plug into sport prep planner so each day gets a target vector.
- Optional: **Block-level scoring** for “best 4 exercises for this block” instead of only per-exercise.

### Phase 5 — Polish and extend

- **exercise_training_quality** already exists (Phase 1); backfill more exercises from tag map + overrides as the library grows; optionally add admin UI to edit weights.
- Add **accessory** and **core** block types if needed; add more sports and goals in config.
- Tune weights and add analytics (e.g. log which exercises were chosen and why).

---

## G. Example Pseudocode / TypeScript Scaffolding

### Target vector merge

```ts
// goalQualityWeights.ts
export const GOAL_QUALITY_WEIGHTS: Record<string, Partial<Record<TrainingQualitySlug, number>>> = {
  hypertrophy: { hypertrophy: 0.9, max_strength: 0.4, pulling_strength: 0.5, pushing_strength: 0.5, ... },
  strength:     { max_strength: 0.95, hypertrophy: 0.3, pulling_strength: 0.6, pushing_strength: 0.6, ... },
  climbing:     { pulling_strength: 0.9, grip_strength: 0.85, scapular_stability: 0.8, core_tension: 0.7, ... },
};

function mergeTargetVector(
  goalWeights: [string, number][],  // e.g. [["hypertrophy", 0.6], ["climbing", 0.4]]
  allQualitySlugs: string[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [slug, weight] of goalWeights) {
    const qualities = GOAL_QUALITY_WEIGHTS[slug] ?? SPORT_QUALITY_WEIGHTS[slug];
    if (!qualities) continue;
    for (const [q, w] of Object.entries(qualities)) {
      out.set(q, (out.get(q) ?? 0) + weight * w);
    }
  }
  // optional: normalize so max = 1
  return out;
}
```

### Exercise alignment score

```ts
function alignmentScore(
  exerciseWeights: Partial<Record<string, number>>,
  targetVector: Map<string, number>
): number {
  let dot = 0, targetNorm = 0;
  targetVector.forEach((tw, q) => {
    const ew = exerciseWeights[q] ?? 0;
    dot += ew * tw;
    targetNorm += tw * tw;
  });
  if (targetNorm <= 0) return 0;
  return dot / Math.sqrt(targetNorm); // normalize by target magnitude
}
```

### Session template example

```ts
// sessionTemplates.ts
export const SESSION_TEMPLATES: Record<string, SessionTemplate> = {
  strength_60: {
    id: "strength_60",
    blockSpecs: [
      { blockType: "warmup", format: "circuit", minItems: 2, maxItems: 4 },
      { blockType: "main_strength", format: "straight_sets", minItems: 2, maxItems: 2 },
      { blockType: "main_strength", format: "superset", minItems: 2, maxItems: 4 },
      { blockType: "conditioning", format: "straight_sets", minItems: 0, maxItems: 1 },
      { blockType: "cooldown", format: "circuit", minItems: 2, maxItems: 3 },
    ],
    estimatedMinutes: 60,
  },
  hypertrophy_60: {
    blockSpecs: [
      { blockType: "warmup", format: "circuit", minItems: 2, maxItems: 4 },
      { blockType: "main_hypertrophy", format: "superset", minItems: 4, maxItems: 6 },
      { blockType: "main_hypertrophy", format: "superset", minItems: 2, maxItems: 4 },
      { blockType: "cooldown", format: "circuit", minItems: 2, maxItems: 3 },
    ],
    estimatedMinutes: 60,
  },
};
```

### Superset pairing (heuristics)

```ts
// Good: push+pull, lower+upper, compound+accessory, strength+mobility
// Bad: grip+grip, hinge+hinge, two high-skill compounds
const GOOD_PAIRS: [string, string][] = [
  ["push", "pull"], ["squat", "pull"], ["hinge", "push"], ["lower", "upper"],
];
const BAD_PAIRS: [string, string][] = [
  ["grip", "grip"], ["hinge", "hinge"], ["squat", "squat"],
];
function canSupersetPair(a: Exercise, b: Exercise): boolean {
  const ap = a.movement_pattern, bp = b.movement_pattern;
  if (BAD_PAIRS.some(([x,y]) => (ap===x&&bp===y)||(ap===y&&bp===x))) return false;
  if (GOOD_PAIRS.some(([x,y]) => (ap===x&&bp===y)||(ap===y&&bp===x))) return true;
  // optional: check grip tag, high difficulty both → false
  return ap !== bp; // at least different pattern
}
```

---

## Summary

- **Three layers**: Goal → qualities, Sport → qualities, Exercise → qualities. Session target = merged goal + sport. Scoring = alignment to target + balance + fatigue + variety + session/energy fit.
- **Config-first**: Qualities, goal weights, sport weights, session templates, block rules in code/config; DB only for exercise vectors when you need full control.
- **Reuse**: Existing session generator flow, movement balance, fatigue (extended), prescription rules; add quality-based scoring and session templates.
- **Phased**: (1) Qualities + target merge + alignment, (2) Full scorer + templates + integration, (3) Superset + prescription, (4) Fatigue extension + weekly distribution, (5) DB and polish.

This keeps the logic extensible, avoids over-engineering, and preserves the distinction between the two **filter sets** (Build vs Sports Prep) while sharing the same session generator and training-qualities backbone.
