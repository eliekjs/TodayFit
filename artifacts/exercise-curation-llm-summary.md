# Exercise curation — LLM classification summary

- **Catalog:** `/Users/ellie/todayfit/data/workout-exercise-catalog.json`
- **Total processed:** 4016
- **Validated:** 3635
- **Rejected (validation failed):** 381
- **Ambiguous** (merged profile: ambiguity_flags non-empty or llm_confidence below threshold): 7
- **Parse / batch JSON failures (staging rows):** 0
- **Malformed record failures (enum/shape, staging rows):** 381

## This run (invocation)
- **Exercises attempted:** 3996
- **API requests made:** 400
- **Average exercises per request:** 9.99
- **Provider errors (rate limit, after retries):** 0
- **Provider errors (other, after retries):** 0
- **Partial batch successes** (mixed pass/fail in one API response): 117

## keep_category
- **core:** 2993
- **niche:** 641
- **remove_candidate:** 1

## primary_role (merged output)
- **accessory_strength:** 375
- **compound_strength:** 1311
- **conditioning:** 72
- **injury_prevention:** 28
- **mobility:** 198
- **power_explosive:** 471
- **stability_core:** 327
- **unilateral_strength:** 853

## complexity
- **advanced:** 682
- **beginner_friendly:** 1478
- **intermediate:** 1475

## sport_transfer_tags
- **climbing:** 25
- **general_athletic:** 3024
- **rehab_friendly:** 219
- **running:** 5

## Locked prefill overrode raw LLM (LLM disagreed with locked deterministic field)
- primary_role: 0, movement_patterns: 23, equipment_class: 0

## Deterministic vs raw LLM (non-locked fields)
### primary_role
- preserved: 2217, replaced: 9, filled_no_prior: 1224, locked_unchanged: 185
### movement_patterns
- preserved: 2356, replaced: 215, filled_no_prior: 0, locked_unchanged: 1064
### equipment_class
- preserved: 2263, replaced: 0, filled_no_prior: 0, locked_unchanged: 1372
### complexity
- preserved: 125, replaced: 0, filled_no_prior: 3510, locked_unchanged: 0
### sport_transfer_tags
- preserved: 151, replaced: 0, filled_no_prior: 3484, locked_unchanged: 0

## Top ambiguity flags
- low_confidence_hint: 7

## Validation failure codes
- **invalid_enum:** 379
- **missing_batch_result:** 2
