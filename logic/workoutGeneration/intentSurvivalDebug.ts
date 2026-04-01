/**
 * Structured instrumentation for tracing how sport/session intent survives selection.
 * Stable field names for tests and analytics; no selection behavior changes.
 */

import type { WorkoutBlock } from "../../lib/types";
import type { ScoringDebug, GenerateWorkoutInput, Exercise } from "./types";
import type { SportPatternGateResult, SportPatternSelectionTier } from "./sportPattern/framework/types";
import type { HikingSessionEnforcementSnapshot, SportCoverageContext } from "./sportPatternTransfer/types";
import {
  alpineSportWorkoutConstraints,
  ALPINE_LATERAL_STABILITY_CATEGORIES,
  ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES,
  ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES,
} from "./sportPatternTransfer/alpineSkiingRules";
import { exerciseMatchesAnyAlpineSkiingCategory } from "./sportPatternTransfer/alpineSkiingExerciseCategories";

/** Gate pool counts at each tier (full → raw gate matches → refined gated pool → pool used for selection). */
export type IntentSurvivalGateTierCounts = {
  full_pool_count: number;
  raw_gate_match_count: number;
  refined_gated_count: number;
  pool_for_selection_count: number;
};

/** One selection pass (one call to selectExercises / iterative sport-pattern selection). */
export type IntentSurvivalSelectionPass = {
  pass_id: string;
  /** Block title when known; else block_type. */
  block_label: string;
  slot_type: string;
  sport_gate_applied: boolean;
  slot_rule_id?: string;
  gate_tier_counts?: IntentSurvivalGateTierCounts;
  pool_mode?: SportPatternGateResult["poolMode"];
  fallback_occurred: boolean;
  /** Authoritative progressive ladder tier when sport gating ran. */
  sport_pattern_selection_tier?: SportPatternSelectionTier;
  /** @deprecated Prefer sport_pattern_selection_tier; binary hint for older consumers. */
  fallback_tier_reached?: "gated" | "full_pool_fallback";
  candidate_count_in_pool: number;
  selection_mode: "standard" | "iterative_sport_pattern";
  /** Top candidates after scoring (stable order by score desc). */
  top_candidate_breakdowns: IntentSurvivalCandidateBreakdown[];
  chosen_exercise_ids: string[];
  /** Human-readable winner rationale (deterministic from scores and tie data). */
  chosen_why: string[];
  /** Iterative mode: one entry per round (optional). */
  iterative_rounds?: IntentSurvivalIterativeRound[];
};

export type IntentSurvivalIterativeRound = {
  round_index: number;
  chosen_exercise_id: string | null;
  top_candidate_breakdowns: IntentSurvivalCandidateBreakdown[];
};

export type IntentSurvivalCandidateBreakdown = {
  exercise_id: string;
  total_score: number;
  scoring_debug?: ScoringDebug;
  sport_pattern_slot_adjustment?: number;
  sport_within_pool_quality_total?: number;
};

/** Alpine-specific coverage flags (session-level). */
export type IntentSurvivalAlpineAnchors = {
  eccentric_or_decel_anchor_in_main: boolean;
  sustained_tension_lower_body_present: boolean;
  lateral_or_dynamic_trunk_stability_present: boolean;
};

export type IntentSurvivalAlpineCategoryStatus = {
  category_id: string;
  satisfied: boolean;
};

export type IntentSurvivalRepairChange = {
  rule_id: string;
  action: string;
  detail: string;
  exercise_id_before?: string;
  exercise_id_after?: string;
  block_type?: string;
};

