/**
 * Deterministic prefill rules for exercise curation (phase 2).
 * Safe: read-only over catalog rows; does not assign keep_category or generator_state.
 */

import type {
  CatalogExerciseRow,
  ExercisePrefillBlock,
  ExercisePrefillRecord,
  PrefillFieldAssignment,
  PrefillRunOptions,
  PrefillRunStats,
  PrefillSource,
} from "./types";
import type {
  CurationComplexity,
  CurationEquipmentClass,
  CurationMovementPattern,
  CurationPrimaryRole,
  CurationSportTransferTag,
} from "./enums";
import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "./enums";
import {
  buildPrefillCatalogContext,
  DEFAULT_HIGH_CONFIDENCE,
  DEFAULT_MIN_CONFIDENCE,
  inferEquipmentClassFromNameFallback,
  inferEquipmentClassFromSlugs,
  inferSportTransferTags,
  mapLegacyPatternHint,
  mapOntologySlugToCurationMovement,
  type PrefillCatalogContext,
} from "./prefillRuleHelpers";
import { incrementCount, sortedCountEntries } from "./summaryStats";
import { applyTrustTiersToPrefillBlock } from "./prefillTrust";

const DEFAULT_OPTIONS: PrefillRunOptions = {
  min_confidence: DEFAULT_MIN_CONFIDENCE,
  high_confidence_threshold: DEFAULT_HIGH_CONFIDENCE,
};

type MovementNameRule = {
  pattern: RegExp;
  movement: CurationMovementPattern;
  confidence: number;
  reason_code: string;
};

/** Order matters: more specific patterns first (lunge before squat). */
const MOVEMENT_NAME_RULES: MovementNameRule[] = [
  { pattern: /split\s*squat|rfe|rear\s*foot|rear-foot|bulgarian|step[\s-]?up|cossack|walking\s*lunge|lunge(?! press)|single[\s-]?leg\s*squat/i, movement: "lunge", confidence: 0.9, reason_code: "name_keyword_lunge_family" },
  { pattern: /deadlift|rdl|romanian|good\s*morning|hip\s*hinge|hip\s*thrust|kb\s*swing|kettlebell\s*swing/i, movement: "hinge", confidence: 0.9, reason_code: "name_keyword_hinge_family" },
  { pattern: /goblet\s*squat|back\s*squat|front\s*squat|squat(?! jump)|hack\s*squat|leg\s*press/i, movement: "squat", confidence: 0.88, reason_code: "name_keyword_squat_family" },
  { pattern: /pull[\s-]?up|chin[\s-]?up|lat\s*pulldown|pulldown/i, movement: "vertical_pull", confidence: 0.9, reason_code: "name_keyword_vertical_pull" },
  { pattern: /\brow\b|bent[\s-]?over\s*row|one[\s-]?arm\s*row|cable\s*row|inverted\s*row/i, movement: "horizontal_pull", confidence: 0.88, reason_code: "name_keyword_horizontal_pull" },
  { pattern: /bench\s*press|push[\s-]?up|chest\s*press|floor\s*press|incline\s*press(?!.*overhead)/i, movement: "horizontal_push", confidence: 0.87, reason_code: "name_keyword_horizontal_push" },
  { pattern: /overhead\s*press|ohp|shoulder\s*press|strict\s*press|landmine\s*press|z\s*press/i, movement: "vertical_push", confidence: 0.88, reason_code: "name_keyword_vertical_push" },
  { pattern: /pallof|anti[\s-]?rotation|dead\s*bug|bird\s*dog/i, movement: "anti_rotation", confidence: 0.9, reason_code: "name_keyword_anti_rotation" },
  { pattern: /russian\s*twist|rotational\s*throw|rotation|cable\s*twist|woodchop/i, movement: "rotation", confidence: 0.86, reason_code: "name_keyword_rotation" },
  { pattern: /farmer|suitcase|waiter\s*carry|yoke|loaded\s*carry/i, movement: "carry", confidence: 0.87, reason_code: "name_keyword_carry" },
  { pattern: /bike|treadmill|rower|ski\s*erg|sled|shuttle|run\b|jog/i, movement: "locomotion", confidence: 0.84, reason_code: "name_keyword_locomotion" },
  { pattern: /plank|hollow\s*hold|wall\s*sit|iso\s*hold|isometric/i, movement: "isometric", confidence: 0.88, reason_code: "name_keyword_isometric" },
];

