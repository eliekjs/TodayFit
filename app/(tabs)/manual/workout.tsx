import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { generateWorkoutAsync } from "../../../lib/generator";
import { formatPrescription } from "../../../lib/types";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "../../../lib/preferencesConstants";
import { isDbConfigured } from "../../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";

export default function ManualWorkoutScreen() {
  const {
    generatedWorkout,
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
    addSavedWorkout,
    savedWorkouts,
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
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Set your preferences first and we'll build a session for you.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Go to Preferences"
              onPress={() => router.push("/manual/preferences")}
            />
          </View>
          {savedWorkouts.length > 0 && (
            <PrimaryButton
              label="Resume a saved workout"
              variant="secondary"
              onPress={() => router.push("/history")}
              style={{ marginTop: 12 }}
            />
          )}
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
    summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
  }

  const onRegenerate = async () => {
    let preferredNames: string[] | undefined;
    if (isDbConfigured() && manualPreferences.primaryFocus.length > 0) {
      try {
        const goalSlugs = manualPreferences.primaryFocus
          .map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f])
          .filter(Boolean);
        const goalWeightsPct = [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ];
        preferredNames = await getPreferredExerciseNamesForSportAndGoals(
          null,
          goalSlugs,
          goalWeightsPct.slice(0, goalSlugs.length)
        );
      } catch {
        preferredNames = undefined;
      }
    }
    const workout = await generateWorkoutAsync(
      manualPreferences,
      activeProfile,
      Date.now(),
      preferredNames
    );
    setGeneratedWorkout(workout);
  };

  const onSaveForLater = () => {
    addSavedWorkout({
      savedAt: new Date().toISOString(),
      workout: generatedWorkout,
    });
    setGeneratedWorkout(null);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
            <Text style={[styles.notes, { color: theme.textMuted }]}>
              {generatedWorkout.notes}
            </Text>
          ) : null}
        </Card>

        {generatedWorkout.blocks.map((block, blockIdx) => (
          <Card key={`${block.block_type}-${blockIdx}`} title={block.title ?? block.block_type} style={styles.sectionCard}>
            {block.reasoning ? (
              <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>
                {block.reasoning}
              </Text>
            ) : null}
            {block.supersetPairs && block.supersetPairs.length > 0 ? (
              block.supersetPairs.map((pair, idx) => (
                <View key={`superset-${idx}`} style={[styles.supersetBlock, { borderLeftColor: theme.border }]}>
                  <Text style={[styles.supersetLabel, { color: theme.textMuted }]}>
                    Superset {idx + 1}
                  </Text>
                  {pair.map((item) => (
                    <View key={item.exercise_id} style={styles.exerciseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {item.exercise_name}
                        </Text>
                        <Text
                          style={[
                            styles.exercisePrescription,
                            { color: theme.textMuted },
                          ]}
                        >
                          {formatPrescription(item)}
                        </Text>
                        {(item.tags?.length ?? 0) > 0 && (
                          <View style={styles.tagsRow}>
                            {(item.tags ?? []).slice(0, 3).map((tag) => (
                              <Text
                                key={tag}
                                style={[styles.tag, { color: theme.textMuted }]}
                              >
                                {tag}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              block.items.map((item) => (
                <View key={item.exercise_id} style={styles.exerciseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: theme.text }]}>
                      {item.exercise_name}
                    </Text>
                    <Text
                      style={[
                        styles.exercisePrescription,
                        { color: theme.textMuted },
                      ]}
                    >
                      {formatPrescription(item)}
                    </Text>
                    {(item.tags?.length ?? 0) > 0 && (
                      <View style={styles.tagsRow}>
                        {(item.tags ?? []).slice(0, 3).map((tag) => (
                          <Text
                            key={tag}
                            style={[styles.tag, { color: theme.textMuted }]}
                          >
                            {tag}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </Card>
        ))}

        <View style={styles.footer}>
          <PrimaryButton
            label="Regenerate"
            variant="secondary"
            onPress={onRegenerate}
          />
          <PrimaryButton
            label="Save for later"
            variant="secondary"
            onPress={onSaveForLater}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            label="Edit Preferences"
            variant="ghost"
            onPress={() => router.push("/manual/preferences")}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            label="Start Workout"
            onPress={() => router.push("/manual/execute")}
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
    marginTop: 80,
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
  sectionReasoning: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 4,
  },
  supersetBlock: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  supersetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
