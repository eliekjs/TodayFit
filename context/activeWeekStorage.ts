import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildActiveWeekSnapshot,
  parseActiveWeekSnapshot,
  type ActiveWeekSnapshot,
  type ActiveWeekSnapshotInput,
} from "../lib/activeWeekSnapshot";

const STORAGE_KEY = "@todayfit/activeWeek";

export async function loadActiveWeekSnapshot(): Promise<ActiveWeekSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseActiveWeekSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveActiveWeekSnapshot(input: ActiveWeekSnapshotInput): Promise<void> {
  try {
    const snapshot = buildActiveWeekSnapshot(input);
    if (!snapshot) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("[activeWeekStorage] save failed", error);
  }
}

export async function clearActiveWeekSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[activeWeekStorage] clear failed", error);
  }
}
