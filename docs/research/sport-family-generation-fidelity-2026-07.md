# Sport-family generation fidelity (stratified)

**Date:** 2026-07-12  
**Subsystem:** Sport-prep sub-focus → generated session intent fidelity (family contracts)  
**Scope:** FAMILY-based contracts (jump, COD, speed, pull-grip, endurance prep, stability) with stratified samples — not one contract per sport×sub.

---

## 1. Research question

When a user picks a sport + flagship sub-focus, does the generated session show family-appropriate transfer work (e.g. plyos for vertical jump, COD drills for change_of_direction, pull/grip for climbing)?

---

## 2. Sources

| Source | Type | Key claim |
|--------|------|-----------|
| NSCA Essentials — plyometric / agility taxonomy | Tier 1 | Jump, COD, and sprint are separable qualities |
| ACSM Guidelines — endurance | Tier 1 | Aerobic base / hill endurance distinct from power days |
| Prior Manual fidelity note | Internal | `docs/research/sub-goal-generation-fidelity-2026-07.md` pattern for contracts |

**Classification:** High-confidence for family definitions; context-dependent for hotel equipment substitutions.

---

## 3. Method

1. **Contracts** — `data/sportSubFocus/sportFamilyIntentContracts.ts` defines shared matchers + stratified samples (category × flagship × gym × seeds).
2. **Harness** — `scripts/auditSportSubGoalGenerationFidelity.ts`.
3. **Vitest** — `logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts`.

---

## 4. Why families (not 164 one-offs)

Sport catalog has many sports × many subs. Product ship bar needs a **stratified gate**: one matcher per transfer family, sampled across representative sports and equipment profiles. Per-sport one-offs would fork and drift.

---

## 5. Validation

```bash
npx tsx scripts/auditSportSubGoalGenerationFidelity.ts
npx vitest run logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts
```

---

## Rollback

Revert `sportFamilyIntentContracts.ts`, fidelity evaluate/test/audit scripts, and vitest include globs.
