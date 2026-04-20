/**
 * Phase 2 — refine equipment_class trust/value when structured assignment contradicts name/slug implement signals.
 */

import type {
  CatalogExerciseRow,
  ExercisePrefillBlock,
  PrefillFieldAssignment,
  PrefillSource,
  PrefillTrustTier,
} from "./types";
import type { CurationEquipmentClass } from "./enums";
import { inferEquipmentFromCatalogAndText } from "./equipmentNameHint";

export type EquipmentLockRefinementEvent =
  | {
      kind: "replaced_bodyweight_with_implement_hint";
      exercise_id: string;
      previous_value: "bodyweight";
      new_value: CurationEquipmentClass;
      hint: CurationEquipmentClass;
      previous_tier: PrefillTrustTier;
    }
  | {
      kind: "downgraded_lock_tier_mismatch";
      exercise_id: string;
      assigned: CurationEquipmentClass;
      hint: CurationEquipmentClass;
    }
  | {
      kind: "downgraded_lock_bodyweight_text_vs_loaded";
      exercise_id: string;
      assigned: CurationEquipmentClass;
      hint: "bodyweight";
    };

function uniqSources(s: readonly string[]): string[] {
  return [...new Set(s)];
}

/**
 * After trust tiers are applied: fix bad locked bodyweight, downgrade locks when name/slug disagrees.
 */
export function refineEquipmentClassAfterTrustTiers(
  row: CatalogExerciseRow,
  prefill: ExercisePrefillBlock,
  log?: (e: EquipmentLockRefinementEvent) => void
): ExercisePrefillBlock {
  const eq = prefill.equipment_class;
  if (!eq) return prefill;

  const hint = inferEquipmentFromCatalogAndText(row.equipment ?? [], row.id, row.name ?? "");
  const tier = eq.trust_tier ?? "weak_prior";
  const codes = [...eq.reason_codes];

  if (!hint) return prefill;

  if (hint === eq.value) return prefill;

  // Bodyweight in assignment but name/slug clearly names a loaded implement first in EQUIP_ORDER
  if (eq.value === "bodyweight" && hint !== "bodyweight") {
    const next: PrefillFieldAssignment<CurationEquipmentClass> = {
      ...eq,
      value: hint,
      confidence: Math.max(0.88, Math.min(0.93, eq.confidence)),
      /** Drop misleading slug-only codes (e.g. equipment_slug_bodyweight) so trust recompute / audits stay coherent. */
      reason_codes: uniqSources([
        "equipment_bodyweight_catalog_slug_overridden_by_name_slug_implement",
        `equipment_prefill_resolved_implement_hint_${hint}`,
      ]),
      trust_tier: "strong_prior",
      sources: uniqSources([...(eq.sources ?? []), "name"]) as PrefillSource[],
    };
    log?.({
      kind: "replaced_bodyweight_with_implement_hint",
      exercise_id: row.id,
      previous_value: "bodyweight",
      new_value: hint,
      hint,
      previous_tier: tier,
    });
    return { ...prefill, equipment_class: next };
  }

  // Text implies bodyweight but structured assignment is a loaded implement — do not keep "locked"
  if (hint === "bodyweight" && eq.value !== "bodyweight" && tier === "locked") {
    const next: PrefillFieldAssignment<CurationEquipmentClass> = {
      ...eq,
      trust_tier: "strong_prior",
      reason_codes: uniqSources([
        ...codes,
        "equipment_lock_downgraded_bodyweight_text_signal_versus_structured_loaded_implement",
      ]),
    };
    log?.({
      kind: "downgraded_lock_bodyweight_text_vs_loaded",
      exercise_id: row.id,
      assigned: eq.value,
      hint: "bodyweight",
    });
    return { ...prefill, equipment_class: next };
  }

  // Two different non-bodyweight signals (structured vs text) — do not lock a single implement
  if (tier === "locked" && eq.value !== "bodyweight" && hint !== "bodyweight") {
    const next: PrefillFieldAssignment<CurationEquipmentClass> = {
      ...eq,
      trust_tier: "strong_prior",
      reason_codes: uniqSources([
        ...codes,
        "equipment_lock_downgraded_name_slug_hint_conflicts_with_structured_class",
        `equipment_name_slug_hint_${hint}`,
      ]),
    };
    log?.({
      kind: "downgraded_lock_tier_mismatch",
      exercise_id: row.id,
      assigned: eq.value,
      hint,
    });
    return { ...prefill, equipment_class: next };
  }

  return prefill;
}

export type EquipmentPrefillEquipmentAudit = {
  generated_at: string;
  exercise_count: number;
  refinement_events: EquipmentLockRefinementEvent[];
  counts: {
    replaced_bodyweight_with_hint: number;
    downgraded_lock_tier_mismatch: number;
    downgraded_lock_bodyweight_text_vs_loaded: number;
  };
  locked_equipment_by_primary_reason: { reason: string; count: number }[];
  sample_resolved_rows: {
    exercise_id: string;
    name: string | null;
    event: EquipmentLockRefinementEvent;
    equipment_after: PrefillFieldAssignment<CurationEquipmentClass> | undefined;
  }[];
};

export function buildEquipmentPrefillAudit(
  records: { exercise_id: string; prefill: ExercisePrefillBlock }[],
  rowsById: Map<string, CatalogExerciseRow>,
  events: EquipmentLockRefinementEvent[]
): EquipmentPrefillEquipmentAudit {
  const counts = {
    replaced_bodyweight_with_hint: 0,
    downgraded_lock_tier_mismatch: 0,
    downgraded_lock_bodyweight_text_vs_loaded: 0,
  };
  for (const e of events) {
    if (e.kind === "replaced_bodyweight_with_implement_hint") counts.replaced_bodyweight_with_hint += 1;
    else if (e.kind === "downgraded_lock_tier_mismatch") counts.downgraded_lock_tier_mismatch += 1;
    else if (e.kind === "downgraded_lock_bodyweight_text_vs_loaded") counts.downgraded_lock_bodyweight_text_vs_loaded += 1;
  }

  const reasonToCount = new Map<string, number>();
  for (const r of records) {
    const ec = r.prefill.equipment_class;
    if (ec?.trust_tier !== "locked") continue;
    const primary = ec.reason_codes[0] ?? "unknown";
    reasonToCount.set(primary, (reasonToCount.get(primary) ?? 0) + 1);
  }

  const locked_equipment_by_primary_reason = [...reasonToCount.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const sample_resolved_rows = events.slice(0, 40).map((event) => {
    const id = event.exercise_id;
    const row = rowsById.get(id);
    const rec = records.find((x) => x.exercise_id === id);
    return {
      exercise_id: id,
      name: row?.name ?? null,
      event,
      equipment_after: rec?.prefill.equipment_class,
    };
  });

  return {
    generated_at: new Date().toISOString(),
    exercise_count: records.length,
    refinement_events: events,
    counts,
    locked_equipment_by_primary_reason,
    sample_resolved_rows,
  };
}
