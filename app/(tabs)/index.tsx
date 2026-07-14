import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";
import { useWelcome } from "../../context/WelcomeContext";
import { AppScreenWrapper } from "../../components/AppScreenWrapper";
import { GenerationLoadingScreen } from "../../components/GenerationLoadingScreen";
import {
  SessionFlowConflictModal,
  type SessionFlowConflict,
} from "../../components/SessionFlowConflictModal";
import { loadGeneratorModule } from "../../lib/loadGeneratorModule";
import { prefetchWorkoutGenerationStack } from "../../lib/prefetchWorkoutGeneration";
import { preferredExerciseNamesForManualPreferences } from "../../lib/manualPreferredExerciseNames";
import type { SessionFlow, SportPreset, WorkoutPresetKind } from "../../lib/sessionDraft";
import { navigateToSessionFlow } from "../../lib/sessionFlowNavigation";
import { resolveDefaultTrainTodayPreset } from "../../lib/defaultTrainTodayPreset";
import type { PreferencePreset } from "../../lib/types";
import {
  canUseTrainToday,
  resolveTrainTodayFromPreset,
  sportSlugsFromForm,
  trainTodaySubtitleFromPreset,
} from "../../lib/trainToday";

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

type PresetPickerRow = {
  kind: WorkoutPresetKind;
  id: string;
  name: string;
  detail: string;
};

function goalDetail(preset: PreferencePreset): string {
  const goals = preset.preferences.primaryFocus;
  if (goals.length === 0) return "No goals set";
  if (goals.length === 1) return goals[0]!;
  return `${goals[0]} +${goals.length - 1} more`;
}

