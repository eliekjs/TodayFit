import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { generateWorkout } from "../../../lib/generator";
import type {
  BodyPartFocusKey,
  SorenessInjuryKey,
  WorkoutStyleKey,
  UpcomingBodyRegion,
  UpcomingDemandType,
  UpcomingTimeBucket,
} from "../../../lib/types";

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

const BODY_PART_FOCUS_OPTIONS: BodyPartFocusKey[] = [
  "Upper body",
  "Lower body",
  "Full body",
  "Push",
  "Pull",
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

const SORENESS_INJURIES: SorenessInjuryKey[] = [
  "Upper Body",
  "Lower Body",
  "Core",
  "Shoulders",
  "Elbows / Wrists",
  "Knees / Ankles",
  "Back",
  "Hips",
  "No Restrictions",
];

const WORKOUT_STYLE_OPTIONS: WorkoutStyleKey[] = [
  "Compound Strength",
  "Hypertrophy Bias",
  "Functional / Athletic",
  "Calisthenics Focus",
  "CrossFit-style / HIIT",
  "Cardio Emphasis",
  "Mixed Strength + Conditioning",
];

const UPCOMING_BODY_REGIONS: UpcomingBodyRegion[] = [
  "Lower",
  "Upper",
  "Full",
  "Skill",
  "None",
];
const UPCOMING_DEMAND_TYPES: UpcomingDemandType[] = [
  "Strength",
  "Endurance",
  "Power",
  "Mixed",
];
const UPCOMING_TIME_BUCKETS: UpcomingTimeBucket[] = [
  "0–1",
  "2–3",
  "4–6",
  "7+",
];

/** Sub-focus options shown only when the related primary focus is selected */
const SUB_FOCUS_BY_PRIMARY: Record<string, string[]> = {
  "Build Strength": [
    "Max Strength",
    "Relative Strength",
    "Posterior Chain",
    "Upper Push",
    "Upper Pull",
  ],
  "Build Muscle (Hypertrophy)": [
    "Glutes",
    "Quads",
    "Back",
    "Arms",
    "Shoulders",
    "Chest",
    "Balanced",
  ],
  "Sport Conditioning": [
    "Uphill Endurance",
    "Eccentric Quad Strength",
    "Lactate Tolerance",
    "Rotational Power",
    "Change of Direction",
  ],
  "Improve Endurance": ["VO2 Max", "Zone 2", "Tempo", "Long Duration"],
  "Mobility & Joint Health": [
    "Ankle dorsiflexion",
    "Hip internal rotation",
    "Thoracic extension",
    "Shoulder flexion",
    "Shoulder stability",
    "Wrist prep",
    "Spinal mobility",
    "Active mobility (strength through range)",
  ],
  "Athletic Performance": [
    "Power output",
    "Sprint speed",
    "Vertical jump",
    "Elasticity",
    "Reactive strength",
    "Acceleration",
    "Coordination",
    "Balance",
  ],
  Calisthenics: [
    "Pull-up Capacity",
    "Dips",
    "Handstand",
    "Front lever",
    "Muscle-up progression",
    "Core compression strength",
    "Straight-arm strength",
  ],
};

export default function ManualPreferencesScreen() {
  const {
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
    setActiveGymProfile,
  } = useAppState();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedGoalRefinementOpen, setAdvancedGoalRefinementOpen] = useState(false);
  const [subFocusExpanded, setSubFocusExpanded] = useState<Record<string, boolean>>({});
  const [showChangeProfileModal, setShowChangeProfileModal] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const toggleFromArray =
    (key: "primaryFocus" | "bodyPartFocus" | "injuries" | "upcoming" | "subFocus" | "sorenessInjuries" | "workoutStyle") =>
    (value: string) => {
      const current = manualPreferences[key] as string[];
      const exists = current.includes(value);
      updateManualPreferences({
        [key]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      });
    };

  const toggleBodyPartFocus = (option: BodyPartFocusKey) => {
    const current = manualPreferences.bodyPartFocus;
    const isSelected = current.includes(option);
    if (isSelected) {
      updateManualPreferences({
        bodyPartFocus: current.filter((v) => v !== option),
      });
      return;
    }
    let next = [...current];
    if (option === "Full body") {
      next = next.filter((v) => v !== "Upper body" && v !== "Lower body");
    } else if (option === "Upper body" || option === "Lower body") {
      next = next.filter((v) => v !== "Full body");
    } else if (option === "Push") {
      next = next.filter((v) => v !== "Pull");
    } else if (option === "Pull") {
      next = next.filter((v) => v !== "Push");
    }
    next.push(option);
    updateManualPreferences({ bodyPartFocus: next });
  };

  const onGenerate = () => {
    const profile = gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
    const workout = generateWorkout(manualPreferences, profile);
    setGeneratedWorkout(workout);
    router.push("/manual/workout");
  };

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedOpen((v) => !v);
  };

  const toggleAdvancedGoalRefinement = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedGoalRefinementOpen((v) => !v);
  };

  const toggleSubFocusGroup = (groupKey: string) => {
    setSubFocusExpanded((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const hasPrimaryFocus = manualPreferences.primaryFocus.length > 0;
  const contextualSubFocusGroups = hasPrimaryFocus
    ? manualPreferences.primaryFocus
        .filter((f) => SUB_FOCUS_BY_PRIMARY[f]?.length)
        .map((focus) => ({ focus, options: SUB_FOCUS_BY_PRIMARY[focus]! }))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          title="Body Part Focus (optional)"
          subtitle="Filter by body region; you can select multiple."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {BODY_PART_FOCUS_OPTIONS.map((option) => {
            const selected = manualPreferences.bodyPartFocus.includes(option);
            const disabled =
              !selected &&
              ((option === "Full body" &&
                (manualPreferences.bodyPartFocus.includes("Upper body") ||
                  manualPreferences.bodyPartFocus.includes("Lower body"))) ||
              (option === "Upper body" && manualPreferences.bodyPartFocus.includes("Full body")) ||
              (option === "Lower body" && manualPreferences.bodyPartFocus.includes("Full body")) ||
              (option === "Push" && manualPreferences.bodyPartFocus.includes("Pull")) ||
              (option === "Pull" && manualPreferences.bodyPartFocus.includes("Push")));
            return (
              <Chip
                key={option}
                label={option}
                selected={selected}
                onPress={() => !disabled && toggleBodyPartFocus(option)}
                disabled={disabled}
              />
            );
          })}
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

        <SectionHeader
          title="Gym profile"
          subtitle={
            activeProfile != null
              ? `Workouts use equipment from: ${activeProfile.name}`
              : "No profile selected. Add one in Profile."
          }
          style={{ marginTop: 20 }}
        />
        <View style={styles.gymProfileActions}>
          <PrimaryButton
            label="Change gym profile"
            variant="secondary"
            onPress={() => setShowChangeProfileModal(true)}
          />
          <PrimaryButton
            label="Edit gym profile(s)"
            variant="ghost"
            onPress={() => router.push("/profiles?from=workout")}
            style={{ marginTop: 8 }}
          />
        </View>

        {hasPrimaryFocus && (
          <>
            <View style={styles.advancedHeader}>
              <Text
                style={[styles.advancedTitle, { color: theme.text }]}
                onPress={toggleAdvancedGoalRefinement}
              >
                Advanced Goal Refinement
              </Text>
              <Text
                style={[styles.advancedToggle, { color: theme.textMuted }]}
                onPress={toggleAdvancedGoalRefinement}
              >
                {advancedGoalRefinementOpen ? "Hide" : "Show"}
              </Text>
            </View>
            {advancedGoalRefinementOpen && (
              <View style={styles.advancedSection}>
                <SectionHeader
                  title="A) Soreness / Injuries"
                  subtitle="Areas to avoid or protect."
                  style={{ marginTop: 0 }}
                />
                <View style={styles.chipGroup}>
                  {SORENESS_INJURIES.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      selected={manualPreferences.sorenessInjuries.includes(opt)}
                      onPress={() => toggleFromArray("sorenessInjuries")(opt)}
                    />
                  ))}
                </View>

                <SectionHeader
                  title="B) Workout Style"
                  subtitle="Multi-select."
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

                <SectionHeader
                  title="C) Upcoming Event"
                  subtitle="Protect the next few days."
                  style={{ marginTop: 20 }}
                />
                <Text style={[styles.advancedLabel, { color: theme.textMuted }]}>
                  Body region
                </Text>
                <View style={styles.chipGroup}>
                  {UPCOMING_BODY_REGIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      selected={manualPreferences.upcomingEventBodyRegion === opt}
                      onPress={() =>
                        updateManualPreferences({
                          upcomingEventBodyRegion:
                            manualPreferences.upcomingEventBodyRegion === opt
                              ? null
                              : opt,
                        })
                      }
                    />
                  ))}
                </View>
                <Text style={[styles.advancedLabel, styles.advancedLabelMargin, { color: theme.textMuted }]}>
                  Demand type
                </Text>
                <View style={styles.chipGroup}>
                  {UPCOMING_DEMAND_TYPES.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      selected={manualPreferences.upcomingEventDemandType === opt}
                      onPress={() =>
                        updateManualPreferences({
                          upcomingEventDemandType:
                            manualPreferences.upcomingEventDemandType === opt
                              ? null
                              : opt,
                        })
                      }
                    />
                  ))}
                </View>
                <Text style={[styles.advancedLabel, styles.advancedLabelMargin, { color: theme.textMuted }]}>
                  Time until event
                </Text>
                <View style={styles.chipGroup}>
                  {UPCOMING_TIME_BUCKETS.map((opt) => (
                    <Chip
                      key={opt}
                      label={`${opt} days`}
                      selected={manualPreferences.upcomingEventTimeBucket === opt}
                      onPress={() =>
                        updateManualPreferences({
                          upcomingEventTimeBucket:
                            manualPreferences.upcomingEventTimeBucket === opt
                              ? null
                              : opt,
                        })
                      }
                    />
                  ))}
                </View>

                <SectionHeader
                  title="D) Sub-Focus"
                  subtitle="Contextual to your primary focus. Tap to expand."
                  style={{ marginTop: 20 }}
                />
                {contextualSubFocusGroups.map(({ focus, options }) => {
                  const isExpanded = subFocusExpanded[focus];
                  return (
                    <View key={focus} style={styles.subFocusGroup}>
                      <Pressable
                        onPress={() => toggleSubFocusGroup(focus)}
                        style={[styles.subFocusGroupHeader, { borderColor: theme.border }]}
                      >
                        <Text style={[styles.subFocusGroupTitle, { color: theme.text }]}>
                          {focus}
                        </Text>
                        <Text style={[styles.advancedToggle, { color: theme.textMuted }]}>
                          {isExpanded ? "▼" : "▶"}
                        </Text>
                      </Pressable>
                      {isExpanded && (
                        <View style={styles.chipGroup}>
                          {options.map((opt) => (
                            <Chip
                              key={opt}
                              label={opt}
                              selected={manualPreferences.subFocus.includes(opt)}
                              onPress={() => toggleFromArray("subFocus")(opt)}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

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
          </View>
        )}

        <View style={styles.footer}>
          <PrimaryButton label="Generate Workout" onPress={onGenerate} />
        </View>
      </ScrollView>

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
  advancedLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  advancedLabelMargin: {
    marginTop: 12,
  },
  advancedSection: {
    gap: 12,
  },
  subFocusGroup: {
    marginTop: 12,
  },
  subFocusGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  subFocusGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    marginBottom: 16,
  },
  gymProfileActions: {
    marginTop: 8,
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
  equipLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
});
