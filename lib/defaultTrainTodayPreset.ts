import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SportPreset, WorkoutPresetKind } from "./sessionDraft";
import type { PreferencePreset } from "./types";

const STORAGE_KEY = "@todayfit/defaultTrainTodayPreset";

/** Pointer to the preset that powers Home → Train today.
 * Device-local only (AsyncStorage) — not synced to Supabase. Intentional for v1.
 */
export type DefaultTrainTodayPresetRef = {
  kind: WorkoutPresetKind;
  id: string;
};

export type ResolvedDefaultTrainTodayPreset =
  | { kind: "goal"; preset: PreferencePreset }
  | { kind: "sport"; preset: SportPreset };

function isWorkoutPresetKind(value: unknown): value is WorkoutPresetKind {
  return value === "goal" || value === "sport";
}

export function parseDefaultTrainTodayPresetRef(
  raw: unknown
): DefaultTrainTodayPresetRef | null {
  if (raw == null || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (!isWorkoutPresetKind(rec.kind) || typeof rec.id !== "string" || !rec.id) {
    return null;
  }
  return { kind: rec.kind, id: rec.id };
}

export async function loadDefaultTrainTodayPreset(): Promise<DefaultTrainTodayPresetRef | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDefaultTrainTodayPresetRef(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveDefaultTrainTodayPreset(
  ref: DefaultTrainTodayPresetRef | null
): Promise<void> {
  try {
    if (ref == null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
  } catch (error) {
    console.warn("[defaultTrainTodayPreset] save failed", error);
  }
}

export function resolveDefaultTrainTodayPreset(
  ref: DefaultTrainTodayPresetRef | null,
  goalPresets: PreferencePreset[],
  sportPresets: SportPreset[]
): ResolvedDefaultTrainTodayPreset | null {
  if (!ref) return null;
  if (ref.kind === "goal") {
    const preset = goalPresets.find((p) => p.id === ref.id);
    return preset ? { kind: "goal", preset } : null;
  }
  const preset = sportPresets.find((p) => p.id === ref.id);
  return preset ? { kind: "sport", preset } : null;
}

function bySavedAtDesc(
  a: { savedAt: string },
  b: { savedAt: string }
): number {
  return (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0);
}

/** After deleting a preset, pick the next default (prefer same kind, most recently saved). */
export function fallbackDefaultAfterRemoval(
  removed: DefaultTrainTodayPresetRef,
  goalPresets: PreferencePreset[],
  sportPresets: SportPreset[]
): DefaultTrainTodayPresetRef | null {
  const sameKind =
    removed.kind === "goal"
      ? [...goalPresets].sort(bySavedAtDesc)
      : [...sportPresets].sort(bySavedAtDesc);
  if (sameKind.length > 0) {
    return { kind: removed.kind, id: sameKind[0]!.id };
  }
  const goals = [...goalPresets].sort(bySavedAtDesc);
  if (goals.length > 0) return { kind: "goal", id: goals[0]!.id };
  const sports = [...sportPresets].sort(bySavedAtDesc);
  if (sports.length > 0) return { kind: "sport", id: sports[0]!.id };
  return null;
}

/** When the stored pointer is missing or stale, recover to the most recently saved preset. */
export function recoverDefaultTrainTodayPreset(
  ref: DefaultTrainTodayPresetRef | null,
  goalPresets: PreferencePreset[],
  sportPresets: SportPreset[]
): DefaultTrainTodayPresetRef | null {
  if (resolveDefaultTrainTodayPreset(ref, goalPresets, sportPresets)) return ref;
  if (ref != null) {
    return fallbackDefaultAfterRemoval(ref, goalPresets, sportPresets);
  }
  const goals = [...goalPresets].sort(bySavedAtDesc);
  if (goals.length > 0) return { kind: "goal", id: goals[0]!.id };
  const sports = [...sportPresets].sort(bySavedAtDesc);
  if (sports.length > 0) return { kind: "sport", id: sports[0]!.id };
  return null;
}
