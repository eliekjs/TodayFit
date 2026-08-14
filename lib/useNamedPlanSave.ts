import { useCallback, useRef, useState } from "react";
import { useAppState } from "../context/AppStateContext";
import {
  defaultSavedDayName,
  defaultSavedWeekName,
  rememberSavedPlanFingerprint,
  savedDayFingerprint,
  savedWeekFingerprint,
  wasPlanSavedThisSession,
  type SavedPlanKind,
} from "./saveNamedPlan";
import type { GeneratedWorkout, ManualWeekPlan, SavedWeek } from "./types";

type SaveDialog = {
  kind: SavedPlanKind;
  defaultName: string;
  fingerprint: string;
  item: Omit<SavedWeek, "id">;
  onSaved?: () => void;
};

export function useNamedPlanSave() {
  const { addSavedWeek } = useAppState();
  const [dialog, setDialog] = useState<SaveDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedEpoch, setSavedEpoch] = useState(0);
  const savingRef = useRef(false);

  const isSaved = useCallback(
    (fingerprint: string) => wasPlanSavedThisSession(fingerprint),
    [savedEpoch]
  );

  const requestSaveDay = useCallback(
    (args: {
      date: string;
      workout: GeneratedWorkout;
      weekStartDate: string;
      source: SavedWeek["source"];
      displayTitle?: string;
      onSaved?: () => void;
    }) => {
      const fingerprint = savedDayFingerprint(args.date, args.workout.id);
      if (wasPlanSavedThisSession(fingerprint) || busy || dialog || savingRef.current) return;
      setDialog({
        kind: "day",
        defaultName: defaultSavedDayName(args.date, args.workout, args.displayTitle),
        fingerprint,
        onSaved: args.onSaved,
        item: {
          savedAt: new Date().toISOString(),
          weekStartDate: args.weekStartDate,
          days: [
            {
              date: args.date,
              workout: args.workout,
              displayTitle: args.displayTitle,
            },
          ],
          source: args.source,
          singleDay: true,
        },
      });
    },
    [busy, dialog]
  );

  const requestSaveWeek = useCallback(
    (args: {
      weekStartDate: string;
      days: ManualWeekPlan["days"];
      source: SavedWeek["source"];
      onSaved?: () => void;
    }) => {
      if (args.days.length === 0 || busy || dialog || savingRef.current) return;
      const fingerprint = savedWeekFingerprint(args.weekStartDate, args.days);
      if (wasPlanSavedThisSession(fingerprint)) return;
      setDialog({
        kind: "week",
        defaultName: defaultSavedWeekName(args.weekStartDate),
        fingerprint,
        onSaved: args.onSaved,
        item: {
          savedAt: new Date().toISOString(),
          weekStartDate: args.weekStartDate,
          days: args.days,
          source: args.source,
          singleDay: false,
        },
      });
    },
    [busy, dialog]
  );

  const confirmSave = useCallback(
    async (name: string) => {
      if (!dialog || busy || savingRef.current) return;
      savingRef.current = true;
      setBusy(true);
      try {
        const trimmed = name.trim() || dialog.defaultName;
        const ok = await addSavedWeek({ ...dialog.item, name: trimmed });
        if (!ok) return;
        rememberSavedPlanFingerprint(dialog.fingerprint);
        setSavedEpoch((n) => n + 1);
        const onSaved = dialog.onSaved;
        setDialog(null);
        onSaved?.();
      } finally {
        savingRef.current = false;
        setBusy(false);
      }
    },
    [addSavedWeek, busy, dialog]
  );

  const cancelSave = useCallback(() => {
    if (busy || savingRef.current) return;
    setDialog(null);
  }, [busy]);

  return {
    dialog,
    busy,
    isSaved,
    requestSaveDay,
    requestSaveWeek,
    confirmSave,
    cancelSave,
  };
}
