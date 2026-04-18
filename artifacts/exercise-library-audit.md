# Exercise library audit

- **Generated:** 2026-04-18T20:41:27.822Z
- **Catalog:** `/Users/ellie/todayfit/data/workout-exercise-catalog.json`
- **Schema version:** 1
- **Exercises: 4016; flags: 0; duplicate ids: 0; curation profiles in extra: 0**

## Coverage (inventory + ontology)
| Field | Present | Missing |
| --- | ---: | ---: |
| inventory.description | 0 | 4016 |
| inventory.equipment | 4016 | 0 |
| inventory.id | 4016 | 0 |
| inventory.modalities | 4016 | 0 |
| inventory.movement_pattern_legacy | 4016 | 0 |
| inventory.muscles | 4016 | 0 |
| inventory.name | 4016 | 0 |
| inventory.ontology_blob | 4016 | 0 |
| inventory.tags | 4016 | 0 |
| ontology.exercise_role | 4013 | 3 |
| ontology.fatigue_regions | 4016 | 0 |
| ontology.joint_stress_tags | 3844 | 172 |
| ontology.movement_patterns | 4016 | 0 |
| ontology.pairing_category | 4016 | 0 |
| ontology.primary_movement_family | 4016 | 0 |

## Target curation schema (from `extra.curation` when present)
| Field | Present | Missing |
| --- | ---: | ---: |
| curation.complexity | 0 | 4016 |
| curation.equipment_class | 0 | 4016 |
| curation.generator_state | 0 | 4016 |
| curation.keep_category | 0 | 4016 |
| curation.movement_patterns | 0 | 4016 |
| curation.primary_role | 0 | 4016 |

## Uniques
- Distinct equipment slugs: **24**
- Distinct tags: **398**
- Distinct legacy movement_pattern: **6**
- Distinct ontology movement_pattern slugs: **10**
- Distinct modalities: **6**

## Top equipment (up to 25)
- bodyweight: 2353
- kettlebells: 913
- dumbbells: 509
- barbell: 284
- plyo_box: 169
- bands: 118
- cable_machine: 100
- trx: 95
- pullup_bar: 67
- rower: 32
- ez_bar: 27
- trap_bar: 22
- sled: 17
- bench: 10
- rings: 5
- squat_rack: 3
- hamstring_curl: 2
- ski_erg: 2
- assault_bike: 1
- chest_press: 1
- leg_extension: 1
- leg_press: 1
- stair_climber: 1
- treadmill: 1

## Top tags (up to 25)
- lower body: 1419
- knee_dominant: 1389
- novice: 1105
- intermediate: 1092
- upper body: 906
- ota_movements: 678
- full body: 572
- advanced: 462
- beginner: 414
- vertical_push: 364
- core: 353
- strength: 324
- hip_hinge: 313
- athleticism: 244
- rotational: 241
- upper: 183
- horizontal_push: 180
- isometric_hold: 175
- lower: 164
- power: 160
- cooldown: 128
- expert: 126
- warmup: 120
- horizontal_pull: 114
- mobility: 112

## Legacy movement_pattern (top 25)
- squat: 2009
- rotate: 863
- push: 734
- pull: 315
- locomotion: 51
- hinge: 44

## Ontology movement_patterns (top 25)
- squat: 2009
- horizontal_push: 718
- rotation: 691
- anti_rotation: 690
- horizontal_pull: 312
- thoracic_mobility: 172
- vertical_push: 94
- locomotion: 51
- hinge: 44
- vertical_pull: 3

## Flags (0)
- errors: 0, warnings: 0, info: 0

