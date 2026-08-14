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
import { useAppState } from "../../context/AppStateContext";
import { themeRadius, useTheme } from "../../lib/theme";
import { SectionLabel } from "../../components/SectionLabel";
import { PillTabs } from "../../components/PillTabs";
import { IconWell } from "../../components/IconWell";
import { LinkPill } from "../../components/LinkPill";
import { ChecklistRow } from "../../components/ChecklistRow";
import { useAuth } from "../../context/AuthContext";
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

type BuilderMode = "goal" | "sport";

function ReadyRing({
  done,
  total,
  theme,
}: {
  done: number;
  total: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const complete = total > 0 && done >= total;
  return (
    <View
      style={[
        styles.readyRing,
        {
          borderColor: complete ? theme.primary : theme.border,
          backgroundColor: complete ? theme.primarySoft : "transparent",
        },
      ]}
    >
      {complete ? (
        <Ionicons name="checkmark" size={26} color={theme.primary} />
      ) : (
        <Text style={[styles.readyRingText, { color: theme.primary }]}>
          {done}/{total}
        </Text>
      )}
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
  const { userId, isLoading: authLoading } = useAuth();
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
  const [builderMode, setBuilderMode] = useState<BuilderMode>("goal");
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

  if (authLoading) {
    return null;
  }
  if (!userId) {
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
          <View style={styles.trainTodayHero}>
            <View style={styles.trainTodayCopy}>
              <SectionLabel>Today</SectionLabel>
              <Text style={[styles.trainTodayTitle, { color: theme.text }]}>
                Train today
              </Text>
              <Text style={[styles.trainTodaySubtitle, { color: theme.textMuted }]}>
                {trainTodayLabel}
              </Text>
            </View>
            <ReadyRing
              done={[activeProfile != null, hasPresets, resolvedDefault != null].filter(Boolean).length}
              total={3}
              theme={theme}
            />
          </View>
          {canTrainToday ? (
            <Pressable
              style={({ pressed }) => [styles.trainTodayButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
              onPress={onTrainToday}
            >
              <View
                style={[
                  styles.trainTodayButton,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={[styles.trainTodayButtonText, { color: theme.onPrimary }]}>
                  Build today&apos;s workout
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.readyList}>
              <Text style={[styles.trainTodayHint, { color: theme.textMuted }]}>
                Finish these to unlock one-tap Train today.
              </Text>
              <ChecklistRow label="Gym profile" done={activeProfile != null} />
              <ChecklistRow label="Saved preset" done={hasPresets} />
              <ChecklistRow
                label="Default for Train today"
                done={resolvedDefault != null}
              />
            </View>
          )}
          {hasPresets ? (
            <LinkPill
              icon="swap-horizontal-outline"
              label="Switch preset"
              onPress={() => setSwitchOpen(true)}
            />
          ) : null}
          <LinkPill
            icon="settings-outline"
            label="Manage presets"
            onPress={() => router.push("/presets")}
          />
        </View>

        <SectionLabel>Build a session</SectionLabel>
        <PillTabs
          tabs={[
            { key: "goal", label: "Goal-Oriented", icon: "barbell-outline" },
            { key: "sport", label: "Sport-Focused", icon: "sparkles-outline" },
          ]}
          value={builderMode}
          onChange={setBuilderMode}
        />
        <View
          style={[
            styles.builderCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.builderHeader}>
            <IconWell
              name={builderMode === "goal" ? "barbell-outline" : "sparkles-outline"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.builderTitle, { color: theme.text }]}>
                {builderMode === "goal"
                  ? "Goal-Oriented Training"
                  : "Sport-Focused Training"}
              </Text>
              <Text style={[styles.builderSubtitle, { color: theme.textMuted }]}>
                {builderMode === "goal"
                  ? "Gym work for strength, physique, and other goals."
                  : "Gym work that complements your sport."}
              </Text>
            </View>
          </View>
          <LinkPill
            icon="today-outline"
            label="One day"
            onPress={() => {
              if (builderMode === "goal") {
                onNavigateFlow("goal_day", "/manual/preferences");
                return;
              }
              onNavigateFlow("sport_day", "/sport-mode?scope=day");
            }}
          />
          <LinkPill
            icon="calendar-outline"
            label="This week"
            onPress={() => {
              if (builderMode === "goal") {
                onNavigateFlow("goal_week", "/manual/preferences?scope=week");
                return;
              }
              onNavigateFlow("sport_week", "/sport-mode");
            }}
          />
        </View>
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
    borderRadius: themeRadius.card,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  trainTodayHero: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  trainTodayCopy: {
    flex: 1,
    gap: 4,
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
    borderRadius: themeRadius.control,
    paddingVertical: 14,
    alignItems: "center",
  },
  trainTodayButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  trainTodayHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  readyList: {
    gap: 8,
  },
  readyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  readyRingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  builderCard: {
    borderRadius: themeRadius.card,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  builderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  builderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  builderSubtitle: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
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
    borderRadius: themeRadius.modal,
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
    borderRadius: themeRadius.card,
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
});
