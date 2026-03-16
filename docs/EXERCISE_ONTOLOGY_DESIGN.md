# TodayFit Exercise Ontology Design (Phase 2)

**Purpose:** Define a hierarchical exercise ontology as the canonical classification system for exercises across the database and generator logic, enabling strict body-part filtering, injury-aware exclusions, superset pairing, block placement, mobility/stretch selection, and future sport-specific logic—with backwards-compatible adoption.

**Scope:** Design only. No implementation, DB migration, or generator refactor in this phase.

---

## A. Executive Summary

The ontology is a **structured classification profile** per exercise: each field answers a different question (e.g. “Where does this belong in the body?” vs “What joint loads does it create?” vs “Where can it go in a session?”). It is **not** a single parent-child tree; exercises can have one primary movement family, multiple movement patterns, multiple joint-stress tags, etc.

**Design choices:**

- **Movement family** = user- and filter-facing (“upper push”, “lower body”, “core”). Used for strict body-part focus and hard_include. Single primary + optional secondary array for hybrids (e.g. thruster).
- **Movement patterns** = engine-facing (squat, hinge, horizontal_push, vertical_pull, lunge, etc.). Used for balance, variety caps, and superset “non-competing” logic. Multi-value.
- **Joint stress tags** = canonical biomechanical loads (shoulder_overhead, knee_flexion, lumbar_shear, …). Single source of truth for injury exclusion; aligned with existing `INJURY_AVOID_TAGS`.
- **Contraindication tags** = body regions to avoid when injured (shoulder, knee, lower_back, …). User-facing injury keys; map 1:many to joint_stress for exclusion.
- **Exercise role** = where the exercise fits in a session (warmup, main_compound, accessory, cooldown, …). Informs block-type compatibility; optional at first.
- **Pairing category** = fatigue/body region for supersets (chest, triceps, back, quads, …). Enables “no double grip”, “chest + triceps OK”, “hinge + hinge avoid”.
- **Mobility/stretch targets** = body areas addressed (hamstrings, thoracic_spine, …). For secondary-goal cooldown selection.
- **Fatigue regions** = regions that get fatigued (quads, pecs, lats, …). For superset distribution and fatigue awareness.

All controlled vocabularies are defined as **canonical slugs** (snake_case) so they can be the single source of truth in TypeScript, DB, adapters, and rules. Generic tags remain for **goal_tags**, **sport_tags**, **energy_fit**, and flexible search; structured fields replace tag-based logic for **body-part**, **injury**, **superset**, and **block placement** over time.

**Next steps after this design:** (1) Encode vocabularies in TypeScript, (2) update schema/types with optional ontology fields, (3) annotate a representative subset of exercises, (4) refactor filtering and assembly to use ontology when present with fallback to derivation.

---

## B. Proposed Ontology Table / Schema by Field

Each row is one **ontology field**: what it answers, allowed values, cardinality, and storage.

| Field | Answers | Cardinality | Storage | Notes |
|-------|---------|--------------|---------|--------|
| **domain** | Broad training domain (strength, conditioning, mobility, etc.) | Single | Optional on type; can derive from modality | Keeps “what kind of training” separate from “what block”. |
| **primary_movement_family** | User-facing body/emphasis (upper push, lower body, core, …) | Single | DB column, Exercise optional | Strict body-part filter; user-facing. |
| **secondary_movement_families** | Other families this exercise meaningfully contributes to | Multi (array) | DB column, Exercise optional | For hybrids (thruster, clean, etc.). |
| **movement_pattern** (legacy) | Coarse engine pattern for balance/caps | Single | Keep on Exercise; map from patterns[0] or derive | Backward compat; dailyGenerator uses it. |
| **movement_patterns** | Finer patterns (horizontal_push, squat, lunge, …) | Multi (array) | DB column, Exercise optional | Engine-facing; balance & superset. |
| **primary_muscle_groups** | Main muscles trained | Multi (array) | DB primary_muscles; Exercise muscle_groups | Already exist; use canonical slugs. |
| **secondary_muscle_groups** | Supporting muscles | Multi (array) | DB secondary_muscles | Already exist. |
| **exercise_role** | Session placement (warmup, main_compound, accessory, …) | Single | DB column, Exercise optional | Block-type compatibility. |
| **equipment_required** | Equipment needed | Multi (array) | Already on Exercise / DB equipment | Canonical equipment slugs. |
| **joint_stress_tags** | Biomechanical loads (injury exclusion) | Multi (array) | DB column; map to tags.joint_stress for compat | Canonical only; single source of truth. |
| **contraindication_tags** | Body regions “avoid when injured” | Multi (array) | DB column; map to tags.contraindications | User-facing injury keys. |
| **mobility_targets** | Areas addressed for mobility work | Multi (array) | DB column | Cooldown/prep selection. |
| **stretch_targets** | Areas stretched | Multi (array) | DB column | Cooldown stretch selection. |
| **stimulus_tags** | Training stimulus (eccentric, plyometric, …) | Multi (array) | Keep in tags.stimulus; can add canonical list | Prescription and goal matching. |
| **fatigue_regions** | Regions that get fatigued | Multi (array) | DB column | Superset and fatigue logic. |
| **pairing_category** | Primary fatigue/region for superset logic | Single | DB column | “Chest”, “triceps”, “posterior_chain”, etc. |
| **unilateral** | Single-limb vs bilateral | Boolean | DB column | Already in migration. |
| **progressions** | Harder exercise IDs | Multi (IDs) | Exercise progressions[] | Relational by ID. |
| **regressions** | Easier exercise IDs | Multi (IDs) | Exercise regressions[] | Relational by ID. |