type PrimaryRoleRule = {
  test: (ctx: PrefillCatalogContext) => boolean;
  role: CurationPrimaryRole;
  confidence: number;
  reason_code: string;
  sources: PrefillSource[];
};

function modalitySet(ctx: PrefillCatalogContext): Set<string> {
  return new Set(ctx.modalities_lower);
}

function hasCardioEquipment(ctx: PrefillCatalogContext): boolean {
  return ctx.equipment_lower.some(
    (e) =>
      e.includes("treadmill") ||
      e.includes("bike") ||
      e.includes("rower") ||
      e.includes("erg") ||
      e.includes("stair") ||
      e.includes("elliptical") ||
      e === "ski_erg" ||
      e === "assault_bike"
  );
}

const PRIMARY_ROLE_RULES: PrimaryRoleRule[] = [
  {
    test: (ctx) => modalitySet(ctx).has("conditioning") && (hasCardioEquipment(ctx) || /bike|treadmill|rower|ski|sled|run|interval/i.test(ctx.norm_name)),
    role: "conditioning",
    confidence: 0.9,
    reason_code: "modalities_conditioning_plus_cardio_signal",
    sources: ["modalities", "equipment", "name"],
  },
  {
    test: (ctx) => modalitySet(ctx).has("mobility") || /\b(mobility|stretch|foam\s*roll)\b/i.test(ctx.norm_name),
    role: "mobility",
    confidence: 0.88,
    reason_code: "modality_or_name_mobility",
    sources: ["modalities", "name"],
  },
  {
    test: (ctx) =>
      ctx.ontology_exercise_role === "stretch" ||
      ctx.ontology_exercise_role === "mobility" ||
      ctx.ontology_exercise_role === "cooldown",
    role: "mobility",
    confidence: 0.9,
    reason_code: "ontology_exercise_role_mobility_family",
    sources: ["ontology_other"],
  },
  {
    test: (ctx) =>
      /\b(box\s*jump|plyo|jump|bounds|snatch|clean\b|jerk|med\s*ball\s*(slam|throw)|throw\b)/i.test(ctx.norm_name),
    role: "power_explosive",
    confidence: 0.86,
    reason_code: "name_power_or_plyo_pattern",
    sources: ["name"],
  },
  {
    test: (ctx) =>
      /\b(rotator\s*cuff|ankle\s*alphabet|mini\s*band|banded\s*activation|prehab|rehab)\b/i.test(ctx.combined_text),
    role: "injury_prevention",
    confidence: 0.84,
    reason_code: "name_or_tags_rehab_prehab",
    sources: ["name", "tags"],
  },
  {
    test: (ctx) =>
      /\b(plank|pallof|dead\s*bug|bird\s*dog|anti[\s-]?rotation|core\s*stability)\b/i.test(ctx.combined_text),
    role: "stability_core",
    confidence: 0.85,
    reason_code: "name_stability_core_pattern",
    sources: ["name"],
  },
  {
    test: (ctx) => ctx.ontology_unilateral === true || /\b(single[\s-]?leg|single[\s-]?arm|unilateral)\b/i.test(ctx.combined_text),
    role: "unilateral_strength",
    confidence: 0.82,
    reason_code: "ontology_unilateral_or_text_unilateral",
    sources: ["ontology_other", "name"],
  },
  {
    test: (ctx) =>
      /\b(curl|extension|fly|raise|lateral|triceps|biceps)\b/i.test(ctx.norm_name) &&
      !/\b(squat|deadlift|press|row|pull)\b/i.test(ctx.norm_name),
    role: "accessory_strength",
    confidence: 0.8,
    reason_code: "name_isolation_accessory_heuristic",
    sources: ["name"],
  },
  {
    test: (ctx) =>
      /\b(squat|deadlift|bench|press|row|pull[\s-]?up|hip\s*thrust|lunge)\b/i.test(ctx.norm_name) &&
      (ctx.equipment_lower.some((e) => e.includes("barbell")) || ctx.equipment_lower.includes("bodyweight")),
    role: "compound_strength",
    confidence: 0.82,
    reason_code: "name_compound_pattern_with_barbell_or_bw",
    sources: ["name", "equipment"],
  },
];

