import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/Button";
import { generateWorkout } from "../../lib/generator";

export default function ManualWorkoutScreen() {
  const {
    generatedWorkout,
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
  } = useAppState();
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  if (generatedWorkout == null) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No workout yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: theme.textMuted }]}
          >
            Set your preferences first and we'll build a session for you.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Go to Preferences"
              onPress={() => router.replace("/manual/preferences")}
            />
          </View>
        </View>
      </View>
    );
  }

  const summaryLines: string[] = [];
  if (generatedWorkout.focus.length > 0) {
    summaryLines.push(generatedWorkout.focus.join(" • "));
  }
  if (generatedWorkout.durationMinutes != null) {
    summaryLines.push(`${generatedWorkout.durationMinutes} min`);
  }
  if (generatedWorkout.energyLevel != null) {
    const e = generatedWorkout.energyLevel;
    summaryLines.push(
      `${e.charAt(0).toUpperCase()}${e.slice(1)} energy`
    );
  }

  const onRegenerate = () => {
    const next = generateWorkout(manualPreferences, activeProfile);
    setGeneratedWorkout(next);
  };

  const onEditPreferences = () => {
    router.push("/manual/preferences");
  };

  const onStartExecute = () => {
    router.push("/manual/execute");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Summary"
          subtitle={summaryLines.join(" • ")}
          style={styles.summaryCard}
        >
          {generatedWorkout.notes != null ? (
            <Text
              style={[styles.notes, { color: theme.textMuted }]}
            >
              {generatedWorkout.notes}
            </Text>
          ) : null}
        </Card>

        {generatedWorkout.sections.map((section) => (
          <Card key={section.id} title={section.title} style={styles.sectionCard}>
            {section.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.exerciseName,
                      { color: theme.text },
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    style={[
                      styles.exercisePrescription,
                      { color: theme.textMuted },
                    ]}
                  >
                    {exercise.prescription}
                  </Text>
                  <View style={styles.tagsRow}>
                    {exercise.tags.slice(0, 3).map((tag) => (
                      <Text
                        key={tag}
                        style={[styles.tag, { color: theme.textMuted }]}
                      >
                        {tag}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        ))}

        <View style={styles.footer}>
          <PrimaryButton
            label="Regenerate"
            variant="secondary"
            onPress={onRegenerate}
          />
          <PrimaryButton
            label="Edit Preferences"
            variant="ghost"
            onPress={onEditPreferences}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            label="Start Workout"
            onPress={onStartExecute}
            style={{ marginTop: 16 }}
          />
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
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  summaryCard: {
    marginBottom: 8,
  },
  notes: {
    fontSize: 13,
  },
  sectionCard: {
    gap: 12,
  },
  exerciseRow: {
    paddingVertical: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tag: {
    fontSize: 11,
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
});
