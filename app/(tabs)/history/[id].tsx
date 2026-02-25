import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";

export default function ViewCompletedWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutHistory } = useAppState();
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

  const workout = item.workout;
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title={date.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          subtitle={
            [
              item.focus?.length ? item.focus.join(" • ") : null,
              item.durationMinutes != null ? `${item.durationMinutes} min` : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          style={{ marginBottom: 16 }}
        />

        {workout.sections.map((section) => {
          if (section.supersetPairs && section.supersetPairs.length > 0) {
            return (
              <View key={section.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title}
                </Text>
                {section.supersetPairs.map((pair, idx) => (
                  <View key={`${section.id}-ss-${idx}`} style={styles.superset}>
                    {pair.map((ex) => (
                      <View
                        key={ex.id}
                        style={[
                          styles.exerciseBlock,
                          styles.exerciseBlockSuperset,
                          { borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {ex.name}
                        </Text>
                        <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                          {ex.prescription}
                        </Text>
                        {notes[ex.id] ? (
                          <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
                            <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                              Your note
                            </Text>
                            <Text style={[styles.noteText, { color: theme.text }]}>
                              {notes[ex.id]}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View key={section.id} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {section.title}
              </Text>
              {section.exercises.map((ex) => (
                <View
                  key={ex.id}
                  style={[
                    styles.exerciseBlock,
                    styles.exerciseBlockStandalone,
                    { borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.exerciseName, { color: theme.text }]}>
                    {ex.name}
                  </Text>
                  <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                    {ex.prescription}
                  </Text>
                  {notes[ex.id] ? (
                    <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                        Your note
                      </Text>
                      <Text style={[styles.noteText, { color: theme.text }]}>
                        {notes[ex.id]}
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
  superset: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
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
