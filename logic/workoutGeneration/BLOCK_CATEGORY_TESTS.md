# Block category tests

Readable tests for **when** conditioning, accessory, and cooldown blocks appear and **what exercises** qualify.

## Run tests

```bash
# Unit tests — eligibility rules (no full generation)
npx vitest run logic/workoutGeneration/blockCategoryBehavior.test.ts

# Integration tests — full session generation for named scenarios
npx vitest run logic/workoutGeneration/blockCategoryGeneration.test.ts

# Both together
npx vitest run logic/workoutGeneration/blockCategoryBehavior.test.ts logic/workoutGeneration/blockCategoryGeneration.test.ts

# Lower-level eligibility (existing)
npx vitest run logic/workoutGeneration/blockSelectionEligibility.test.ts
```

## What each file covers

| File | Purpose |
|------|---------|
| `blockCategoryBehavior.test.ts` | **Unit tests** with readable `describe` blocks: policy for when conditioning is allowed, and positive/negative eligibility for Figure 8, Burpee, Tibialis Raise, Child's Pose, etc. |
| `blockCategoryGeneration.test.ts` | **Integration tests** — generates real workouts for diverse sport/manual scenarios; asserts block presence and rejects wrong-category exercises. |
| `blockSelectionEligibility.test.ts` | Original low-level eligibility tests (kept for regression). |

## Sim + test together

Human-readable reports (full catalog, app path):

```bash
# Sport — power / RSA / COD / sprint
npx tsx scripts/blockCategoryReview.ts 99123 soccer
npx tsx scripts/blockCategoryReview.ts 77201 lacrosse
npx tsx scripts/blockCategoryReview.ts 66440 volleyball
npx tsx scripts/blockCategoryReview.ts 88042 basketball
npx tsx scripts/blockCategoryReview.ts 88101 track

# Manual — hypertrophy, endurance, strength+conditioning, recovery
npx tsx scripts/blockCategoryReview.ts 55001 hypertrophy
npx tsx scripts/blockCategoryReview.ts 66001 endurance
npx tsx scripts/blockCategoryReview.ts 77001 strength_cond
npx tsx scripts/blockCategoryReview.ts 11111 recovery

# Pure strength baseline
npx tsx scripts/blockCategoryReview.ts 42001 strength
```

Scenario keys: `volleyball`, `basketball`, `soccer`, `lacrosse`, `strength`, `hypertrophy`, `endurance`, `strength_cond`, `track`, `recovery`.

JSON sim (same scenarios as user-simulation skill):

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts 66440 volleyball
```

## Scenario expectations (integration)

| Scenario | Conditioning | Accessory | Cooldown |
|----------|-------------|-----------|----------|
| Volleyball VJ lower 45min | yes | yes | yes (stretches, not tibialis) |
| Basketball VJ lower 45min | yes | yes | yes |
| Soccer repeat sprint lower 45min | maybe | yes | yes |
| Lacrosse COD full body 45min | maybe | yes | yes |
| Track sprint acceleration lower 45min | maybe | yes | maybe |
| Pure strength lower 30min | maybe | yes | yes |
| Upper hypertrophy chest+arms | no | yes | yes |
| Endurance primary 40min | yes | yes | yes |
| Strength + Sport Conditioning secondary | yes | yes | yes |
| Recovery mobility 30min | no | no | yes |

**Note:** Stub-pool integration tests and full-catalog `blockCategoryReview` can diverge on cooldown/accessory presence for the same seed (duration budget + template differ). Compare both when judging product behavior.

## Key rejection rules (unit tests)

- **Conditioning:** Figure 8 / COD drills excluded even with `aerobic_zone2` tag; Burpee / assault bike / rower included.
- **Cooldown:** Child's Pose / couch stretch included; Tibialis Raise / calf raise excluded.
- **Accessory:** Bulgarian split squat / isolation strength included; stretches, metabolic finishers, and mobility-modality prehab (e.g. Tibialis Raise) excluded.