**Not in ontology (stay as-is or generic tags):**

- **modality** — Keep (strength, hypertrophy, conditioning, mobility, …); aligns with goal/session type.
- **goal_tags** — Keep as tags for flexibility; quality alignment can use training_quality_weights.
- **sport_tags** — Keep as tags for sport-specific scoring.
- **energy_fit** — Keep (low/medium/high) for session energy filter.
- **difficulty** / **time_cost** — Keep on Exercise; not part of classification hierarchy.
- **estimated_minutes** — Keep as optional metadata.

---

## C. Canonical Allowed Values and Definitions

### C.1 Domain (optional)

**Purpose:** Broad training domain for filtering “kind of work” before movement family.

| Slug | Definition | When to use |
|------|------------|-------------|
| `strength` | Resistance training for force / hypertrophy | Main lifts, accessories, compounds, isolations |
| `power` | High-velocity / explosive | Olympic derivatives, plyos, throws |
| `conditioning` | Cardiorespiratory / work capacity | Running, rowing, bike, circuits, HIIT |
| `mobility` | ROM, stability, movement quality | Drills, flows, activation |
| `recovery` | Low load, restoration | Light movement, breathing, easy stretch |

**Cardinality:** Single (optional). Can derive from `modality` (e.g. strength+hypertrophy→strength, conditioning→conditioning, mobility+recovery→mobility). **Storage:** Optional on type; not required in DB initially.

---

### C.2 Movement family (primary + secondary)

**Purpose:** User-facing body-part / emphasis. Drives strict body-part focus (hard_include) and “what did we train today”.

| Slug | Definition | When to use |
|------|------------|-------------|
| `upper_push` | Upper-body pressing (chest, shoulders, triceps) | Bench, OH press, push-ups, dips |
| `upper_pull` | Upper-body pulling (back, biceps, rear delt) | Rows, pull-ups, lat pulldown, face pull |
| `lower_body` | Lower-body dominant (quads, glutes, hamstrings, calves) | Squat, hinge, lunge, leg press, carry (loaded) |
| `core` | Trunk / anti-movement / rotation | Plank, dead bug, pallof, rotation, carry (core focus) |
| `mobility` | Mobility / ROM / activation (not conditioning) | T-spine rotation, hip mobility, band work |
| `conditioning` | Cardio / work capacity (not strength-dominant) | Run, bike, row, ski erg, circuits as cardio |

**Cardinality:** Primary = single. Secondary = array (0..n).  
**Rule:** Use **primary** for dominant emphasis; use **secondary** when the exercise clearly contributes to another family (e.g. thruster: primary `lower_body`, secondary `upper_push`).  
**Generator:** Strict body-part filter includes an exercise if user focus matches **primary or secondary**. Scoring uses **family priority**: primary family match receives higher score than secondary (scoreMovementFamilyFit: 1.5 for primary match, 0.8 for secondary).  
**Storage:** `primary_movement_family` (text), `secondary_movement_families` (text[]). DB columns exist. Optional on Exercise / ExerciseWithQualities.

---

### C.3 Movement patterns (engine-facing)

**Purpose:** Balance (spread across patterns), variety caps (max per pattern), superset “non-competing” logic. Finer than single movement_pattern.

| Slug | Definition | When to use |
|------|------------|-------------|
| `squat` | Knee-dominant lower (squat, leg press) | Back squat, front squat, goblet, leg press |
| `hinge` | Hip-dominant lower (deadlift, RDL, good morning) | Deadlift, RDL, hip thrust, KB swing |
| `lunge` | Unilateral/split lower | Split squat, lunge, step-up |
| `horizontal_push` | Push in horizontal plane (chest emphasis) | Bench, push-up, dip |
| `vertical_push` | Push in vertical plane (shoulder emphasis) | OH press, handstand push-up |
| `horizontal_pull` | Pull in horizontal plane (row) | Row, face pull |
| `vertical_pull` | Pull in vertical plane (lat emphasis) | Pull-up, lat pulldown |
| `carry` | Loaded carry | Farmer, suitcase, overhead carry |
| `rotation` | Trunk rotation / rotational | Russian twist, wood chop |
| `anti_rotation` | Resisting rotation | Pallof hold, band anti-rotation |
| `locomotion` | Gait / cyclical lower | Walking lunge, step-up, running (conditioning) |
| `shoulder_stability` | Scapular / shoulder control (mobility/prep) | Band pull-apart, shoulder CARs |
| `thoracic_mobility` | T-spine / rib cage (mobility) | Cat cow, T-spine rotation |

