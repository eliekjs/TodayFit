import React, { useState } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useAppState,
  defaultManualPreferences,
} from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { generateWorkoutAsync } from "../../../lib/generator";
import {
  PRIMARY_FOCUS_OPTIONS,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
  DURATIONS,
  ENERGY_LEVELS,
  TARGET_OPTIONS,
  MODIFIERS_BY_TARGET,
  CONSTRAINT_OPTIONS,
  CONSTRAINT_OPTIONS_UPPER,
  CONSTRAINT_OPTIONS_LOWER,
  WORKOUT_STYLE_OPTIONS,
  UPCOMING_OPTIONS,
  ZONE2_CARDIO_OPTIONS,
  SUB_FOCUS_BY_PRIMARY,
  deriveSubFocus,
  normalizeGoalMatchPct,
} from "../../../lib/preferencesConstants";
import { isDbConfigured } from "../../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";
import type { TargetBody } from "../../../lib/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_GOALS = 3;
const MAX_SUB_GOALS_PER_GOAL = 3;
const MAX_UPCOMING = 3;

function buildSelectionSummary(prefs: typeof defaultManualPreferences): string {
  const parts: string[] = [];
  if (prefs.primaryFocus.length) parts.push(prefs.primaryFocus[0]);
  if (prefs.durationMinutes != null) parts.push(`${prefs.durationMinutes} min`);
  if (prefs.energyLevel)
    parts.push(prefs.energyLevel.charAt(0).toUpperCase() + prefs.energyLevel.slice(1));
  if (prefs.targetBody) {
    const mod =
      prefs.targetModifier.length > 0 ? ` (${prefs.targetModifier[0]})` : "";
    parts.push(`${prefs.targetBody}${mod}`);
  }
  const flatSub = deriveSubFocus(prefs.primaryFocus, prefs.subFocusByGoal);
  if (flatSub.length) parts.push(flatSub[0]);
  return parts.join(" • ") || "Set your preferences below";
}

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
  const [showChangeProfileModal, setShowChangeProfileModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [expandedSubGoalsForGoal, setExpandedSubGoalsForGoal] = useState<string | null>(null);
  const [editingGoalMatchRank, setEditingGoalMatchRank] = useState<1 | 2 | 3 | null>(null);
  const [editingGoalMatchValue, setEditingGoalMatchValue] = useState("");
  const router = useRouter();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
  const rankedGoals = manualPreferences.primaryFocus;
  const hasPrimaryFocus = rankedGoals.length > 0;

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
      if (expandedSubGoalsForGoal === option) setExpandedSubGoalsForGoal(null);
    } else {
      if (current.length >= MAX_GOALS) return;
      const nextFocus = [...current, option];
      const norm = normalizeGoalMatchPct(p1, p2, p3, nextFocus.length);
      updateManualPreferences({ primaryFocus: nextFocus, ...norm });
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
    if (scope === "week") {
      router.push("/manual/week");
      return;
    }
    const profile = gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
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
      profile,
      undefined,
      preferredNames
    );
    setGeneratedWorkout(workout);
    router.push("/manual/workout");
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

  const modifierOptions = manualPreferences.targetBody
    ? MODIFIERS_BY_TARGET[manualPreferences.targetBody]
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.summary, { color: theme.textMuted }]}
          numberOfLines={1}
        >
          {buildSelectionSummary(manualPreferences)}
        </Text>

        {/* ——— Core: Ranked goals (up to 3) ——— */}
        <SectionHeader
          title="Primary Focus"
          subtitle="Pick up to 3, ranked."
          style={{ marginTop: 20 }}
        />
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

        <SectionHeader
          title="Duration"
          subtitle="Approximate total session length."
          style={{ marginTop: 24 }}
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

        {/* ——— Body emphasis (optional) ——— */}
        <SectionHeader
          title="Emphasize this area?"
          subtitle="Workouts will still train the whole body, but we'll prioritize this area more."
          style={{ marginTop: 24 }}
        />
        <View style={styles.chipGroup}>
          {TARGET_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={manualPreferences.targetBody === opt}
              onPress={() =>
                setTargetBody(
                  manualPreferences.targetBody === opt ? null : opt
                )
              }
            />
          ))}
        </View>
        {modifierOptions.length > 0 && (
          <>
            <Text
              style={[styles.modifierLabel, { color: theme.textMuted }]}
            >
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

        {/* ——— Advanced filters (collapsible) ——— */}
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
            Advanced filters
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
            {/* Energy Level (moved here from main flow) */}
            <SectionHeader
              title="Energy Level"
              subtitle="How much you have in the tank."
              style={{ marginTop: 0 }}
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

            {/* Goal match % — linked to the ranked goals shown above; edit here in Advanced */}
            {hasPrimaryFocus && (
              <>
                <SectionHeader
                  title="Goal match %"
                  subtitle="What % of the workout should match each ranked goal. Sum = 100%."
                  style={{ marginTop: 20 }}
                />
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
              </>
            )}

            {/* Sub-goals per ranked goal */}
            {hasPrimaryFocus && (
              <>
                <SectionHeader
                  title="Sub-goals"
                  subtitle="Up to 3 per goal, ranked."
                  style={{ marginTop: 0 }}
                />
                {rankedGoals.map((goal, goalIdx) => {
                  const subOptions = SUB_FOCUS_BY_PRIMARY[goal] ?? [];
                  const selectedSubs = manualPreferences.subFocusByGoal[goal] ?? [];
                  const isExpanded = expandedSubGoalsForGoal === goal;
                  const canAddSub = selectedSubs.length < MAX_SUB_GOALS_PER_GOAL;
                  return (
                    <View
                      key={goal}
                      style={[styles.goalRow, { borderColor: theme.border }]}
                    >
                      <View style={styles.goalRowHeader}>
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
                          <Text
                            style={[
                              styles.rankBadgeTextSmall,
                              { color: theme.chipSelectedText },
                            ]}
                          >
                            {goalIdx + 1}
                          </Text>
                        </View>
                        <Text
                          style={[styles.goalRowLabel, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {goal}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setExpandedSubGoalsForGoal(
                              isExpanded ? null : goal
                            )
                          }
                          style={styles.subGoalsControl}
                        >
                          <Text
                            style={[
                              styles.subGoalsControlText,
                              { color: theme.primary },
                            ]}
                          >
                            {isExpanded ? "− Sub-goals" : "+ Sub-goals"}
                          </Text>
                        </Pressable>
                      </View>
                      {isExpanded && subOptions.length > 0 && (
                        <View
                          style={[
                            styles.subGoalsBlock,
                            { borderTopColor: theme.border },
                          ]}
                        >
                          {selectedSubs.length > 0 && (
                            <View style={styles.chipGroup}>
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
                                        backgroundColor:
                                          theme.chipSelectedBackground,
                                        borderWidth: 1,
                                        borderColor: theme.primary,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.rankBadgeTextSmall,
                                        {
                                          color: theme.chipSelectedText,
                                        },
                                      ]}
                                    >
                                      {subIdx + 1}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.rankedChipInner,
                                      {
                                        backgroundColor:
                                          theme.chipSelectedBackground,
                                        borderWidth: 1,
                                        borderColor: theme.primary,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.rankedChipLabelSmall,
                                        {
                                          color: theme.chipSelectedText,
                                        },
                                      ]}
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
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {/* Constraints: single section; when target is Upper/Lower, only show relevant body areas */}
            <SectionHeader
              title="Constraints (injuries / soreness)"
              subtitle="Areas to avoid. No restrictions clears others."
              style={{ marginTop: 20 }}
            />
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

            {/* Style */}
            <SectionHeader
              title="Style"
              subtitle="Optional."
              style={{ marginTop: 20 }}
            />
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

            {/* Upcoming 1–3 days (ranked) */}
            <SectionHeader
              title="Upcoming (1–3 days)"
              subtitle="Protect big days. Pick up to 3, ranked."
              style={{ marginTop: 20 }}
            />
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

            {/* Zone 2 cardio preference — show when goals include recomp / endurance / conditioning */}
            {manualPreferences.primaryFocus.some(
              (g) =>
                g === "Body Recomposition" ||
                g === "Improve Endurance" ||
                g === "Sport Conditioning"
            ) ? (
              <>
                <SectionHeader
                  title="Zone 2 cardio"
                  subtitle="Choose modalities for the cardio finisher (e.g. run, bike, rower, stair climber). Leave empty for any."
                  style={{ marginTop: 20 }}
                />
                <View style={styles.chipGroup}>
                  {ZONE2_CARDIO_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.key}
                      label={opt.label}
                      selected={manualPreferences.preferredZone2Cardio?.includes(opt.key) ?? false}
                      onPress={() => {
                        const current = manualPreferences.preferredZone2Cardio ?? [];
                        const next = current.includes(opt.key)
                          ? current.filter((k) => k !== opt.key)
                          : [...current, opt.key];
                        updateManualPreferences({ preferredZone2Cardio: next });
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* ——— Gym profile ——— */}
        <SectionHeader
          title="Gym profile"
          style={{ marginTop: 24 }}
          subtitle={
            activeProfile != null
              ? `Workouts use equipment from: ${activeProfile.name}`
              : "No profile selected. Add one in Profile."
          }
        />
        <View style={[styles.gymProfileActions, { marginBottom: 32 }]}>
          <PrimaryButton
            label="Change gym profile"
            variant="secondary"
            onPress={() => setShowChangeProfileModal(true)}
            style={styles.gymProfileBtn}
          />
          <PrimaryButton
            label="Edit gym profiles"
            variant="secondary"
            onPress={() => router.push("/profiles?from=workout")}
            style={styles.gymProfileBtn}
          />
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <PrimaryButton label="Generate Workout" onPress={onGenerate} />
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
    </View>
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
  subGoalsControl: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  subGoalsControlText: {
    fontSize: 13,
    fontWeight: "600",
  },
  subGoalsBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
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
});
