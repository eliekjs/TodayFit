import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../lib/theme";
import type { VolumePreference } from "../lib/types";
import {
  volumePreferenceOptionsForGoals,
  type VolumePreferenceOptionCopy,
} from "../lib/volumePreferenceCopy";

type Props = {
  value: VolumePreference | null | undefined;
  onChange: (next: VolumePreference | null) => void;
  primaryFocus?: string[] | null;
  goalBias?: string | null;
  goalSlugs?: string[] | null;
  /** When true, tapping the selected option clears to null (prefs default). */
  allowDeselect?: boolean;
};

export function VolumePreferencePicker({
  value,
  onChange,
  primaryFocus,
  goalBias,
  goalSlugs,
  allowDeselect = true,
}: Props) {
  const theme = useTheme();
  const options: VolumePreferenceOptionCopy[] = volumePreferenceOptionsForGoals({
    primaryFocus,
    goalBias,
    goalSlugs,
  });
  const selected = value ?? "standard";

  return (
    <View style={styles.list}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (allowDeselect && isSelected) {
                onChange(null);
                return;
              }
              onChange(opt.value);
            }}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isSelected ? theme.primary : theme.border,
              backgroundColor: isSelected ? theme.primarySoft : "transparent",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[styles.label, { color: theme.text }]}>{opt.label}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              {opt.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
});
