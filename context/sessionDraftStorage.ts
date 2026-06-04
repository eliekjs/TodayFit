import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModeFilterSnapshot, SessionFlow } from "../lib/sessionDraft";

const STORAGE_KEY = "@todayfit/lastEditedFiltersByMode";

export type LastEditedFiltersByMode = Partial<Record<SessionFlow, ModeFilterSnapshot>>;

export async function loadLastEditedFiltersByMode(): Promise<LastEditedFiltersByMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastEditedFiltersByMode;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveLastEditedFiltersByMode(data: LastEditedFiltersByMode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("[sessionDraftStorage] save failed", error);
  }
}

export async function persistModeFilterSnapshot(
  flow: SessionFlow,
  snapshot: ModeFilterSnapshot,
  existing?: LastEditedFiltersByMode
): Promise<LastEditedFiltersByMode> {
  const base = existing ?? (await loadLastEditedFiltersByMode());
  const next = { ...base, [flow]: snapshot };
  await saveLastEditedFiltersByMode(next);
  return next;
}
