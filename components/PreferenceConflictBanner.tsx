/**
 * PreferenceConflictBanner: shows the top 1–2 preference conflicts with inline resolution buttons.
 * Conflicts are advisory only — user can always dismiss and proceed.
 */

import React from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import type { ManualPreferences } from "../lib/types";
import type { PreferenceConflict } from "../lib/preferenceConflictDetector";
import { useTheme } from "../lib/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  conflicts: PreferenceConflict[];
  dismissedIds: string[];
  /** Current preferences — passed to resolution.apply() so patch can reference existing state. */
  currentPrefs?: ManualPreferences;
  onDismiss: (id: string) => void;
  onApplyResolution: (patch: Partial<ManualPreferences>) => void;
};

const HIGH_COLOR = "#f59e0b";    // amber — high severity
const MEDIUM_COLOR = "#3b82f6";  // blue — medium severity

export function PreferenceConflictBanner({
  conflicts,
  dismissedIds,
  currentPrefs,
  onDismiss,
  onApplyResolution,
}: Props) {
  const theme = useTheme();

  const visible = conflicts
    .filter((c) => !dismissedIds.includes(c.id))
    .slice(0, 2);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {visible.map((conflict) => {
        const accentColor = conflict.severity === "high" ? HIGH_COLOR : MEDIUM_COLOR;
        return (
          <View
            key={conflict.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: accentColor,
              },
            ]}
          >
            <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text style={[styles.severityLabel, { color: accentColor }]}>
                  {conflict.severity === "high" ? "Heads up" : "Note"}
                </Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    onDismiss(conflict.id);
                  }}
                  style={styles.dismissBtn}
                >
                  <Text style={[styles.dismissText, { color: theme.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <Text style={[styles.message, { color: theme.text }]}>
                {conflict.message}
              </Text>

              {conflict.resolutions.length > 0 && (
                <View style={styles.resolutionRow}>
                  {conflict.resolutions.slice(0, 2).map((res, idx) => {
                    const isPrimary = idx === 0;
                    return (
                      <Pressable
                        key={res.label}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          const patch = res.apply(currentPrefs ?? ({} as ManualPreferences));
                          onApplyResolution(patch);
                          onDismiss(conflict.id);
                        }}
                        style={({ pressed }) => [
                          styles.resolutionBtn,
                          {
                            backgroundColor: isPrimary
                              ? `${accentColor}26`
                              : "transparent",
                            borderColor: isPrimary ? accentColor : theme.border,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.resolutionBtnText,
                            {
                              color: isPrimary ? accentColor : theme.textMuted,
                            },
                          ]}
                        >
                          {res.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 20,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  severityLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingLeft: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "500",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  resolutionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  resolutionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  resolutionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
