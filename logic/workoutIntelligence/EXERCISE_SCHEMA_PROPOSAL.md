# Exercise Schema Proposal — Structured Fields for Rule-Based Filtering

## Current state (audit)

- **exercises**: slug, name, description, movement_pattern (single text), primary_muscles[], secondary_muscles[], equipment[], modalities[], level, is_active.
- **exercise_tags** / **exercise_tag_map**: many-to-many tags (movement_pattern, muscle, modality, equipment, energy, joint_stress, contraindication, sport, general).
- **exercise_contraindications**: exercise_id, contraindication, joint.

Generator types (**ExerciseWithQualities**): movement_pattern (string), muscle_groups[], equipment_required[], training_quality_weights, joint_stress[], contraindications[], energy_fit[], modality, fatigue_cost, skill_level.

**Gaps for strict rules:**

1. No single **primary_movement_family** (upper_push, upper_pull, etc.) — we derive from pattern + muscles in code.
2. **joint_stress** is a string array with inconsistent naming (shoulder_overhead vs joint_shoulder_overhead).
3. No **movement_patterns** array (e.g. horizontal_push, vertical_push) for finer matching.
4. No **exercise_role** (warmup, main_compound, accessory, cooldown) for block placement.
5. No **stretch_targets** / **mobility_targets** for cooldown selection.
6. No **pairing_category** or **fatigue_regions** for superset logic.

## Proposed additions (research-aligned)

Based on NSCA movement-pattern frameworks, common exercise libraries, and injury-filtering needs:

### 1. primary_movement_family (text, nullable)

One of: `upper_push` | `upper_pull` | `lower_body` | `core` | `mobility` | `conditioning`.

Enables strict body-part inclusion without deriving from muscles/pattern.

### 2. secondary_movement_families (text[], default '{}')

Array of same enum. Enables “also counts as” for overlap (e.g. thruster = upper_push + lower_body).

### 3. movement_patterns (text[], default '{}')

Finer patterns: `horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hinge`, `lunge`, `rotation`, `anti_rotation`, `carry`, `locomotion`, `shoulder_stability`, `thoracic_mobility`. Keeps existing `movement_pattern` for backward compatibility.

### 4. joint_stress_tags (text[], default '{}')

Canonical list for injury filtering: `shoulder_overhead`, `shoulder_abduction_load`, `shoulder_extension_load`, `grip_hanging`, `deep_knee_flexion`, `knee_flexion`, `spinal_axial_load`, `lumbar_shear`, `lumbar_flexion_load`, `wrist_extension_load`, `elbow_stress`, `hip_stress`, `ankle_stress`. Map existing `joint_stress` / tags into these for new column or use as authoritative source.

### 5. contraindication_tags (text[], default '{}')

Explicit “avoid when” keys: e.g. `shoulder`, `knee`, `lower_back`, `elbow`, `wrist`, `hip`, `ankle`. Complements existing exercise_contraindications table; can be synced from it.

### 6. stretch_targets / mobility_targets (text[], default '{}')

For cooldown selection: `hamstrings`, `hip_flexors`, `thoracic_spine`, `shoulders`, `calves`, `glutes`, `quadriceps`, etc.

### 7. exercise_role (text, nullable)

One of: `warmup`, `prep`, `main_compound`, `accessory`, `isolation`, `finisher`, `cooldown`, `mobility`, `conditioning`. Helps block-type compatibility.

### 8. pairing_category (text, nullable)

For supersets: e.g. `chest`, `shoulders`, `triceps`, `back`, `biceps`, `quads`, `posterior_chain`, `core`, `mobility`. Enables “chest + triceps” vs “chest + chest” rules.

### 9. unilateral (boolean, default false)

Single-limb vs bilateral.

### 10. fatigue_regions (text[], default '{}')

Regions that get fatigued: `quads`, `glutes`, `pecs`, `triceps`, `lats`, `biceps`, `forearms`, `core`, etc. For distribution and superset balance.

## Migration strategy

- Add new columns as **nullable** or with **default '{}'** so existing rows remain valid.
- Backfill from existing `movement_pattern`, `primary_muscles`, tags, and contraindications where possible.
- Generator can use **primary_movement_family** when present, else fall back to **deriveMovementFamily()** from existing fields.
- Keep **joint_stress** and **contraindications** on ExerciseWithQualities; map from DB **joint_stress_tags** and **contraindication_tags** when present.

## Integration with app

When loading exercises from the DB for the workout intelligence layer (constraints, filtering, assembly):

- Select **joint_stress_tags** and map to `ExerciseWithQualities.joint_stress` (array of strings). These must match the slugs in `lib/workoutRules` `INJURY_AVOID_TAGS` (e.g. `shoulder_overhead`, `knee_flexion`, `lumbar_shear`).
- Select **contraindication_tags** or keep using **exercise_contraindications** and map to `contraindications`.
- Select **primary_movement_family**; when present, `eligibilityHelpers.deriveMovementFamily()` can use it directly instead of deriving from pattern + muscles.
- **exercise_role**, **pairing_category**, **stretch_targets**, **fatigue_regions** can be used by block-type filters and cooldown mobility selection once the loader exposes them.

## Naming conventions

- Snake_case for DB and TypeScript.
- Enums in application code; DB uses text/array of text.
- Consistent prefixes: `joint_` for joint stress, `contra_` optional for contraindication keys.