**Cardinality:** Multi (array). At least one for working exercises; mobility/conditioning can have one or more.  
**Order:** Within `movement_patterns`, list **most→least relevant** (first = primary pattern for that exercise). Compounds (e.g. thruster) have multiple patterns in order: primary then secondary.  
**Backward compatibility:** Legacy single `movement_pattern` (squat, hinge, push, pull, carry, rotate, locomotion) is derived from first element via getLegacyMovementPattern(). When `movement_patterns[]` is set, generator uses first for legacy and for **pattern priority**: when filling a target legacy pattern, prefers exercises whose primary (first) fine pattern maps to that legacy.  
**Storage:** DB `movement_patterns` (text[]). Exercise type: keep `movement_pattern` (single) for compat; add optional `movement_patterns?: string[]`.

---

### C.4 Primary / secondary muscle groups

**Purpose:** Scoring (“match focus”), display, and optional soft filters. Use canonical muscle slugs so UI and logic agree.

**Canonical slugs (primary/secondary):**  
`legs`, `quads`, `glutes`, `hamstrings`, `calves`, `core`, `chest`, `back`, `lats`, `upper_back`, `shoulders`, `triceps`, `biceps`, `forearms`.

**Cardinality:** Multi (array) each. **Storage:** DB `primary_muscles`, `secondary_muscles`; Exercise `muscle_groups` (merged), optional `primary_muscle_groups` and `secondary_muscle_groups` in adapter. **Order:** Within each array, list muscles **most→least contribution** (ExRx: first = primary mover). Generator uses primary_muscle_groups for body-part focus priority (primary-match bonus).  
**Guidance:** Prefer these slugs; avoid freeform. “Push”/“pull” as body regions are movement-family; for muscles use chest, shoulders, triceps, etc.

---

### C.5 Exercise role

**Purpose:** Which block types this exercise is suitable for (warmup, main, accessory, cooldown).

| Slug | Definition | When to use |
|------|------------|-------------|
| `warmup` | Warm-up only (activation, light cardio) | Band work, light bike, jump rope |
| `prep` | Prep / activation (pre-main) | Hip circles, glute bridge, shoulder CARs |
| `main_compound` | Primary compound lift | Squat, deadlift, bench, OH press, pull-up |
| `accessory` | Accessory / secondary lift | Rows, RDL, split squat, isolation |
| `isolation` | Single-joint / isolation | Leg curl, leg ext, fly, curl |
| `finisher` | Finisher (burnout, core) | Plank, core finisher, light pump |
| `cooldown` | Cooldown (stretch/mobility) | Static stretch, breathing |
| `mobility` | Mobility block | T-spine, hip mobility, flows |
| `conditioning` | Conditioning block | Run, row, bike, circuit |

**Cardinality:** Single. An exercise can have one **primary** role; some exercises are valid in multiple (e.g. glute bridge as prep or accessory). Use the **most common** placement.  
**Storage:** DB `exercise_role` (text). Optional on Exercise.  
**Generator:** **Role priority** is used for block-type fit: main_strength/main_hypertrophy prefer main_compound (scoreRoleFit +2), accept accessory/isolation/finisher (+0.5); cooldown/stretch/mobility/breathing are excluded from main work (MAIN_WORK_EXCLUDED_ROLES). Warmup block prefers prep/warmup/mobility; cooldown block prefers cooldown/stretch/breathing/mobility.  
**Guidance:** If used in both warmup and cooldown (e.g. cat cow), pick the more common (e.g. `mobility` or `cooldown`).

---

### C.6 Equipment

**Purpose:** Hard filter (availability). Use canonical slugs everywhere.

**Canonical slugs:**  
`bodyweight`, `barbell`, `dumbbells`, `kettlebells`, `bands`, `resistance_band`, `cable_machine`, `bench`, `squat_rack`, `pullup_bar`, `leg_press`, `leg_extension`, `machine`, `trap_bar`, `plyo_box`, `treadmill`, `rower`, `assault_bike`, `bike`, `trx`, `foam_roller`, `miniband`.

**Cardinality:** Multi (array). **Storage:** Already on Exercise `equipment_required` and DB `equipment`. Normalize to these slugs in adapter/seed.

---

### C.7 Joint stress tags

**Purpose:** Injury-based **hard exclusion**. “This exercise loads these structures.” Must match `lib/workoutRules` `INJURY_AVOID_TAGS` and constraintTypes `JointStressTag`.

