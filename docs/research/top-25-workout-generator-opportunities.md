# Top 25 Workout Generator Implementation Opportunities

Audit date: 2025-03. Ordered by value and feasibility. Each item: title, why it matters, impacted files, metadata needs, daily/weekly/both, difficulty, user impact.

---

1. **User level (beginner) in prescription**
   - **Why:** Beginners need fewer sets and clearer cues to avoid overload and confusion.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (getPrescription), `logic/workoutGeneration/types.ts` (StylePrefs already has user_level).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Medium.
   - **User impact:** High for beginners.

2. **Low-energy: reduce main block exercise count**
   - **Why:** Low energy sessions should be shorter in volume; we scale sets but not number of exercises.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildMainStrength, buildMainHypertrophy).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Easy.
   - **User impact:** Medium.

3. **Warmup count by duration**
   - **Why:** 20 min session needs minimal warmup; 60 min can use 3 items. Fixed 2 is one-size-fits-all.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildWarmup).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Easy.
   - **User impact:** Medium.

4. **Weekly: pass style_prefs to daily input**
   - **Why:** Avoid tags, Zone 2 preference, and user level should apply to each day when generating a week.
   - **Impacted:** `logic/workoutIntelligence/weekly/weeklyTypes.ts`, `logic/workoutIntelligence/weekly/weeklyDailyGeneratorBridge.ts`, callers of weekly planner.
   - **New metadata:** No.
   - **Scope:** Weekly.
   - **Difficulty:** Easy.
   - **User impact:** High (consistency across week).

5. **Main strength compound min by duration**
   - **Why:** 30 min session cannot fit 2 heavy compounds + accessory well; allow 1 compound.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildMainStrength).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Easy.
   - **User impact:** Medium (short sessions).

6. **Conditioning block format by goal**
   - **Why:** Endurance/body recomp may want steady straight_sets; conditioning goal may want circuit/AMRAP from goal rules.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (conditioning block creation), `lib/generation/prescriptionRules.ts` (conditioningFormats).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Easy.
   - **User impact:** Medium (goal alignment).

7. **Cooldown preferred targets when no mobility requirement**
   - **Why:** Even without mobility secondary goal, cooldown can target areas worked (main work families) for better recovery.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildCooldown).
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Easy.
   - **User impact:** Medium.

8. **Block titles for main and conditioning**
   - **Why:** UI shows block titles; main_strength, main_hypertrophy, conditioning often lack title/reasoning.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildMainStrength, buildMainHypertrophy, conditioning blocks).
   - **New metadata:** No.
   - **Scope:** Daily + weekly (output).
   - **Difficulty:** Easy.
   - **User impact:** Medium (clarity).

