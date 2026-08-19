import { formatWeekDayLong } from "./weekProgress";
import type { WeekDayToStart } from "./weekProgress";

/**
 * Shared copy for the review → save → train handoff. Goal-week, sport-week, and
 * single-day review screens all read from here so the flow reads identically.
 */

/** Sits under the plan heading, above the editable session list. */
export const REVIEW_AND_ADJUST_HINT =
  "You can review and adjust this workout below.";

export function reviewAndAdjustHint(args: { multipleDays: boolean }): string {
  return args.multipleDays
    ? `Tap a day to open its session. ${REVIEW_AND_ADJUST_HINT}`
    : REVIEW_AND_ADJUST_HINT;
}

export function saveAndExecuteLabel(args: {
  multipleDays: boolean;
  busy?: boolean;
  alreadySaved?: boolean;
}): string {
  if (args.busy) return "Saving…";
  if (args.alreadySaved) return args.multipleDays ? "Start this week" : "Start workout";
  return "Save and start";
}

export function saveAndExecuteHint(args: { multipleDays: boolean }): string {
  return args.multipleDays
    ? "Saves this week to your library, then asks if you want to start today's session."
    : "Saves this workout to your library, then asks if you want to start it.";
}

export function startPromptTitle(target: WeekDayToStart): string {
  return target.isToday ? "Start today's workout?" : "Start your next workout?";
}

export function startPromptBody(target: WeekDayToStart): string {
  const when = target.isToday ? "Today" : formatWeekDayLong(target.day.date);
  return `${when}: ${target.day.title}`;
}

export function startPromptConfirmLabel(target: WeekDayToStart): string {
  return target.isToday
    ? "Start today's workout"
    : `Start ${formatWeekDayLong(target.day.date)}'s workout`;
}

/** Declining the prompt still leaves the plan active, so say where it went. */
export const START_PROMPT_DISMISS_LABEL = "Not right now";
export const START_PROMPT_FOOTNOTE =
  "Either way this plan is saved and waiting for you on the Workout tab.";
