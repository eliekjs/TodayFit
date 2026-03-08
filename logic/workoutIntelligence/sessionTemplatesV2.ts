/**
 * Phase 3: Session templates (V2) with stimulus profile and session type.
 * Example templates for: full_body_strength+max_strength, upper_hypertrophy+hypertrophy,
 * lower_power+power_speed, mixed_sport_support+sport_support_strength,
 * aerobic_builder+aerobic_base, resilience_recovery+mobility_recovery.
 */

import type { SessionTemplateV2 } from "./types";
import { blockSpecsFromStimulus } from "./blockTemplates";
import { getBlockTemplate } from "./blockTemplates";
import { getFatigueBudgetForStimulus } from "./sessionShaping";

function buildTemplate(
  id: string,
  name: string,
  session_type: SessionTemplateV2["session_type"],
  stimulus_profile: SessionTemplateV2["stimulus_profile"],
  durationMin: number,
  durationMax: number,
  fatigueLevel: "low" | "moderate" | "high"
): SessionTemplateV2 {
  const block_specs = blockSpecsFromStimulus(stimulus_profile);
  const prescription_styles_by_block = block_specs.map((spec) => {
    const tmpl = getBlockTemplate(spec.block_type, spec.format);
    return tmpl.prescription_style ?? "moderate_hypertrophy";
  });
  return {
    id,
    name,
    session_type,
    stimulus_profile,
    block_specs,
    duration_minutes_min: durationMin,
    duration_minutes_max: durationMax,
    fatigue_budget: { kind: "level", level: fatigueLevel },
    prescription_styles_by_block,
  };
}

/** Phase 3 example session templates (Build My Workout + Adaptive/Sports Prep compatible). */
export const SESSION_TEMPLATES_V2: Record<string, SessionTemplateV2> = {
  full_body_strength_max_strength: buildTemplate(
    "full_body_strength_max_strength",
    "Full body strength (max strength)",
    "full_body_strength",
    "max_strength",
    45,
    75,
    "high"
  ),
  upper_hypertrophy_accumulation: buildTemplate(
    "upper_hypertrophy_accumulation",
    "Upper hypertrophy",
    "upper_hypertrophy",
    "hypertrophy_accumulation",
    45,
    60,
    "high"
  ),
  lower_power_speed: buildTemplate(
    "lower_power_speed",
    "Lower power",
    "lower_power",
    "power_speed",
    30,
    50,
    "low"
  ),
  mixed_sport_support_strength: buildTemplate(
    "mixed_sport_support_strength",
    "Mixed sport support",
    "mixed_sport_support",
    "sport_support_strength",
    45,
    65,
    "moderate"
  ),
  aerobic_builder_base: buildTemplate(
    "aerobic_builder_base",
    "Aerobic builder",
    "aerobic_builder",
    "aerobic_base",
    30,
    60,
    "moderate"
  ),
  resilience_recovery_mobility: buildTemplate(
    "resilience_recovery_mobility",
    "Resilience / recovery",
    "resilience_recovery",
    "mobility_recovery",
    20,
    45,
    "low"
  ),
  // Phase 6 weekly planner session types
  lower_hypertrophy_accumulation: buildTemplate(
    "lower_hypertrophy_accumulation",
    "Lower hypertrophy",
    "lower_hypertrophy",
    "hypertrophy_accumulation",
    45,
    65,
    "high"
  ),
  pull_strength_sport_support: buildTemplate(
    "pull_strength_sport_support",
    "Pull / sport support",
    "pull_strength",
    "sport_support_strength",
    45,
    65,
    "moderate"
  ),
  pull_strength_max_strength: buildTemplate(
    "pull_strength_max_strength",
    "Pull strength",
    "pull_strength",
    "max_strength",
    45,
    65,
    "high"
  ),
  pull_strength_hypertrophy_accumulation: buildTemplate(
    "pull_strength_hypertrophy_accumulation",
    "Pull hypertrophy",
    "pull_strength",
    "hypertrophy_accumulation",
    45,
    65,
    "high"
  ),
  push_strength_max_strength: buildTemplate(
    "push_strength_max_strength",
    "Push strength",
    "push_strength",
    "max_strength",
    45,
    65,
    "high"
  ),
  push_strength_hypertrophy_accumulation: buildTemplate(
    "push_strength_hypertrophy_accumulation",
    "Push hypertrophy",
    "push_strength",
    "hypertrophy_accumulation",
    45,
    65,
    "high"
  ),
  conditioning_only_aerobic_base: buildTemplate(
    "conditioning_only_aerobic_base",
    "Conditioning (aerobic)",
    "conditioning_only",
    "aerobic_base",
    30,
    60,
    "moderate"
  ),
  core_and_mobility_resilience_stability: buildTemplate(
    "core_and_mobility_resilience_stability",
    "Core and mobility",
    "core_and_mobility",
    "resilience_stability",
    20,
    45,
    "low"
  ),
  core_and_mobility_mobility_recovery: buildTemplate(
    "core_and_mobility_mobility_recovery",
    "Core and mobility (recovery)",
    "core_and_mobility",
    "mobility_recovery",
    20,
    45,
    "low"
  ),
  full_body_strength_hypertrophy_accumulation: buildTemplate(
    "full_body_strength_hypertrophy_accumulation",
    "Full body hypertrophy",
    "full_body_strength",
    "hypertrophy_accumulation",
    45,
    75,
    "high"
  ),
};

