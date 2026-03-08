# Filter-to-Workout Rules Engine — Design

## Goal

Make generated workouts **strictly and predictably** reflect user filters. The engine converts normalized input into explicit workout constraints and ensures the final workout complies before return.

## Rule precedence (applied in order)

1. **Injuries / restrictions** — hard exclusions and soft cautions
2. **Equipment** — hard exclude if required equipment missing
3. **Body-part strictness** — strict inclusion (only allowed movement families)
4. **Primary goal** — session structure and block emphasis
5. **Secondary goal** — required blocks (e.g. mobility cooldown)
6. **Preferences** — format (supersets), duration, energy

## Constraint / rule types

| Rule type | Purpose | Example |
|-----------|---------|--------|
| `hard_exclude` | Exercise must not appear | Exclude IDs or joint_stress tags when injury present |
| `soft_caution` | Prefer to avoid; reduce score | Shoulder-heavy when "managing" shoulder |
| `hard_include` | Working exercises must match | Only `upper_push` when body focus = Upper Body Push |
| `preferred` | Boost score for match | Prefer compound when goal = strength |
| `required_block` | Session must have a block of this type | `cooldown` with mobility when secondary = mobility |
| `required_block_type` | At least one block must be of type | `mobility` or `recovery` in cooldown |
| `required_finishers` | Cooldown must include N mobility/stretch exercises | When mobility secondary |
| `superset_pairing_rules` | Allow/prefer/forbid pairs | Chest+triceps OK; chest+chest isolation avoid |
| `movement_distribution_rules` | How to spread volume across families | Rotate chest / shoulders / triceps in upper push |

## Filter → rules mapping

- **Body part focus**  
  - Single (e.g. Upper Push): `hard_include` = that movement family only for main/accessory blocks.  
  - Multiple: `movement_distribution_rules` to distribute; all working exercises must match one of the included families.

- **Primary goal**  
  - Drives block sequence and stimulus (existing template).  
  - Adds `preferred` for modality/qualities (e.g. hypertrophy → prefer moderate rep range).

- **Secondary goal**  
  - Mobility: `required_block` cooldown, `required_finishers` mobility/stretch; optional warmup mobility.  
  - Other secondaries: `preferred` qualities.

- **Injuries / restrictions**  
  - From structured `joint_stress` / `contraindication_tags`: `hard_exclude` (tags + exercise IDs).  
  - Optional `soft_caution` for “managing” vs “avoid” severity.

- **Equipment**  
  - `hard_exclude` any exercise requiring unavailable or excluded equipment.

- **Duration / energy**  
  - Used by existing session shaping; no new rule type, just inputs to template/assembly.

- **Format (supersets)**  
  - `superset_pairing_rules`: allowed movement-family pairs, forbidden pairs (e.g. double grip), preferred rotation (chest+triceps, chest+shoulders, shoulders+triceps).

## Validation (post-assembly)

- Run **validateWorkoutAgainstConstraints(workout, constraints)**.
- If any **hard_include** or **hard_exclude** or **required_finishers** violated:
  - Replace offending exercises or add missing cooldown exercises.
  - Re-run validation until pass or max iterations.
- Return workout only when compliant.

## Data model (exercise schema) — see SCHEMA_PROPOSAL below

Generator and DB rely on **structured** fields for strict rules:

- `primary_movement_family` (upper_push | upper_pull | lower_body | core | mobility | conditioning)
- `secondary_movement_families[]`
- `movement_patterns[]` (horizontal_push, vertical_push, squat, hinge, lunge, rotation, anti_rotation, etc.)
- `joint_stress_tags[]` (shoulder_abduction_load, deep_knee_flexion, spinal_axial_load, etc.)
- `contraindication_tags[]` (injury filtering)
- `stretch_targets` / `mobility_targets[]` (for cooldown selection)
- `exercise_role` (warmup, main_compound, accessory, isolation, finisher, cooldown)
- `pairing_category` (for superset logic)
- `fatigue_regions[]` (quads, pecs, triceps, etc.)

Existing `movement_pattern` (single), `muscle_groups`, `joint_stress`, `contraindications` remain; new fields add precision and allow strict filtering without string guessing.
