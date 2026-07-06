/**
 * Inline conflict prompt for a single day in weekly session-focus setup.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Theme } from "../lib/theme";
import type {
  DaySessionFocusConflict,
  DaySessionFocusResolution,
} from "../lib/daySessionFocusConflict";

type Props = {
  theme: Theme;
  conflict: DaySessionFocusConflict;
  resolvedId?: string;
  onApplyResolution: (resolution: DaySessionFocusResolution) => void;
};

const ACCENT = "#f59e0b";

export function DaySessionFocusConflictBanner({
  theme,
  conflict,
  resolvedId,
  onApplyResolution,
}: Props) {
  const isResolved = resolvedId === conflict.id;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isResolved ? `${theme.primary}14` : theme.card,
          borderColor: isResolved ? theme.primary : ACCENT,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: isResolved ? theme.primarySolid : ACCENT }]} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: isResolved ? theme.primary : ACCENT }]}>
          {isResolved ? "Resolved" : "Needs alignment"}
        </Text>
        <Text style={[styles.message, { color: theme.text }]}>
          {isResolved
            ? "This day's body focus and sub-goals are aligned."
            : conflict.message}
        </Text>
        {!isResolved && conflict.resolutions.length > 0 ? (
          <View style={styles.resolutionRow}>
            {conflict.resolutions.map((res, idx) => {
              const isPrimary = idx === 0;
              return (
                <Pressable
                  key={res.id}
                  onPress={() => onApplyResolution(res)}
                  style={({ pressed }) => [
                    styles.resolutionBtn,
                    {
                      backgroundColor: isPrimary ? `${ACCENT}26` : "transparent",
                      borderColor: isPrimary ? ACCENT : theme.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.resolutionBtnText,
                      { color: isPrimary ? ACCENT : theme.textMuted },
                    ]}
                  >
                    {res.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
  },
  resolutionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  resolutionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  resolutionBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
