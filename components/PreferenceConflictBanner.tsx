/**
 * PreferenceConflictBanner: shows the top 1–2 preference conflicts with inline resolution buttons.
 * Conflicts are advisory only — user can always dismiss and proceed (unless an id is in
 * `resolutionRequiredIds`, used for daily body-focus resolve mode).
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
  /**
   * Conflict ids that must be resolved (no ✕ dismiss) — typically body-focus conflicts in
   * daily "focus & resolve" mode. Advisory cards (opposing goals, etc.) stay dismissible.
   */
  resolutionRequiredIds?: string[];
  /**
   * @deprecated Prefer `resolutionRequiredIds` so only body-focus cards lock. When true and
   * `resolutionRequiredIds` is omitted, every visible card hides ✕ (legacy).
   */
  requireResolution?: boolean;
};

const HIGH_COLOR = "#f59e0b"; // amber — high severity
const MEDIUM_COLOR = "#3b82f6"; // blue — medium severity

function patchIsAcknowledgeOnly(patch: Partial<ManualPreferences>): boolean {
  return Object.keys(patch).length === 0;
}

function animateLayout() {
  if (Platform.OS === "web") return;
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function PreferenceConflictBanner({
  conflicts,
  dismissedIds,
  currentPrefs,
  onDismiss,
  onApplyResolution,
  resolutionRequiredIds,
  requireResolution = false,
}: Props) {
  const theme = useTheme();
  const requiredIds =
    resolutionRequiredIds ??
    (requireResolution ? conflicts.map((c) => c.id) : []);
  const requiredSet = new Set(requiredIds);

  const visible = conflicts
    .filter((c) => !dismissedIds.includes(c.id))
    .slice(0, 2);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {visible.map((conflict) => {
        const accentColor = conflict.severity === "high" ? HIGH_COLOR : MEDIUM_COLOR;
        const mustResolve = requiredSet.has(conflict.id);
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
                  {mustResolve
                    ? "Needs alignment"
                    : conflict.severity === "high"
                      ? "Heads up"
                      : "Note"}
                </Text>
                {!mustResolve ? (
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      animateLayout();
                      onDismiss(conflict.id);
                    }}
                    style={styles.dismissBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${conflict.id}`}
                  >
                    <Text style={[styles.dismissText, { color: theme.textMuted }]}>✕</Text>
                  </Pressable>
                ) : null}
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
                        key={`${conflict.id}:${res.label}`}
                        onPress={() => {
                          animateLayout();
                          const patch = res.apply(currentPrefs ?? ({} as ManualPreferences));
                          // Acknowledge-only: dismiss just this card.
                          // Real preference changes: apply and let the detector drop resolved
                          // cards — never dismiss siblings / unrelated advisories.
                          if (patchIsAcknowledgeOnly(patch)) {
                            onDismiss(conflict.id);
                            return;
                          }
                          onApplyResolution(patch);
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
                        accessibilityRole="button"
                        accessibilityLabel={res.label}
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
