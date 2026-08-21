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
import { themeFonts, themeRadius, useTheme } from "../../lib/theme";
import { SectionLabel } from "../../components/SectionLabel";
import { PillTabs } from "../../components/PillTabs";
import { IconWell } from "../../components/IconWell";
import { GoalsIcon } from "../../components/GoalsIcon";
import { SportFocusedIcon } from "../../components/SportFocusedIcon";
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
import { formatItemList } from "../../lib/formatItemList";
import type { SessionFlow, SportPreset, WorkoutPresetKind } from "../../lib/sessionDraft";
import { navigateToSessionFlow } from "../../lib/sessionFlowNavigation";
import { setupRouteForFlow } from "../../lib/sessionFlowNav";
import { resolveDefaultTrainTodayPreset } from "../../lib/defaultTrainTodayPreset";
import type { PreferencePreset } from "../../lib/types";
import {
  canUseTrainToday,
  resolveTrainTodayFromPreset,
  sportSlugsFromForm,
  trainTodayCtaLabelFromPreset,
  trainTodaySessionFlow,
  trainTodaySubtitleFromPreset,
  type TrainTodayScope,
} from "../../lib/trainToday";

type BuilderMode = "goal" | "sport";

type PresetPickerRow = {
  kind: WorkoutPresetKind;
  id: string;
  name: string;
  detail: string;
};

function goalDetail(preset: PreferencePreset): string {
  const goals = preset.preferences.primaryFocus;
  if (goals.length === 0) return "No goals set";
  return formatItemList(goals);
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
    applyPreferencePreset,
    applySportPreset,
  } = useAppState();
  const [isTrainTodayGenerating, setIsTrainTodayGenerating] = useState(false);
  const [flowConflict, setFlowConflict] = useState<SessionFlowConflict | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("goal");
  const [trainTodayScope, setTrainTodayScope] = useState<TrainTodayScope>("day");
  const trainTodayCancelledRef = useRef(false);
  const pendingPresetApplyRef = useRef<(() => void) | null>(null);

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
  const trainTodayCta = trainTodayCtaLabelFromPreset(resolvedDefault, trainTodayScope);

  const applyResolvedTrainTodayPreset = () => {
    if (!resolvedDefault) return;
    if (resolvedDefault.kind === "goal") {
      applyPreferencePreset(resolvedDefault.preset.id);
    } else {
      applySportPreset(resolvedDefault.preset.id);
    }
  };

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
      setFlowConflict,
      true
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
    if (trainTodayScope === "week") {
      const sessionFlow = trainTodaySessionFlow(resolvedDefault, "week");
      navigateToSessionFlow(
        router,
        sessionFlow,
        setupRouteForFlow(sessionFlow),
        beginSessionFlow,
        replaceSessionFlow,
        activeSessionDraft,
        applyResolvedTrainTodayPreset,
        (conflict) => {
          pendingPresetApplyRef.current = applyResolvedTrainTodayPreset;
          setFlowConflict(conflict);
        }
      );
      return;
    }
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
      `You're already building a session. Continue that or replace it with a Quick Create workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => router.push(activeSessionDraft.resumeRoute as never),
        },
        {
          text: "Quick Create",
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
        message="Putting the session together"
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
        onCancel={() => {
          setFlowConflict(null);
          pendingPresetApplyRef.current = null;
        }}
        onContinue={() => {
          if (!flowConflict) return;
          const resume = flowConflict.resumeRoute;
          setFlowConflict(null);
          pendingPresetApplyRef.current = null;
          router.push(resume as never);
        }}
        onStartNew={() => {
          if (!flowConflict) return;
          const { nextFlow, targetHref } = flowConflict;
          setFlowConflict(null);
          replaceSessionFlow(nextFlow);
          pendingPresetApplyRef.current?.();
          pendingPresetApplyRef.current = null;
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Default for Quick Create</Text>
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
        <View
          style={[
            styles.trainTodayCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.trainTodayHero}>
            <View style={styles.trainTodayCopy}>
              <Text style={[styles.trainTodayTitle, { color: theme.text }]}>
                Quick Create
              </Text>
              <Text
                style={[styles.trainTodaySubtitle, { color: theme.textMuted }]}
                numberOfLines={2}
              >
                {trainTodayLabel}
              </Text>
            </View>
            {canTrainToday ? (
              <PillTabs
                compact
                tabs={[
                  { key: "day", label: "Day" },
                  { key: "week", label: "Week" },
                ]}
                value={trainTodayScope}
                onChange={setTrainTodayScope}
              />
            ) : null}
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
                <Text
                  style={[styles.trainTodayButtonText, { color: theme.onPrimary }]}
                  numberOfLines={1}
                >
                  {trainTodayCta}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.readyList}>
              <Text style={[styles.trainTodayHint, { color: theme.textMuted }]}>
                Needs a gym and a default preset.
              </Text>
              <ChecklistRow label="Gym profile" done={activeProfile != null} />
              <ChecklistRow label="Saved preset" done={hasPresets} />
              <ChecklistRow
                label="Default for Quick Create"
                done={resolvedDefault != null}
              />
            </View>
          )}
          <View style={styles.trainTodayActions}>
            {hasPresets ? (
              <LinkPill
                compact
                fill={false}
                icon="swap-horizontal-outline"
                label="Switch"
                onPress={() => setSwitchOpen(true)}
              />
            ) : null}
            <LinkPill
              compact
              fill={false}
              icon="settings-outline"
              label="Manage"
              onPress={() => router.push("/presets")}
            />
          </View>
        </View>

        <SectionLabel>Build a session</SectionLabel>
        <PillTabs
          tabs={[
            { key: "goal", label: "Goals", renderIcon: (color, size) => (
              <GoalsIcon color={color} size={size} />
            ) },
            { key: "sport", label: "Sport", renderIcon: (color, size) => (
              <SportFocusedIcon color={color} size={size} />
            ) },
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
            <IconWell>
              {builderMode === "goal" ? (
                <GoalsIcon size={20} />
              ) : (
                <SportFocusedIcon size={20} />
              )}
            </IconWell>
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
  trainTodayCard: {
    borderRadius: themeRadius.card,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  trainTodayHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  trainTodayCopy: {
    flex: 1,
    gap: 2,
  },
  trainTodayTitle: {
    fontFamily: themeFonts.displayBold,
    fontSize: 18,
  },
  trainTodaySubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  trainTodayButtonWrap: {
    marginTop: 2,
  },
  trainTodayButton: {
    borderRadius: themeRadius.button,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  trainTodayButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  trainTodayHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  trainTodayActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  readyList: {
    gap: 8,
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
    fontFamily: themeFonts.displayBold,
    fontSize: 20,
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
    fontFamily: themeFonts.displayBold,
    fontSize: 17,
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
