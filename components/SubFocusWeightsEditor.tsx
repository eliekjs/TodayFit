import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import type { Theme } from "../lib/theme";
import { commitSubFocusPctEdit } from "../lib/subFocusWeights";

const BLEND_HINT =
  "How much each sub-goal steers exercise picks for this training goal. Shares always total 100%. If you do not adjust them, we use ranked priority instead.";

export type SubFocusWeightsEditorProps = {
  theme: Theme;
  /** Canonical primary-focus label key (ManualPreferences keys). */
  goalLabel: string;
  selectedSubsOrdered: string[];
  pctBySub: Record<string, number>;
  onCommit: (goalLabel: string, nextPctBySub: Record<string, number>) => void;
};

export function SubFocusWeightsEditor(props: SubFocusWeightsEditorProps) {
  const { theme, goalLabel, selectedSubsOrdered, pctBySub, onCommit } = props;
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  if (selectedSubsOrdered.length <= 1) {
    return (
      <Text style={[styles.singleNote, { color: theme.textMuted }]}>
        This sub-focus uses the full slice of this goal (100%).
      </Text>
    );
  }

  const parts = selectedSubsOrdered.map((s) => {
    const v = pctBySub[s] ?? 0;
    const short =
      s.length > 28 ? `${s.slice(0, 26)}…` : s;
    return `${v}% ${short}`;
  });
  const blendLine = `Blend: ${parts.join(" · ")} (100%)`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>{BLEND_HINT}</Text>
      <Text style={[styles.blendSummary, { color: theme.text }]}>{blendLine}</Text>
      {selectedSubsOrdered.map((sub) => {
        const value = pctBySub[sub] ?? 0;
        const editing = editingSub === sub;
        const displayVal = editing ? editingText : String(value);
        return (
          <View key={sub} style={styles.row}>
            <Text style={[styles.subName, { color: theme.text }]} numberOfLines={2}>
              {sub}
            </Text>
            <View style={styles.rowRight}>
              <TextInput
                style={[
                  styles.pctInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                value={displayVal}
                onFocus={() => {
                  setEditingSub(sub);
                  setEditingText(String(value));
                }}
                onBlur={() => {
                  const n = parseInt(editingText.replace(/\D/g, ""), 10);
                  if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                    const next = commitSubFocusPctEdit(
                      selectedSubsOrdered,
                      pctBySub,
                      sub,
                      n
                    );
                    onCommit(goalLabel, next);
                  }
                  setEditingSub(null);
                  setEditingText("");
                }}
                onChangeText={(t) => {
                  if (!editing) return;
                  setEditingText(t.replace(/\D/g, ""));
                }}
              />
              <Text style={[styles.pctSuffix, { color: theme.textMuted }]}>%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    gap: 6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  blendSummary: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 18,
  },
  singleNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  subName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pctInput: {
    width: 56,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    textAlign: "center",
  },
  pctSuffix: {
    fontSize: 13,
  },
});
