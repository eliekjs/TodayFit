# Evidence review: Priority sports sub-focus mapping (7 sports)

**Date:** 2026-08-12  
**Subsystem:** Sport sub-focus → tag matching pools for surfing, xc skiing, soccer, trail running, alpine skiing, backcountry skiing, snowboarding  
**Agent run:** manual (pilot priority build-up)

---

## 1. Research question

What evidence-backed tags and staple movements should map into each priority sport’s sub-focuses so Your Gym filtered pools exceed the weak threshold (>12 matches), without bloating `eligible_core` far past ~1000?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Berg & Eiken / alpine eccentric literature (via NSCA snow sports S&C) | Tier 2–3 | NSCA / snow sports reviews | Alpine skiing is eccentric-quad dominant; slow absorption and single-leg control matter |
| NSCA SCJ freestyle snowboarding S&C plan (2021) | Tier 2 | journals.lww.com/nsca-scj | Snowboarders need lower-body eccentric strength, RFD, rotational/anti-rotation trunk, landing mechanics |
| BJSM / hamstring injury meta-analyses (Nordic + eccentric) | Tier 1–2 | BJSM Nordic hamstring literature | Eccentric hamstring training (incl. Nordics) ~halves hamstring injury risk in field sports |
| ACSM cardiorespiratory position / modality guidance | Tier 1 | ACSM Q&Q exercise | Continuous rhythmic modalities (walk, bike, row, elliptical, stair, XC ski analogs) build aerobic fitness when intensity/duration are appropriate |
| Cleveland Clinic / practitioner Zone 2 summaries | Tier 3 | health.clevelandclinic.org | Zone 2 = conversational effort; walk, bike, row, elliptical are valid modes |
| XC skiing strength reviews (IJERPH 2022; DP upper-body strength) | Tier 1–2 | PMC9179959, PMC6716506 | Aerobic base remains central; maximal upper-body strength improves double-poling economy/performance |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- Tag alpine `eccentric_control` with `eccentric_strength` / `eccentric_quad_strength` (not display-slug tags). Source: alpine eccentric literature. Implemented: `data/sportSubFocusEnrichment.ts` + existing `subFocusTagMap.ts`.
- Tag soccer `hamstring_resilience` with `hamstrings` + `eccentric_strength` on Nordics/RDLs/leg curls. Source: BJSM Nordic metas. Implemented: enrichment staples.
- Tag shared `aerobic_base` with `zone2_cardio` + `aerobic_base` on steady cardio staples (bike, treadmill, rower, elliptical, stair, ski erg, incline walk). Source: ACSM modality list + Zone 2 practice. Implemented: enrichment + static catalog staples + eligibility promotions.
- Expand Your Gym defaults to include assault bike / rower / ski erg / stair / elliptical so cardio isn’t equipment-gated out. Implemented: `data/gymProfiles.ts`.

### Context-dependent heuristics (implemented)

- Snowboarding engine emphasizes eccentric + lateral + balance (NSCA snowboard S&C). Implemented: `sportDefinitions.ts` snowboarding entry.
- XC skiing engine emphasizes aerobic + double-pole upper pull endurance. Implemented: `sportDefinitions.ts` xc_skiing engine.
- Surfing engine emphasizes paddle endurance, pop-up power, rotation, shoulder stability, balance. Implemented: `sportDefinitions.ts` surfing engine.

### Speculative / deferred

- Further snow-family session distinctness polish (`auditSportPatternDistinctness`) after invite feedback.
- DB `sport_*` tags still not used as primary matcher — leave unused.

---

## 4. Implementation summary

| Change | Location |
|--------|----------|
| Map-aligned enrichment tags + staple ID lists | `data/sportSubFocusEnrichment.ts` |
| Static Zone-2 / steady cardio staples | `data/exercises.ts` |
| Eligibility promotions for missing static cardio IDs | `data/generator-eligibility-by-id.json` (+ live DB) |
| Snowboard / XC / surfing engines | `data/sportSubFocus/sportDefinitions.ts` |
| Cardio equipment on Your Gym | `data/gymProfiles.ts` |
| Flip 7 sports into pilot allowlist | `lib/pilotCatalog.ts`, migration `20260812220000_pilot_sports_priority_buildup_on.sql` |

**Gate result (Your Gym, 2026-08-12):** all 7 sports’ sub-focuses **ok** (0 critical, 0 weak). Shared `aerobic_base` ≈ 20 matches.

**Follow-up (2026-08-13):** Full pilot allowlist (19 sports, 108 sub-focus chips) re-audited. Remaining weak holes — football `grip_endurance` (8), climbing `finger_strength` (11), cycling `vo2_intervals` (12) — cleared via enrichment (`grip`/`carry` alignment, hang/pull staples, VO₂ interval tags) + sprint-interval eligibility promotions. Re-audit: **108/108 ok**.

---

## 5. Risks / rollback

- Core eligibility count rose slightly (~1000 → ~1007) from cardio staple promotions — monitor bloat.
- Static catalog now duplicates some DB-only cardio names; keep slugs aligned with Supabase.
- Rollback sports: remove from `PILOT_SPORT_SLUGS` and set `is_active=false` for the 7.

---

## 6. Follow-ups

- Run `auditSportSubGoalGenerationFidelity.ts` on the 7 sports under CI time budget.
- Invite order: trail / alpine → soccer → surfing → snowboard / backcountry / xc.
