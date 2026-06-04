/**
 * Maps built gym/sport session slots onto calendar weekdays when the user picks
 * explicit gym days and per-sport days (Sport Mode schedule screen).
 */

export type WeekDaySlot =
  | { type: "gym"; key: string }
  | { type: "sport"; sportSlug: string; discipline?: string };

export function hasExplicitWeekDaySchedule(
  gymTrainingDays?: number[],
  sportTrainingDaysBySlug?: Record<string, number[]>
): boolean {
  if ((gymTrainingDays?.length ?? 0) > 0) return true;
  return Object.values(sportTrainingDaysBySlug ?? {}).some((days) => days.length > 0);
}

/** Sorted union of gym and sport weekday indices (0=Mon .. 6=Sun). */
export function unionTrainingDayIndices(
  gymTrainingDays: number[],
  sportTrainingDaysBySlug: Record<string, number[]>
): number[] {
  const set = new Set<number>();
  for (const d of gymTrainingDays) {
    if (d >= 0 && d < 7) set.add(d);
  }
  for (const days of Object.values(sportTrainingDaysBySlug)) {
    for (const d of days) {
      if (d >= 0 && d < 7) set.add(d);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function partitionWeekDaySlots<T extends WeekDaySlot>(slots: T[]): {
  gymSlots: T[];
  sportSlotsBySlug: Record<string, T[]>;
} {
  const gymSlots: T[] = [];
  const sportSlotsBySlug: Record<string, T[]> = {};
  for (const slot of slots) {
    if (slot.type === "gym") {
      gymSlots.push(slot);
      continue;
    }
    const slug = slot.sportSlug;
    (sportSlotsBySlug[slug] ??= []).push(slot);
  }
  return { gymSlots, sportSlotsBySlug };
}

type PickState = { gymIdx: number; sportIdxBySlug: Record<string, number> };

function dequeueSportSlot<T extends WeekDaySlot>(
  sportsOnDay: string[],
  rankedSportSlugs: string[],
  sportSlotsBySlug: Record<string, T[]>,
  state: PickState
): T | null {
  for (const slug of rankedSportSlugs) {
    if (!sportsOnDay.includes(slug)) continue;
    const queue = sportSlotsBySlug[slug] ?? [];
    const i = state.sportIdxBySlug[slug] ?? 0;
    if (i < queue.length) {
      state.sportIdxBySlug[slug] = i + 1;
      return queue[i];
    }
  }
  return null;
}

/**
 * Assign the next session slot for a calendar day.
 * Sport-only days get sport slots; gym days get gym slots (sport on overlap only if gym queue is empty).
 */
export function pickSlotForCalendarDay<T extends WeekDaySlot>(
  dayIdx: number,
  gymTrainingDays: Set<number>,
  sportTrainingDaysBySlug: Record<string, number[]>,
  rankedSportSlugs: string[],
  gymSlots: T[],
  sportSlotsBySlug: Record<string, T[]>,
  state: PickState
): T | null {
  const sportsOnDay = rankedSportSlugs.filter((slug) =>
    (sportTrainingDaysBySlug[slug] ?? []).includes(dayIdx)
  );
  const isGymDay = gymTrainingDays.has(dayIdx);
  const isSportOnlyDay = sportsOnDay.length > 0 && !isGymDay;

  if (isSportOnlyDay) {
    return dequeueSportSlot(sportsOnDay, rankedSportSlugs, sportSlotsBySlug, state);
  }

  if (isGymDay && state.gymIdx < gymSlots.length) {
    return gymSlots[state.gymIdx++];
  }

  if (isGymDay && sportsOnDay.length > 0) {
    return dequeueSportSlot(sportsOnDay, rankedSportSlugs, sportSlotsBySlug, state);
  }

  return null;
}

/**
 * Reorder slots so gym and sport alternate (legacy when weekdays are not specified).
 */
export function interleaveGymAndSportSlots<T extends WeekDaySlot>(slots: T[]): T[] {
  const gym: T[] = [];
  const sport: T[] = [];
  for (const s of slots) {
    if (s.type === "gym") gym.push(s);
    else sport.push(s);
  }
  const result: T[] = [];
  let gi = 0;
  let si = 0;
  for (let i = 0; i < slots.length; i++) {
    if (i % 2 === 0 && gi < gym.length) {
      result.push(gym[gi++]);
    } else if (si < sport.length) {
      result.push(sport[si++]);
    } else {
      result.push(gym[gi++]);
    }
  }
  while (gi < gym.length) result.push(gym[gi++]);
  while (si < sport.length) result.push(sport[si++]);
  return result;
}

export function createExplicitWeekSlotPicker<T extends WeekDaySlot>(
  gymTrainingDays: number[],
  sportTrainingDaysBySlug: Record<string, number[]>,
  rankedSportSlugs: string[],
  daySlots: T[]
): (dayIdx: number) => T | null {
  const gymDaySet = new Set(gymTrainingDays.filter((d) => d >= 0 && d < 7));
  const { gymSlots, sportSlotsBySlug } = partitionWeekDaySlots(daySlots);
  const state: PickState = { gymIdx: 0, sportIdxBySlug: {} };
  return (dayIdx: number) =>
    pickSlotForCalendarDay(
      dayIdx,
      gymDaySet,
      sportTrainingDaysBySlug,
      rankedSportSlugs,
      gymSlots,
      sportSlotsBySlug,
      state
    );
}
