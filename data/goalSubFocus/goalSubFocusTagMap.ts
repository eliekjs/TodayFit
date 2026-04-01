/**
 * Mapping: goal_slug:sub_focus_slug → exercise tag slugs (with optional weight).
 * Used to bias exercise selection when user selects sub-goals in Manual mode.
 * Reuses tag slugs from sport sub-focus taxonomy and public.exercise_tags.
 */

import type { GoalSubFocusTagMap } from "./types";

function key(goalSlug: string, subFocusSlug: string): string {
  return `${goalSlug}:${subFocusSlug}`;
}

export const GOAL_SUB_FOCUS_TAG_MAP: GoalSubFocusTagMap = {
  // --- Build Strength (goal_slug: strength) ---
  [key("strength", "squat")]: [
    { tag_slug: "squat", weight: 1.3 },
    { tag_slug: "compound", weight: 1.1 },
    { tag_slug: "quads", weight: 1 },
    { tag_slug: "glutes", weight: 1 },
  ],
  [key("strength", "deadlift_hinge")]: [
    { tag_slug: "hinge", weight: 1.3 },
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "glutes", weight: 1.1 },
    { tag_slug: "hamstrings", weight: 1 },
  ],
  [key("strength", "bench_press")]: [
    { tag_slug: "push", weight: 1.3 },
    { tag_slug: "chest", weight: 1.2 },
    { tag_slug: "triceps", weight: 1 },
  ],
  [key("strength", "overhead_press")]: [
    { tag_slug: "push", weight: 1.2 },
    { tag_slug: "shoulders", weight: 1.3 },
    { tag_slug: "core", weight: 1 },
  ],
  [key("strength", "pull")]: [
    { tag_slug: "pull", weight: 1.3 },
    { tag_slug: "back", weight: 1.1 },
    { tag_slug: "lats", weight: 1.1 },
    { tag_slug: "biceps", weight: 1 },
  ],
  [key("strength", "full_body")]: [
    { tag_slug: "compound", weight: 1.3 },
    { tag_slug: "squat", weight: 1 },
    { tag_slug: "hinge", weight: 1 },
    { tag_slug: "push", weight: 1 },
    { tag_slug: "pull", weight: 1 },
    { tag_slug: "power", weight: 0.9 },
  ],

  // --- Athletic Performance (goal_slug: strength) ---
  [key("strength", "speed_sprint")]: [
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("strength", "vertical_jump")]: [
    { tag_slug: "plyometric", weight: 1.3 },
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("strength", "power_explosive")]: [
    { tag_slug: "power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.1 },
    { tag_slug: "compound", weight: 1 },
  ],
  // Agility / change of direction: favor dynamic, lateral, and plyometric exercises (skaters, bounds, rotational jumps, lateral lunges) over static squats/lunges only.
  [key("strength", "agility_cod")]: [
    { tag_slug: "agility", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "lateral_power", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1.1 },
    { tag_slug: "balance", weight: 1 },
    { tag_slug: "single_leg", weight: 1 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("strength", "core")]: [
    { tag_slug: "core_stability", weight: 1.3 },
    { tag_slug: "core", weight: 1.1 },
  ],
  [key("strength", "upper")]: [
    { tag_slug: "push", weight: 1.1 },
    { tag_slug: "pull", weight: 1.1 },
    { tag_slug: "chest", weight: 1 },
    { tag_slug: "back", weight: 1 },
    { tag_slug: "shoulders", weight: 1 },
  ],
  [key("strength", "lower")]: [
    { tag_slug: "squat", weight: 1.1 },
    { tag_slug: "hinge", weight: 1.1 },
    { tag_slug: "legs", weight: 1.1 },
    { tag_slug: "glutes", weight: 1 },
    { tag_slug: "quads", weight: 1 },
  ],

  // --- Calisthenics (goal_slug: strength) ---
  // Full body calisthenics: pull, push, core + legs (pistol, shrimp, single-leg) so lower body appears in full-body sessions.
  [key("strength", "full_body_calisthenics")]: [
    { tag_slug: "pull", weight: 1.2 },
    { tag_slug: "push", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "squat", weight: 1.1 },
    { tag_slug: "legs", weight: 1 },
    { tag_slug: "single_leg", weight: 1 },
    { tag_slug: "lats", weight: 1 },
    { tag_slug: "chest", weight: 1 },
    { tag_slug: "triceps", weight: 1 },
    { tag_slug: "upper_back", weight: 1 },
    { tag_slug: "scapular_control", weight: 1 },
    { tag_slug: "core", weight: 1 },
  ],
  // Legs / Pistol: pistol squats, shrimp squats, assisted (TRX/pole), elevated, dragon squat, BOSU (when exercises exist).
  [key("strength", "legs_pistol")]: [
    { tag_slug: "squat", weight: 1.3 },
    { tag_slug: "legs", weight: 1.2 },
    { tag_slug: "single_leg", weight: 1.2 },
    { tag_slug: "balance", weight: 1.1 },
    { tag_slug: "quads", weight: 1.1 },
    { tag_slug: "glutes", weight: 1 },
    { tag_slug: "core", weight: 0.9 },
  ],
  [key("strength", "pull_ups")]: [
    { tag_slug: "pull", weight: 1.3 },
    { tag_slug: "lats", weight: 1.2 },
    { tag_slug: "back", weight: 1.1 },
  ],
  [key("strength", "push_ups")]: [
    { tag_slug: "push", weight: 1.3 },
    { tag_slug: "chest", weight: 1.1 },
    { tag_slug: "triceps", weight: 1 },
  ],
  [key("strength", "dips")]: [
    { tag_slug: "push", weight: 1.2 },
    { tag_slug: "triceps", weight: 1.2 },
    { tag_slug: "chest", weight: 1 },
  ],
  [key("strength", "handstand")]: [
    { tag_slug: "push", weight: 1.1 },
    { tag_slug: "shoulders", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "core", weight: 1 },
  ],
  [key("strength", "core")]: [
    { tag_slug: "core_stability", weight: 1.3 },
    { tag_slug: "core", weight: 1.1 },
  ],
  [key("strength", "front_lever_advanced")]: [
    { tag_slug: "pull", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "lats", weight: 1 },
  ],

  // --- Build Muscle / Body Recomposition (goal_slug: muscle, physique) ---
  [key("muscle", "glutes")]: [
    { tag_slug: "glutes", weight: 1.4 },
    { tag_slug: "hinge", weight: 1.1 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("muscle", "back")]: [
    { tag_slug: "back", weight: 1.3 },
    { tag_slug: "lats", weight: 1.2 },
    { tag_slug: "pull", weight: 1.1 },
  ],
  [key("muscle", "chest")]: [
    { tag_slug: "chest", weight: 1.3 },
    { tag_slug: "push", weight: 1.1 },
  ],
  [key("muscle", "arms")]: [
    { tag_slug: "biceps", weight: 1.2 },
    { tag_slug: "triceps", weight: 1.2 },
  ],
  [key("muscle", "shoulders")]: [
    { tag_slug: "shoulders", weight: 1.3 },
    { tag_slug: "push", weight: 1 },
  ],
  [key("muscle", "legs")]: [
    { tag_slug: "legs", weight: 1.2 },
    { tag_slug: "quads", weight: 1.1 },
    { tag_slug: "glutes", weight: 1.1 },
    { tag_slug: "hamstrings", weight: 1 },
    { tag_slug: "squat", weight: 1 },
    { tag_slug: "hinge", weight: 1 },
  ],
  [key("muscle", "core")]: [
    { tag_slug: "core", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.1 },
  ],
  [key("muscle", "balanced")]: [],

  [key("physique", "glutes")]: [
    { tag_slug: "glutes", weight: 1.4 },
    { tag_slug: "hinge", weight: 1.1 },
  ],
  [key("physique", "back")]: [
    { tag_slug: "back", weight: 1.3 },
    { tag_slug: "lats", weight: 1.2 },
  ],
  [key("physique", "chest")]: [
    { tag_slug: "chest", weight: 1.3 },
  ],
  [key("physique", "arms")]: [
    { tag_slug: "biceps", weight: 1.2 },
    { tag_slug: "triceps", weight: 1.2 },
  ],
  [key("physique", "shoulders")]: [
    { tag_slug: "shoulders", weight: 1.3 },
  ],
  [key("physique", "legs")]: [
    { tag_slug: "legs", weight: 1.2 },
    { tag_slug: "quads", weight: 1.1 },
    { tag_slug: "glutes", weight: 1.1 },
  ],
  [key("physique", "core")]: [
    { tag_slug: "core", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.1 },
  ],
  [key("physique", "balanced")]: [],

  // --- Sport Conditioning (goal_slug: conditioning) ---
  [key("conditioning", "zone2_aerobic_base")]: [
    { tag_slug: "conditioning", weight: 1.2 },
    { tag_slug: "endurance", weight: 1.2 },
    { tag_slug: "low_impact", weight: 1 },
  ],
  [key("conditioning", "intervals_hiit")]: [
    { tag_slug: "conditioning", weight: 1.3 },
    { tag_slug: "energy_high", weight: 1.1 },
    { tag_slug: "compound", weight: 1 },
  ],
  [key("conditioning", "threshold_tempo")]: [
    { tag_slug: "conditioning", weight: 1.2 },
    { tag_slug: "endurance", weight: 1.1 },
  ],
  [key("conditioning", "hills")]: [
    { tag_slug: "uphill_conditioning", weight: 1.35 },
    { tag_slug: "legs", weight: 1.2 },
    { tag_slug: "glutes", weight: 1.1 },
    { tag_slug: "conditioning", weight: 1 },
  ],
  [key("conditioning", "full_body")]: [
    { tag_slug: "compound", weight: 1.2 },
    { tag_slug: "conditioning", weight: 1.1 },
  ],
  [key("conditioning", "upper")]: [
    { tag_slug: "push", weight: 1.1 },
    { tag_slug: "pull", weight: 1.1 },
    { tag_slug: "conditioning", weight: 1 },
  ],
  [key("conditioning", "lower")]: [
    { tag_slug: "legs", weight: 1.2 },
    { tag_slug: "squat", weight: 1 },
    { tag_slug: "hinge", weight: 1 },
  ],
  [key("conditioning", "core")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core", weight: 1 },
  ],

  // --- Power & Explosiveness (goal_slug: conditioning) ---
  [key("conditioning", "lower_body_power_plyos")]: [
    { tag_slug: "power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "squat", weight: 1 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("conditioning", "olympic_triple_extension")]: [
    { tag_slug: "power", weight: 1.3 },
    { tag_slug: "hinge", weight: 1.1 },
    { tag_slug: "compound", weight: 1 },
  ],
  [key("conditioning", "upper_body_power")]: [
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "push", weight: 1.1 },
    { tag_slug: "plyometric", weight: 1 },
  ],
  [key("conditioning", "vertical_jump")]: [
    { tag_slug: "plyometric", weight: 1.3 },
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "legs", weight: 1 },
  ],
  [key("conditioning", "sprint")]: [
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "conditioning", weight: 1.1 },
    { tag_slug: "legs", weight: 1 },
  ],

  // --- Improve Endurance (goal_slug: endurance) ---
  [key("endurance", "zone2_long_steady")]: [
    { tag_slug: "endurance", weight: 1.3 },
    { tag_slug: "conditioning", weight: 1.1 },
    { tag_slug: "low_impact", weight: 1 },
  ],
  [key("endurance", "threshold_tempo")]: [
    { tag_slug: "endurance", weight: 1.2 },
    { tag_slug: "conditioning", weight: 1.1 },
  ],
  [key("endurance", "intervals")]: [
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "anaerobic", weight: 1.1 },
    { tag_slug: "conditioning", weight: 1.15 },
    { tag_slug: "energy_high", weight: 1 },
  ],
  [key("endurance", "hills")]: [
    { tag_slug: "uphill_conditioning", weight: 1.3 },
    { tag_slug: "legs", weight: 1.15 },
    { tag_slug: "endurance", weight: 1.15 },
    { tag_slug: "conditioning", weight: 1 },
  ],
  [key("endurance", "durability")]: [
    { tag_slug: "endurance", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],

  // --- Mobility & Joint Health (goal_slug: mobility) ---
  [key("mobility", "hips")]: [
    { tag_slug: "hip_mobility", weight: 1.3 },
    { tag_slug: "mobility", weight: 1.1 },
  ],
  [key("mobility", "shoulders")]: [
    { tag_slug: "shoulder stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("mobility", "t_spine")]: [
    { tag_slug: "thoracic_mobility", weight: 1.3 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("mobility", "lower_back")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "anti_rotation", weight: 1.1 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("mobility", "ankles")]: [
    { tag_slug: "balance", weight: 1.1 },
    { tag_slug: "mobility", weight: 1.1 },
  ],
  [key("mobility", "full_body")]: [
    { tag_slug: "mobility", weight: 1.2 },
    { tag_slug: "thoracic_mobility", weight: 1 },
    { tag_slug: "hip_mobility", weight: 1 },
  ],

  // --- Recovery (goal_slug: resilience) ---
  [key("resilience", "hips")]: [
    { tag_slug: "hip_mobility", weight: 1.2 },
    { tag_slug: "recovery", weight: 1.1 },
  ],
  [key("resilience", "shoulders")]: [
    { tag_slug: "shoulder stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.1 },
    { tag_slug: "recovery", weight: 1 },
  ],
  [key("resilience", "t_spine")]: [
    { tag_slug: "thoracic_mobility", weight: 1.2 },
    { tag_slug: "recovery", weight: 1 },
  ],
  [key("resilience", "lower_back")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "recovery", weight: 1 },
  ],
  [key("resilience", "ankles")]: [
    { tag_slug: "balance", weight: 1 },
    { tag_slug: "recovery", weight: 1.1 },
  ],
  [key("resilience", "full_body")]: [
    { tag_slug: "recovery", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
  ],
};
