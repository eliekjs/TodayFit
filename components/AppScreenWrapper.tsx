import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Wraps in-app screen content with TodayFit background + geometric pattern. */
export function AppScreenWrapper({ children, style }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