9. **Endurance rep range and prescription branch**
   - **Why:** Endurance goal has 15–25 rep range in rules; getPrescription should have explicit endurance branch for support work.
   - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts`, `lib/generation/prescriptionRules.ts`.
   - **New metadata:** No.
   - **Scope:** Daily.
   - **Difficulty:** Medium.
   - **User impact:** High for endurance users.

10. **Secondary goal scoring weight in selection**
    - **Why:** Secondary goals (e.g. mobility) affect cooldown but not main block exercise ranking; soft boost could improve fit.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (scoreExercise), `logic/workoutGeneration/ontologyScoring.ts`.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

11. **Injury string normalization and mapping**
    - **Why:** User-facing injury phrases must map to canonical contraindication/joint_stress tags so no violations slip through.
    - **Impacted:** `lib/workoutRules.ts`, `logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts`.
    - **New metadata:** Optional: extend INJURY_AVOID_TAGS / normalization table.
    - **Scope:** Both.
    - **Difficulty:** Easy.
    - **User impact:** High for injured users.

12. **Superset repair uses pairing score**
    - **Why:** Validator repair for superset violations picks any replacement; should prefer high pairing score.
    - **Impacted:** `logic/workoutIntelligence/validation/workoutValidator.ts`.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

13. **Movement pattern balance uses ontology patterns**
    - **Why:** balanceBonusForExercise uses legacy movement_pattern; movement_patterns give finer variety.
    - **Impacted:** `lib/generation/movementBalance.ts`, `logic/workoutGeneration/dailyGenerator.ts`.
    - **New metadata:** Exercises with movement_patterns (already optional).
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

14. **Exercise-specific rep range in library**
    - **Why:** getEffectiveRepRange uses rep_range_min/max; more exercises (calves, isolation) should have them.
    - **Impacted:** Exercise seed/DB, `logic/workoutGeneration/exerciseStub.ts`.
    - **New metadata:** Yes (rep_range_min, rep_range_max on exercises).
    - **Scope:** Daily.
    - **Difficulty:** Easy.
    - **User impact:** Medium.

15. **Weekly day labels include duration**
    - **Why:** Session label e.g. "Upper hypertrophy" could be "Upper hypertrophy · 45 min" for clarity.
    - **Impacted:** `logic/workoutIntelligence/weekly/weeklyAllocation.ts`, `weeklyOrdering.ts`, types.
    - **New metadata:** No.
    - **Scope:** Weekly.
    - **Difficulty:** Easy.
    - **User impact:** Low–medium.

16. **No double grip in same superset (enforce in repair)**
    - **Why:** Pairing already forbids double grip; validator repair should not suggest a grip-heavy replacement for a grip pair.
    - **Impacted:** `logic/workoutIntelligence/validation/workoutValidator.ts`, supersetPairing.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Easy.
    - **User impact:** Medium (safety/climbing).

17. **Block order by goal**
    - **Why:** Goal rules have blockOrder (e.g. conditioning first for conditioning goal); not fully wired in flow.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts`, `lib/generation/prescriptionRules.ts`.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

18. **Preferred movement patterns for main block**
    - **Why:** preferredMovementPatterns in goal rules could bias selection for main_strength (e.g. squat, hinge, push, pull).
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (selectExercises or pool filter), prescriptionRules.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

19. **Sport tags in scoring**
    - **Why:** Sport prep mode should boost exercises with matching sport_tags when sports are in input.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (scoreExercise), types (sport_slugs on input).
    - **New metadata:** Yes (sport_tags on exercises, already exists in tags).
    - **Scope:** Daily + weekly.
    - **Difficulty:** Medium.
    - **User impact:** High for sport prep.

20. **Fatigue region variety tuning**
    - **Why:** We already track sessionFatigueRegions and score; tune weights so we don’t triple same region.
    - **Impacted:** `logic/workoutGeneration/ontologyScoring.ts`, `dailyGenerator.ts`.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Easy.
    - **User impact:** Medium.

21. **RPE or intent in coaching cues**
    - **Why:** Cues could include "RPE 8" or "leave 1–2 in the tank" when goal/level suggests it.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (getPrescription), prescriptionRules cueStyle.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Medium.

22. **Weekly: avoid same session type on consecutive days**
    - **Why:** Ordering already has some swap; explicitly avoid e.g. two upper hypertrophy days back-to-back.
    - **Impacted:** `logic/workoutIntelligence/weekly/weeklyOrdering.ts`, weeklyAllocation.
    - **New metadata:** No.
    - **Scope:** Weekly.
    - **Difficulty:** Easy.
    - **User impact:** Medium.

23. **Tempo or intent from prescription styles**
    - **Why:** PrescriptionStyle has intent_guidance; getPrescription doesn’t use it for cues.
    - **Impacted:** `logic/workoutIntelligence/prescription/`, `dailyGenerator.ts`.
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Medium.
    - **User impact:** Low–medium.

24. **Exercise role “finisher” placement**
    - **Why:** Exercises with role finisher could be placed last in main_hypertrophy block.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts`, ontology.
    - **New metadata:** Yes (exercise_role already exists).
    - **Scope:** Daily.
    - **Difficulty:** Easy.
    - **User impact:** Low.

25. **Calisthenics equipment preference**
    - **Why:** When goal is calisthenics, strongly prefer bodyweight; ensure filter doesn’t exclude.
    - **Impacted:** `logic/workoutGeneration/dailyGenerator.ts` (buildMainHypertrophy already has bodyweight preference).
    - **New metadata:** No.
    - **Scope:** Daily.
    - **Difficulty:** Easy.
    - **User impact:** Niche (calisthenics users).