| Slug | Definition | When to use |
|------|------------|-------------|
| `shoulder_overhead` | Arm(s) overhead; significant shoulder load | OH press, snatch, handstand |
| `shoulder_extension_load` | Shoulder extension under load | Pull-up, dip, lat pulldown |
| `shoulder_abduction_load` | Arm abduction under load | Lateral raise, upright row |
| `grip_hanging` | Hanging from bar / grip dominant | Pull-up, hang, bar work |
| `knee_flexion` | Deep or loaded knee flexion | Squat, lunge, leg press |
| `deep_knee_flexion` | Very deep knee bend | Full squat, pistol |
| `spinal_axial_load` | Vertical load on spine | Back squat, OH squat |
| `lumbar_shear` | Shear / flexion on lumbar | Deadlift, RDL, good morning |
| `lumbar_flexion_load` | Loaded lumbar flexion | Sit-up, toe touch under load |
| `wrist_extension_load` | Wrist extension under load | Push-up, handstand, front rack |
| `elbow_stress` | High elbow load | Skull crusher, narrow bench |
| `hip_stress` | End-range or loaded hip | Deep squat, hip flexor stretch under load |
| `ankle_stress` | Ankle load / mobility demand | Olympic lifts, pistol |

**Cardinality:** Multi (array). **Storage:** DB `joint_stress_tags` (text[]). Map to `tags.joint_stress` or `joint_stress` on Exercise/ExerciseWithQualities for backward compat. **Critical:** These slugs must be the **exact** values used in `INJURY_AVOID_TAGS` (no `joint_` prefix in code; DB can store same slugs).

---

### C.8 Contraindication tags

**Purpose:** “Avoid when user has this body-region issue.” User-facing; maps to joint_stress + optional exercise IDs in rules.

| Slug | Definition | When to use |
|------|------------|-------------|
| `shoulder` | Shoulder / rotator cuff concern | Any exercise with shoulder_overhead or shoulder_extension_load |
| `knee` | Knee concern | knee_flexion, deep_knee_flexion |
| `lower_back` | Low back / lumbar concern | lumbar_shear, lumbar_flexion_load, spinal_axial_load |
| `elbow` | Elbow concern | elbow_stress |
| `wrist` | Wrist concern | wrist_extension_load |
| `hip` | Hip concern | hip_stress |
| `ankle` | Ankle concern | ankle_stress |

**Cardinality:** Multi (array). **Storage:** DB `contraindication_tags` (text[]). Map to `tags.contraindications` for compat. **Order:** Tags are stored **most→least relevant** (first = primary concern). Source: `exercise_contraindications.sort_order`; sync uses `ORDER BY sort_order, contraindication`. **Rule:** Populate from joint_stress mapping (e.g. shoulder_overhead → contraindication `shoulder`) plus exercise-specific overrides (e.g. “this exercise is known bad for knee” even if joint_stress is light). Generator uses contraindication count for tie-breaking (prefer fewer contraindications when otherwise equal).

---

### C.9 Mobility targets

**Purpose:** Cooldown/prep selection when secondary goal is mobility. “This drill addresses these areas.”

| Slug | Definition | When to use |
|------|------------|-------------|
| `thoracic_spine` | T-spine / rib cage | Cat cow, T-spine rotation, open book |
| `hip_flexors` | Hip flexor length / control | Hip flexor stretch, half-kneeling |
| `hamstrings` | Hamstring length | Seated stretch, straight-leg |
| `hip_internal_rotation` | Hip IR | 90/90, hip circles |
| `hip_external_rotation` | Hip ER | Figure-4, glute stretch |
| `shoulders` | Glenohumeral / scapular | Sleeper, cross-body, band stretch |
| `calves` | Calf / ankle | Calf stretch, ankle mobility |
| `quadriceps` | Quad / rectus femoris | Standing quad stretch |
| `glutes` | Glute / piriformis | Figure-4, pigeon |
| `lumbar` | Low back mobility (careful) | Child’s pose, cat cow |
| `wrists` | Wrist mobility | Wrist circles, flexor stretch |

**Cardinality:** Multi (array). **Storage:** DB `mobility_targets` (text[]). Optional on Exercise.

---

### C.10 Stretch targets

**Purpose:** Cooldown stretch selection. “This stretch targets these areas.” Overlap with mobility_targets is OK; stretch = often static, mobility = often dynamic/control.

| Slug | Definition | When to use |
|------|------------|-------------|
| `hamstrings` | Hamstrings | Seated/standing hamstring stretch |
| `hip_flexors` | Hip flexors | Half-kneeling, couch stretch |
| `quadriceps` | Quads | Standing quad stretch |
| `calves` | Calves | Wall calf stretch |
| `glutes` | Glutes / piriformis | Figure-4, pigeon |
| `thoracic_spine` | T-spine | Open book, twist |
| `shoulders` | Shoulders / chest | Doorway, cross-body |
| `lats` | Lats | Overhead lat stretch |
| `low_back` | Low back (gentle) | Child’s pose, knees to chest |

**Cardinality:** Multi (array). **Storage:** DB `stretch_targets` (text[]). Optional on Exercise. **Rule:** If same drill is both mobility and stretch, tag both; cooldown logic can treat “mobility or stretch” together for required_finishers.

