# Conditioning intent pool expansion (June 2026)

## Subsystem

Sport Conditioning / Endurance intent block selection — pool size, tag coverage, and anti-repeat variety for `intervals_hiit`, `hills`, `sprint`, `threshold_tempo`, plyometric/power intents.

## Evidence summary

| Intent | Representative exercises (consensus / coaching practice) | Sources |
|--------|----------------------------------------------------------|---------|
| **intervals_hiit** | Burpees, KB swings, battle ropes, jump rope, mountain climbers; sprint drills (A/B skip, shuttles) for short work/rest | Metcon practice; sprint drill literature |
| **sprint** | A-skip, B-skip, acceleration starts (2-/3-point), pro shuttle, build-up sprints, resisted sprints | [Australian Athletics coaching](https://coachathletics.com.au/coaching-education/rethinking-the-role-of-a-and-b-skipsin-improving-sprinting-performance), [NSCA sprint prep](https://www.nsca.com) |
| **hills** | Hill sprints, incline treadmill, stair climber, sled push/drag, walking lunges | [Sportsmith hill sprints](https://www.sportsmith.co/articles/hill-sprints-for-acceleration-and-speed-development), NSCA stair-climb research |
| **lower_body_power_plyos / vertical_jump** | Box jump, tuck jump, broad jump, bounds, depth/rebound jumps | [Physiopedia plyometrics](https://www.physio-pedia.com/Plyometrics), PJT meta-analyses |
| **olympic_triple_extension** | Power clean, hang snatch, push jerk | NSCA Olympic lifting progressions |
| **threshold_tempo** | Tempo runs, cruise intervals, erg threshold pieces | Endurance coaching consensus |

**Classification:** High-confidence that intent-specific pools should include exercises coaches actually prescribe for that intent. Context-dependent: exact tag assignment on multi-use ergs (rower/bike) — steady vs interval variants.

## Gap analysis (before)

- `buildIntervalsHIITMain` (and sibling intent builders) gated on `modality === "conditioning"` only → excluded ~395 `intervals_hiit`-tagged power/strength exercises.
- Only **17/95** conditioning exercises carried `intervals_hiit`; **78** OTA sprint drills untagged.
- Phase-4 inference auto-tagged all rowers/bikes with `intervals_hiit`, polluting HIIT pools with steady-state machines.
- `pickConditioningExercise` used uniform random — no regeneration penalty.

## Implementation

1. **`conditioningPoolBuilder.ts`** — widened modality gate (`conditioning` \| `power` \| direct intent tag); soft signal fallback when direct tag pool < 12; weighted anti-repeat picker.
2. **`data/conditioningIntentEnrichment.ts`** — curated `attribute_tags_append` for sprint drills, hills, plyos, Olympic derivatives, HIIT staples.
3. **`phase4ConditioningIntentInference.ts`** — stop default `intervals_hiit` on steady ergs; require explicit interval/sprint name signals.
4. **`dailyGenerator.ts`** — all conditioning intent main blocks + finisher use shared pool builder and pick context.

## Threshold modalities added (June 2026 follow-up)

Evidence-backed threshold formats (tempo run, cruise intervals, erg threshold / sweet-spot):
- Treadmill Tempo Run, Treadmill Cruise Intervals
- Rower Threshold Intervals, Bike Threshold / Sweet Spot, Ski Erg Threshold Intervals
- Outdoor Tempo Run (OTA catalog)

Hill treadmill additions: Incline Treadmill Walk, Incline Treadmill Run, Treadmill Hill Sprints,
Stair Climber Hill Repeats.

Zone 2 is steady work below LT1 (~60–70% max HR, conversational). Threshold/tempo is
moderate–hard sustained work at or near LT2 / FTP (often “comfortably hard”, not all-out
sprints). Steady `zone2_bike` / `zone2_rower` entries stay **`zone2_aerobic_base` only**;
they are not tagged `threshold_tempo`. See Concept2 / TrainingPeaks zone guidance.

- Wider pools may occasionally surface less familiar FF/OTA drill names — mitigated by equipment filtering and anti-repeat weighting.
- Rollback: revert `conditioningPoolBuilder` wiring and enrichment import in adapter.

## Deferred

- Separate steady vs interval exercise records for ergs (e.g. `rower_intervals` vs `zone2_rower`).
- Session-level “no repeat same family” cap for sprint drills.

## Pool audit follow-up (June 2026)

**Threshold leak:** OTA sprint drills carried `lactate_threshold` tags; `exerciseHasSubFocusSlug` treated that as `threshold_tempo`. Fixed via `exerciseLooksLikeSprintDrill()` gate and hill-sprint exclusion.

**Hills false positives:** Generic `incline` name match pulled incline bench/press. Tightened legacy hill matcher and pool-builder signals.

**Vertical jump / plyos:** Expanded phase-4 vertical cues and curated enrichment for core-pool jump IDs (tuck/squat/pogo/hurdle variants).

**Sport sub-focus:** `sportSubFocusEnrichment.ts` tags core-pool staples (`bear_crawl`, scapular drills, woodchops) with `core_stability` / `core_anti_rotation`; steady treadmill work with `aerobic_base` / `zone2_cardio`. Promoted `zone2_treadmill`, curated treadmill threshold/hill entries, and `dead_bug` to `eligible_core` in `generator-eligibility-by-id.json` so default-tier sessions can access them.