const COMPLEXITY_RULES: { pattern: RegExp; value: CurationComplexity; confidence: number; reason: string }[] = [
  { pattern: /\b(snatch|clean and jerk|muscle[\s-]?up|pistol\s*squat|overhead\s*squat)\b/i, value: "advanced", confidence: 0.88, reason: "name_advanced_lift_pattern" },
  { pattern: /\b(goblet\s*squat|assisted\s*pull|knee\s*push[\s-]?up|wall\s*sit|basic\s*squat)\b/i, value: "beginner_friendly", confidence: 0.85, reason: "name_beginner_staple_pattern" },
];

function tryMovementFromOntology(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationMovementPattern[]> | null {
  const mapped = ctx.ontology_movement_patterns
    .map(mapOntologySlugToCurationMovement)
    .filter((x): x is CurationMovementPattern => x != null);
  const unique = [...new Set(mapped)].sort();
  if (!unique.length) return null;
  return {
    value: unique,
    confidence: 0.91,
    reason_codes: ["ontology_movement_patterns_mapped"],
    sources: ["ontology_movement_patterns"],
  };
}

function tryMovementFromName(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationMovementPattern[]> | null {
  const hay = ctx.norm_name;
  const matched: { movement: CurationMovementPattern; confidence: number; reason: string }[] = [];
  for (const rule of MOVEMENT_NAME_RULES) {
    if (rule.pattern.test(hay)) {
      matched.push({ movement: rule.movement, confidence: rule.confidence, reason: rule.reason_code });
    }
  }
  if (!matched.length) return null;
  matched.sort((a, b) => b.confidence - a.confidence);
  const best = matched[0]!;
  return {
    value: [best.movement],
    confidence: best.confidence,
    reason_codes: [best.reason],
    sources: ["name"],
  };
}

function tryMovementFromLegacyDisambiguation(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationMovementPattern[]> | null {
  const hint = mapLegacyPatternHint(ctx.legacy_movement_pattern);
  if (!hint) return null;
  const n = ctx.norm_name;
  if (hint === "pull") {
    if (/row|bent over/i.test(n)) {
      return {
        value: ["horizontal_pull"],
        confidence: 0.8,
        reason_codes: ["legacy_pull_disambiguated_row"],
        sources: ["legacy_movement_pattern", "name"],
      };
    }
    if (/pull|chin|lat/i.test(n)) {
      return {
        value: ["vertical_pull"],
        confidence: 0.8,
        reason_codes: ["legacy_pull_disambiguated_vertical"],
        sources: ["legacy_movement_pattern", "name"],
      };
    }
  }
  if (hint === "push") {
    if (/overhead|ohp|shoulder press|strict press/i.test(n)) {
      return {
        value: ["vertical_push"],
        confidence: 0.8,
        reason_codes: ["legacy_push_disambiguated_vertical"],
        sources: ["legacy_movement_pattern", "name"],
      };
    }
    if (/bench|push up|push-up|chest press|floor press/i.test(n)) {
      return {
        value: ["horizontal_push"],
        confidence: 0.8,
        reason_codes: ["legacy_push_disambiguated_horizontal"],
        sources: ["legacy_movement_pattern", "name"],
      };
    }
  }
  return null;
}

function mergeMovementAssignments(
  primary: PrefillFieldAssignment<CurationMovementPattern[]> | null,
  secondary: PrefillFieldAssignment<CurationMovementPattern[]> | null
): PrefillFieldAssignment<CurationMovementPattern[]> | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;
  const set = new Set([...primary.value, ...secondary.value]);
  const value = [...set].sort();
  const confidence = Math.min(primary.confidence, secondary.confidence) * (value.length > Math.max(primary.value.length, secondary.value.length) ? 0.95 : 1);
  const reason_codes = [...new Set([...primary.reason_codes, ...secondary.reason_codes])];
  const sources = [...new Set([...primary.sources, ...secondary.sources])] as PrefillSource[];
  return { value, confidence, reason_codes, sources };
}

function assignMovementPatterns(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationMovementPattern[]> | null {
  const ont = tryMovementFromOntology(ctx);
  const name = tryMovementFromName(ctx);
  const legacy = tryMovementFromLegacyDisambiguation(ctx);

  let merged = mergeMovementAssignments(ont, name);
  merged = mergeMovementAssignments(merged, legacy);
  return merged;
}

function assignPrimaryRole(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationPrimaryRole> | null {
  let best: { role: CurationPrimaryRole; confidence: number; reason_codes: string[]; sources: PrefillSource[] } | null = null;
  for (const rule of PRIMARY_ROLE_RULES) {
    if (!rule.test(ctx)) continue;
    if (!best || rule.confidence > best.confidence) {
      best = { role: rule.role, confidence: rule.confidence, reason_codes: [rule.reason_code], sources: rule.sources };
    }
  }
  if (!best) return null;
  return {
    value: best.role,
    confidence: best.confidence,
    reason_codes: best.reason_codes,
    sources: best.sources,
  };
}

function assignEquipmentClass(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationEquipmentClass> | null {
  const fromEq = inferEquipmentClassFromSlugs(ctx.equipment_lower, ctx.norm_name);
  if (fromEq) {
    return {
      value: fromEq.equipment_class,
      confidence: fromEq.confidence,
      reason_codes: [fromEq.reason_code],
      sources: ["equipment"],
    };
  }
  const fromName = inferEquipmentClassFromNameFallback(ctx.norm_name);
  if (!fromName) return null;
  return {
    value: fromName.equipment_class,
    confidence: fromName.confidence,
    reason_codes: [fromName.reason_code],
    sources: ["name"],
  };
}

function assignComplexity(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationComplexity> | null {
  for (const rule of COMPLEXITY_RULES) {
    if (rule.pattern.test(ctx.norm_name)) {
      return {
        value: rule.value,
        confidence: rule.confidence,
        reason_codes: [rule.reason],
        sources: ["name"],
      };
    }
  }
  return null;
}

function assignSportTransferTags(ctx: PrefillCatalogContext): PrefillFieldAssignment<CurationSportTransferTag[]> | null {
  const tags = inferSportTransferTags(ctx);
  if (!tags.length) return null;
  const confidence = tags.length === 1 ? 0.88 : 0.82;
  const reason_codes = tags.map((t) => `sport_transfer_${t}`);
  return {
    value: tags,
    confidence,
    reason_codes,
    sources: ["name", "tags"],
  };
}

function filterByMinConfidence<T>(
  assignment: PrefillFieldAssignment<T> | null,
  min: number
): PrefillFieldAssignment<T> | null {
  if (!assignment) return null;
  if (assignment.confidence < min) return null;
  return assignment;
}

/**
 * Deterministic prefill for one catalog row.
 */
export function runPrefillForExercise(
  row: CatalogExerciseRow,
  options: Partial<PrefillRunOptions> = {}
): ExercisePrefillRecord {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = buildPrefillCatalogContext(row);

  const prefill: ExercisePrefillBlock = {};

  const movement = filterByMinConfidence(assignMovementPatterns(ctx), opts.min_confidence);
  if (movement) prefill.movement_patterns = movement;

  const role = filterByMinConfidence(assignPrimaryRole(ctx), opts.min_confidence);
  if (role) prefill.primary_role = role;

  const equip = filterByMinConfidence(assignEquipmentClass(ctx), opts.min_confidence);
  if (equip) prefill.equipment_class = equip;

  const complexity = filterByMinConfidence(assignComplexity(ctx), opts.min_confidence);
  if (complexity) prefill.complexity = complexity;

  const sports = filterByMinConfidence(assignSportTransferTags(ctx), opts.min_confidence);
  if (sports) prefill.sport_transfer_tags = sports;

  return { exercise_id: row.id, prefill: applyTrustTiersToPrefillBlock(prefill) };
}

export function runPrefillForCatalog(
  rows: CatalogExerciseRow[],
  options: Partial<PrefillRunOptions> = {}
): ExercisePrefillRecord[] {
  return rows.map((r) => runPrefillForExercise(r, options));
}

function collectReasonCodes(rec: ExercisePrefillRecord, out: Record<string, number>): void {
  const push = (a: PrefillFieldAssignment<unknown> | undefined) => {
    if (!a) return;
    for (const c of a.reason_codes) incrementCount(out, c, 1);
  };
  push(rec.prefill.primary_role);
  push(rec.prefill.movement_patterns);
  push(rec.prefill.equipment_class);
  push(rec.prefill.complexity);
  push(rec.prefill.sport_transfer_tags);
}

function fieldHighLow(
  a: PrefillFieldAssignment<unknown> | undefined,
  highThreshold: number
): { has: boolean; high: boolean } {
  if (!a) return { has: false, high: false };
  return { has: true, high: a.confidence >= highThreshold };
}

/**
 * Aggregate stats for console + markdown summaries.
 */
export function computePrefillStats(
  records: ExercisePrefillRecord[],
  options: PrefillRunOptions
): PrefillRunStats {
  const total = records.length;
  const assigned_counts = {
    primary_role: 0,
    movement_patterns: 0,
    equipment_class: 0,
    complexity: 0,
    sport_transfer_tags: 0,
  };
  const high_confidence_counts = { ...assigned_counts };
  const low_confidence_counts = { ...assigned_counts };

  const reasonAgg: Record<string, number> = {};

  for (const rec of records) {
    collectReasonCodes(rec, reasonAgg);

    const pr = fieldHighLow(rec.prefill.primary_role, options.high_confidence_threshold);
    if (pr.has) {
      assigned_counts.primary_role += 1;
      if (pr.high) high_confidence_counts.primary_role += 1;
      else low_confidence_counts.primary_role += 1;
    }

    const mp = fieldHighLow(rec.prefill.movement_patterns, options.high_confidence_threshold);
    if (mp.has) {
      assigned_counts.movement_patterns += 1;
      if (mp.high) high_confidence_counts.movement_patterns += 1;
      else low_confidence_counts.movement_patterns += 1;
    }

    const ec = fieldHighLow(rec.prefill.equipment_class, options.high_confidence_threshold);
    if (ec.has) {
      assigned_counts.equipment_class += 1;
      if (ec.high) high_confidence_counts.equipment_class += 1;
      else low_confidence_counts.equipment_class += 1;
    }

    const cx = fieldHighLow(rec.prefill.complexity, options.high_confidence_threshold);
    if (cx.has) {
      assigned_counts.complexity += 1;
      if (cx.high) high_confidence_counts.complexity += 1;
      else low_confidence_counts.complexity += 1;
    }

    const st = fieldHighLow(rec.prefill.sport_transfer_tags, options.high_confidence_threshold);
    if (st.has) {
      assigned_counts.sport_transfer_tags += 1;
      if (st.high) high_confidence_counts.sport_transfer_tags += 1;
      else low_confidence_counts.sport_transfer_tags += 1;
    }
  }

  const coverage_fraction = {
    primary_role: total ? assigned_counts.primary_role / total : 0,
    movement_patterns: total ? assigned_counts.movement_patterns / total : 0,
    equipment_class: total ? assigned_counts.equipment_class / total : 0,
    complexity: total ? assigned_counts.complexity / total : 0,
    sport_transfer_tags: total ? assigned_counts.sport_transfer_tags / total : 0,
  };

  const top_reason_codes = sortedCountEntries(reasonAgg)
    .slice(0, 40)
    .map(({ key, count }) => ({ code: key, count }));

  return {
    total_exercises: total,
    assigned_counts,
    high_confidence_counts,
    low_confidence_counts,
    coverage_fraction,
    top_reason_codes,
  };
}

/**
 * Serialize only high-confidence curation field values (for optional staging catalog merge).
 * Does not include confidence / reason metadata in `extra.curation`.
 */
export function prefillBlockToCurationValues(prefill: ExercisePrefillBlock): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (prefill.primary_role) o.primary_role = prefill.primary_role.value;
  if (prefill.movement_patterns) o.movement_patterns = prefill.movement_patterns.value;
  if (prefill.equipment_class) o.equipment_class = prefill.equipment_class.value;
  if (prefill.complexity) o.complexity = prefill.complexity.value;
  if (prefill.sport_transfer_tags) o.sport_transfer_tags = prefill.sport_transfer_tags.value;
  return o;
}

export function mergeCatalogRowWithPrefillCuration(
  row: CatalogExerciseRow,
  prefill: ExercisePrefillBlock
): CatalogExerciseRow {
  const extra = { ...row.extra };
  const prior =
    extra.curation && typeof extra.curation === "object" && !Array.isArray(extra.curation)
      ? { ...(extra.curation as Record<string, unknown>) }
      : {};
  const merged = { ...prior, ...prefillBlockToCurationValues(prefill) };
  extra.curation = merged;
  return { ...row, extra };
}

export function formatPrefillMarkdown(
  catalogPath: string,
  options: PrefillRunOptions,
  stats: PrefillRunStats,
  persistStaging: boolean
): string {
  const lines: string[] = [];
  lines.push(`# Exercise curation prefill (deterministic)`);
  lines.push(``);
  lines.push(`- **Catalog:** \`${catalogPath}\``);
  lines.push(`- **min_confidence:** ${options.min_confidence}`);
  lines.push(`- **high_confidence_threshold:** ${options.high_confidence_threshold}`);
  lines.push(`- **persist_extra_curation_staging:** ${persistStaging}`);
  lines.push(`- **Exercises:** ${stats.total_exercises}`);
  lines.push(``);
  lines.push(`## Coverage (fraction of exercises with a field emitted)`);
  for (const [k, v] of Object.entries(stats.coverage_fraction)) {
    lines.push(`- **${k}:** ${(v * 100).toFixed(1)}%`);
  }
  lines.push(``);
  lines.push(`## Assignments (counts)`);
  lines.push(`| Field | Assigned | High conf | Low conf |`);
  lines.push(`| --- | ---: | ---: | ---: |`);
  const keys = [
    "primary_role",
    "movement_patterns",
    "equipment_class",
    "complexity",
    "sport_transfer_tags",
  ] as const;
  for (const k of keys) {
    lines.push(
      `| ${k} | ${stats.assigned_counts[k]} | ${stats.high_confidence_counts[k]} | ${stats.low_confidence_counts[k]} |`
    );
  }
  lines.push(``);
  lines.push(`## Top reason codes`);
  for (const { code, count } of stats.top_reason_codes.slice(0, 30)) {
    lines.push(`- ${code}: ${count}`);
  }
  lines.push(``);
  return lines.join("\n");
}

export { DEFAULT_OPTIONS, EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION };
