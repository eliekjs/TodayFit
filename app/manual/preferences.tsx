import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";
import { SectionHeader } from "../../components/SectionHeader";
import { Chip } from "../../components/Chip";
import { ToggleRow } from "../../components/ToggleRow";
import { PrimaryButton } from "../../components/Button";
import { generateWorkout } from "../../lib/generator";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY_FOCUS_OPTIONS = [
  "Build Strength",
  "Build Muscle (Hypertrophy)",
  "Body Recomposition",
  "Sport Conditioning",
  "Improve Endurance",
  "Mobility & Joint Health",
  "Athletic Performance",
  "Calisthenics",
  "Power & Explosiveness",
  "Recovery",
];

const DURATIONS = [20, 30, 45, 60, 75];

const ENERGY_LEVELS = ["Low", "Medium", "High"] as const;

const INJURIES = [
  "Shoulder",
  "Elbow",
  "Wrist",
  "Lower Back",
  "Hip",
  "Knee",
  "Ankle",
];

const UPCOMING = [
  "Long Run",
  "Big Hike",
  "Ski Day",
  "Climbing Day",
  "Hard Leg Day",
  "Hard Upper Day",
];

const SUB_FOCUS = [
  "Knee mobility",
  "Uphill conditioning",
  "Core stability",
  "Posterior chain",
  "Shoulder stability",
  "Grip strength",
];

export default function ManualPreferencesScreen() {
  const {
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
  } = useAppState();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const toggleFromArray =
    (key: "primaryFocus" | "injuries" | "upcoming" | "subFocus") =>
    (value: string) => {
      const current = manualPreferences[key];
      const exists = current.includes(value);
      updateManualPreferences({
        [key]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      });
    };

  const onGenerate = () => {
    const workout = generateWorkout(manualPreferences, activeProfile);
    setGeneratedWorkout(workout);
    router.push("/manual/workout");
  };

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedOpen((v) => !v);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Primary Focus"
          subtitle="Pick one or more themes for today."
        />
        <View style={styles.chipGroup}>
          {PRIMARY_FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={manualPreferences.primaryFocus.includes(option)}
              onPress={() => toggleFromArray("primaryFocus")(option)}
            />
          ))}
        </View>

        <SectionHeader
          title="Duration"
          subtitle="Approximate total session length."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {DURATIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={manualPreferences.durationMinutes === minutes}
              onPress={() =>
                updateManualPreferences({ durationMinutes: minutes })
              }
            />
          ))}
        </View>

        <SectionHeader
          title="Energy Level"
          subtitle="How much you have in the tank."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {ENERGY_LEVELS.map((level) => (
            <Chip
              key={level}
              label={level}
              selected={
                manualPreferences.energyLevel === level.toLowerCase()
              }
              onPress={() =>
                updateManualPreferences({
                  energyLevel: level.toLowerCase() as "low" | "medium" | "high",
                })
              }
            />
          ))}
        </View>

        <View style={styles.advancedHeader}>
          <Text
            style={[styles.advancedTitle, { color: theme.text }]}
            onPress={toggleAdvanced}
          >
            Advanced Refinements
          </Text>
          <Text
            style={[styles.advancedToggle, { color: theme.textMuted }]}
            onPress={toggleAdvanced}
          >
            {advancedOpen ? "Hide" : "Show"}
          </Text>
        </View>

        {advancedOpen && (
          <View style={styles.advancedSection}>
            <SectionHeader
              title="Injuries / Avoid"
              subtitle="We'll steer away from movements that stress these."
            />
            <View style={styles.chipGroup}>
              {INJURIES.map((injury) => (
                <Chip
                  key={injury}
                  label={injury}
                  selected={manualPreferences.injuries.includes(injury)}
                  onPress={() => toggleFromArray("injuries")(injury)}
                />
              ))}
            </View>

            <SectionHeader
              title="Upcoming (1–3 days)"
              subtitle="Protect big days and avoid overlap."
              style={{ marginTop: 20 }}
            />
            <View style={styles.chipGroup}>
              {UPCOMING.map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={manualPreferences.upcoming.includes(u)}
                  onPress={() => toggleFromArray("upcoming")(u)}
                />
              ))}
            </View>

            <SectionHeader
              title="Sub-focus goals"
              subtitle="Optional micro-themes for this block."
              style={{ marginTop: 20 }}
            />
            <View style={styles.chipGroup}>
              {SUB_FOCUS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={manualPreferences.subFocus.includes(s)}
                  onPress={() => toggleFromArray("subFocus")(s)}
                />
              ))}
            </View>

            <SectionHeader
              title="Equipment constraints"
              subtitle={
                activeProfile != null
                  ? `Current profile: ${activeProfile.name}`
                  : "No active profile selected."
              }
              style={{ marginTop: 20 }}
            />
            <ToggleRow
              label="Use only what's in my gym profile"
              value={manualPreferences.useGymEquipmentOnly}
              onValueChange={(value) =>
                updateManualPreferences({ useGymEquipmentOnly: value })
              }
            />
          </View>
        )}

        <View style={styles.footer}>
          <PrimaryButton label="Generate Workout" onPress={onGenerate} />
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
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  advancedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  advancedTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  advancedToggle: {
    fontSize: 13,
    fontWeight: "500",
  },
  advancedSection: {
    gap: 12,
  },
  footer: {
    marginTop: 24,
    marginBottom: 16,
  },
});