---

### C.11 Stimulus tags

**Purpose:** Prescription and goal matching (eccentric, isometric, plyometric, etc.). Keep in tags; optionally canonicalize.

| Slug | Definition | When to use |
|------|------------|-------------|
| `eccentric` | Eccentric emphasis | Slow lower, Nordic |
| `isometric` | Isometric hold | Plank, wall sit, hold |
| `plyometric` | Explosive / stretch-shorten | Jump, throw, swing (power) |
| `aerobic_zone2` | Steady aerobic | Zone 2 run/bike |
| `anaerobic` | High intensity / glycolytic | Sprints, HIIT |
| `grip` | Grip demanding | Deadlift, hang, farmer |
| `scapular_control` | Scapular emphasis | Rows, face pull, band |
| `trunk_anti_rotation` | Anti-rotation | Pallof, band hold |
| `anti_flexion` | Anti-flexion / bracing | Dead bug, plank |

**Cardinality:** Multi (array). **Storage:** Keep in `tags.stimulus`; can add canonical const array in code. No new DB column required.

---

### C.12 Fatigue regions

**Purpose:** “Which regions get fatigued?” For superset distribution (avoid same region back-to-back) and fatigue awareness.

| Slug | Definition | When to use |
|------|------------|-------------|
| `quads` | Quadriceps | Squat, lunge, leg ext |
| `glutes` | Glutes | Hinge, hip thrust, bridge |
| `hamstrings` | Hamstrings | RDL, leg curl |
| `pecs` | Pectorals | Bench, push-up, dip |
| `triceps` | Triceps | Push, dip, ext |
| `shoulders` | Delts | OH press, raise, upright row |
| `lats` | Lats | Pull-up, row, pulldown |
| `biceps` | Biceps | Curl, row (arm) |
| `forearms` | Forearms / grip | Deadlift, hang, farmer |
| `core` | Trunk / abs | Plank, carry, anti-rotation |
| `calves` | Calves | Calf raise, jump |

**Cardinality:** Multi (array). **Storage:** DB `fatigue_regions` (text[]). Optional on Exercise. **Evidence and enrichment:** See `docs/research/fatigue-regions-audit-2025.md` (NSCA, ACSM, ExRx, NCSF); grip-heavy exercises include `forearms` and `grip`; hybrid compounds (thruster, devils press, wall ball) explicitly list quads, glutes, shoulders, triceps, core; calf-dominant and jump/run conditioning include `calves`. See also `docs/research/exercise-ontology-enrichment-2025.md`.

---

### C.13 Pairing category

**Purpose:** Superset logic: “no double grip”, “chest + triceps OK”, “avoid same category twice”.

| Slug | Definition | When to use |
|------|------------|-------------|
| `chest` | Chest dominant | Bench, push-up, dip, fly |
| `shoulders` | Shoulder dominant | OH press, raise, face pull |
| `triceps` | Triceps dominant | Extensions, close-grip, dip |
| `back` | Back (lats/rhomboids) | Row, pulldown |
| `biceps` | Biceps dominant | Curl, chin-up (arm) |
| `quads` | Quad dominant | Squat, leg press, lunge |
| `posterior_chain` | Glutes/hamstrings | Hinge, RDL, hip thrust |
| `core` | Core dominant | Plank, carry, rotation |
| `grip` | Grip limited | Deadlift, hang, farmer |
| `mobility` | Mobility / prep | Band, CARs, flow |

**Cardinality:** Single. **Storage:** DB `pairing_category` (text). Optional on Exercise. **Rule:** Pick the **primary** limiting factor for pairing (e.g. deadlift → `grip` or `posterior_chain`; bench → `chest`). **Evidence and enrichment:** See `docs/research/exercise-ontology-enrichment-2025.md`; power/Olympic (thruster → quads, clean/snatch → grip, jerk → shoulders).

---

### C.14 Unilateral

**Purpose:** Single-limb vs bilateral for balance and superset (unilateral + unilateral same leg = avoid).

**Values:** `true` | `false`. **Storage:** DB `unilateral` (boolean). Optional on Exercise.

---

### C.15 Progressions / regressions

**Purpose:** Substitution and scaling (harder / easier options).

**Cardinality:** Multi (exercise IDs). **Storage:** Exercise `progressions?: string[]`, `regressions?: string[]`. No new DB column; can live in exercise table or relation table. **Rule:** IDs reference same exercise catalog (slug or id).

---

### C.16 Demand levels and relevance (warmup, cooldown, stability, grip, impact)

**Purpose:** Ordinal levels for warmup/cooldown suitability, balance/stability demand, grip demand, and joint impact. Used by generator for block selection (warmup/cooldown) and fatigue/injury awareness.

**Values (all):** `none` | `low` | `medium` | `high`. **Storage:** DB columns `warmup_relevance`, `cooldown_relevance`, `stability_demand`, `grip_demand`, `impact_level` (text). Optional on Exercise.

