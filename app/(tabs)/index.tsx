import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";
import { useWelcome } from "../../context/WelcomeContext";
import { AppScreenWrapper } from "../../components/AppScreenWrapper";
import { PrimaryButton } from "../../components/Button";
import { GenerationLoadingScreen } from "../../components/GenerationLoadingScreen";
import { loadGeneratorModule } from "../../lib/loadGeneratorModule";
import { prefetchWorkoutGenerationStack } from "../../lib/prefetchWorkoutGeneration";
import { preferredExerciseNamesForManualPreferences } from "../../lib/manualPreferredExerciseNames";
import type { SessionFlow } from "../../lib/sessionDraft";
import { navigateToSessionFlow } from "../../lib/sessionFlowNavigation";

type ActionCardProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  oneDayFlow: SessionFlow;
  weekFlow: SessionFlow;
  oneDayHref: string;
  weekHref: string;
  oneDayLabel?: string;
  weekLabel?: string;
  variant: "build" | "help";
  theme: ReturnType<typeof useTheme>;
  onNavigateFlow: (flow: SessionFlow, href: string) => void;
};

function ActionCard({
  icon,
  title,
  subtitle,
  oneDayFlow,
  weekFlow,
  oneDayHref,
  weekHref,
  oneDayLabel = "One day",
  weekLabel = "This week",
  variant,
  theme,
  onNavigateFlow,
}: ActionCardProps) {
  const isBuild = variant === "build";
  const accent = theme.primary;
  const accentSoft = theme.primarySoft;

  return (
    <View
      style={[
        styles.actionCard,
        {
          backgroundColor: theme.card,
          borderColor: accentSoft,
        },
      ]}
    >
      <View style={[styles.actionCardIcon, { backgroundColor: accentSoft }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.actionCardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.actionCardSubtitle, { color: theme.textMuted }]}>
        {subtitle}
      </Text>
      <View style={styles.subButtons}>
        <Pressable
          style={({ pressed }) => [styles.subButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => onNavigateFlow(oneDayFlow, oneDayHref)}
        >
          <LinearGradient
            colors={[theme.primary, theme.primarySolid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subButton}
          >
            <Text style={styles.subButtonText}>{oneDayLabel}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.subButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => onNavigateFlow(weekFlow, weekHref)}
        >
          <View style={[styles.subButton, styles.subButtonSecondary]}>
            <Text style={[styles.subButtonText, { color: theme.text }]}>{weekLabel}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasEntered, isHydrated } = useWelcome();
  const {
    manualPreferences,
    activeSessionDraft,
    beginSessionFlow,
    replaceSessionFlow,
    setGeneratedWorkout,
    activeGymProfileId,
    gymProfiles,
    workoutHistory,
    savedWorkouts,
    manualSessionProgress,
    preferencePresets,
    applyPreferencePreset,
    updatePreferencePreset,
    removePreferencePreset,
  } = useAppState();
  const [isTrainTodayGenerating, setIsTrainTodayGenerating] = useState(false);
  const [showPreferenceProfiles, setShowPreferenceProfiles] = useState(false);
  const trainTodayCancelledRef = useRef(false);

  useEffect(() => {
    void prefetchWorkoutGenerationStack();
  }, []);

  const primaryGoal = manualPreferences.primaryFocus[0] ?? "Not set";
  const secondaryGoal = manualPreferences.primaryFocus[1] ?? "Not set";
  const activeProfile =
    gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
  const canTrainToday =
    manualPreferences.primaryFocus.length >= 1 && activeProfile != null;

  const onNavigateFlow = (flow: SessionFlow, href: string) => {
    navigateToSessionFlow(
      router,
      flow,
      href,
      beginSessionFlow,
      replaceSessionFlow,
      activeSessionDraft
    );
  };

  const runTrainToday = async () => {
    if (!canTrainToday || !activeProfile) return;
    trainTodayCancelledRef.current = false;
    setIsTrainTodayGenerating(true);
    try {
      const prefs = {
        ...manualPreferences,
        durationMinutes: manualPreferences.durationMinutes ?? 45,
      };
      const preferredNamesPromise = preferredExerciseNamesForManualPreferences(prefs);
      const generatorPromise = loadGeneratorModule();
      const [preferredNames, { generateWorkoutAsync }] = await Promise.all([
        preferredNamesPromise,
        generatorPromise,
      ]);
      if (trainTodayCancelledRef.current) return;
      const workout = await generateWorkoutAsync(
        prefs,
        activeProfile,
        undefined,
        preferredNames,
        undefined,
        {
          historySources: {
            workoutHistory,
            savedWorkouts,
            inProgressProgress: manualSessionProgress,
          },
        }
      );
      if (trainTodayCancelledRef.current) return;
      setGeneratedWorkout(workout);
      router.push("/manual/workout");
    } catch (e) {
      if (trainTodayCancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't build workout", msg);
    } finally {
      setIsTrainTodayGenerating(false);
    }
  };

  const onTrainToday = () => {
    if (!canTrainToday || !activeProfile) return;
    if (beginSessionFlow("goal_day")) {
      void runTrainToday();
      return;
    }
    if (!activeSessionDraft) {
      replaceSessionFlow("goal_day");
      void runTrainToday();
      return;
    }
    Alert.alert(
      "Session in progress",
      `You're already building a session. Continue that or replace it with a quick Train today workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => router.push(activeSessionDraft.resumeRoute as never),
        },
        {
          text: "Train today",
          style: "destructive",
          onPress: () => {
            replaceSessionFlow("goal_day");
            void runTrainToday();
          },
        },
      ]
    );
  };

  if (!isHydrated) {
    return null;
  }
  if (!hasEntered) {
    return <Redirect href="/welcome" />;
  }

  if (isTrainTodayGenerating) {
    return (
      <GenerationLoadingScreen
        message="Building your session…"
        subtitle="Using your goals, gym, and recent workouts."
        onGoBack={() => {
          trainTodayCancelledRef.current = true;
          setIsTrainTodayGenerating(false);
        }}
      />
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: theme.text }]}>
          Customize your gym session:
        </Text>

        {canTrainToday && !activeSessionDraft && (
          <View
            style={[
              styles.trainTodayCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.trainTodayTitle, { color: theme.text }]}>Train today</Text>
            <Text style={[styles.trainTodaySubtitle, { color: theme.textMuted }]}>
              {primaryGoal}
              {secondaryGoal !== "Not set" ? ` · ${secondaryGoal}` : ""}
              {activeProfile ? ` · ${activeProfile.name}` : ""}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.trainTodayButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
              onPress={onTrainToday}
            >
              <LinearGradient
                colors={[theme.primary, theme.primarySolid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trainTodayButton}
              >
                <Text style={styles.trainTodayButtonText}>Build today&apos;s workout</Text>
              </LinearGradient>
            </Pressable>
            <Text style={[styles.trainTodayHint, { color: theme.textMuted }]}>
              Uses your saved goals and gym. Sport prep and advanced options stay in the cards below.
            </Text>
          </View>
        )}

        <View
          style={[
            styles.preferenceProfilesCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => setShowPreferenceProfiles((prev) => !prev)}
            style={({ pressed }) => [
              styles.preferenceProfilesHeader,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.preferenceProfilesTitle, { color: theme.text }]}>
                Workout preference profiles
              </Text>
              <Text style={[styles.preferenceProfilesSubtitle, { color: theme.textMuted }]}>
                {preferencePresets.length === 0
                  ? "Save presets from Goal-Oriented Training to switch quickly."
                  : `${preferencePresets.length} saved — tap to change`}
              </Text>
            </View>
            <Ionicons
              name={showPreferenceProfiles ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
          {showPreferenceProfiles && (
            <View style={styles.preferenceProfilesList}>
              {preferencePresets.length === 0 ? (
                <Text style={[styles.preferenceProfilesEmpty, { color: theme.textMuted }]}>
                  No presets yet. Use Save preset at the bottom of Goal-Oriented Training.
                </Text>
              ) : (
                preferencePresets.map((preset) => (
                  <View
                    key={preset.id}
                    style={[styles.preferencePresetRow, { borderColor: theme.border }]}
                  >
                    <TextInput
                      value={preset.name}
                      onChangeText={(name) =>
                        updatePreferencePreset(preset.id, {
                          name: name.trim() || preset.name,
                        })
                      }
                      placeholder="Preset name"
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.preferencePresetNameInput,
                        { borderColor: theme.border, color: theme.text },
                      ]}
                    />
                    <View style={styles.preferencePresetActions}>
                      <PrimaryButton
                        label="Use"
                        variant="secondary"
                        onPress={() => applyPreferencePreset(preset.id)}
                        style={styles.preferencePresetBtn}
                      />
                      <PrimaryButton
                        label="Delete"
                        variant="ghost"
                        onPress={() => {
                          Alert.alert("Delete preset?", `Remove "${preset.name}"?`, [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => removePreferencePreset(preset.id),
                            },
                          ]);
                        }}
                        style={styles.preferencePresetBtn}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <ActionCard
          icon="barbell-outline"
          title="Goal-Oriented Training"
          subtitle="Build workouts tailored to one or multiple goals (strength, physique, etc.)"
          oneDayFlow="goal_day"
          weekFlow="goal_week"
          oneDayHref="/manual/preferences"
          weekHref="/manual/preferences?scope=week"
          variant="build"
          theme={theme}
          onNavigateFlow={onNavigateFlow}
        />
        <ActionCard
          icon="sparkles-outline"
          title="Sport-Focused Training"
          subtitle="Train for your sport(s) to prevent injuries and improve performance."
          oneDayFlow="sport_day"
          weekFlow="sport_week"
          oneDayHref="/sport-mode?scope=day"
          weekHref="/sport-mode"
          variant="help"
          theme={theme}
          onNavigateFlow={onNavigateFlow}
        />

        {!canTrainToday && (
          <View style={[styles.goalSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>
                Primary Goal:
              </Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {primaryGoal}
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>
                Secondary Goal:
              </Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {secondaryGoal}
              </Text>
            </View>
            <Text style={[styles.trainTodayHint, { color: theme.textMuted, marginTop: 8 }]}>
              Pick at least one goal in Goal-Oriented or Sport-Focused training to enable Train today.
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.savedPresetsCard,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push("/presets")}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.savedPresetsTitle, { color: theme.text }]}>
              Want to utilize a saved preset?
            </Text>
            <Text style={[styles.savedPresetsSubtitle, { color: theme.textMuted }]}>
              Reuse a saved goal or sport setup for a day or a week.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </Pressable>
      </ScrollView>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  trainTodayCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  trainTodayTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  trainTodaySubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  trainTodayButtonWrap: {
    marginTop: 4,
  },
  trainTodayButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  trainTodayButtonText: {
    color: "#fffdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  trainTodayHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  preferenceProfilesCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  preferenceProfilesHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
  },
  preferenceProfilesTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  preferenceProfilesSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  preferenceProfilesList: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 10,
  },
  preferenceProfilesEmpty: {
    fontSize: 13,
    lineHeight: 18,
  },
  preferencePresetRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  preferencePresetNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  preferencePresetActions: {
    flexDirection: "row",
    gap: 8,
  },
  preferencePresetBtn: {
    flex: 1,
  },
  actionCard: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
  },
  actionCardIcon: {
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  actionCardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.9,
  },
  subButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    justifyContent: "center",
  },
  subButtonWrap: {
    minWidth: 118,
  },
  subButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subButtonSecondary: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "rgba(44,38,32,0.12)",
  },
  subButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffdf8",
  },
  goalSummary: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalLabel: {
    fontSize: 14,
  },
  goalValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  savedPresetsCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
  },
  savedPresetsTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  savedPresetsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
