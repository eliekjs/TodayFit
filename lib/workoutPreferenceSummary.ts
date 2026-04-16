import {
  GOAL_SLUG_TO_LABEL,
  ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY,
} from "./preferencesConstants";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import { SPECIFIC_FOCUS_LABELS } from "./dayTitle";
import type {
  AdaptiveScheduleLabels,
  BodyEmphasisKey,
  DailyWorkoutPreferences,
  GoalDistributionStyle,
  ManualPreferences,
  SpecificBodyFocusKey,
} from "./types";

function humanizeSportSlug(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveSportSubFocusLabels(sportSlug: string, slugs: string[]): string[] {
  if (!slugs.length) return [];
  const canonical = getCanonicalSportSlug(sportSlug);
  const sport = SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === canonical);
  if (!sport) return slugs.map(humanizeSportSlug);
  return slugs.map((slug) => {
    const hit = sport.sub_focuses.find((sf) => sf.slug === slug);
    return hit?.name ?? humanizeSportSlug(slug);
  });
}

function subGoalsForGoalSlug(
  goalSlug: string,
  snapshotSubs: Record<string, string[]> | undefined,
  manualSubs: Record<string, string[]> | undefined
): string[] {
  const manualKey = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalSlug];
  if (!manualKey) return [];
  const fromSnap = snapshotSubs?.[manualKey];
  if (fromSnap?.length) return fromSnap;
  const fromManual = manualSubs?.[manualKey];
  return fromManual?.length ? fromManual : [];
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

export type BuildAdaptiveGoalsAndSportsOptions = {
  /**
   * When the plan snapshot has no goal sub-focus (legacy), use live manual prefs so the summary
   * still lists sub-goals the user selected in Sport Mode.
   */
  manualSubFocusByGoal?: Record<string, string[]>;
};

export function buildAdaptiveGoalsAndSportsLines(
  snapshot:
    | {
        primaryGoalSlug: string | null;
        secondaryGoalSlug?: string | null;
        tertiaryGoalSlug?: string | null;
        rankedSportSlugs?: string[];
        sportSlug?: string | null;
        sportQualitySlugs?: string[];
        sportSubFocusSlugs?: string[];
        sportSubFocusSlugsBySport?: Record<string, string[]>;
        sportFocusPct?: [number, number];
        sportVsGoalPct?: number;
        goalSubFocusByGoal?: Record<string, string[]>;
        goalDistributionStyle?: GoalDistributionStyle | null;
        specificBodyPartEmphasis?: SpecificBodyFocusKey[] | null;
      }
    | null
    | undefined,
  opts?: BuildAdaptiveGoalsAndSportsOptions
): string[] {
  if (!snapshot) return [];
  const lines: string[] = [];
  const snapGoalSubs = snapshot.goalSubFocusByGoal;
  const manualGoalSubs = opts?.manualSubFocusByGoal;

  const goals = [snapshot.primaryGoalSlug, snapshot.secondaryGoalSlug, snapshot.tertiaryGoalSlug].filter(
    (g): g is string => g != null && g !== ""
  );
  if (goals.length > 0) {
    const goalParts = goals.map((g) => {
      const title = GOAL_SLUG_TO_LABEL[g] ?? humanizeSportSlug(g);
      const subs = subGoalsForGoalSlug(g, snapGoalSubs, manualGoalSubs);
      return subs.length ? `${title} (${subs.join(", ")})` : title;
    });
    lines.push(`Goals: ${goalParts.join(" • ")}`);
  }

  const sports = snapshot.rankedSportSlugs?.length
    ? snapshot.rankedSportSlugs
    : snapshot.sportSlug
      ? [snapshot.sportSlug]
      : [];
  if (sports.length > 0) {
    const sportParts = sports.map((sportKey) => {
      const base = humanizeSportSlug(sportKey);
      const rawSubs =
        snapshot.sportSubFocusSlugsBySport?.[sportKey] ??
        (sportKey === snapshot.sportSlug ? snapshot.sportSubFocusSlugs : undefined) ??
        [];
      const subLabels = resolveSportSubFocusLabels(sportKey, rawSubs);
      const qualitySlugs =
        sportKey === snapshot.sportSlug && snapshot.sportQualitySlugs?.length
          ? snapshot.sportQualitySlugs
          : [];
      const qualityLabels = qualitySlugs.map(humanizeSportSlug);
      const detail = [...subLabels, ...qualityLabels];
      return detail.length ? `${base} (${detail.join(", ")})` : base;
    });
    lines.push(`Sports: ${sportParts.join(" • ")}`);
  }

  if (
    snapshot.sportVsGoalPct != null &&
    goals.length > 0 &&
    sports.length > 0
  ) {
    const s = Math.round(snapshot.sportVsGoalPct);
    lines.push(`Sport vs goals: ${s}% sport · ${100 - s}% goals`);
  }

  if (snapshot.sportFocusPct?.length === 2 && sports.length === 2) {
    const [a, b] = snapshot.sportFocusPct;
    lines.push(
      `Sport mix: ${Math.round(a)}% ${humanizeSportSlug(sports[0])} · ${Math.round(b)}% ${humanizeSportSlug(sports[1])}`
    );
  }

  if (snapshot.goalDistributionStyle && goals.length > 0) {
    lines.push(
      snapshot.goalDistributionStyle === "dedicate_days"
        ? "Gym: one main goal per day"
        : "Gym: blended goals across days"
    );
  }

  if (snapshot.specificBodyPartEmphasis?.length) {
    const labels = snapshot.specificBodyPartEmphasis.map(
      (k) => SPECIFIC_FOCUS_LABELS[k] ?? humanizeSportSlug(k)
    );
    lines.push(`Body targets: ${labels.join(", ")}`);
  }

  return lines;
}
