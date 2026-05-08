import React from "react";
import { View, StyleSheet, Platform, type ViewStyle } from "react-native";
import { GeometricPatternBackground } from "./GeometricPatternBackground";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Wraps in-app screen content with TodayFit background + geometric pattern. */
export function AppScreenWrapper({ children, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <GeometricPatternBackground />
      <View style={styles.foreground}>{children}</View>
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
