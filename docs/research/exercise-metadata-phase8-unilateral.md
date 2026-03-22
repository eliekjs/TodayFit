# Phase 8 — Unilateral flag

**Subsystem:** Ontology field `unilateral: true` on generator exercises. Canonical `isCanonicalUnilateral` only treats explicit true as unilateral, so inference closes the gap for variety scoring (`scoreUnilateralVariety`).

**Date:** 2025-03-21

## Sources

- **PHASE4 annotation conventions §7** (internal): single-limb or asymmetric movements get `unilateral: true`.
- **NSCA ESSENTIALS** (textbook tier 1–2): single-leg and offset-load exercises are standard in program design; we use this only to justify tagging, not injury claims.
- **NATA ACL prevention literature** (tier 2): context that single-limb strength appears in multicomponent programs; we do not prescribe rehab.

## Policy

- Infer **true** only on clear id/name/tag cues; never infer **false**.
- Skip merge when `unilateral` is already a boolean.
- Implementation: `lib/exerciseMetadata/phase8UnilateralInference.ts`
