import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import { generateWorkoutAsync } from "../../../lib/generator";
import {
  getSessionTypeOptions,
  type SessionTypeOption,
} from "../../../lib/adaptiveSessionTypes";

export default function AdaptiveRecommendationScreen() {
  const { primary, secondary, horizon, recentLoad, fatigue } = useLocalSearchParams<{
    primary?: string;
    secondary?: string;
    horizon?: string;
    recentLoad?: string;
    fatigue?: string;
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
    const h = horizon ?? "4_8_weeks";
    const load = recentLoad ?? "Normal / Mixed";
    return getSessionTypeOptions(p, s, h, load, fatigue ?? null);
  }, [primary, secondary, horizon, recentLoad, fatigue]);

  const [recommended, ...otherOptions] = options;
  const alternativesScrollRef = useRef<ScrollView>(null);
  const [alternativesSectionY, setAlternativesSectionY] = useState(0);
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

    generateWorkoutAsync(mergedPreferences, activeProfile).then((workout) => {
      setGeneratedWorkout(workout);
      router.push("/manual/workout");
    });
  };

  if (!recommended) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={alternativesScrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title={`Today's Optimal Session: ${recommended.sessionType} (${recommended.durationMinutes} min)`}
        >
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Focus: {recommended.focus.join(" • ") || "General training"} {"\n"}
            Energy target:{" "}
            {`${recommended.energy}`.charAt(0).toUpperCase() +
              `${recommended.energy}`.slice(1)}
          </Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            <PrimaryButton
              label="Accept & Build"
              onPress={() => onChooseSessionType(recommended)}
            />
            <PrimaryButton
              label="See Alternatives"
              variant="secondary"
              onPress={() => alternativesScrollRef.current?.scrollTo({ y: alternativesSectionY, animated: true })}
            />
            <PrimaryButton
              label="Switch Modes"
              variant="ghost"
              onPress={() => router.replace("/(tabs)")}
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

        <View
          onLayout={(e) => setAlternativesSectionY(e.nativeEvent.layout.y)}
          style={{ marginTop: 24 }}
        >
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
