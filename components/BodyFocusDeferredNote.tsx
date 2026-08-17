/**
 * Explains that body-part / pattern / muscle-day picks happen on the next
 * week page instead of as first-page sub-goals.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";

export function BodyFocusDeferredNote() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.primary,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.primary }]}>Note</Text>
        <Text style={[styles.title, { color: theme.text }]}>Body focus is on the next page</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          You’ll choose body parts, patterns (push / pull / legs), or muscle days when you set
          each training day — not as sub-goals here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: themeRadius.card,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
