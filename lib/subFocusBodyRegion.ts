/**
 * Maps sub-focus slugs to primary body regions for conflict detection
 * (session body focus vs regional sub-goals).
 */

import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus";
import type { DayBodyFocusChoiceId } from "./weekDaySessionFocus";

export type SubFocusBodyRegion = "upper" | "lower" | "core";

export type DayBodyRegion = SubFocusBodyRegion | "full";

/** Sub-focus slug → dominant body region. Omitted slugs are region-neutral (no conflict). */
const SUB_FOCUS_BODY_REGION: Record<string, SubFocusBodyRegion> = {
  // Strength
  squat: "lower",
  deadlift_hinge: "lower",
  bench_press: "upper",
  overhead_press: "upper",
  pull: "upper",
  // Hypertrophy / physique
  back: "upper",
  chest: "upper",
  arms: "upper",
  shoulders: "upper",
  glutes: "lower",
  legs: "lower",
  // Conditioning / athletic overlays
  upper: "upper",
  lower: "lower",
  core: "core",
  upper_body_power: "upper",
  lower_body_power_plyos: "lower",
  // Calisthenics
  pull_ups: "upper",
  push_ups: "upper",
  dips: "upper",
  handstand: "upper",
  front_lever_advanced: "upper",
  legs_pistol: "lower",
  // Joint health
  knee_health: "lower",
  hip_health: "lower",
  ankle_foot_health: "lower",
  shoulder_health: "upper",
  elbow_wrist_health: "upper",
  back_spine_health: "core",
  // Recovery & mobility (regional)
  hips: "lower",
  knees: "lower",
  ankles: "lower",
  elbows: "upper",
  wrists: "upper",
  t_spine: "upper",
  lower_back: "core",
};

/** Fallback when display names persist but catalog options drift (e.g. legacy Recovery subs). */
const REGIONAL_DISPLAY_NAME_TO_SLUG: Record<string, string> = {
  "knee health": "knee_health",
  "shoulder health": "shoulder_health",
  "hip health": "hip_health",
  "ankle & foot health": "ankle_foot_health",
  "back & spine health": "back_spine_health",
  "elbow/wrist health": "elbow_wrist_health",
  knees: "knees",
  hips: "hips",
  ankles: "ankles",
  elbows: "elbows",
  wrists: "wrists",
  "t-spine": "t_spine",
  "lower back": "lower_back",
  shoulders: "shoulders",
};

function normSlug(slug: string): string {
  return slug.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
}

export function getSubFocusBodyRegion(slug: string): SubFocusBodyRegion | null {
  return SUB_FOCUS_BODY_REGION[normSlug(slug)] ?? null;
}

/** Resolve sub-focus slug from goal label + display name (catalog first, then regional fallback). */
export function resolveSubFocusSlugFromDisplayName(
  goalLabel: string,
  displayName: string
): string | null {
  const entry = GOAL_SUB_FOCUS_OPTIONS[goalLabel];
  const fromCatalog = entry?.subFocuses.find((f) => f.name === displayName)?.slug;
  if (fromCatalog) return fromCatalog;
  return REGIONAL_DISPLAY_NAME_TO_SLUG[displayName.trim().toLowerCase()] ?? null;
}

export function isUpperBodySubFocusSlug(slug: string): boolean {
  return getSubFocusBodyRegion(slug) === "upper";
}

export function isLowerBodySubFocusSlug(slug: string): boolean {
  return getSubFocusBodyRegion(slug) === "lower";
}

export function dayBodyFocusToRegion(bodyId: DayBodyFocusChoiceId): DayBodyRegion {
  switch (bodyId) {
    case "upper":
      return "upper";
    case "lower":
      return "lower";
    case "core":
      return "core";
    case "full":
    default:
      return "full";
  }
}

/** True when a regional sub-focus contradicts the day's body emphasis. */
export function subFocusRegionConflictsWithDay(
  subRegion: SubFocusBodyRegion,
  dayRegion: DayBodyRegion
): boolean {
  if (dayRegion === "full" || dayRegion === "core") return false;
  if (dayRegion === "upper") return subRegion === "lower";
  if (dayRegion === "lower") return subRegion === "upper";
  return false;
}

export function dayRegionLabel(region: DayBodyRegion): string {
  switch (region) {
    case "upper":
      return "Upper body";
    case "lower":
      return "Lower body";
    case "core":
      return "Core";
    case "full":
    default:
      return "Full body";
  }
}

export function subFocusRegionLabel(region: SubFocusBodyRegion): string {
  switch (region) {
    case "upper":
      return "upper body";
    case "lower":
      return "lower body";
    case "core":
      return "core";
  }
}

/** Body focus id that best matches a sub-focus region. */
export function bodyFocusIdForSubFocusRegion(
  region: SubFocusBodyRegion
): DayBodyFocusChoiceId {
  if (region === "upper") return "upper";
  if (region === "lower") return "lower";
  return "core";
}
