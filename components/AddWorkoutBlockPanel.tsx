import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { themeRadius, useTheme } from "../lib/theme";
import {
  ADDABLE_BLOCK_TYPES,
  ADDABLE_BODY_CHOICES,
} from "../lib/appendGeneratedBlock";
import type { DayBodyFocusChoiceId } from "../lib/weekDaySessionFocus";
import type { BlockType } from "../lib/types";
import { Chip } from "./Chip";
import { PrimaryButton } from "./Button";

export type AddWorkoutBlockRequest = {
  blockType: BlockType;
  bodyChoiceId: DayBodyFocusChoiceId | null;
};

type Props = {
  onAdd: (request: AddWorkoutBlockRequest) => void;
  adding?: boolean;
  disabled?: boolean;
};

export function AddWorkoutBlockPanel({ onAdd, adding = false, disabled = false }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("main_strength");
  const [bodyChoiceId, setBodyChoiceId] = useState<DayBodyFocusChoiceId | null>(null);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.cardOpaque,
          borderColor: theme.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse add a block" : "Add a block"}
        accessibilityState={{ expanded, disabled: disabled || adding }}
        onPress={() => {
          if (disabled || adding) return;
          setExpanded((v) => !v);
        }}
        style={({ pressed }) => [styles.header, pressed ? { opacity: 0.85 } : undefined]}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Add a block</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Expand this session with another block and generated exercises.
          </Text>
        </View>
        {adding ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textMuted}
          />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Block type</Text>
          <View style={styles.chipGroup}>
            {ADDABLE_BLOCK_TYPES.map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={blockType === opt.id}
                disabled={disabled || adding}
                onPress={() => setBlockType(opt.id)}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Body part</Text>
          <View style={styles.chipGroup}>
            <Chip
              label="This session"
              selected={bodyChoiceId == null}
              disabled={disabled || adding}
              onPress={() => setBodyChoiceId(null)}
            />
            {ADDABLE_BODY_CHOICES.map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={bodyChoiceId === opt.id}
                disabled={disabled || adding}
                onPress={() => setBodyChoiceId(opt.id)}
              />
            ))}
          </View>

          <PrimaryButton
            label={adding ? "Adding block…" : "Add to this workout"}
            onPress={() => onAdd({ blockType, bodyChoiceId })}
            disabled={disabled || adding}
            style={styles.addBtn}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: themeRadius.card,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  body: {
    marginTop: 14,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addBtn: {
    marginTop: 8,
  },
});
