import { useCallback, useState } from "react";
import { useNamedPlanSave } from "./useNamedPlanSave";
import { savedDayFingerprint, savedWeekFingerprint } from "./saveNamedPlan";
import {
  buildManualWeekProgress,
  pickTodayOrNextDay,
  type WeekDayToStart,
  type WeekProgressDay,
} from "./weekProgress";
import type { ManualWeekPlan, SavedWeek } from "./types";

export type SaveAndExecuteRequest = {
  kind: "day" | "week";
  weekStartDate: string;
  /** For `kind: "day"`, exactly one entry. */
  days: ManualWeekPlan["days"];
  source: SavedWeek["source"];
  /** Runs once the plan is in the library, before the start prompt opens. */
  onSaved?: () => void;
  /** User accepted the prompt — begin executing this session. */
  onStart: (day: WeekProgressDay) => void;
  /** User declined the prompt, or there was nothing left to start. */
  onDecline?: () => void;
};

/**
 * Review → save to library → offer to start today's session. Shared by the goal-week,
 * sport-week, and single-day review screens so the handoff behaves the same everywhere.
 */
export function useSaveAndExecute() {
  const save = useNamedPlanSave();
  const [pending, setPending] = useState<{
    target: WeekDayToStart;
    onStart: (day: WeekProgressDay) => void;
    onDecline?: () => void;
  } | null>(null);

  const requestSaveAndExecute = useCallback(
    (request: SaveAndExecuteRequest) => {
      if (request.days.length === 0) return;
      const target = pickTodayOrNextDay(
        buildManualWeekProgress({
          weekStartDate: request.weekStartDate,
          days: request.days,
        }).days
      );

      const afterSave = () => {
        request.onSaved?.();
        if (!target) {
          request.onDecline?.();
          return;
        }
        setPending({ target, onStart: request.onStart, onDecline: request.onDecline });
      };

      const firstDay = request.days[0]!;
      const fingerprint =
        request.kind === "week"
          ? savedWeekFingerprint(request.weekStartDate, request.days)
          : savedDayFingerprint(firstDay.date, firstDay.workout.id);

      // Re-pressing after a save should still offer to train, not silently do nothing.
      if (save.isSaved(fingerprint)) {
        afterSave();
        return;
      }

      if (request.kind === "week") {
        save.requestSaveWeek({
          weekStartDate: request.weekStartDate,
          days: request.days,
          source: request.source,
          onSaved: afterSave,
        });
        return;
      }

      save.requestSaveDay({
        date: firstDay.date,
        workout: firstDay.workout,
        weekStartDate: request.weekStartDate,
        source: request.source,
        displayTitle: firstDay.displayTitle,
        onSaved: afterSave,
      });
    },
    [save]
  );

  const confirmStart = useCallback(() => {
    if (!pending) return;
    const { target, onStart } = pending;
    setPending(null);
    onStart(target.day);
  }, [pending]);

  const dismissStart = useCallback(() => {
    if (!pending) return;
    const { onDecline } = pending;
    setPending(null);
    onDecline?.();
  }, [pending]);

  return {
    save,
    startTarget: pending?.target ?? null,
    requestSaveAndExecute,
    confirmStart,
    dismissStart,
  };
}