/** Get a V2 template by id. */
export function getSessionTemplateV2(id: string): SessionTemplateV2 | undefined {
  return SESSION_TEMPLATES_V2[id];
}

/** Resolve a session template by session type + stimulus + duration. */
export function resolveSessionTemplateV2(
  sessionType: SessionTemplateV2["session_type"],
  stimulusProfile: SessionTemplateV2["stimulus_profile"],
  durationMinutes: number
): SessionTemplateV2 {
  const key = `${sessionType}_${stimulusProfile}`.replace(/\s/g, "_");
  const byKey: Record<string, string> = {
    full_body_strength_max_strength: "full_body_strength_max_strength",
    full_body_strength_hypertrophy_accumulation: "full_body_strength_hypertrophy_accumulation",
    upper_hypertrophy_hypertrophy_accumulation: "upper_hypertrophy_accumulation",
    lower_hypertrophy_hypertrophy_accumulation: "lower_hypertrophy_accumulation",
    lower_power_power_speed: "lower_power_speed",
    pull_strength_sport_support_strength: "pull_strength_sport_support",
    pull_strength_max_strength: "pull_strength_max_strength",
    pull_strength_hypertrophy_accumulation: "pull_strength_hypertrophy_accumulation",
    push_strength_max_strength: "push_strength_max_strength",
    push_strength_hypertrophy_accumulation: "push_strength_hypertrophy_accumulation",
    mixed_sport_support_sport_support_strength: "mixed_sport_support_strength",
    conditioning_only_aerobic_base: "conditioning_only_aerobic_base",
    aerobic_builder_aerobic_base: "aerobic_builder_base",
    resilience_recovery_mobility_recovery: "resilience_recovery_mobility",
    core_and_mobility_resilience_stability: "core_and_mobility_resilience_stability",
    core_and_mobility_mobility_recovery: "core_and_mobility_mobility_recovery",
  };
  const templateId = byKey[key];
  if (templateId && SESSION_TEMPLATES_V2[templateId]) {
    const t = SESSION_TEMPLATES_V2[templateId];
    if (durationMinutes >= t.duration_minutes_min && durationMinutes <= t.duration_minutes_max) {
      return t;
    }
    return t;
  }
  return buildTemplate(
    `custom_${sessionType}_${stimulusProfile}`,
    `${sessionType} (${stimulusProfile})`,
    sessionType,
    stimulusProfile,
    Math.max(20, durationMinutes - 15),
    Math.min(75, durationMinutes + 15),
    "moderate"
  );
}
