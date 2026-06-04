import type { AdaptiveSetup } from "../context/appStateModel";
import type { SportFormSnapshot } from "./sessionDraft";
import type { Dispatch, SetStateAction } from "react";

export function buildSportFormSnapshot(params: {
  rankedGoals: (string | null)[];
  intensityLevel: string;
  injuryStatus: string;
  injuryTypes: string[];
  sportFocusPct: [number, number];
  sportVsGoalPct: number;
  rankedSportSlugs: (string | null)[];
  subFocusBySport: Record<string, string[]>;
  oneDayDuration: number;
  oneDayBodyBias: "upper" | "lower" | "full";
}): SportFormSnapshot {
  return { ...params };
}

/** Partial hydration from adaptive setup (week flow — schedule step). */
export function buildSportFormSnapshotFromAdaptiveSetup(setup: AdaptiveSetup): SportFormSnapshot {
  return {
    rankedGoals: setup.rankedGoals,
    intensityLevel: setup.intensityLevel,
    injuryStatus: setup.injuryStatus,
    injuryTypes: setup.injuryTypes,
    sportFocusPct: setup.sportFocusPct,
    sportVsGoalPct: setup.sportVsGoalPct ?? 50,
    rankedSportSlugs: setup.rankedSportSlugs,
    subFocusBySport: setup.subFocusBySport,
    oneDayDuration: 45,
    oneDayBodyBias: "full",
  };
}

export type SportFormHydrationTarget = {
  setRankedGoals: Dispatch<SetStateAction<(string | null)[]>>;
  setIntensityLevel: Dispatch<SetStateAction<string>>;
  setInjuryStatus: Dispatch<SetStateAction<string>>;
  setInjuryTypes: Dispatch<SetStateAction<string[]>>;
  setSportFocusPct: Dispatch<SetStateAction<[number, number]>>;
  setSportVsGoalPct: Dispatch<SetStateAction<number>>;
  setRankedSportSlugs: Dispatch<SetStateAction<(string | null)[]>>;
  setSubFocusBySport: Dispatch<SetStateAction<Record<string, string[]>>>;
  setOneDayDuration: Dispatch<SetStateAction<number>>;
  setOneDayBodyBias: Dispatch<SetStateAction<"upper" | "lower" | "full">>;
};

export function applySportFormSnapshot(
  snapshot: SportFormSnapshot,
  target: SportFormHydrationTarget
): void {
  target.setRankedGoals(snapshot.rankedGoals);
  target.setIntensityLevel(snapshot.intensityLevel);
  target.setInjuryStatus(snapshot.injuryStatus);
  target.setInjuryTypes(snapshot.injuryTypes);
  target.setSportFocusPct(snapshot.sportFocusPct);
  target.setSportVsGoalPct(snapshot.sportVsGoalPct);
  target.setRankedSportSlugs(snapshot.rankedSportSlugs);
  target.setSubFocusBySport(snapshot.subFocusBySport);
  target.setOneDayDuration(snapshot.oneDayDuration);
  target.setOneDayBodyBias(snapshot.oneDayBodyBias);
}
