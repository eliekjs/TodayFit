import { getWeekStartMonday } from "./dateUtils";
import type { WorkoutHistoryItem } from "./types";

export function sortBySavedAtNewestFirst<T extends { savedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export type HistoryWeekGroup = {
  weekStartDate: string;
  items: WorkoutHistoryItem[];
};

function historyItemDateKey(date: string): string {
  return date.slice(0, 10);
}

/**
 * Completed sessions, newest week first, newest session first within a week.
 * Used so History can offer "Redo week" after a multi-session week is finished.
 */
export function groupCompletedHistoryByWeek(
  items: WorkoutHistoryItem[]
): HistoryWeekGroup[] {
  const newestFirst = [...items].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
  const groups = new Map<string, WorkoutHistoryItem[]>();
  const weekOrder: string[] = [];
  for (const item of newestFirst) {
    const weekStartDate = getWeekStartMonday(historyItemDateKey(item.date));
    const existing = groups.get(weekStartDate);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(weekStartDate, [item]);
      weekOrder.push(weekStartDate);
    }
  }
  return weekOrder.map((weekStartDate) => ({
    weekStartDate,
    items: groups.get(weekStartDate) ?? [],
  }));
}

export function historyWeekCanRedo(group: HistoryWeekGroup): boolean {
  return group.items.filter((item) => item.workout != null).length >= 2;
}
