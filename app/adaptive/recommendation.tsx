import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/Button";
import { useAppState } from "../../context/AppStateContext";
import { generateWorkout } from "../../lib/generator";

export default function AdaptiveRecommendationScreen() {
  const { sessionType, focus, duration, energy } = useLocalSearchParams<{
    sessionType?: string;
    focus?: string;
    duration?: string;
    energy?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const {
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
  } = useAppState();

  const primaryFocus =
    typeof focus === "string" && focus.length > 0
      ? focus.split(",").filter(Boolean)
      : manualPreferences.primaryFocus;

  const durationMinutes =
    typeof duration === "string" && duration.length > 0
      ? Number.parseInt(duration, 10)
      : manualPreferences.durationMinutes ?? 60;

  const energyLevel: "low" | "medium" | "high" =
    typeof energy === "string" && energy.length > 0
      ? (energy as "low" | "medium" | "high")
      : manualPreferences.energyLevel ?? "medium";

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const onGenerateWorkout = () => {
    const mergedPreferences = {
      ...manualPreferences,
      primaryFocus,
      durationMinutes,
      energyLevel,
    };

    updateManualPreferences({
      primaryFocus: mergedPreferences.primaryFocus,
      durationMinutes: mergedPreferences.durationMinutes,
      energyLevel: mergedPreferences.energyLevel,
    });

    const workout = generateWorkout(mergedPreferences, activeProfile);
    setGeneratedWorkout(workout);
    router.push("/manual/workout");
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
          title="Recommended session"
          subtitle={
            typeof sessionType === "string"
              ? sessionType
              : "Balanced Full-Body Strength"
          }
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.textMuted,
            }}
          >
            Focus: {primaryFocus.join(" • ") || "General training"} {"\n"}
            Duration: {durationMinutes} min {"\n"}
            Energy target:{" "}
            {`${energyLevel}`.charAt(0).toUpperCase() + `${energyLevel}`.slice(1)}
          </Text>
        </Card>

        <Card
          title="Why this was chosen"
          subtitle="Strategic explanation (placeholder)"
          style={{ marginTop: 16 }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 4,
            }}
          >
            • Balances your long-term goals with recent training load.{"\n"}
            • Keeps today's work specific without overloading any one pattern.
            {"\n"}
            • Leaves you fresh enough for the next 1–3 days of planned sessions.
          </Text>
        </Card>

        <View style={styles.footer}>
          <PrimaryButton
            label="Generate Workout"
            onPress={onGenerateWorkout}
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
  },
  footer: {
    marginTop: 24,
    marginBottom: 24,
  },
});
