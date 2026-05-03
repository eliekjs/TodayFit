import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
