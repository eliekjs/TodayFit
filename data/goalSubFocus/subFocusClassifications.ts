/**
 * Per-goal sub-focus classifications: intent vs overlay and conflict groups.
 * Used by the shared resolver to combine non-conflicting classes additively
 * and resolve same-class conflicts by user priority (ranked order).
 */

import type { SubFocusClassMap, SubFocusConflictConfig } from "./types";

/** Sub-focus slug → class (intent | overlay). Default for unknown slug: intent. */
const SUB_FOCUS_CLASS_BY_GOAL: Record<string, SubFocusClassMap> = {
  conditioning: {
    zone2_aerobic_base: "intent",
    intervals_hiit: "intent",
    threshold_tempo: "intent",
    hills: "intent",
    full_body: "overlay",
    upper: "overlay",
    lower: "overlay",
    core: "overlay",
    // Power & Explosiveness (same goal slug)
    lower_body_power_plyos: "intent",
    olympic_triple_extension: "intent",
    upper_body_power: "intent",
    vertical_jump: "intent",
    sprint: "intent",
  },
  endurance: {
    zone2_long_steady: "intent",
    threshold_tempo: "intent",
    intervals: "intent",
    hills: "intent",
    durability: "intent",
  },
  strength: {
    squat: "intent",
    deadlift_hinge: "intent",
    bench_press: "intent",
    overhead_press: "intent",
    pull: "intent",
    full_body: "overlay",
    speed_sprint: "intent",
    vertical_jump: "intent",
    power_explosive: "intent",
    agility_cod: "intent",
    core: "overlay",
    upper: "overlay",
    lower: "overlay",
    full_body_calisthenics: "intent",
    legs_pistol: "intent",
    pull_ups: "intent",
    push_ups: "intent",
    dips: "intent",
    handstand: "intent",
    front_lever_advanced: "intent",
  },
  muscle: {
    glutes: "intent",
    back: "intent",
    chest: "intent",
    arms: "intent",
    shoulders: "intent",
    legs: "intent",
    core: "intent",
    balanced: "intent",
  },
  physique: {
    glutes: "intent",
    back: "intent",
    chest: "intent",
    arms: "intent",
    shoulders: "intent",
    legs: "intent",
    core: "intent",
    balanced: "intent",
  },
  mobility: {
    hips: "intent",
    shoulders: "intent",
    t_spine: "intent",
    lower_back: "intent",
    ankles: "intent",
    full_body: "overlay",
  },
  resilience: {
    hips: "intent",
    shoulders: "intent",
    t_spine: "intent",
    lower_back: "intent",
    ankles: "intent",
    full_body: "overlay",
  },
};

/** Optional conflict groups per goal. Slugs in the same group are resolved by user rank (first = highest weight). */
const SUB_FOCUS_CONFLICT_BY_GOAL: Record<string, SubFocusConflictConfig> = {
  conditioning: {
    intent: [
      ["zone2_aerobic_base", "intervals_hiit", "threshold_tempo", "hills"],
      ["lower_body_power_plyos", "olympic_triple_extension", "upper_body_power", "vertical_jump", "sprint"],
    ],
    overlay: [["full_body", "upper", "lower", "core"]],
  },
  endurance: {
    intent: [["zone2_long_steady", "threshold_tempo", "intervals", "hills", "durability"]],
  },
  strength: {
    intent: [
      ["squat", "deadlift_hinge", "bench_press", "overhead_press", "pull", "full_body"],
      ["speed_sprint", "vertical_jump", "power_explosive", "agility_cod"],
      ["full_body_calisthenics", "legs_pistol", "pull_ups", "push_ups", "dips", "handstand", "front_lever_advanced"],
    ],
    overlay: [["full_body", "upper", "lower", "core"]],
  },
  // mobility / resilience: only full_body is overlay; rest are intent (body region). No overlay conflict group.
};

const DEFAULT_CLASS: import("./types").SubFocusClass = "intent";

export function getSubFocusClass(goalSlug: string, subFocusSlug: string): import("./types").SubFocusClass {
  const map = SUB_FOCUS_CLASS_BY_GOAL[goalSlug];
  return map?.[subFocusSlug] ?? DEFAULT_CLASS;
}

export function getSubFocusConflictConfig(goalSlug: string): SubFocusConflictConfig | undefined {
  return SUB_FOCUS_CONFLICT_BY_GOAL[goalSlug];
}

export function getSubFocusClassMap(goalSlug: string): SubFocusClassMap {
  return SUB_FOCUS_CLASS_BY_GOAL[goalSlug] ?? {};
}
