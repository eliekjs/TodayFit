/**
 * Diagnostic aggregates for prefill trust tiers (movement + equipment focus).
 */

import { incrementCount, sortedCountEntries } from "./summaryStats";
import type { PrefillDiagnosticsArtifact, ExercisePrefillRecord, PrefillTrustTier } from "./types";
import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "./enums";

function bumpTier(
  map: Record<string, Partial<Record<PrefillTrustTier, number>>>,
  key: string,
  tier: PrefillTrustTier
) {
  const row = map[key] ?? {};
  row[tier] = (row[tier] ?? 0) + 1;
  map[key] = row;
}

/**
 * Build diagnostics artifact for QA and phase 3 handoff.
 */
export function computePrefillDiagnostics(records: ExercisePrefillRecord[]): PrefillDiagnosticsArtifact {
  const movement_pattern_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>> = {};
  const primary_role_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>> = {};
  const equipment_class_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>> = {};

  const mixedReasons: Record<string, number> = {};
  const lockedComboKeys: Record<string, number> = {};
  const lockedComboDetail = new Map<
    string,
    { movement_patterns: string[]; sources: string; reason_codes: string }
  >();

  for (const rec of records) {
    const p = rec.prefill;

    if (p.movement_patterns?.trust_tier) {
      const tier = p.movement_patterns.trust_tier;
      for (const mp of p.movement_patterns.value) {
        bumpTier(movement_pattern_counts_by_tier, mp, tier);
      }
      if (tier === "locked") {
        const sources = [...new Set(p.movement_patterns.sources)].sort().join("+");
        const rc = [...new Set(p.movement_patterns.reason_codes)].sort().join("|");
        const key = `${p.movement_patterns.value.join(",")}::${sources}::${rc}`;
        incrementCount(lockedComboKeys, key, 1);
        if (!lockedComboDetail.has(key)) {
          lockedComboDetail.set(key, {
            movement_patterns: [...p.movement_patterns.value],
            sources,
            reason_codes: rc,
          });
        }
      }
    }

    if (p.primary_role?.trust_tier) {
      bumpTier(primary_role_counts_by_tier, p.primary_role.value, p.primary_role.trust_tier);
    }

    if (p.equipment_class?.trust_tier) {
      bumpTier(equipment_class_counts_by_tier, p.equipment_class.value, p.equipment_class.trust_tier);
      if (p.equipment_class.value === "mixed") {
        for (const c of p.equipment_class.reason_codes) incrementCount(mixedReasons, c, 1);
      }
    }
  }

  const mixed_equipment = {
    count: records.filter((r) => r.prefill.equipment_class?.value === "mixed").length,
    reason_counts: sortedCountEntries(mixedReasons).map(({ key, count }) => ({ reason_code: key, count })),
  };

  const locked_movement_pattern_source_reason_combos = sortedCountEntries(lockedComboKeys)
    .map(({ key, count }) => {
      const d = lockedComboDetail.get(key)!;
      return {
        key,
        movement_patterns: d.movement_patterns,
        sources: d.sources,
        reason_codes: d.reason_codes,
        count,
      };
    })
    .slice(0, 40);

  return {
    schema_version: EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    exercise_count: records.length,
    movement_pattern_counts_by_tier,
    primary_role_counts_by_tier,
    equipment_class_counts_by_tier,
    mixed_equipment,
    locked_movement_pattern_source_reason_combos,
  };
}

export type TrustTierFieldSummary = {
  movement_patterns: Record<PrefillTrustTier, number>;
  primary_role: Record<PrefillTrustTier, number>;
  equipment_class: Record<PrefillTrustTier, number>;
};

function emptyTier(): Record<PrefillTrustTier, number> {
  return { locked: 0, strong_prior: 0, weak_prior: 0 };
}

