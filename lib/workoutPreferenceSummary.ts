import { GOAL_SLUG_TO_LABEL } from "./preferencesConstants";
import type { AdaptiveScheduleLabels, BodyEmphasisKey, DailyWorkoutPreferences, ManualPreferences } from "./types";

function humanizeSportSlug(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const GOAL_BIAS_LABEL: Record<NonNullable<DailyWorkoutPreferences["goalBias"]>, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  endurance: "Endurance",
  mobility: "Mobility",
  recovery: "Recovery",
  power: "Power",
};

const BODY_REGION_LABEL: Record<NonNullable<DailyWorkoutPreferences["bodyRegionBias"]>, string> = {
  upper: "Upper body",
  lower: "Lower body",
  full: "Full body",
  pull: "Pull emphasis",
  push: "Push emphasis",
  core: "Core emphasis",
};

export type BuildManualPreferenceSummaryOptions = {
  /** Set false when the headline already shows primary goals (e.g. week day title). Default true. */
  includePrimaryFocus?: boolean;
};

/**
 * One-line segments for workout summary: only non-empty user selections (no generator defaults).
 */
export function buildManualPreferenceSummaryLines(
  prefs: ManualPreferences,
  options?: BuildManualPreferenceSummaryOptions
): string[] {
  const includePrimaryFocus = options?.includePrimaryFocus !== false;
  const lines: string[] = [];

  if (includePrimaryFocus && prefs.primaryFocus.length > 0) {
    lines.push(prefs.primaryFocus.join(" • "));
  }

  if (prefs.targetBody) {
    const mod =
      prefs.targetModifier.length > 0 ? ` — ${prefs.targetModifier.join(", ")}` : "";
    lines.push(`${prefs.targetBody}${mod}`);
  }

  if (prefs.durationMinutes != null && prefs.durationMinutes > 0) {
    lines.push(`${prefs.durationMinutes} min`);
  }

  if (prefs.energyLevel != null) {
    lines.push(`${capitalizeWord(prefs.energyLevel)} energy`);
  }

  if (prefs.injuries.length > 0) {
    lines.push(`Constraints: ${prefs.injuries.join(", ")}`);
  }

  if (prefs.upcoming.length > 0) {
    lines.push(`Upcoming: ${prefs.upcoming.join(", ")}`);
  }

  const subParts: string[] = [];
  for (const [goal, subs] of Object.entries(prefs.subFocusByGoal ?? {})) {
    if (subs?.length) subParts.push(`${goal}: ${subs.join(", ")}`);
  }
  if (subParts.length > 0) {
    lines.push(subParts.join(" · "));
  }

  if (prefs.workoutStyle?.length) {
    lines.push(prefs.workoutStyle.join(" • "));
  }

  if (prefs.preferredZone2Cardio?.length) {
    lines.push(`Zone 2: ${prefs.preferredZone2Cardio.join(", ")}`);
  }

  if (prefs.workoutTier != null && prefs.workoutTier !== "intermediate") {
    lines.push(`${capitalizeWord(prefs.workoutTier)} experience`);
  }

  if (prefs.includeCreativeVariations === true) {
    lines.push("Creative variations");
  }

  return lines;
}

/** Per-day adaptive overrides (chips on recommendation / regenerate). */
export function buildDailyWorkoutPreferencesSummaryLines(p: DailyWorkoutPreferences): string[] {
  const lines: string[] = [];
  if (p.goalBias) {
    lines.push(`Session goal: ${GOAL_BIAS_LABEL[p.goalBias] ?? p.goalBias}`);
  }
  if (p.bodyRegionBias) {
    lines.push(`Body: ${BODY_REGION_LABEL[p.bodyRegionBias] ?? p.bodyRegionBias}`);
  }
  if (p.specificBodyFocus?.length) {
    lines.push(`Focus areas: ${p.specificBodyFocus.join(", ")}`);
  }
  if (p.energyLevel) {
    lines.push(`${capitalizeWord(p.energyLevel)} energy`);
  }
  if (p.stylePreference?.trim()) {
    lines.push(p.stylePreference.trim());
  }
  if (p.workoutTier != null && p.workoutTier !== "intermediate") {
    lines.push(`${capitalizeWord(p.workoutTier)} experience`);
  }
  if (p.includeCreativeVariations === true) {
    lines.push("Creative variations");
  }
  return lines;
}

const EMPHASIS_LABELS: Record<Exclude<BodyEmphasisKey, "none">, string> = {
  upper_body: "Upper body",
  lower_body: "Lower body",
  pull: "Pull",
  push: "Push",
  glutes: "Glutes",
  core: "Core",
};

/**
 * Adaptive plan: show what the user chose on setup (fatigue, phase, load, injuries) — not derived generator energy.
 */
export function buildAdaptiveScheduleContextLines(opts: {
  labels?: AdaptiveScheduleLabels | null;
  weekEmphasis?: BodyEmphasisKey | null;
}): string[] {
  const lines: string[] = [];
  const L = opts.labels;
  if (L) {
    lines.push(`Feel: ${L.fatigue}`);
    lines.push(`Phase: ${L.horizonLabel}`);
    lines.push(`Recent load: ${L.recentLoad}`);
    if (L.injuryStatus !== "No Concerns") {
      lines.push(
        L.injuryAreas?.length
          ? `${L.injuryStatus}: ${L.injuryAreas.join(", ")}`
          : L.injuryStatus
      );
    }
  }
  const em = opts.weekEmphasis;
  if (em != null && em !== "none") {
    lines.push(`Week emphasis: ${EMPHASIS_LABELS[em]}`);
  }
  return lines;
}

export function buildAdaptiveGoalsAndSportsLines(
  snapshot:
    | {
        primaryGoalSlug: string;
        secondaryGoalSlug?: string | null;
        tertiaryGoalSlug?: string | null;
        rankedSportSlugs?: string[];
        sportSlug?: string | null;
      }
    | null
    | undefined
): string[] {
  if (!snapshot) return [];
  const lines: string[] = [];
  const goals = [snapshot.primaryGoalSlug, snapshot.secondaryGoalSlug, snapshot.tertiaryGoalSlug].filter(
    (g): g is string => g != null && g !== ""
  );
  if (goals.length > 0) {
    lines.push(`Goals: ${goals.map((g) => GOAL_SLUG_TO_LABEL[g] ?? humanizeSportSlug(g)).join(", ")}`);
  }
  const sports = snapshot.rankedSportSlugs?.length
    ? snapshot.rankedSportSlugs
    : snapshot.sportSlug
      ? [snapshot.sportSlug]
      : [];
  if (sports.length > 0) {
    lines.push(`Sports: ${sports.map(humanizeSportSlug).join(" • ")}`);
  }
  return lines;
}
