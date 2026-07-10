import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { useTheme } from "../lib/theme";
import { createSetLogRow, type SetLogRow } from "../lib/types";

type ExerciseSetLogTableProps = {
  mode: "strength" | "rounds";
  rows: SetLogRow[];
  onChange: (rows: SetLogRow[]) => void;
  defaultReps?: number;
  defaultDurationSeconds?: number;
};

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function formatOptionalNumber(value: number | undefined): string {
  return value != null ? String(value) : "";
}

function formatDurationMinutes(seconds: number | undefined): string {
  if (seconds == null) return "";
  const min = seconds / 60;
  return Number.isInteger(min) ? String(min) : min.toFixed(1);
}

function parseDurationMinutes(text: string): number | undefined {
  const min = parseOptionalNumber(text);
  if (min == null) return undefined;
  return Math.round(min * 60);
}

export function ExerciseSetLogTable({
  mode,
  rows,
  onChange,
  defaultReps,
  defaultDurationSeconds,
}: ExerciseSetLogTableProps) {
  const theme = useTheme();
  const rowLabel = mode === "rounds" ? "Round" : "Set";

  const updateRow = (id: string, patch: Partial<SetLogRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const row = createSetLogRow();
    if (mode === "strength" && defaultReps != null) row.reps = defaultReps;
    if (mode === "rounds" && defaultDurationSeconds != null) {
      row.duration_seconds = defaultDurationSeconds;
    }
    onChange([...rows, row]);
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardOpaque },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.labelCol, { color: theme.textMuted }]}>
          {rowLabel}
        </Text>
        {mode === "strength" ? (
          <>
            <Text style={[styles.headerCell, styles.fieldCol, { color: theme.textMuted }]}>
              Reps
            </Text>
            <Text style={[styles.headerCell, styles.fieldCol, { color: theme.textMuted }]}>
              Weight
            </Text>
          </>
        ) : (
          <Text style={[styles.headerCell, styles.fieldCol, { color: theme.textMuted }]}>
            Min
          </Text>
        )}
        <Text style={[styles.headerCell, styles.notesCol, { color: theme.textMuted }]}>
          Notes
        </Text>
        <View style={styles.removeCol} />
      </View>

      {rows.map((row, index) => (
        <View key={row.id} style={styles.dataRow}>
          <Text style={[styles.labelCell, styles.labelCol, { color: theme.textMuted }]}>
            {index + 1}
          </Text>
          {mode === "strength" ? (
            <>
              <TextInput
                style={[...inputStyle, styles.fieldCol]}
                keyboardType="number-pad"
                placeholder={defaultReps != null ? String(defaultReps) : "—"}
                placeholderTextColor={theme.textMuted}
                value={formatOptionalNumber(row.reps)}
                onChangeText={(text) => updateRow(row.id, { reps: parseOptionalNumber(text) })}
              />
              <TextInput
                style={[...inputStyle, styles.fieldCol]}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={theme.textMuted}
                value={formatOptionalNumber(row.load_kg)}
                onChangeText={(text) => updateRow(row.id, { load_kg: parseOptionalNumber(text) })}
              />
            </>
          ) : (
            <TextInput
              style={[...inputStyle, styles.fieldCol]}
              keyboardType="decimal-pad"
              placeholder={
                defaultDurationSeconds != null
                  ? formatDurationMinutes(defaultDurationSeconds)
                  : "—"
              }
              placeholderTextColor={theme.textMuted}
              value={formatDurationMinutes(row.duration_seconds)}
              onChangeText={(text) =>
                updateRow(row.id, { duration_seconds: parseDurationMinutes(text) })
              }
            />
          )}
          <TextInput
            style={[...inputStyle, styles.notesCol]}
            placeholder="—"
            placeholderTextColor={theme.textMuted}
            value={row.notes ?? ""}
            onChangeText={(text) => updateRow(row.id, { notes: text || undefined })}
          />
          <Pressable
            onPress={() => removeRow(row.id)}
            style={[styles.removeButton, { borderColor: theme.border }]}
            accessibilityLabel={`Remove ${rowLabel.toLowerCase()} ${index + 1}`}
          >
            <Text style={[styles.removeButtonText, { color: theme.textMuted }]}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={addRow}
        style={[styles.addButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.addButtonText, { color: theme.primary }]}>
          + Add {rowLabel.toLowerCase()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  labelCell: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  labelCol: {
    width: 28,
  },
  fieldCol: {
    flex: 1,
    minWidth: 52,
  },
  notesCol: {
    flex: 1.4,
    minWidth: 64,
  },
  removeCol: {
    width: 28,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    minHeight: 32,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 20,
  },
  addButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