| Field | Use in generation |
|-------|--------------------|
| `warmup_relevance` | Warmup block: prefer high/medium when scoring candidates. |
| `cooldown_relevance` | Cooldown block: prefer high/medium; cooldown selection sorts by this after role. |
| `stability_demand` | Optional: down-rank high when user_level is beginner. |
| `grip_demand` | `hasGripFatigueDemand`: high/medium → add "grip" to fatigue regions for superset logic. |
| `impact_level` | Optional: down-rank or exclude high when user has knee/lower_back/ankle limitations. |

**Evidence and enrichment:** See `docs/research/demand-levels-audit-2025.md` (NSCA, ACSM, ExRx, NCSF; warmup/cooldown block selection, stability for beginners, grip for superset, impact for injury-aware). Backfill: warmup/cooldown low for main work, impact high for plyo/jump/run, grip high for heavy pulls.

---

### C.17 Aliases and swap candidates

**Purpose:** Search/discovery (aliases) and substitution in the same slot (swap_candidates).

**aliases:** Alternate names (e.g. "OHP", "overhead press" for oh_press). **Cardinality:** Multi (text[]). **Storage:** DB `aliases` (text[]).

**swap_candidates:** Exercise slugs that are good substitutes in the same block/slot. **Cardinality:** Multi (slugs). **Storage:** DB `swap_candidates` (text[]). **Rules:** No self-reference; only active slugs; same pattern/family preferred. **Evidence and enrichment:** See `docs/research/exercise-ontology-enrichment-2025.md`; **descriptions:** `docs/research/descriptions-audit-2025.md`; **rep ranges:** `docs/research/rep-ranges-audit-2025.md`; **aliases:** `docs/research/aliases-audit-2025.md`; **swap_candidates:** `docs/research/swap-candidates-audit-2025.md` (NSCA, ACSM, ExRx, NCSF; same pattern/family, substitution in same slot).

---

## D. Mapping to Current Repo and DB

### D.1 Which ontology fields live on the exercise type used by dailyGenerator

**logic/workoutGeneration/types.ts — `Exercise`:**

- **Already present:** `id`, `name`, `movement_pattern`, `muscle_groups`, `modality`, `equipment_required`, `difficulty`, `time_cost`, `tags`, `progressions`, `regressions`.
- **Add as optional (no breaking change):**  
  `primary_movement_family?: string`  
  `secondary_movement_families?: string[]`  
  `movement_patterns?: string[]`  
  `joint_stress_tags?: string[]`  
  `contraindication_tags?: string[]`  
  `exercise_role?: string`  
  `pairing_category?: string`  
  `fatigue_regions?: string[]`  
  `mobility_targets?: string[]`  
  `stretch_targets?: string[]`  
  `unilateral?: boolean`
- **Keep:** `tags` (goal_tags, sport_tags, energy_fit, joint_stress, contraindications, stimulus). Adapter can **populate** `joint_stress` and `contraindications` from `joint_stress_tags` and `contraindication_tags` when present so existing filter logic keeps working.
- **Legacy:** `movement_pattern` stays. When `movement_patterns?.length` is set, derive legacy from first element or explicit map (e.g. horizontal_push → push).

### D.2 Which fields remain optional at first

All new ontology fields are **optional** on Exercise and ExerciseWithQualities. Priority for “present first”: `primary_movement_family`, `joint_stress_tags`, `contraindication_tags`. Then `movement_patterns`, `pairing_category`, `exercise_role`. Then `fatigue_regions`, `mobility_targets`, `stretch_targets`, `secondary_movement_families`, `unilateral`.

### D.3 Exercise (logic/workoutGeneration/types.ts)

- Add optional fields from table in D.1.
- `ExerciseTags` keeps `joint_stress`, `contraindications`, `stimulus`. Adapter: if `joint_stress_tags` is set, use it for `tags.joint_stress` (and for filterByHardConstraints); same for `contraindication_tags` → `tags.contraindications`. So generator sees one shape; ontology is source when available.

### D.4 ExerciseWithQualities (logic/workoutIntelligence/types.ts)

- Already has optional `primary_movement_family`.
- Add same optional ontology fields as Exercise: `secondary_movement_families`, `movement_patterns`, `joint_stress_tags`, `contraindication_tags`, `exercise_role`, `pairing_category`, `fatigue_regions`, `mobility_targets`, `stretch_targets`, `unilateral`.
- Keep `joint_stress`, `contraindications`; adapter can set from ontology when present. `deriveMovementFamily()` already prefers `primary_movement_family` when set.

### D.5 Fit with existing structured DB columns

