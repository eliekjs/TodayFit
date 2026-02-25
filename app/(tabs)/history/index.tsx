import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    workoutHistory,
    savedWorkouts,
    setGeneratedWorkout,
    setResumeProgress,
    removeSavedWorkout,
  } = useAppState();

  const items = [...workoutHistory].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Build display labels; append " (1)", " (2)" when multiple share same date + focus
  const getItemKey = (item: (typeof items)[0]) =>
    `${new Date(item.date).toLocaleDateString()} • ${item.focus.join(" • ") || "General training"}`;
  const keyToIndices = items.reduce<Record<string, number[]>>((acc, item, i) => {
    const key = getItemKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {});
  const getDisplayLabel = (item: (typeof items)[0], index: number) => {
    const key = getItemKey(item);
    const indices = keyToIndices[key] ?? [index];
    if (indices.length <= 1) return key;
    const which = indices.indexOf(index) + 1;
    return `${key} (${which})`;
  };

  const onResumeSaved = (saved: typeof savedWorkouts[0]) => {
    setGeneratedWorkout(saved.workout);
    setResumeProgress(saved.progress ?? null);
    router.push("/manual/execute");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {savedWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved for later
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Resume or discard workouts you didn't finish.
            </Text>
            {savedWorkouts.map((saved) => {
              const date = new Date(saved.savedAt);
              const label = `${date.toLocaleDateString()} • ${
                saved.workout.focus.join(" • ") || "General"
              }`;
              return (
                <View
                  key={saved.id}
                  style={[styles.savedCard, { borderColor: theme.border }]}
                >
                  <Text
                    style={[styles.savedTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[styles.savedMeta, { color: theme.textMuted }]}
                  >
                    {saved.workout.durationMinutes != null
                      ? `${saved.workout.durationMinutes} min`
                      : "—"}
                  </Text>
                  <View style={styles.savedActions}>
                    <PrimaryButton
                      label="Resume"
                      onPress={() => onResumeSaved(saved)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Discard"
                      variant="ghost"
                      onPress={() => removeSavedWorkout(saved.id)}
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Completed
          </Text>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No workouts saved yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Once you finish a session, it will appear here with a quick
                snapshot.
              </Text>
            </View>
          ) : (
            items.map((item, index) => {
              const label = getDisplayLabel(item, index);
              const canViewOrRepeat = item.workout != null;
              const subtitleParts = [
                item.durationMinutes != null ? `${item.durationMinutes} min` : null,
                item.workout
                  ? `${item.workout.sections.length} section${item.workout.sections.length !== 1 ? "s" : ""}`
                  : null,
              ].filter(Boolean);
              return (
                <View key={item.id} style={{ marginBottom: 12 }}>
                  <Card
                    title={label}
                    subtitle={subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined}
                  />
                  {canViewOrRepeat && (
                    <View style={styles.completedActions}>
                      <PrimaryButton
                        label="View"
                        variant="secondary"
                        onPress={() => router.push(`/history/${item.id}`)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label="Do again"
                        onPress={() => {
                          if (!item.workout) return;
                          setGeneratedWorkout({
                            ...item.workout,
                            id: `workout_${Date.now()}`,
                          });
                          setResumeProgress(null);
                          router.push("/manual/execute");
                        }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  savedCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  savedMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  savedActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  discardBtn: {
    minWidth: 80,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  completedActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
});