export type IntentSurvivalSessionSummary = {
  sport_slug_primary?: string;
  /** Copy of generator-facing intent (no new semantics). */
  session_intent_summary: Record<string, unknown>;
  session_intent_primitives?: Record<string, unknown>;
  /** Optional upstream snapshot (planner / adapter) when input carries it. */
  upstream?: {
    source?: string;
    session_intent_summary?: string;
    primitives?: Record<string, unknown>;
  };
  selection_passes: IntentSurvivalSelectionPass[];
  alpine?: {
    required_category_hits: IntentSurvivalAlpineCategoryStatus[];
    key_coverage_ok_pre_repair: boolean;
    key_coverage_ok_post_repair: boolean;
    repair_ran: boolean;
    repair_changes: IntentSurvivalRepairChange[];
    /** Share of strength/hypertrophy/accessory/conditioning/power items (0–1). */
    strict_gate_selection_share: number;
    fallback_path_selection_share: number;
    degraded_mode: boolean;
    anchors_pre_repair: IntentSurvivalAlpineAnchors;
    anchors_post_repair: IntentSurvivalAlpineAnchors;
  };
};

export type IntentSurvivalCollector = {
  report: IntentSurvivalSessionSummary;
  pushSelectionPass: (pass: IntentSurvivalSelectionPass) => void;
  setUpstream: (upstream: IntentSurvivalSessionSummary["upstream"]) => void;
  setAlpinePartial: (partial: Partial<NonNullable<IntentSurvivalSessionSummary["alpine"]>>) => void;
};

function snapshotGeneratorIntent(input: GenerateWorkoutInput): Record<string, unknown> {
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals ?? null,
    focus_body_parts: input.focus_body_parts ?? null,
    sport_slugs: input.sport_slugs ?? null,
    sport_sub_focus: input.sport_sub_focus ?? null,
    sport_weight: input.sport_weight ?? null,
    goal_weights: input.goal_weights ?? null,
    goal_sub_focus: input.goal_sub_focus ?? null,
    session_target_qualities: input.session_target_qualities ?? null,
    session_target_qualities_weight: input.session_target_qualities_weight ?? null,
    session_intent_contract: input.session_intent_contract ?? null,
  };
}

function snapshotIntentPrimitives(input: GenerateWorkoutInput): Record<string, unknown> | undefined {
  const prim: Record<string, unknown> = {};
  if (input.sport_slugs?.length) prim.sport_slugs_ordered = [...input.sport_slugs];
  if (input.sport_sub_focus && Object.keys(input.sport_sub_focus).length) {
    prim.sport_sub_focus_by_sport = { ...input.sport_sub_focus };
  }
  if (input.session_target_qualities && Object.keys(input.session_target_qualities).length) {
    prim.session_target_qualities = { ...input.session_target_qualities };
  }
  if (input.goal_sub_focus && Object.keys(input.goal_sub_focus).length) {
    prim.goal_sub_focus_by_goal = { ...input.goal_sub_focus };
  }
  return Object.keys(prim).length ? prim : undefined;
}

export function createIntentSurvivalCollector(
  input: GenerateWorkoutInput,
  primarySportSlug?: string
): IntentSurvivalCollector {
  const report: IntentSurvivalSessionSummary = {
    sport_slug_primary: primarySportSlug,
    session_intent_summary: snapshotGeneratorIntent(input),
    session_intent_primitives: snapshotIntentPrimitives(input),
    selection_passes: [],
  };
  return {
    report,
    pushSelectionPass(p) {
      report.selection_passes.push(p);
    },
    setUpstream(u) {
      report.upstream = u;
    },
    setAlpinePartial(partial) {
      const base: NonNullable<IntentSurvivalSessionSummary["alpine"]> = {
        required_category_hits: [],
        key_coverage_ok_pre_repair: false,
        key_coverage_ok_post_repair: false,
        repair_ran: false,
        repair_changes: [],
        strict_gate_selection_share: 0,
        fallback_path_selection_share: 0,
        degraded_mode: false,
        anchors_pre_repair: {
          eccentric_or_decel_anchor_in_main: false,
          sustained_tension_lower_body_present: false,
          lateral_or_dynamic_trunk_stability_present: false,
        },
        anchors_post_repair: {
          eccentric_or_decel_anchor_in_main: false,
          sustained_tension_lower_body_present: false,
          lateral_or_dynamic_trunk_stability_present: false,
        },
        ...report.alpine,
        ...partial,
      };
      report.alpine = base;
    },
  };
}

