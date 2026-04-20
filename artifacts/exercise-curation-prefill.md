# Exercise curation prefill (deterministic)

- **Catalog:** `/Users/ellie/todayfit/data/workout-exercise-catalog.json`
- **min_confidence:** 0.75
- **high_confidence_threshold:** 0.88
- **persist_extra_curation_staging:** false
- **Exercises:** 4016

## Coverage (fraction of exercises with a field emitted)
- **primary_role:** 65.6%
- **movement_patterns:** 100.0%
- **equipment_class:** 100.0%
- **complexity:** 3.1%
- **sport_transfer_tags:** 3.9%

## Assignments (counts)
| Field | Assigned | High conf | Low conf |
| --- | ---: | ---: | ---: |
| primary_role | 2636 | 196 | 2440 |
| movement_patterns | 4016 | 1927 | 2089 |
| equipment_class | 4016 | 3769 | 247 |
| complexity | 125 | 116 | 9 |
| sport_transfer_tags | 155 | 155 | 0 |

## Top reason codes
- ontology_movement_patterns_mapped: 4016
- equipment_slug_bodyweight: 1711
- name_keyword_lunge_family: 1181
- ontology_unilateral_or_text_unilateral: 897
- name_compound_pattern_with_barbell_or_bw: 759
- equipment_slug_kettlebell: 701
- equipment_dominant_name_tiebreak_equal_weight: 487
- name_power_or_plyo_pattern: 405
- equipment_slug_dumbbell: 320
- name_isolation_accessory_heuristic: 253
- equipment_slug_barbell_family: 247
- name_keyword_squat_family: 235
- legacy_push_disambiguated_horizontal: 222
- name_keyword_horizontal_push: 220
- equipment_true_mixed_two_mains_equal_weight: 191
- ontology_exercise_role_mobility_family: 165
- name_keyword_vertical_push: 149
- sport_transfer_rehab_friendly: 126
- legacy_push_disambiguated_vertical: 116
- name_advanced_lift_pattern: 116
- name_keyword_horizontal_pull: 107
- name_keyword_hinge_family: 106
- name_stability_core_pattern: 98
- equipment_slug_specialty: 94
- equipment_slug_cable: 77
- name_keyword_isometric: 72
- name_keyword_rotation: 70
- name_keyword_vertical_pull: 69
- legacy_pull_disambiguated_row: 65
- legacy_pull_disambiguated_vertical: 65

## Trust tier coverage (exercises with each field assigned)
| Field | locked | strong_prior | weak_prior |
| --- | ---: | ---: | ---: |
| movement_patterns | 1153 | 2863 | 0 |
| primary_role | 189 | 412 | 2035 |
| equipment_class | 1506 | 1967 | 543 |

Complexity and sport_transfer_tags are never `locked` in phase 2 (strong_prior or weak_prior only).

See **`exercise-curation-prefill-diagnostics.md`** for movement/equipment breakdowns.
