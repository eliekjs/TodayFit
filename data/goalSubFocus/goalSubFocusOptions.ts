/**
 * Sub-focus options per primary focus (Manual mode). Each primary focus has a goal slug
 * for tag lookup and an ordered list of sub-goals (slug + display name).
 * Order = most popular first; max 3 selectable per goal in UI.
 */

import type { GoalSubFocusOptionsEntry } from "./types";

function entry(goalSlug: string, subFocuses: { slug: string; name: string }[]): GoalSubFocusOptionsEntry {
  return { goalSlug, subFocuses };
}

/** Key = primary focus label (must match PRIMARY_FOCUS_OPTIONS). */
export const GOAL_SUB_FOCUS_OPTIONS: Record<string, GoalSubFocusOptionsEntry> = {
  "Build Strength": entry("strength", [
    { slug: "squat", name: "Squat" },
    { slug: "deadlift_hinge", name: "Deadlift / Hinge" },
    { slug: "bench_press", name: "Bench / Press" },
    { slug: "overhead_press", name: "Overhead Press" },
    { slug: "pull", name: "Pull-ups / Pull" },
    { slug: "full_body", name: "Full-body" },
  ]),
  "Build Muscle (Hypertrophy)": entry("muscle", [
    { slug: "glutes", name: "Glutes" },
    { slug: "back", name: "Back" },
    { slug: "chest", name: "Chest" },
    { slug: "arms", name: "Arms" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "legs", name: "Legs" },
    { slug: "core", name: "Core" },
    { slug: "balanced", name: "Balanced" },
  ]),
  "Body Recomposition": entry("physique", [
    { slug: "glutes", name: "Glutes" },
    { slug: "back", name: "Back" },
    { slug: "chest", name: "Chest" },
    { slug: "arms", name: "Arms" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "legs", name: "Legs" },
    { slug: "core", name: "Core" },
    { slug: "balanced", name: "Balanced" },
  ]),
  "Sport Conditioning": entry("conditioning", [
    { slug: "zone2_aerobic_base", name: "Zone 2 / Aerobic base" },
    { slug: "intervals_hiit", name: "Intervals / HIIT" },
    { slug: "threshold_tempo", name: "Threshold / Tempo" },
    { slug: "hills", name: "Hills" },
    { slug: "full_body", name: "Full-body" },
    { slug: "upper", name: "Upper" },
    { slug: "lower", name: "Lower" },
    { slug: "core", name: "Core" },
  ]),
  "Improve Endurance": entry("endurance", [
    { slug: "zone2_long_steady", name: "Zone 2 / Long steady" },
    { slug: "threshold_tempo", name: "Threshold / Tempo" },
    { slug: "intervals", name: "Intervals" },
    { slug: "hills", name: "Hills" },
    { slug: "durability", name: "Durability / Long sessions" },
  ]),
  "Mobility & Joint Health": entry("mobility", [
    { slug: "hips", name: "Hips" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "t_spine", name: "T-spine" },
    { slug: "lower_back", name: "Lower back" },
    { slug: "ankles", name: "Ankles" },
    { slug: "full_body", name: "Full-body" },
  ]),
  "Athletic Performance": entry("strength", [
    { slug: "speed_sprint", name: "Speed / Sprint" },
    { slug: "vertical_jump", name: "Vertical jump" },
    { slug: "power_explosive", name: "Power / Explosive" },
    { slug: "agility_cod", name: "Agility / Change of direction" },
    { slug: "core", name: "Core" },
    { slug: "upper", name: "Upper" },
    { slug: "lower", name: "Lower" },
    { slug: "full_body", name: "Full-body" },
  ]),
  Calisthenics: entry("strength", [
    { slug: "pull_ups", name: "Pull-ups" },
    { slug: "push_ups", name: "Push-ups" },
    { slug: "dips", name: "Dips" },
    { slug: "handstand", name: "Handstand" },
    { slug: "core", name: "Core" },
    { slug: "front_lever_advanced", name: "Front lever / Advanced" },
  ]),
  "Power & Explosiveness": entry("conditioning", [
    { slug: "lower_body_power_plyos", name: "Lower body power / Plyos" },
    { slug: "olympic_triple_extension", name: "Olympic / Triple extension" },
    { slug: "upper_body_power", name: "Upper body power" },
    { slug: "vertical_jump", name: "Vertical jump" },
    { slug: "sprint", name: "Sprint" },
    { slug: "full_body", name: "Full-body" },
  ]),
  Recovery: entry("resilience", [
    { slug: "hips", name: "Hips" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "t_spine", name: "T-spine" },
    { slug: "lower_back", name: "Lower back" },
    { slug: "ankles", name: "Ankles" },
    { slug: "full_body", name: "Full-body" },
  ]),
};