| DB column | Ontology field | Notes |
|----------|----------------|--------|
| `primary_movement_family` | primary_movement_family | Direct. |
| `secondary_movement_families` | secondary_movement_families | Direct. |
| `movement_patterns` | movement_patterns | Direct. |
| `joint_stress_tags` | joint_stress_tags | Canonical slugs only. |
| `contraindication_tags` | contraindication_tags | Canonical slugs only. |
| `stretch_targets` | stretch_targets | Direct. |
| `mobility_targets` | mobility_targets | Direct. |
| `exercise_role` | exercise_role | Direct. |
| `pairing_category` | pairing_category | Direct. |
| `unilateral` | unilateral | Direct. |
| `fatigue_regions` | fatigue_regions | Direct. |

No new DB columns required for this ontology; use existing nullable/array columns.

### D.6 Which current generic tag categories remain

- **goal_tags** — Keep. Used for goal alignment scoring; training_quality_weights can complement.
- **sport_tags** — Keep. Sport-specific scoring and future sport logic. Sport prep design and evidence: see `docs/research/sports-audit-2025.md` (NSCA, ACSM, ExRx, NCSF; qualities, exercise–sport alignment).
- **energy_fit** — Keep. Session energy filter.
- **joint_stress** (in tags) — Keep on type for backward compat; **source of truth** becomes `joint_stress_tags` when present (adapter copies to tags).
- **contraindications** (in tags) — Same: keep on type; source of truth `contraindication_tags` when present.
- **stimulus** — Keep in tags; optionally canonicalize to same slugs as C.11.
- **General / muscle / equipment tags** in `exercise_tags` table — Keep for search and display; ontology is for **logic** (filter, constraint, pairing).

### D.7 Which tag-based concepts move to structured fields over time

- **Body-part / “where does it belong”** → `primary_movement_family` (+ secondary). Replace derivation from pattern+muscles for strict filter when present.
- **Injury exclusion** → `joint_stress_tags` + `contraindication_tags`. Replace ad hoc tag matching; rules use canonical slugs.
- **Superset “can pair”** → `pairing_category` + `fatigue_regions`. Replace pattern-only nonCompeting; add “no double grip”, “no same pairing_category” when present.
- **Block placement** → `exercise_role`. Replace modality-only block filters when present.
- **Cooldown mobility/stretch** → `mobility_targets`, `stretch_targets`. Replace “modality === mobility” only for targeted selection.
- **Balance / variety** → `movement_patterns`. Use for pattern caps and balance; legacy `movement_pattern` derived when needed.

---

## E. Recommended Priority Fields for Immediate Implementation

### E.1 Highest priority (immediate value, strict filtering)

1. **primary_movement_family** — Enables strict body-part focus (hard_include) without derivation. User-facing.
2. **joint_stress_tags** — Single source of truth for injury exclusion; align with INJURY_AVOID_TAGS.
3. **contraindication_tags** — User-facing injury keys; map to exclusions.

Use for: constraint resolution, filterByHardConstraints (or constraint filter step), and validateWorkout. Backfill from existing `movement_pattern` + muscles + tags; override for edge cases.

### E.2 Next (superset and block placement)

4. **pairing_category** — Enables “no double grip”, “chest + triceps OK”, “avoid same category”.
5. **exercise_role** — Block-type compatibility (warmup vs main vs cooldown).
6. **movement_patterns** — Finer balance and superset “non-competing” (e.g. horizontal_push vs vertical_push).

Use for: superset pairing in buildMainStrength/buildMainHypertrophy, block-type filters in candidateFilters/blockFiller.

### E.3 Softer / deferred

7. **fatigue_regions** — Superset distribution and fatigue awareness (softer at first).
8. **mobility_targets** / **stretch_targets** — Cooldown targeting when secondary goal = mobility.
9. **secondary_movement_families** — Hybrid exercises (thruster, clean); optional.
10. **unilateral** — Already in DB; use when superset logic “same leg” matters.

### E.4 Representative starter subset for testing

- **Upper push:** Barbell bench, DB shoulder press, push-up, dip (include one with shoulder_overhead).
- **Upper pull:** Pull-up, lat pulldown, DB row, face pull.
- **Lower:** Back squat, RDL, hip thrust, lunge, leg press (mix knee_flexion and lumbar_shear).
- **Core:** Plank, dead bug, pallof hold.
- **Mobility/cooldown:** Cat cow, T-spine rotation, band pull-apart, hamstring stretch.
- **Conditioning:** Rower, bike (zone 2).
- **Edge cases:** Thruster (lower + upper push), goblet squat (knee_flexion), deadlift (lumbar_shear, grip).

Annotate these with: primary_movement_family, joint_stress_tags, contraindication_tags, then pairing_category and exercise_role, then movement_patterns. Use for unit tests and generator integration tests.

### E.5 Which fields for strict filtering first

- **Strict (hard exclude/include):** primary_movement_family, joint_stress_tags, contraindication_tags. Use in resolveWorkoutConstraints and in the generator’s constraint filter step.

### E.6 Which fields for softer scoring / pairing first

- **Scoring:** primary_movement_family (body-part bonus when focus matches). movement_patterns (balance bonus for underrepresented pattern).
- **Pairing:** pairing_category (forbid same category or forbidden_pairs; prefer preferred_pairs). fatigue_regions (soft: prefer not to double up same region). exercise_role (soft: prefer role matches block type).

