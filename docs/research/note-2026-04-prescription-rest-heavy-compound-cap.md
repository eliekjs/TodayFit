# Prescription rest bias (strength) and heavy-compound session cap

**Date:** 2026-04-22  
**Subsystem:** Prescription (`setRepResolver`), movement balance (`scoringConfig` + guardrails)  
**Related targets:** `docs/research/top-20-improvement-targets.md` — #3 prescription, #2 movement balance  

## Evidence (high confidence)

- **Strength rest:** ACSM and NSCA guidelines prescribe **~3–5 minutes** between sets for heavy compound strength work to restore phosphagen stores and sustain load.
- **Session structure:** Limiting **multiple maximal hinge/squat exposures** in one session reduces redundant fatigue and lumbar/overuse risk; programming texts typically emphasize **1–2 primary lower patterns** plus accessories rather than stacking many heavy compounds.

## Implementation

1. **`resolveRest`:** When the prescription style’s rest range is wide (`max − min ≥ 120` seconds, typical of heavy strength), bias the resolved rest **toward the upper end** of the range. Hypertrophy styles (narrow 60–90 s band) are unchanged.
2. **`DEFAULT_SELECTION_CONFIG.max_heavy_compounds_per_session`:** Reduced from **4 → 3** for squat/hinge exercises with **high** fatigue cost. Climbing-specific overrides in `sessionAssembler` (already stricter) unchanged.

## Tests

- `logic/workoutIntelligence/prescription/setRepResolver.test.ts`
- `logic/workoutIntelligence/scoring/movementBalanceGuardrails.test.ts`

## Risks / rollback

- **Rest:** Slightly longer prescribed rests for strength blocks; users on short-duration sessions already shorten via duration tier bias — monitor UX copy if needed.
- **Heavy cap:** Rare sessions that previously allowed four heavy compounds may drop one; revert `max_heavy_compounds_per_session` to 4 if selection failure rates increase.

## Sources

- ACSM position stand / resistance training guidelines (rest for maximal strength).
- NSCA Essentials of Strength Training and Conditioning (session organization and compound volume).
