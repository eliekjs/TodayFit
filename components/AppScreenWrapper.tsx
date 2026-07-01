import React from "react";
import { View, StyleSheet, Platform, type ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSessionBannerInset } from "./ActiveSessionCard";
import { useTheme } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Wraps in-app screen content above the root geometric background (`app/_layout.tsx`). */
export function AppScreenWrapper({ children, style }: Props) {
  const isFocused = useIsFocused();
  const bannerInset = useSessionBannerInset();
  const theme = useTheme();

  /** RN Web keeps every tab route mounted; hide unfocused scenes to avoid stacked UI (see FocusAwareTabHeader). */
  if (Platform.OS === "web" && !isFocused) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      <View style={[styles.foreground, bannerInset > 0 ? { paddingTop: bannerInset } : null]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /** Anchor for absolute children (e.g. sticky footers) on web; default static can mis-place `bottom: 0`. */
    position: "relative",
    ...(Platform.OS === "web"
      ? ({
          minHeight: 0,
        } as const)
      : null),
  },
  /** Scene content above background; flex chain fixes web sticky footers anchoring mid-screen. */
  foreground: {
    flex: 1,
    position: "relative",
    ...(Platform.OS === "web" ? ({ minHeight: 0 } as const) : null),
  },
});
