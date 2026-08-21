import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { themeFonts, useTheme } from "../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
};

export function SectionHeader({ title, subtitle, style }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    fontFamily: themeFonts.displaySemi,
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 4,
  },
});
