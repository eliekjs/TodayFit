import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { formatPrescription, getSupersetPairsForBlock, normalizeGeneratedWorkout } from "../../../lib/types";

export default function ViewCompletedWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    workoutHistory,
    setGeneratedWorkout,
    setResumeProgress,
    updateWorkoutHistoryItem,
  } = useAppState();
  const theme = useTheme();

  const item = id ? workoutHistory.find((h) => h.id === id) : null;

  if (!id || !item) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Workout not found.
          </Text>
        </View>
      </View>
    );
  }

  const rawWorkout = item.workout;
  const workout = rawWorkout ? normalizeGeneratedWorkout(rawWorkout) : null;
  const notes = item.exerciseNotes ?? {};

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            This completed workout has no plan saved (finished before this feature).
          </Text>
        </View>
      </View>
    );
  }

  const date = new Date(item.date);
  const focusLabel = item.focus?.length ? item.focus.join(" • ") : "General training";
  const displayTitle = item.name?.trim() || focusLabel;
  const exerciseCount = workout.blocks.reduce(
    (sum, b) => {
      const pairs = getSupersetPairsForBlock(b);
      return sum + (pairs ? pairs.flat().length : b.items.length);
    },
    0
  );

  const onDoAgain = () => {
    setGeneratedWorkout({ ...workout, id: `workout_${Date.now()}` });
    setResumeProgress(null);
    router.push("/manual/execute");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PrimaryButton
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <View style={styles.nameSection}>
          <Text style={[styles.nameLabel, { color: theme.textMuted }]}>
            Workout name
          </Text>
          <TextInput
            value={item.name ?? ""}
            onChangeText={(name) =>
              updateWorkoutHistoryItem(item.id, { name: name.trim() || undefined })
            }
            placeholder={focusLabel}
            placeholderTextColor={theme.textMuted}
            style={[
              styles.nameInput,
              { borderColor: theme.border, color: theme.text },
            ]}
          />
        </View>
        <Card
          title={displayTitle}
          subtitle={
            [
              date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              item.durationMinutes != null ? `${item.durationMinutes} min` : null,
              `${workout.blocks.length} block${workout.blocks.length !== 1 ? "s" : ""} · ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")
          }
          style={{ marginBottom: 16 }}
        />
        <View style={styles.detailActions}>
          <PrimaryButton
            label="Repeat session"
            onPress={onDoAgain}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Edit + re-run"
            variant="secondary"
            onPress={() => router.push("/manual/preferences")}
            style={{ flex: 1 }}
          />
        </View>

        {workout.blocks.map((block, blockIdx) => {
          const pairs = getSupersetPairsForBlock(block);
          if (pairs && pairs.length > 0) {
            return (
              <View key={`${block.block_type}-${blockIdx}`} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {block.title ?? block.block_type}
                </Text>
                {pairs.map((pair, idx) => (
                  <View key={`${block.block_type}-ss-${idx}`} style={styles.supersetPairWrapper}>
                    <Text style={[styles.supersetPairLabel, { color: theme.textMuted }]}>
                      Pair {idx + 1} — do A then B
                    </Text>
                    <View style={styles.superset}>
                      {pair.map((item, pairIdx) => (
                        <View
                          key={item.exercise_id}
                          style={[
                            styles.exerciseBlock,
                            styles.exerciseBlockSuperset,
                            { borderColor: theme.border },
                          ]}
                        >
                          <Text style={[styles.supersetLetter, { color: theme.textMuted }]}>
                            {String.fromCharCode(65 + pairIdx)}
                          </Text>
                          <View style={styles.exerciseBlockContent}>
                            <Text style={[styles.exerciseName, { color: theme.text }]}>
                              {item.exercise_name}
                            </Text>
                            <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                              {formatPrescription(item)}
                            </Text>
                            {notes[item.exercise_id] ? (
                              <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
                                <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                                  Your note
                                </Text>
                                <Text style={[styles.noteText, { color: theme.text }]}>
                                  {notes[item.exercise_id]}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View key={`${block.block_type}-${blockIdx}`} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {block.title ?? block.block_type}
              </Text>
              {block.items.map((item) => (
                <View
                  key={item.exercise_id}
                  style={[
                    styles.exerciseBlock,
                    styles.exerciseBlockStandalone,
                    { borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.exerciseName, { color: theme.text }]}>
                    {item.exercise_name}
                  </Text>
                  <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                    {formatPrescription(item)}
                  </Text>
                  {notes[item.exercise_id] ? (
                    <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                        Your note
                      </Text>
                      <Text style={[styles.noteText, { color: theme.text }]}>
                        {notes[item.exercise_id]}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  nameSection: {
    marginBottom: 16,
    gap: 6,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  detailActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  supersetPairWrapper: {
    marginBottom: 14,
  },
  supersetPairLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  superset: {
    flexDirection: "row",
    gap: 12,
  },
  exerciseBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exerciseBlockStandalone: {
    marginBottom: 10,
  },
  exerciseBlockSuperset: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  supersetLetter: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseBlockContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  noteBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 13,
  },
});
