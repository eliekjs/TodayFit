import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
} from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";
import type { WorkoutItem } from "../lib/types";

export type PrescriptionEdit = {
  sets: number;
  reps?: number;
  time_seconds?: number;
};

type Props = {
  visible: boolean;
  exerciseName: string;
  item: WorkoutItem | null;
  onClose: () => void;
  onSave: (edit: PrescriptionEdit) => void;
};

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function EditPrescriptionModal({
  visible,
  exerciseName,
  item,
  onClose,
  onSave,
}: Props) {
  const theme = useTheme();
  const isTimeBased = item != null && item.time_seconds != null && item.time_seconds > 0;
  const [setsText, setSetsText] = useState("3");
  const [repsText, setRepsText] = useState("10");
  const [minutesText, setMinutesText] = useState("1");

  useEffect(() => {
    if (!visible || item == null) return;
    setSetsText(String(item.sets ?? 1));
    if (item.time_seconds != null && item.time_seconds > 0) {
      const min = item.time_seconds / 60;
      setMinutesText(Number.isInteger(min) ? String(min) : min.toFixed(1));
    } else {
      setRepsText(item.reps != null ? String(item.reps) : "10");
    }
  }, [visible, item]);

  if (!visible || item == null) return null;

  const bump = (field: "sets" | "reps" | "minutes", delta: number) => {
    if (field === "sets") {
      const next = clampInt(setsText, 1, 12, 1) + delta;
      setSetsText(String(Math.max(1, Math.min(12, next))));
      return;
    }
    if (field === "reps") {
      const next = clampInt(repsText, 1, 50, 10) + delta;
      setRepsText(String(Math.max(1, Math.min(50, next))));
      return;
    }
    const current = Number.parseFloat(minutesText);
    const base = Number.isFinite(current) ? current : 1;
    const next = Math.round((base + delta * 0.5) * 10) / 10;
    setMinutesText(String(Math.max(0.5, Math.min(60, next))));
  };

  const handleSave = () => {
    const sets = clampInt(setsText, 1, 12, item.sets ?? 1);
    if (isTimeBased) {
      const minutes = Number.parseFloat(minutesText);
      const safeMin = Number.isFinite(minutes) ? Math.max(0.5, Math.min(60, minutes)) : 1;
      onSave({
        sets,
        time_seconds: Math.round(safeMin * 60),
        reps: undefined,
      });
      return;
    }
    onSave({
      sets,
      reps: clampInt(repsText, 1, 50, item.reps ?? 10),
    });
  };

  const StepperRow = ({
    label,
    value,
    onChangeText,
    onBump,
    keyboardType = "number-pad",
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    onBump: (delta: number) => void;
    keyboardType?: "number-pad" | "decimal-pad";
  }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onBump(-1)}
          style={[styles.stepBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={Platform.OS === "web" ? "numeric" : keyboardType}
          selectTextOnFocus
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.cardOpaque ?? theme.card,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onBump(1)}
          style={[styles.stepBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.cardOpaque,
              borderColor: theme.border,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                },
                android: { elevation: 12 },
                default: { boxShadow: "0 12px 40px rgba(0,0,0,0.45)" },
              }),
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Customize</Text>
          <Text style={[styles.title, { color: theme.text }]}>{exerciseName}</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Adjust sets and {isTimeBased ? "round length" : "reps"} for this exercise.
          </Text>

          <StepperRow
            label="Sets"
            value={setsText}
            onChangeText={setSetsText}
            onBump={(d) => bump("sets", d)}
          />
          {isTimeBased ? (
            <StepperRow
              label="Minutes / round"
              value={minutesText}
              onChangeText={setMinutesText}
              onBump={(d) => bump("minutes", d)}
              keyboardType="decimal-pad"
            />
          ) : (
            <StepperRow
              label="Reps"
              value={repsText}
              onChangeText={setRepsText}
              onBump={(d) => bump("reps", d)}
            />
          )}

          <View style={styles.actions}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              compact
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Save"
              compact
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  row: {
    marginBottom: 14,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 26,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
