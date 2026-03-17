import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { normalizeGeneratedWorkout } from "../../../lib/types";

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
      <AppScreenWrapper>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Workout not found.
          </Text>
        </View>
      </AppScreenWrapper>
    );
  }

  const rawWorkout = item.workout;
  const workout = rawWorkout ? normalizeGeneratedWorkout(rawWorkout) : null;
  const notes = item.exerciseNotes ?? {};

  if (!workout) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            This completed workout has no plan saved (finished before this feature).
          </Text>
        </View>
      </AppScreenWrapper>
    );
  }

  const date = new Date(item.date);
  const focusLabel = item.focus?.length ? item.focus.join(" • ") : "General training";
  const displayTitle = item.name?.trim() || focusLabel;
  const exerciseCount = workout.blocks.reduce(
    (sum, b) => sum + b.items.length,
    0
  );

  const onDoAgain = () => {
    setGeneratedWorkout({ ...workout, id: `workout_${Date.now()}` });
    setResumeProgress(null);
    router.push("/manual/execute");
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
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

        <WorkoutBlockList
          workout={workout}
          exerciseNotes={notes}
        />
      </ScrollView>
    </AppScreenWrapper>
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
});
