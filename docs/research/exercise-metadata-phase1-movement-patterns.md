# Phase 1 — Movement family and movement patterns (research note)

**Purpose:** Ground rule-based inference for `primary_movement_family`, `secondary_movement_families`, and `movement_patterns` when curated DB values are absent. This note defines **how** labels are applied; it does not claim each exercise row is individually evidence-validated.

**Implementation:** [`lib/exerciseMetadata/phase1MovementInference.ts`](../../lib/exerciseMetadata/phase1MovementInference.ts)

## Source ranking

Per [`source-ranking.md`](source-ranking.md): preference for professional consensus and teaching frameworks over single studies for **taxonomy** (what categories exist). Biomechanical studies are secondary for edge cases.

## External references (web)

1. **NSCA — Eight main movement patterns (programming framework)**  
   [The 8 Main Movement Patterns – A Programming Framework for Tactical Strength and Conditioning](https://www.nsca.com/education/articles/tsac-report/the-8-main-movement-patterns/)  
   *Use:* Validates treating squat, hinge, lunge, push, pull, carry, rotation, and locomotion-style work as distinct buckets for menu design.

2. **NSCA — Teaching fundamental resistance training movement patterns**  
   [Progressive Strategies for Teaching Fundamental Resistance Training Movement Patterns](https://www.nsca.com/education/articles/ptq/teaching-resistance-training-movement-patterns/)  
   *Use:* Supports progression from fundamental patterns before specificity; justifies conservative defaults when data are ambiguous (prefer broad pattern + human review later).

3. **NSCA — Classifying movements (Kinetic Select)**  
   [Classifying Movements](https://www.nsca.com/education/articles/kinetic-select/classifying-movements/)  
   *Use:* Reinforces multi-planar and pattern-based thinking when mapping exercises to categories.

4. **ACSM — Resistance training guidelines / position stand (updated)**  
   [ACSM Publishes Updated Resistance Training Guidelines](https://acsm.org/resistance-training-guidelines-update-2026/)  
   *Use:* Emphasis on training major muscle groups and multi-joint work; aligns with prioritizing compound pattern labels over isolation when signals conflict.

5. **ACSM MSSE — Progression models (historical reference for exercise selection principles)**  
   Garber et al., *Progression Models in Resistance Training for Healthy Adults* (MSSE, cited widely; full text via LWW).  
   *Use:* Principle that programs use **single- and multi-joint** exercises; our fine patterns distinguish horizontal vs vertical push/pull where possible.

## Mapping to TodayFit ontology

Canonical slugs: [`lib/ontology/vocabularies.ts`](../../lib/ontology/vocabularies.ts) (`MOVEMENT_FAMILIES`, `MOVEMENT_PATTERNS`). Legacy `movement_pattern` for the generator is derived via [`getLegacyMovementPattern`](../../lib/ontology/legacyMapping.ts).

| Research / coaching bucket | `primary_movement_family` (typical) | `movement_patterns` (examples) |
|----------------------------|-------------------------------------|---------------------------------|
| Lower-body knee-dominant squat | `lower_body` | `squat` |
| Hip hinge / posterior chain | `lower_body` | `hinge` |
| Lunge / split-stance | `lower_body` | `lunge` (legacy maps to squat for balance) |
| Upper push (horizontal vs vertical by line of action) | `upper_push` | `horizontal_push` or `vertical_push` |
| Upper pull (vertical vs horizontal) | `upper_pull` | `vertical_pull` or `horizontal_pull` |
| Loaded carry | `lower_body` or `core` if trunk-only context | `carry` |
| Rotary / anti-rotation core | `core` | `rotation`, `anti_rotation` |
| Running / agility / gait drills | `conditioning` | `locomotion` |
| Mobility / prep for T-spine or shoulder | `mobility` | `thoracic_mobility`, `shoulder_stability` |

**Hybrids (e.g. thruster, wall ball, clean):** NSCA/ACSM both emphasize multi-joint exercises. We assign a **primary** family from the dominant driver (often `lower_body` when legs initiate) and **secondary** families for upper contribution (e.g. `upper_push`), with multiple `movement_patterns` ordered primary-first.

## When we do not know (data gaps)

1. **Prefer explicit tags** on the exercise (`quad-focused`, `squat`, `posterior_chain`, `scapular_control`) when present.  
2. **Use id/name keywords** only for disambiguation (e.g. `overhead`, `pullup`, `rdl`, `lunge`) — document regexes in code comments.  
3. **If still ambiguous:** apply the **conservative default** from the teaching literature: label the **broad fundamental pattern** (e.g. `lower_body` + `squat` for ambiguous “legs” without hinge cues) and avoid inventing fine patterns.  
4. **Human curation** remains the source of truth when DB fields are filled; this layer fills **gaps** for static export and offline generation only.

## Validation

- Run [`scripts/auditExerciseMetadataCoverage.ts`](../../scripts/auditExerciseMetadataCoverage.ts) — Phase 1 columns on merged catalog / generator output.  
- Spot-check `generateWorkoutSession` with Upper / Lower / Full body focus after static pool picks up ontology.

## Related

- Ontology design: [`docs/EXERCISE_ONTOLOGY_DESIGN.md`](../EXERCISE_ONTOLOGY_DESIGN.md)  
- Enrichment policy: [`.cursor/skills/exercise-db-enrichment-agent/SKILL.md`](../../.cursor/skills/exercise-db-enrichment-agent/SKILL.md)