export function gateResultToTierCounts(g: SportPatternGateResult): IntentSurvivalGateTierCounts {
  const t = g.telemetry;
  return {
    full_pool_count: t?.full_pool_count ?? g.poolForSelection.length,
    raw_gate_match_count: t?.raw_gate_match_count ?? g.matchCount,
    refined_gated_count: t?.refined_gated_count ?? (g.selectionTier === "strict_gate" ? g.matchCount : 0),
    pool_for_selection_count: g.poolForSelection.length,
    prefer_match_count: t?.prefer_match_count,
    quality_aligned_count: t?.quality_aligned_count,
    selection_tier: g.selectionTier ?? t?.selection_tier,
  };
}

export function computeAlpineAnchorSnapshot(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): IntentSurvivalAlpineAnchors {
  let eccentric_or_decel_anchor_in_main = false;
  let sustained_tension_lower_body_present = false;
  let lateral_or_dynamic_trunk_stability_present = false;

  for (const b of blocks) {
    const isMain = b.block_type === "main_strength" || b.block_type === "main_hypertrophy";
    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      if (isMain && exerciseMatchesAnyAlpineSkiingCategory(ex, [...ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES])) {
        eccentric_or_decel_anchor_in_main = true;
      }
      if (exerciseMatchesAnyAlpineSkiingCategory(ex, [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES])) {
        sustained_tension_lower_body_present = true;
      }
      if (exerciseMatchesAnyAlpineSkiingCategory(ex, [...ALPINE_LATERAL_STABILITY_CATEGORIES])) {
        lateral_or_dynamic_trunk_stability_present = true;
      }
    }
  }

  return {
    eccentric_or_decel_anchor_in_main,
    sustained_tension_lower_body_present,
    lateral_or_dynamic_trunk_stability_present,
  };
}

export function alpineRequiredCategoryHits(
  ctx: SportCoverageContext,
  violations: { ruleId: string }[]
): IntentSurvivalAlpineCategoryStatus[] {
  const failed = new Set(violations.map((v) => v.ruleId));
  return alpineSportWorkoutConstraints.minimumCoverage.map((r) => ({
    category_id: r.id,
    satisfied: !r.applies(ctx) || !failed.has(r.id),
  }));
}

function alpineSlotUsesRelaxedPool(
  blockType: string,
  enforcement: HikingSessionEnforcementSnapshot
): boolean {
  let gate: SportPatternGateResult | undefined;
  if (blockType === "main_strength") gate = enforcement.main_strength;
  else if (blockType === "main_hypertrophy") gate = enforcement.main_hypertrophy;
  else if (blockType === "accessory") gate = enforcement.accessory;
  if (!gate) return false;
  if (gate.selectionTier != null) return gate.selectionTier !== "strict_gate";
  return gate.usedFullPoolFallback === true;
}

/**
 * Share of items in main/accessory blocks selected under strict gate vs any relaxed tier
 * (prefer / quality-aligned / full pool; uses enforcement snapshot only).
 */
export function computeAlpineStrictVsFallbackShares(
  blocks: WorkoutBlock[],
  enforcement: HikingSessionEnforcementSnapshot
): { strict_gate_selection_share: number; fallback_path_selection_share: number } {
  let strict = 0;
  let fallback = 0;
  for (const b of blocks) {
    const slotRelaxed = alpineSlotUsesRelaxedPool(b.block_type, enforcement);
    if (!["main_strength", "main_hypertrophy", "accessory"].includes(b.block_type)) continue;

    for (const _ of b.items) {
      if (slotRelaxed) fallback += 1;
      else strict += 1;
    }
  }
  const total = strict + fallback;
  if (!total) return { strict_gate_selection_share: 0, fallback_path_selection_share: 0 };
  return {
    strict_gate_selection_share: strict / total,
    fallback_path_selection_share: fallback / total,
  };
}