/** Per-field counts of exercises that received each trust tier (one tier per field per exercise). */
export function computeTrustTierFieldSummary(records: ExercisePrefillRecord[]): TrustTierFieldSummary {
  const movement_patterns = emptyTier();
  const primary_role = emptyTier();
  const equipment_class = emptyTier();

  for (const r of records) {
    const p = r.prefill;
    if (p.movement_patterns?.trust_tier) movement_patterns[p.movement_patterns.trust_tier] += 1;
    if (p.primary_role?.trust_tier) primary_role[p.primary_role.trust_tier] += 1;
    if (p.equipment_class?.trust_tier) equipment_class[p.equipment_class.trust_tier] += 1;
  }

  return { movement_patterns, primary_role, equipment_class };
}

export function formatTrustTierSummaryMarkdown(s: TrustTierFieldSummary): string {
  const lines: string[] = [];
  lines.push(`## Trust tier coverage (exercises with each field assigned)`);
  lines.push(`| Field | locked | strong_prior | weak_prior |`);
  lines.push(`| --- | ---: | ---: | ---: |`);
  lines.push(
    `| movement_patterns | ${s.movement_patterns.locked} | ${s.movement_patterns.strong_prior} | ${s.movement_patterns.weak_prior} |`
  );
  lines.push(`| primary_role | ${s.primary_role.locked} | ${s.primary_role.strong_prior} | ${s.primary_role.weak_prior} |`);
  lines.push(
    `| equipment_class | ${s.equipment_class.locked} | ${s.equipment_class.strong_prior} | ${s.equipment_class.weak_prior} |`
  );
  lines.push(``);
  lines.push(`Complexity and sport_transfer_tags are never \`locked\` in phase 2 (strong_prior or weak_prior only).`);
  lines.push(``);
  return lines.join("\n");
}

export function formatPrefillDiagnosticsMarkdown(d: PrefillDiagnosticsArtifact): string {
  const lines: string[] = [];
  lines.push(`# Prefill diagnostics (movement + equipment trust)`);
  lines.push(``);
  lines.push(`- **Exercises:** ${d.exercise_count}`);
  lines.push(`- **Mixed equipment rows:** ${d.mixed_equipment.count}`);
  lines.push(``);
  lines.push(`## Movement patterns × trust tier (counts per pattern slug)`);
  const mpKeys = Object.keys(d.movement_pattern_counts_by_tier).sort();
  for (const pat of mpKeys) {
    const row = d.movement_pattern_counts_by_tier[pat]!;
    lines.push(`- **${pat}:** locked ${row.locked ?? 0} | strong ${row.strong_prior ?? 0} | weak ${row.weak_prior ?? 0}`);
  }
  lines.push(``);
  lines.push(`## Primary role × trust tier`);
  for (const role of Object.keys(d.primary_role_counts_by_tier).sort()) {
    const row = d.primary_role_counts_by_tier[role]!;
    lines.push(`- **${role}:** locked ${row.locked ?? 0} | strong ${row.strong_prior ?? 0} | weak ${row.weak_prior ?? 0}`);
  }
  lines.push(``);
  lines.push(`## Equipment class × trust tier`);
  for (const ec of Object.keys(d.equipment_class_counts_by_tier).sort()) {
    const row = d.equipment_class_counts_by_tier[ec]!;
    lines.push(`- **${ec}:** locked ${row.locked ?? 0} | strong ${row.strong_prior ?? 0} | weak ${row.weak_prior ?? 0}`);
  }
  lines.push(``);
  lines.push(`## Mixed equipment — reason codes`);
  for (const { reason_code, count } of d.mixed_equipment.reason_counts.slice(0, 25)) {
    lines.push(`- ${reason_code}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Locked movement patterns — top source/reason combinations`);
  for (const row of d.locked_movement_pattern_source_reason_combos.slice(0, 25)) {
    lines.push(`- **${row.count}×** \`${row.movement_patterns.join(",")}\` | sources: ${row.sources} | ${row.reason_codes}`);
  }
  lines.push(``);
  return lines.join("\n");
}
