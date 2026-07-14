import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { SupportedStorage } from "@supabase/supabase-js";

const WEB_PREFIX = "todayfit-auth:";

/**
 * Supabase auth storage: SecureStore on native (tokens), AsyncStorage on web.
 * SecureStore values are capped (~2KB); large sessions fall back to AsyncStorage.
 */
export const supabaseAuthStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(WEB_PREFIX + key);
    }
    try {
      const secure = await SecureStore.getItemAsync(key);
      if (secure != null) return secure;
      return AsyncStorage.getItem(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(WEB_PREFIX + key, value);
      return;
    }
    try {
      if (value.length < 1800) {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // fall through to AsyncStorage
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(WEB_PREFIX + key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(key);
  },
};