---

## F. Ambiguities and Decision Rules

### F.1 Exercises that span multiple movement families

**Rule:** Assign **one primary_movement_family** (the dominant emphasis) and list others in **secondary_movement_families**. For strict “upper push only” filter: include exercise if primary OR secondary is upper_push. For “full body” or distribution: use both.  
**Examples:** Thruster → primary `lower_body`, secondary `upper_push`. Clean → primary `lower_body`, secondary `upper_pull` (or power domain).

### F.2 Compounds: thrusters, Olympic derivatives

**Rule:** Primary = the **first/main** pattern (e.g. thruster = lower-body driven). Secondary = other families meaningfully involved. movement_patterns = all that apply (e.g. squat, vertical_push). pairing_category = the **most limiting** for supersets (e.g. `posterior_chain` or `grip` for clean). exercise_role = `main_compound` if used as main lift, else `conditioning` if in circuit.

### F.3 Push exercises not clearly chest vs shoulder dominant

**Rule:** primary_movement_family stays `upper_push` (both are upper push). Use **pairing_category** for superset nuance: bench → `chest`, OH press → `shoulders`. Use **movement_patterns**: horizontal_push vs vertical_push. So body-part filter stays upper_push; pairing and balance use pairing_category and movement_patterns.

### F.4 Rehab / mobility: warmup vs cooldown

**Rule:** Assign **one** exercise_role: the **most common** use (e.g. `prep` if often warmup, `cooldown` or `mobility` if often finisher). Tag **mobility_targets** and/or **stretch_targets** so cooldown logic can select by target. Allow block-type filters to accept “mobility” or “recovery” modality for both warmup and cooldown even if role says one.

### F.5 Stretch vs mobility vs activation

**Definitions:** **Stretch** = static or long-hold lengthening (stretch_targets). **Mobility** = dynamic ROM / control (mobility_targets). **Activation** = low-load prep (often exercise_role `prep` or `warmup`).  
**Rule:** An exercise can have both mobility_targets and stretch_targets if it does both. For “required_finishers” (e.g. 2 mobility/stretch in cooldown), count exercises that have modality mobility/recovery OR any mobility_targets OR stretch_targets. Role can be `cooldown` or `mobility`.

### F.6 Contraindication_tags vs joint_stress_tags

**Rule:** **joint_stress_tags** = biomechanical load (what the exercise does). **contraindication_tags** = body regions to avoid (user-facing). Mapping: each joint_stress tag implies one or more contraindication regions (e.g. shoulder_overhead → shoulder). Populate **contraindication_tags** from that mapping plus exercise-specific overrides (e.g. “known bad for knee” even if knee_flexion is light). Injury resolution: user says “knee” → exclude exercises where contraindication_tags includes `knee` OR joint_stress_tags includes tags in INJURY_AVOID_TAGS for knee (e.g. knee_flexion). One source (joint_stress) drives the other (contraindication) for consistency; override when needed.

### F.7 Unilateral and “same side” supersets

**Rule:** `unilateral` = true if single-limb or alternating. For “avoid same leg back-to-back” in supersets: when both exercises are unilateral and pairing_category overlaps (e.g. both lower), optional rule: prefer opposite sides or different pairing_category. Defer to Phase 2 implementation detail; ontology supports it via unilateral + pairing_category + fatigue_regions.

### F.8 Equipment slug drift

**Rule:** Adapter normalizes equipment to canonical slugs (lowercase, snake_case). DB and generator use same list; new equipment gets a new canonical slug and is added to the const array. No freeform in strict logic.

---

## Summary Table: Ontology Fields at a Glance

| Field | Cardinality | DB column | Priority | Used for |
|-------|-------------|-----------|----------|----------|
| primary_movement_family | Single | primary_movement_family | P1 | Strict body-part filter |
| secondary_movement_families | Array | secondary_movement_families | P3 | Hybrids |
| movement_patterns | Array | movement_patterns | P2 | Balance, superset |
| joint_stress_tags | Array | joint_stress_tags | P1 | Injury exclude |
| contraindication_tags | Array | contraindication_tags | P1 | Injury exclude |
| exercise_role | Single | exercise_role | P2 | Block placement |
| pairing_category | Single | pairing_category | P2 | Superset rules |
| fatigue_regions | Array | fatigue_regions | P3 | Superset, fatigue |
| mobility_targets | Array | mobility_targets | P3 | Cooldown mobility |
| stretch_targets | Array | stretch_targets | P3 | Cooldown stretch |
| unilateral | Boolean | unilateral | P3 | Superset, balance |
| progressions/regressions | IDs | (existing) | — | Substitution |

---

*Document completes Phase 2 ontology design. Next: encode vocabularies in TypeScript, update schema/types, annotate representative exercises, then refactor filtering and assembly to use ontology with fallback.*
