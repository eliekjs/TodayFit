# Phase 0 proof — 2026-07-12

## Exit criteria (SHIP_SPEC)

> This spec + gap register exist; PRODUCT_PRIORITIES / MIGRATION auth & inventory drift corrected

## Evidence

| Criterion | Proof |
|-----------|--------|
| Ship Spec exists | [docs/SHIP_SPEC.md](../SHIP_SPEC.md) — in/out bar, phase exit proofs, guest durability **out** |
| Gap register exists | [docs/SHIP_GAP_REGISTER.md](../SHIP_GAP_REGISTER.md) — G0–G5; G2.5 guest durability `wont_fix_v1` |
| Auth not overstated as built | PRODUCT_PRIORITIES: **Auth / sync** under Partially built (welcome preview-only) |
| MIGRATION inventory current | MIGRATION.md Phase 0 lists AsyncStorage keys + Supabase sync + guest ephemeral |

## Commands

```bash
test -f docs/SHIP_SPEC.md && test -f docs/SHIP_GAP_REGISTER.md && echo OK
rg -n "Auth / sync" docs/PRODUCT_PRIORITIES.md
rg -n "AsyncStorage" MIGRATION.md
rg -n "wont_fix_v1" docs/SHIP_GAP_REGISTER.md
```

## Verdict

**Phase 0 COMPLETE.**
