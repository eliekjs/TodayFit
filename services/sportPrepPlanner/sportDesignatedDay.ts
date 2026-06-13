/** Stored in DB `intent_label` for sport-designated days (no generated workout). */
export const SPORT_DAY_INTENT_PREFIX = "[sport-day] ";

export type PlannedDaySessionKind = "gym" | "sport";

/** Subset of PlannedDay fields used by sport-day helpers (avoids circular import with index). */
export type SportDesignatedPlannedDay = {
  id: string;
  date: string;
  title?: string | null;
  intentLabel: string | null;
  status: "planned" | "completed" | "skipped";
  generatedWorkoutId: string | null;
  sessionKind?: PlannedDaySessionKind;
  sportSlug?: string | null;
};

function humanizeSportSlug(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function sportDesignatedDayLabel(
  sportSlug: string,
  discipline?: string
): string {
  if (sportSlug === "triathlon" && discipline) {
    return discipline.charAt(0).toUpperCase() + discipline.slice(1);
  }
  return humanizeSportSlug(sportSlug);
}

/** Sports the user assigned to this weekday (0=Mon .. 6=Sun). */
export function getSportsOnCalendarDay(
  dayIdx: number,
  rankedSportSlugs: string[],
  sportTrainingDaysBySlug: Record<string, number[]> | undefined
): string[] {
  if (!sportTrainingDaysBySlug) return [];
  return rankedSportSlugs.filter((slug) =>
    (sportTrainingDaysBySlug[slug] ?? []).includes(dayIdx)
  );
}

export function buildSportDesignatedPlannedDay(params: {
  id: string;
  date: string;
  sportSlug: string;
  discipline?: string;
}): SportDesignatedPlannedDay {
  const sportLabel = sportDesignatedDayLabel(params.sportSlug, params.discipline);
  const title = `${sportLabel} — Sport day`;
  return {
    id: params.id,
    date: params.date,
    sessionKind: "sport",
    sportSlug: params.sportSlug,
    title,
    intentLabel: `${SPORT_DAY_INTENT_PREFIX}${params.sportSlug}`,
    status: "planned",
    generatedWorkoutId: null,
  };
}

export function isSportDesignatedPlannedDay(
  day: Pick<SportDesignatedPlannedDay, "sessionKind" | "intentLabel">
): boolean {
  return (
    day.sessionKind === "sport" ||
    (day.intentLabel?.startsWith(SPORT_DAY_INTENT_PREFIX) ?? false)
  );
}

export function sportSlugFromPlannedDay(
  day: Pick<SportDesignatedPlannedDay, "sportSlug" | "intentLabel">
): string | null {
  if (day.sportSlug) return day.sportSlug;
  if (day.intentLabel?.startsWith(SPORT_DAY_INTENT_PREFIX)) {
    const slug = day.intentLabel.slice(SPORT_DAY_INTENT_PREFIX.length).trim();
    return slug || null;
  }
  return null;
}

export function sportDesignatedDayDisplayTitle(
  day: Pick<SportDesignatedPlannedDay, "title" | "sportSlug" | "intentLabel">
): string {
  if (day.title?.trim()) return day.title.trim();
  const slug = sportSlugFromPlannedDay(day);
  return slug ? `${sportDesignatedDayLabel(slug)} — Sport day` : "Sport day";
}

export function plannedDayFromDbRow(row: {
  id: string;
  date: string;
  intent_label: string | null;
  status: "planned" | "completed" | "skipped" | null;
  generated_workout_id: string | null;
}): SportDesignatedPlannedDay {
  const intentLabel = row.intent_label ?? null;
  const isSport = intentLabel?.startsWith(SPORT_DAY_INTENT_PREFIX) ?? false;
  const sportSlug = isSport ? sportSlugFromPlannedDay({ intentLabel }) : null;
  const title = isSport && sportSlug
    ? `${sportDesignatedDayLabel(sportSlug)} — Sport day`
    : intentLabel;

  return {
    id: row.id,
    date: row.date,
    title,
    intentLabel,
    status: row.status ?? "planned",
    generatedWorkoutId: row.generated_workout_id,
    ...(isSport
      ? {
          sessionKind: "sport" as const,
          sportSlug: sportSlug ?? undefined,
        }
      : {}),
  };
}