function sportDetail(preset: SportPreset): string {
  const sports = sportSlugsFromForm(preset.sportForm);
  if (sports.length === 0) return "No sports set";
  return sports
    .slice(0, 2)
    .map((s) => s.replace(/_/g, " "))
    .join(" · ");
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasEntered, isHydrated } = useWelcome();
  const {
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
    sportPresets,
    defaultTrainTodayPreset,
    setDefaultTrainTodayPreset,
  } = useAppState();
  const [isTrainTodayGenerating, setIsTrainTodayGenerating] = useState(false);
  const [flowConflict, setFlowConflict] = useState<SessionFlowConflict | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const trainTodayCancelledRef = useRef(false);

  useEffect(() => {
    void prefetchWorkoutGenerationStack();
  }, []);

  const activeProfile =
    gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
  const resolvedDefault = useMemo(
    () =>
      resolveDefaultTrainTodayPreset(
        defaultTrainTodayPreset,
        preferencePresets,
        sportPresets
      ),
    [defaultTrainTodayPreset, preferencePresets, sportPresets]
  );
  const hasPresets = preferencePresets.length + sportPresets.length > 0;
  const canTrainToday = canUseTrainToday(activeProfile != null, resolvedDefault);
  const trainTodayLabel = trainTodaySubtitleFromPreset(
    resolvedDefault,
    activeProfile?.name ?? null
  );

  const pickerRows = useMemo((): PresetPickerRow[] => {
    const goals: PresetPickerRow[] = preferencePresets.map((p) => ({
      kind: "goal",
      id: p.id,
      name: p.name,
      detail: goalDetail(p),
    }));
    const sports: PresetPickerRow[] = sportPresets.map((p) => ({
      kind: "sport",
      id: p.id,
      name: p.name,
      detail: sportDetail(p),
    }));
    return [...goals, ...sports];
  }, [preferencePresets, sportPresets]);

  const onNavigateFlow = (flow: SessionFlow, href: string) => {
    navigateToSessionFlow(
      router,
      flow,
      href,
      beginSessionFlow,
      replaceSessionFlow,
      activeSessionDraft,
      undefined,
      setFlowConflict
    );
  };

  const runTrainToday = async () => {
    if (!canTrainToday || !activeProfile || !resolvedDefault) return;
    trainTodayCancelledRef.current = false;
    setIsTrainTodayGenerating(true);
    try {
      const { prefs, sportGoalContext } = resolveTrainTodayFromPreset(resolvedDefault);
      const prefsWithDuration = {
        ...prefs,
        durationMinutes: prefs.durationMinutes ?? 45,
      };
      const preferredNamesPromise = preferredExerciseNamesForManualPreferences(prefsWithDuration);
      const generatorPromise = loadGeneratorModule();
      const [preferredNames, { generateWorkoutAsync }] = await Promise.all([
        preferredNamesPromise,
        generatorPromise,
      ]);
      if (trainTodayCancelledRef.current) return;
      const workout = await generateWorkoutAsync(
        prefsWithDuration,
        activeProfile,
        undefined,
        preferredNames,
        sportGoalContext,
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
    if (!canTrainToday || !activeProfile || !resolvedDefault) return;
    const { sessionFlow } = resolveTrainTodayFromPreset(resolvedDefault);
    if (beginSessionFlow(sessionFlow)) {
      void runTrainToday();
      return;
    }
    if (!activeSessionDraft) {
      replaceSessionFlow(sessionFlow);
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
            replaceSessionFlow(sessionFlow);
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
        subtitle="Using your default preset and gym."
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
      <SessionFlowConflictModal
        conflict={flowConflict}
        onCancel={() => setFlowConflict(null)}
        onContinue={() => {
          if (!flowConflict) return;
          const resume = flowConflict.resumeRoute;
          setFlowConflict(null);
          router.push(resume as never);
        }}
        onStartNew={() => {
          if (!flowConflict) return;
          const { nextFlow, targetHref } = flowConflict;
          setFlowConflict(null);
          replaceSessionFlow(nextFlow);
          router.push(targetHref as never);
        }}
      />
      <Modal
        visible={switchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSwitchOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Default for Train today</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {pickerRows.map((row) => {
                const selected =
                  defaultTrainTodayPreset?.kind === row.kind &&
                  defaultTrainTodayPreset.id === row.id;
                return (
                  <Pressable
                    key={`${row.kind}:${row.id}`}
                    style={({ pressed }) => [
                      styles.modalRow,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.85 : 1,
                        backgroundColor: selected ? theme.primarySoft : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setDefaultTrainTodayPreset({ kind: row.kind, id: row.id });
                      setSwitchOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalRowTitle, { color: theme.text }]}>
                        {row.name}
                      </Text>
                      <Text style={[styles.modalRowDetail, { color: theme.textMuted }]}>
                        {row.kind === "goal" ? "Goal" : "Sport"} · {row.detail}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setSwitchOpen(false)} style={styles.modalClose}>
              <Text style={{ color: theme.primary, fontWeight: "600" }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: theme.text }]}>
          How do you want to train?
        </Text>

        <View
          style={[
            styles.trainTodayCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.trainTodayTitle, { color: theme.text }]}>Train today</Text>
          <Text style={[styles.trainTodaySubtitle, { color: theme.textMuted }]}>
            {trainTodayLabel}
          </Text>
          {canTrainToday ? (
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
          ) : (
            <Text style={[styles.trainTodayHint, { color: theme.textMuted }]}>
              Save a goal or sport setup as a preset to enable one-tap Train today.
            </Text>
          )}
          {hasPresets ? (
            <Pressable
              style={({ pressed }) => [styles.switchRow, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setSwitchOpen(true)}
            >
              <Text style={[styles.switchLabel, { color: theme.primary }]}>Switch preset</Text>
              <Ionicons name="swap-horizontal" size={16} color={theme.primary} />
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.manageRow, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/presets")}
          >
            <Text style={[styles.manageLabel, { color: theme.textMuted }]}>Manage presets</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
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
          subtitle="Gym work that complements your sport."
          oneDayFlow="sport_day"
          weekFlow="sport_week"
          oneDayHref="/sport-mode?scope=day"
          weekHref="/sport-mode"
          variant="help"
          theme={theme}
          onNavigateFlow={onNavigateFlow}
        />
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
    fontSize: 20,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manageLabel: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  modalList: {
    flexGrow: 0,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  modalRowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalRowDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  modalClose: {
    alignItems: "center",
    paddingVertical: 6,
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
});
