import React, { useState, useRef, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  type LayoutChangeEvent,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { defaultManualPreferences } from "../../../context/appStateModel";
import { useTheme } from "../../../lib/theme";
import { CollapsiblePreferenceSection } from "../../../components/CollapsiblePreferenceSection";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import { Chip } from "../../../components/Chip";
import { DurationSlider } from "../../../components/DurationSlider";
import { PrimaryButton } from "../../../components/Button";
import { ExperienceLevelToggle } from "../../../components/ExperienceLevelToggle";
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { preferredExerciseNamesForManualPreferences } from "../../../lib/manualPreferredExerciseNames";
import {
  PRIMARY_FOCUS_OPTIONS,
  ENERGY_LEVELS,
  TARGET_OPTIONS,
  MODIFIERS_BY_TARGET,
  CONSTRAINT_OPTIONS,
  CONSTRAINT_OPTIONS_UPPER,
  CONSTRAINT_OPTIONS_LOWER,
  WORKOUT_STYLE_OPTIONS,
  UPCOMING_OPTIONS,
  SUB_FOCUS_BY_PRIMARY,
  normalizeGoalMatchPct,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "../../../lib/preferencesConstants";
import {
  computeDeclaredIntentSplitFromPrefs,
  buildWorkoutIntentTitle,
} from "../../../lib/workoutIntentSplit";
import type { TargetBody } from "../../../lib/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_GOALS = 3;
const MAX_SUB_GOALS_PER_GOAL = 3;
/** Cap total sub-goal chips across all ranked goals (was 3 per goal → up to 9). */
const MAX_TOTAL_SUB_GOALS = 3;
const MAX_UPCOMING = 3;

const DEFAULT_SESSION_MINUTES = 45 as const;

export default function ManualPreferencesScreen() {
  const {
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
    setActiveGymProfile,
    addPreferencePreset,
  } = useAppState();
  const [refinementsOpen, setRefinementsOpen] = useState(false);
  const [sectionDurationOpen, setSectionDurationOpen] = useState(false);
  const [sectionGoalOpen, setSectionGoalOpen] = useState(false);
  const [sectionBodyOpen, setSectionBodyOpen] = useState(false);
  const [sectionGymOpen, setSectionGymOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const advancedSectionRef = useRef<View>(null);
  const [showChangeProfileModal, setShowChangeProfileModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [editingGoalMatchRank, setEditingGoalMatchRank] = useState<1 | 2 | 3 | null>(null);
  const [editingGoalMatchValue, setEditingGoalMatchValue] = useState("");
  const [bottomBarHeight, setBottomBarHeight] = useState(180);
  const router = useRouter();
  const navigation = useNavigation();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const theme = useTheme();
  const isWeek = scope === "week";
  const [isGenerating, setIsGenerating] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isWeek ? "Plan your week" : "Build workout",
    });
  }, [navigation, isWeek]);

  useFocusEffect(
    useCallback(() => {
      const updates: Partial<typeof defaultManualPreferences> = {};
      if (manualPreferences.durationMinutes == null) {
        updates.durationMinutes = DEFAULT_SESSION_MINUTES;
      }
      if (!isWeek && manualPreferences.targetBody == null) {
        updates.targetBody = "Full";
      }
      if (Object.keys(updates).length > 0) {
        updateManualPreferences(updates);
      }
    }, [
      isWeek,
      manualPreferences.durationMinutes,
      manualPreferences.targetBody,
      updateManualPreferences,
    ])
  );

  const rankedGoals = manualPreferences.primaryFocus;
  const hasPrimaryFocus = rankedGoals.length > 0;

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const hasGoal = manualPreferences.primaryFocus.length >= 1;
  const hasDuration = manualPreferences.durationMinutes != null;
  const hasBodyEmphasis = manualPreferences.targetBody != null;
  const hasGymProfile = activeProfile != null;
  const canProceed =
    isWeek
      ? hasGoal && hasDuration && hasGymProfile
      : hasGoal && hasDuration && hasBodyEmphasis && hasGymProfile;

  const durationSummary =
    manualPreferences.durationMinutes != null
      ? `${manualPreferences.durationMinutes} min`
      : "Tap to choose";
  const goalSummary = !hasGoal
    ? "Tap to choose"
    : rankedGoals.length > 1
      ? `${rankedGoals[0]} +${rankedGoals.length - 1} more`
      : rankedGoals[0];
  const bodySummary = !manualPreferences.targetBody
    ? "Tap to choose"
    : manualPreferences.targetBody === "Full"
      ? "Full body"
      : manualPreferences.targetModifier.length > 0
        ? `${manualPreferences.targetBody} (${manualPreferences.targetModifier[0]})`
        : manualPreferences.targetBody;
  const gymSummary =
    activeProfile != null ? activeProfile.name : "Tap to choose";

  const togglePrimaryFocus = (option: string) => {
    const current = manualPreferences.primaryFocus;
    const exists = current.includes(option);
    const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
    const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
    const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
    if (exists) {
      const nextFocus = current.filter((v) => v !== option);
      const nextSub = { ...manualPreferences.subFocusByGoal };
      delete nextSub[option];
      const norm = normalizeGoalMatchPct(p1, p2, p3, nextFocus.length);
      updateManualPreferences({
        primaryFocus: nextFocus,
        subFocusByGoal: nextSub,
        ...norm,
      });
    } else {
      if (current.length >= MAX_GOALS) return;
      const nextFocus = [...current, option];
      const norm = normalizeGoalMatchPct(p1, p2, p3, nextFocus.length);
      updateManualPreferences({ primaryFocus: nextFocus, ...norm });
    }
  };

  /** Move goal to first rank (or add then place first). */
  const promoteGoalToPrimary = (option: string) => {
    const current = manualPreferences.primaryFocus;
    const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
    const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
    const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
    const without = current.filter((g) => g !== option);
    const nextFocus = current.includes(option)
      ? [option, ...without]
      : [option, ...current].slice(0, MAX_GOALS);
    const norm = normalizeGoalMatchPct(p1, p2, p3, nextFocus.length);
    const nextSub = { ...manualPreferences.subFocusByGoal };
    current.forEach((g) => {
      if (!nextFocus.includes(g)) delete nextSub[g];
    });
    updateManualPreferences({
      primaryFocus: nextFocus,
      subFocusByGoal: nextSub,
      ...norm,
    });
  };

  const onGoalEssentialChipPress = (option: string) => {
    if (manualPreferences.primaryFocus.includes(option)) {
      promoteGoalToPrimary(option);
    } else {
      if (manualPreferences.primaryFocus.length >= MAX_GOALS) return;
      togglePrimaryFocus(option);
    }
  };

  const toggleSubGoal = (goal: string, subOpt: string) => {
    const current = manualPreferences.subFocusByGoal[goal] ?? [];
    const exists = current.includes(subOpt);
    if (exists) {
      const next = current.filter((v) => v !== subOpt);
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [goal]: next,
        },
      });
    } else {
      if (current.length >= MAX_SUB_GOALS_PER_GOAL) return;
      const totalOthers = Object.entries(manualPreferences.subFocusByGoal).reduce(
        (n, [g, arr]) => (g === goal ? n : n + arr.length),
        0
      );
      if (totalOthers + current.length >= MAX_TOTAL_SUB_GOALS) return;
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [goal]: [...current, subOpt],
        },
      });
    }
  };

  const setTargetBody = (target: TargetBody | null) => {
    const current = manualPreferences.injuries.filter((i) => i !== "No restrictions");
    const upperOnly = ["Shoulder", "Elbow", "Wrist", "Core"];
    const lowerOnly = ["Lower Back", "Hip", "Knee", "Ankle", "Core"];
    let nextInjuries = current;
    if (target === "Upper") {
      nextInjuries = current.filter((i) => upperOnly.includes(i));
    } else if (target === "Lower") {
      nextInjuries = current.filter((i) => lowerOnly.includes(i));
    }
    if (manualPreferences.injuries.includes("No restrictions")) nextInjuries = ["No restrictions"];
    updateManualPreferences({
      targetBody: target,
      targetModifier: [],
      injuries: nextInjuries,
    });
  };

  const toggleTargetModifier = (modifier: string) => {
    const current = manualPreferences.targetModifier;
    const exists = current.includes(modifier);
    const next = exists
      ? current.filter((v) => v !== modifier)
      : [...current, modifier];
    updateManualPreferences({ targetModifier: next });
  };

  const toggleConstraint = (opt: string) => {
    const current = manualPreferences.injuries;
    if (opt === "No restrictions") {
      updateManualPreferences({ injuries: ["No restrictions"] });
      return;
    }
    const withoutNoRestrictions = current.filter((c) => c !== "No restrictions");
    const exists = withoutNoRestrictions.includes(opt);
    const next = exists
      ? withoutNoRestrictions.filter((v) => v !== opt)
      : [...withoutNoRestrictions, opt];
    updateManualPreferences({ injuries: next });
  };

  const toggleUpcoming = (option: string) => {
    const current = manualPreferences.upcoming;
    const exists = current.includes(option);
    if (exists) {
      updateManualPreferences({
        upcoming: current.filter((v) => v !== option),
      });
    } else {
      if (current.length >= MAX_UPCOMING) return;
      updateManualPreferences({ upcoming: [...current, option] });
    }
  };

  const toggleFromArray =
    (key: "workoutStyle") =>
    (value: string) => {
      const current = manualPreferences[key] as string[];
      const exists = current.includes(value);
      updateManualPreferences({
        [key]: exists ? current.filter((v) => v !== value) : [...current, value],
      });
    };

  const onGenerate = async () => {
    if (!canProceed) return;
    if (scope === "week") {
      router.push("/manual/week");
      return;
    }
    setIsGenerating(true);
    try {
      const profile = gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
      const preferredNames = await preferredExerciseNamesForManualPreferences(manualPreferences);
      const { generateWorkoutAsync } = await loadGeneratorModule();
      const workout = await generateWorkoutAsync(
        manualPreferences,
        profile,
        undefined,
        preferredNames
      );
      setGeneratedWorkout(workout);
      router.push("/manual/workout");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn’t build workout", msg);
      setIsGenerating(false);
    }
  };

  const onReset = () => {
    updateManualPreferences(defaultManualPreferences);
  };

  const onSavePreset = () => {
    setSavePresetName("");
    setShowSavePresetModal(true);
  };

  const onConfirmSavePreset = () => {
    const name = savePresetName.trim() || "My preset";
    addPreferencePreset({
      name,
      savedAt: new Date().toISOString(),
      preferences: { ...manualPreferences },
    });
    setShowSavePresetModal(false);
    setSavePresetName("");
    router.push("/profiles");
  };

  const toggleRefinements = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefinementsOpen((v) => !v);
  };

  const openAdvancedAndScroll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefinementsOpen(true);
    requestAnimationFrame(() => {
      const scroll = scrollViewRef.current;
      const content = scrollContentRef.current;
      const section = advancedSectionRef.current;
      if (!scroll || !content || !section) return;
      section.measureLayout(
        content as unknown as View,
        (_x: number, y: number) => {
          scroll.scrollTo({ y: Math.max(0, y - 12), animated: true });
        },
        () => {}
      );
    });
  }, []);

  const onBottomBarLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setBottomBarHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const modifierOptions = manualPreferences.targetBody
    ? MODIFIERS_BY_TARGET[manualPreferences.targetBody]
    : [];

  type ManualAdvNestedKey =
    | "energy"
    | "goalWeights"
    | "subGoals"
    | "extraGoals"
    | "avoid"
    | "style"
    | "upcoming"
    | "zone2";
  const [manualAdvNestedOpen, setManualAdvNestedOpen] = useState<
    Partial<Record<ManualAdvNestedKey, boolean>>
  >({});
  const toggleManualAdvNested = useCallback((key: ManualAdvNestedKey) => {
    setManualAdvNestedOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const manualAdvEnergySummary =
    manualPreferences.energyLevel != null
      ? manualPreferences.energyLevel.charAt(0).toUpperCase() +
        manualPreferences.energyLevel.slice(1)
      : "Default (medium)";
  const gw1 = manualPreferences.goalMatchPrimaryPct ?? 50;
  const gw2 = manualPreferences.goalMatchSecondaryPct ?? 30;
  const gw3 = manualPreferences.goalMatchTertiaryPct ?? 20;
  const manualAdvGoalWeightsSummary =
    rankedGoals.length === 0
      ? "—"
      : rankedGoals.length === 1
        ? `${gw1}%`
        : rankedGoals.length === 2
          ? `${gw1}/${gw2}%`
          : `${gw1}/${gw2}/${gw3}%`;
  const subGoalsTotalCount = Object.values(manualPreferences.subFocusByGoal).reduce(
    (n, arr) => n + arr.length,
    0
  );
  const manualAdvSubGoalsSummary =
    subGoalsTotalCount === 0 ? "None" : `${subGoalsTotalCount} selected`;
  const manualAdvExtraGoalsSummary =
    rankedGoals.length >= MAX_GOALS ? "Full" : `${MAX_GOALS - rankedGoals.length} slot(s)`;
  const manualAdvAvoidSummary = (() => {
    const inj = manualPreferences.injuries;
    if (inj.includes("No restrictions") || inj.length === 0) return "No restrictions";
    if (inj.length <= 2) return inj.join(", ");
    return `${inj[0]}, +${inj.length - 1}`;
  })();
  const manualAdvStyleSummary =
    manualPreferences.workoutStyle.length === 0
      ? "None"
      : manualPreferences.workoutStyle.length === 1
        ? manualPreferences.workoutStyle[0]
        : `${manualPreferences.workoutStyle[0]} +${manualPreferences.workoutStyle.length - 1}`;
  const manualAdvUpcomingSummary =
    manualPreferences.upcoming.length === 0
      ? "None"
      : `${manualPreferences.upcoming.length} picked`;

  const prefsFocusSplit = (() => {
    const goalLabels = manualPreferences.primaryFocus.slice(0, 3);
    if (goalLabels.length === 0) return [];
    const goalSlugs = goalLabels.map((l) => PRIMARY_FOCUS_TO_GOAL_SLUG[l] ?? "strength");
    return computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs,
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
      goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
      goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
    });
  })();
  const prefsWorkoutTitle =
    prefsFocusSplit.length > 0 ? buildWorkoutIntentTitle(prefsFocusSplit) : undefined;

  if (isGenerating) {
    return (
      <GenerationLoadingScreen
        message="Building your session…"
        subtitle="Matching movements to your gym and goals."
        focusSplit={prefsFocusSplit.length > 0 ? prefsFocusSplit : undefined}
        workoutTitle={prefsWorkoutTitle}
      />
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View ref={scrollContentRef} collapsable={false}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>
          {isWeek ? "Plan your week" : "Build today’s workout"}
        </Text>
        <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
          {isWeek
            ? "Two quick choices, then pick your training days. Fine-tune anytime in Advanced options."
            : "Three quick choices. You can fine-tune later."}
        </Text>

        <ExperienceLevelToggle
          marginTop={16}
          workoutTier={manualPreferences.workoutTier ?? "intermediate"}
          includeCreativeVariations={manualPreferences.includeCreativeVariations === true}
          onChange={(patch) => updateManualPreferences(patch)}
        />

        <CollapsiblePreferenceSection
          title="Session length"
          subtitle="About how long you want to train."
          summary={durationSummary}
          expanded={sectionDurationOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionDurationOpen((v) => !v);
          }}
          marginTop={12}
        >
          <DurationSlider
            valueMinutes={manualPreferences.durationMinutes}
            onValueChange={(minutes) => updateManualPreferences({ durationMinutes: minutes })}
            theme={theme}
          />
        </CollapsiblePreferenceSection>

        <CollapsiblePreferenceSection
          title="Training goal"
          subtitle={rankedGoals.length === 0 ? "Choose up to three, ranked by priority." : undefined}
          summary={goalSummary}
          expanded={sectionGoalOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionGoalOpen((v) => !v);
          }}
        >
          {rankedGoals.length > 1 ? (
            <Text style={[styles.helperHint, { color: theme.textMuted }]}>
              Your main goal is first in the list. Tap a chip to make it primary, or remove extras with ×.
            </Text>
          ) : null}
          {rankedGoals.length > 0 && (
            <View style={styles.chipGroup}>
              {rankedGoals.map((goal, idx) => (
                <View key={goal} style={styles.rankedChipWrap}>
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor: theme.chipSelectedBackground,
                        borderWidth: 1,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rankBadgeText, { color: theme.chipSelectedText }]}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.rankedChipInner,
                      {
                        backgroundColor: theme.chipSelectedBackground,
                        borderWidth: 1,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rankedChipLabel, { color: theme.chipSelectedText }]}
                      numberOfLines={1}
                    >
                      {goal}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => togglePrimaryFocus(goal)}
                    style={styles.rankedChipRemove}
                  >
                    <Text style={[styles.rankedChipRemoveText, { color: theme.textMuted }]}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={styles.chipGroup}>
            {PRIMARY_FOCUS_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={manualPreferences.primaryFocus.includes(option)}
                onPress={() => onGoalEssentialChipPress(option)}
              />
            ))}
          </View>
        </CollapsiblePreferenceSection>

        {/* Sub-goals — always visible when goals are selected */}
        {hasPrimaryFocus && (
          <View style={[styles.subFocusSectionWrap, { borderTopColor: theme.border, borderTopWidth: 0, marginTop: 8 }]}>
            <Text style={[styles.subFocusSectionLabel, { color: theme.textMuted }]}>
              Sub-goals <Text style={{ fontWeight: "400" }}>(optional, up to 3 total)</Text>
            </Text>
            {rankedGoals.map((goal, goalIdx) => {
              const subOptions = SUB_FOCUS_BY_PRIMARY[goal] ?? [];
              const selectedSubs = manualPreferences.subFocusByGoal[goal] ?? [];
              const canAddSub =
                selectedSubs.length < MAX_SUB_GOALS_PER_GOAL &&
                subGoalsTotalCount < MAX_TOTAL_SUB_GOALS;
              if (subOptions.length === 0) return null;
              return (
                <View key={goal} style={{ marginTop: rankedGoals.length > 1 && goalIdx > 0 ? 10 : 0 }}>
                  {rankedGoals.length > 1 && (
                    <View style={[styles.goalRowHeader, { marginBottom: 6 }]}>
                      <View
                        style={[
                          styles.rankBadgeSmall,
                          {
                            backgroundColor: theme.chipSelectedBackground,
                            borderWidth: 1,
                            borderColor: theme.primary,
                          },
                        ]}
                      >
                        <Text style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}>
                          {goalIdx + 1}
                        </Text>
                      </View>
                      <Text style={[styles.goalRowLabel, { color: theme.textMuted, fontSize: 12 }]}>
                        {goal}
                      </Text>
                    </View>
                  )}
                  {selectedSubs.length > 0 && (
                    <View style={[styles.chipGroup, { marginBottom: 6 }]}>
                      {selectedSubs.map((sub, subIdx) => (
                        <Pressable
                          key={sub}
                          style={styles.rankedChipWrap}
                          onPress={() => toggleSubGoal(goal, sub)}
                        >
                          <View
                            style={[
                              styles.rankBadgeSmall,
                              {
                                backgroundColor: theme.chipSelectedBackground,
                                borderWidth: 1,
                                borderColor: theme.primary,
                              },
                            ]}
                          >
                            <Text style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}>
                              {subIdx + 1}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.rankedChipInner,
                              {
                                backgroundColor: theme.chipSelectedBackground,
                                borderWidth: 1,
                                borderColor: theme.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                              numberOfLines={1}
                            >
                              {sub}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.chipGroup}>
                    {subOptions
                      .filter((opt) => !selectedSubs.includes(opt))
                      .map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          selected={false}
                          disabled={!canAddSub}
                          onPress={() => toggleSubGoal(goal, opt)}
                        />
                      ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <CollapsiblePreferenceSection
          title="Where you train"
          subtitle={
            activeProfile != null
              ? `Equipment from: ${activeProfile.name}`
              : "Choose a gym profile for equipment."
          }
          summary={gymSummary}
          expanded={sectionGymOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionGymOpen((v) => !v);
          }}
          marginTop={12}
        >
          <View style={[styles.gymProfileActions, { marginBottom: 8 }]}>
            <PrimaryButton
              label="Change gym profile"
              variant="secondary"
              onPress={() => setShowChangeProfileModal(true)}
              style={styles.gymProfileBtn}
            />
            <PrimaryButton
              label="Edit gym profiles"
              variant="secondary"
              onPress={() => router.push("/profiles?from=manual")}
              style={styles.gymProfileBtn}
            />
          </View>
        </CollapsiblePreferenceSection>

        {!isWeek ? (
          <CollapsiblePreferenceSection
            title="Body emphasis"
            subtitle="Still full-body—we’ll lean a bit more on this area."
            summary={bodySummary}
            expanded={sectionBodyOpen}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSectionBodyOpen((v) => !v);
            }}
          >
            <View style={styles.chipGroup}>
              {TARGET_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={manualPreferences.targetBody === opt}
                  onPress={() => setTargetBody(opt)}
                />
              ))}
            </View>
            {modifierOptions.length > 0 && (
              <>
                <Text style={[styles.modifierLabel, { color: theme.textMuted }]}>
                  Optional modifier
                </Text>
                <View style={styles.chipGroup}>
                  {modifierOptions.map((mod) => (
                    <Chip
                      key={mod}
                      label={mod}
                      selected={manualPreferences.targetModifier.includes(mod)}
                      onPress={() => toggleTargetModifier(mod)}
                    />
                  ))}
                </View>
              </>
            )}
          </CollapsiblePreferenceSection>
        ) : null}

        <View ref={advancedSectionRef} collapsable={false}>
        {/* ——— Advanced options (collapsible) ——— */}
        <Pressable
          style={[
            styles.advancedFiltersHeader,
            { borderBottomColor: theme.border },
          ]}
          onPress={toggleRefinements}
        >
          <Text
            style={[styles.advancedFiltersTitle, { color: theme.textMuted }]}
          >
            Advanced options
          </Text>
          <Text
            style={[styles.advancedFiltersChevron, { color: theme.textMuted }]}
          >
            {refinementsOpen ? "▼" : "▶"}
          </Text>
        </Pressable>

        {refinementsOpen && (
          <View
            style={[
              styles.advancedFiltersSection,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
          >
            <CollapsiblePreferenceSection
              nested
              title="How hard to train"
              subtitle="Low, medium, or high affects sets and conditioning length."
              summary={manualAdvEnergySummary}
              expanded={manualAdvNestedOpen.energy === true}
              onToggle={() => toggleManualAdvNested("energy")}
            >
              <View style={styles.chipGroup}>
                {ENERGY_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={level}
                    selected={
                      manualPreferences.energyLevel === level.toLowerCase()
                    }
                    onPress={() => {
                      const next = level.toLowerCase() as "low" | "medium" | "high";
                      updateManualPreferences({
                        energyLevel: manualPreferences.energyLevel === next ? null : next,
                      });
                    }}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

            {hasPrimaryFocus && (
              <CollapsiblePreferenceSection
                nested
                title="Goal match %"
                subtitle="What % of the workout should match each ranked goal. Sum = 100%."
                summary={manualAdvGoalWeightsSummary}
                expanded={manualAdvNestedOpen.goalWeights === true}
                onToggle={() => toggleManualAdvNested("goalWeights")}
              >
                <View style={[styles.chipGroup, { flexDirection: "column", gap: 12 }]}>
                  {rankedGoals.slice(0, 3).map((goal, idx) => {
                    const rank = (idx + 1) as 1 | 2 | 3;
                    const value =
                      rank === 1
                        ? (manualPreferences.goalMatchPrimaryPct ?? 50)
                        : rank === 2
                          ? (manualPreferences.goalMatchSecondaryPct ?? 30)
                          : (manualPreferences.goalMatchTertiaryPct ?? 20);
                    const isEditing = editingGoalMatchRank === rank;
                    const displayValue = isEditing ? editingGoalMatchValue : String(value);
                    const commitWeight = (raw: number) => {
                      const v = Math.max(0, Math.min(100, Math.round(raw)));
                      let p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
                      let p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
                      let p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
                      if (rank === 1) p1 = v;
                      else if (rank === 2) p2 = v;
                      else p3 = v;
                      const norm = normalizeGoalMatchPct(
                        p1,
                        p2,
                        p3,
                        rankedGoals.length,
                      );
                      updateManualPreferences(norm);
                    };
                    return (
                      <View
                        key={goal}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={[styles.modifierLabel, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {goal}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <TextInput
                            style={[
                              styles.goalMatchInput,
                              {
                                color: theme.text,
                                borderColor: theme.border,
                              },
                            ]}
                            keyboardType="number-pad"
                            value={displayValue}
                            onFocus={() => {
                              setEditingGoalMatchRank(rank);
                              setEditingGoalMatchValue(String(value));
                            }}
                            onBlur={() => {
                              const n = parseInt(editingGoalMatchValue.replace(/\D/g, ""), 10);
                              if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                                commitWeight(n);
                              }
                              setEditingGoalMatchRank(null);
                              setEditingGoalMatchValue("");
                            }}
                            onChangeText={(t) => {
                              if (!isEditing) return;
                              const digits = t.replace(/\D/g, "");
                              setEditingGoalMatchValue(digits);
                            }}
                          />
                          <Text style={[styles.modifierLabel, { color: theme.textMuted }]}>%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </CollapsiblePreferenceSection>
            )}

            {/* Sport mode hint when user has athletic/sport goals */}
            {hasPrimaryFocus &&
            rankedGoals.some(
              (g) => g === "Athletic Performance" || g === "Sport Conditioning"
            ) ? (
              <Pressable
                onPress={() => router.push("/sport-mode")}
                style={({ pressed }) => [
                  styles.sportModeHint,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.sportModeHintText, { color: theme.textMuted }]}>
                  Looking for something else? Try{" "}
                  <Text style={[styles.sportModeHintLink, { color: theme.primary }]}>
                    Sport mode
                  </Text>
                  !
                </Text>
              </Pressable>
            ) : null}

            <CollapsiblePreferenceSection
              nested
              title="Avoid or protect"
              subtitle="We’ll skip exercises that bother these areas. “No restrictions” clears others."
              summary={manualAdvAvoidSummary}
              expanded={manualAdvNestedOpen.avoid === true}
              onToggle={() => toggleManualAdvNested("avoid")}
            >
              <View style={styles.chipGroup}>
                {(manualPreferences.targetBody === "Upper"
                  ? CONSTRAINT_OPTIONS_UPPER
                  : manualPreferences.targetBody === "Lower"
                    ? CONSTRAINT_OPTIONS_LOWER
                    : [...CONSTRAINT_OPTIONS]
                ).map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={manualPreferences.injuries.includes(opt)}
                    onPress={() => toggleConstraint(opt)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

            <CollapsiblePreferenceSection
              nested
              title="Style"
              subtitle="Optional workout style tags."
              summary={manualAdvStyleSummary}
              expanded={manualAdvNestedOpen.style === true}
              onToggle={() => toggleManualAdvNested("style")}
            >
              <View style={styles.chipGroup}>
                {WORKOUT_STYLE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={manualPreferences.workoutStyle.includes(opt)}
                    onPress={() => toggleFromArray("workoutStyle")(opt)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

            <CollapsiblePreferenceSection
              nested
              title="Upcoming (1–3 days)"
              subtitle="Protect big days. Pick up to 3, ranked."
              summary={manualAdvUpcomingSummary}
              expanded={manualAdvNestedOpen.upcoming === true}
              onToggle={() => toggleManualAdvNested("upcoming")}
            >
            {manualPreferences.upcoming.length > 0 && (
              <View style={styles.chipGroup}>
                {manualPreferences.upcoming.map((u, idx) => (
                  <Pressable
                    key={u}
                    style={styles.rankedChipWrap}
                    onPress={() => toggleUpcoming(u)}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: theme.chipSelectedBackground,
                          borderWidth: 1,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankBadgeText,
                          { color: theme.chipSelectedText },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.rankedChipInner,
                        {
                          backgroundColor: theme.chipSelectedBackground,
                          borderWidth: 1,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankedChipLabel,
                          { color: theme.chipSelectedText },
                        ]}
                        numberOfLines={1}
                      >
                        {u}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.chipGroup}>
              {UPCOMING_OPTIONS.filter(
                (u) => !manualPreferences.upcoming.includes(u)
              ).map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={false}
                  onPress={() => toggleUpcoming(u)}
                />
              ))}
            </View>
            </CollapsiblePreferenceSection>

            {hasPrimaryFocus && rankedGoals.length < MAX_GOALS ? (
              <CollapsiblePreferenceSection
                nested
                title="Additional goals (optional)"
                subtitle="Second or third ranked goal. Reorder from Training goal above."
                summary={manualAdvExtraGoalsSummary}
                expanded={manualAdvNestedOpen.extraGoals === true}
                onToggle={() => toggleManualAdvNested("extraGoals")}
              >
                <View style={styles.chipGroup}>
                  {PRIMARY_FOCUS_OPTIONS.filter(
                    (option) => !manualPreferences.primaryFocus.includes(option)
                  ).map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={false}
                      onPress={() => togglePrimaryFocus(option)}
                    />
                  ))}
                </View>
              </CollapsiblePreferenceSection>
            ) : null}
          </View>
        )}

        </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        onLayout={onBottomBarLayout}
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <PrimaryButton
          label={isWeek ? "Next: Choose training days" : "Build workout"}
          onPress={onGenerate}
          disabled={!canProceed}
        />
        {!canProceed ? (
          <Text style={[styles.ctaHint, { color: theme.textMuted }]}>
            {isWeek
              ? "Choose a session length and training goal to continue."
              : "Choose session length, training goal, body emphasis, and gym profile to continue."}
          </Text>
        ) : null}
        <Pressable onPress={openAdvancedAndScroll} style={styles.advancedLinkWrap}>
          <Text style={[styles.advancedLinkText, { color: theme.primary }]}>
            Advanced options (energy, injuries, extra goals…)
          </Text>
        </Pressable>
        <View style={styles.bottomBarRow}>
          <PrimaryButton
            label="Reset"
            variant="secondary"
            onPress={onReset}
            style={styles.resetBtn}
          />
          <Pressable onPress={onSavePreset} style={styles.savePresetWrap}>
            <Text style={[styles.savePresetText, { color: theme.textMuted }]}>
              Save preset
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Change gym profile modal */}
      <Modal
        transparent
        visible={showChangeProfileModal}
        animationType="slide"
        onRequestClose={() => setShowChangeProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setShowChangeProfileModal(false)}
          />
          <View
            style={[styles.modalSheet, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Change gym profile
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Workouts will use equipment from the selected profile.
            </Text>
            <View style={styles.profileList}>
              {gymProfiles.map((profile) => {
                const isActive = profile.id === activeGymProfileId;
                return (
                  <View key={profile.id} style={styles.profileRowWrap}>
                    <Pressable
                      onPress={() => {
                        setActiveGymProfile(profile.id);
                        setShowChangeProfileModal(false);
                      }}
                      style={[
                        styles.profileRow,
                        {
                          borderColor: isActive ? theme.primary : theme.border,
                          backgroundColor: isActive
                            ? theme.primarySoft
                            : "transparent",
                          flex: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileRowText,
                          {
                            color: theme.text,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {profile.name}
                      </Text>
                      {isActive && (
                        <Text style={{ color: theme.primary, fontSize: 12 }}>
                          Active
                        </Text>
                      )}
                    </Pressable>
                    <PrimaryButton
                      label="Edit"
                      variant="ghost"
                      onPress={() => {
                        setShowChangeProfileModal(false);
                        router.push("/profiles?from=workout");
                      }}
                      style={styles.editProfileBtn}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Done"
                onPress={() => setShowChangeProfileModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Save preset modal */}
      <Modal
        transparent
        visible={showSavePresetModal}
        animationType="fade"
        onRequestClose={() => setShowSavePresetModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setShowSavePresetModal(false)}
          />
          <View
            style={[styles.modalSheet, styles.savePresetModalSheet, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Save preference preset
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Name this preset to reuse your current workout preferences later.
            </Text>
            <TextInput
              placeholder="e.g. Upper Push Day"
              placeholderTextColor={theme.textMuted}
              value={savePresetName}
              onChangeText={setSavePresetName}
              style={[
                styles.savePresetInput,
                { borderColor: theme.border, color: theme.text },
              ]}
            />
            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => setShowSavePresetModal(false)}
                style={styles.modalFooterBtn}
              />
              <PrimaryButton
                label="Save"
                onPress={onConfirmSavePreset}
                style={styles.modalFooterBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  helperHint: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  ctaHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  advancedLinkWrap: {
    paddingVertical: 10,
    alignItems: "center",
  },
  advancedLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  summary: {
    fontSize: 13,
    marginTop: 8,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  rankedChipWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  rankedChipPressable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankedChipPct: {
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "500",
  },
  rankedChipRemove: {
    paddingLeft: 6,
    paddingVertical: 4,
    marginLeft: 2,
  },
  rankedChipRemoveText: {
    fontSize: 18,
    fontWeight: "600",
  },
  rankBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rankedChipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: 220,
  },
  rankedChipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  goalRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  goalRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  rankBadgeSmall: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadgeTextSmall: {
    fontSize: 11,
    fontWeight: "700",
  },
  goalRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },
  subGoalsBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sportModeHint: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sportModeHintText: {
    fontSize: 14,
  },
  sportModeHintLink: {
    fontWeight: "600",
  },
  rankedChipLabelSmall: {
    fontSize: 12,
    fontWeight: "500",
  },
  modifierLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 4,
  },
  goalMatchInput: {
    width: 56,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    textAlign: "center",
  },
  advancedFiltersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  advancedFiltersTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  advancedFiltersChevron: {
    fontSize: 14,
    fontWeight: "600",
  },
  advancedFiltersSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 20,
  },
  refinementsLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  refinementsLabelMargin: {
    marginTop: 12,
  },
  gymProfileActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  gymProfileBtn: {
    flex: 1,
    minWidth: 140,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  bottomBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  resetBtn: {
    flex: 0,
    minWidth: 100,
  },
  savePresetWrap: {
    paddingVertical: 8,
  },
  savePresetText: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    flexDirection: "column",
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    flexShrink: 1,
  },
  modalFooter: {
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalFooterBtn: {
    minWidth: 100,
  },
  savePresetModalSheet: {
    paddingBottom: 24,
  },
  savePresetInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  profileList: {
    gap: 8,
    marginBottom: 20,
  },
  profileRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  profileRowText: {
    fontSize: 15,
  },
  editProfileBtn: {
    minWidth: 60,
  },
  subFocusSectionWrap: {
    paddingTop: 14,
  },
  subFocusSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
});