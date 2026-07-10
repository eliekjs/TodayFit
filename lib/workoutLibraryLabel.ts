import { parseLocalDate } from "./dateUtils";

/** Parse stored workout dates (YYYY-MM-DD or ISO timestamps). */
export function parseWorkoutLibraryDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  if (date.includes("T")) return new Date(date);
  return parseLocalDate(date);
}

/** Short date line for library cards — e.g. "Thu, Jul 9, 2026". */
export function formatWorkoutLibraryDate(date: string | Date): string {
  return parseWorkoutLibraryDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Join focus labels with a subtle separator instead of bullet dots. */
export function formatWorkoutFocusLabel(
  focusAreas: string[],
  fallback = "General training"
): string {
  const areas = focusAreas.map((f) => f.trim()).filter(Boolean);
  return areas.length > 0 ? areas.join(" · ") : fallback;
}

/** Stable key for grouping duplicate workouts on the same day with the same focus. */
export function workoutLibraryDedupKey(
  date: string | Date,
  focusAreas: string[]
): string {
  const d = parseWorkoutLibraryDate(date);
  const dateKey = d.toLocaleDateString();
  const focusKey = formatWorkoutFocusLabel(focusAreas, "General training");
  return `${dateKey}|${focusKey}`;
}
