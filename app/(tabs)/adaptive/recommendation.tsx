import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import { generateWorkout } from "../../../lib/generator";
import {
  getSessionTypeOptions,
  type SessionTypeOption,
} from "../../../lib/adaptiveSessionTypes";

export default function AdaptiveRecommendationScreen() {
  const { primary, secondary, horizon, recentLoad } = useLocalSearchParams<{
    primary?: string;
    secondary?: string;
    horizon?: string;
    recentLoad?: string;
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

  const options = useMemo(() => {
    const p = primary ?? "strength";
    const s = secondary && secondary.length > 0 ? secondary : null;
    const h = horizon ? parseInt(horizon, 10) : 8;
    const load = recentLoad ?? "Normal";
    return getSessionTypeOptions(p, s, h, load);
  }, [primary, secondary, horizon, recentLoad]);

  const [recommended, ...otherOptions] = options;
  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const onChooseSessionType = (option: SessionTypeOption) => {
    const mergedPreferences = {
      ...manualPreferences,
      primaryFocus: option.focus,
      durationMinutes: option.durationMinutes,
      energyLevel: option.energy,
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

  if (!recommended) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Recommended session"
          subtitle={recommended.sessionType}
        >
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Focus: {recommended.focus.join(" • ") || "General training"} {"\n"}
            Duration: {recommended.durationMinutes} min {"\n"}
            Energy target:{" "}
            {`${recommended.energy}`.charAt(0).toUpperCase() +
              `${recommended.energy}`.slice(1)}
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label="Generate Workout"
              onPress={() => onChooseSessionType(recommended)}
            />
          </View>
        </Card>

        <Card
          title="Why this was chosen"
          subtitle="Strategic explanation (placeholder)"
          style={{ marginTop: 16 }}
        >
          <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>
            • Balances your long-term goals with recent training load.{"\n"}
            • Keeps today's work specific without overloading any one pattern.
            {"\n"}
            • Leaves you fresh enough for the next 1–3 days of planned sessions.
          </Text>
        </Card>

        <Text style={[styles.otherSectionTitle, { color: theme.text }]}>
          Other session type options
        </Text>
        <View style={styles.otherOptions}>
          {otherOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => onChooseSessionType(option)}
              style={[
                styles.optionRow,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <Text
                style={[styles.optionTitle, { color: theme.text }]}
                numberOfLines={2}
              >
                {option.sessionType}
              </Text>
              <Text
                style={[styles.optionMeta, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {option.durationMinutes} min •{" "}
                {option.focus.join(" • ") || "General"}
              </Text>
              <Text style={[styles.optionCta, { color: theme.primary }]}>
                Generate workout →
              </Text>
            </Pressable>
          ))}
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
  otherSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  otherOptions: {
    gap: 12,
  },
  optionRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  optionMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  optionCta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
});
