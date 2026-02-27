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
import {
  useAppState,
  defaultManualPreferences,
} from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { generateWorkout } from "../../../lib/generator";
import {
  PRIMARY_FOCUS_OPTIONS,
  DURATIONS,
  ENERGY_LEVELS,
  TARGET_OPTIONS,
  MODIFIERS_BY_TARGET,
  CONSTRAINT_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  UPCOMING_OPTIONS,
  SUB_FOCUS_MICRO_GOALS,
  SUB_FOCUS_BY_PRIMARY,
} from "../../../lib/preferencesConstants";
import type { TargetBody } from "../../../lib/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUB_FOCUS_CAP = 3;

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
  if (prefs.subFocus.length) parts.push(prefs.subFocus[0]);
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
  } = useAppState();
  const [refinementsOpen, setRefinementsOpen] = useState(false);
  const [showChangeProfileModal, setShowChangeProfileModal] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
  const hasPrimaryFocus = manualPreferences.primaryFocus.length > 0;
  const refineFocus =
    hasPrimaryFocus ? manualPreferences.primaryFocus[0]! : null;
  const contextualSubFocusOptions = refineFocus
    ? SUB_FOCUS_BY_PRIMARY[refineFocus] ?? []
    : [];
  const subFocusCount =
    manualPreferences.subFocus.length;
  const canAddSubFocus = subFocusCount < SUB_FOCUS_CAP;

  const togglePrimaryFocus = (option: string) => {
    const current = manualPreferences.primaryFocus;
    const exists = current.includes(option);
    updateManualPreferences({
      primaryFocus: exists
        ? current.filter((v) => v !== option)
        : [...current, option],
    });
  };

  const setTargetBody = (target: TargetBody | null) => {
    updateManualPreferences({
      targetBody: target,
      targetModifier: [],
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

  const toggleSubFocus = (opt: string) => {
    const current = manualPreferences.subFocus;
    const exists = current.includes(opt);
    if (exists) {
      updateManualPreferences({ subFocus: current.filter((v) => v !== opt) });
      return;
    }
    if (subFocusCount >= SUB_FOCUS_CAP) return;
    updateManualPreferences({ subFocus: [...current, opt] });
  };

  const toggleFromArray =
    (key: "upcoming" | "workoutStyle") =>
    (value: string) => {
      const current = manualPreferences[key] as string[];
      const exists = current.includes(value);
      updateManualPreferences({
        [key]: exists ? current.filter((v) => v !== value) : [...current, value],
      });
    };

  const onGenerate = () => {
    const profile = gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
    const workout = generateWorkout(manualPreferences, profile);
    setGeneratedWorkout(workout);
    router.push("/manual/workout");
  };

  const onReset = () => {
    updateManualPreferences(defaultManualPreferences);
  };

  const onSavePreset = () => {
    // TODO: Save preset – persistence not built yet
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
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.summary, { color: theme.textMuted }]}
          numberOfLines={1}
        >
          {buildSelectionSummary(manualPreferences)}
        </Text>

        {/* ——— Core ——— */}
        <SectionHeader
          title="Primary Focus"
          subtitle="Pick up to 2 (optional)."
          style={{ marginTop: 16 }}
        />
        <View style={styles.chipGroup}>
          {PRIMARY_FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={manualPreferences.primaryFocus.includes(option)}
              onPress={() => togglePrimaryFocus(option)}
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

        {/* ——— Targets ——— */}
        <SectionHeader
          title="Target"
          subtitle="Upper, Lower, or Full body (optional)."
          style={{ marginTop: 20 }}
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

        {/* ——— Refinements (collapsible) ——— */}
        <View style={styles.refinementsHeader}>
          <Text
            style={[styles.refinementsTitle, { color: theme.text }]}
            onPress={toggleRefinements}
          >
            Refinements
          </Text>
          <Text
            style={[styles.refinementsToggle, { color: theme.textMuted }]}
            onPress={toggleRefinements}
          >
            {refinementsOpen ? "Hide" : "Show"}
          </Text>
        </View>

        {refinementsOpen && (
          <View style={styles.refinementsSection}>
            {/* Sub-Focus: only when at least one Primary Focus */}
            {hasPrimaryFocus && (
              <>
                <SectionHeader
                  title="Sub-Focus"
                  subtitle="Refine within your primary focus (optional)."
                  style={{ marginTop: 12 }}
                />
                {contextualSubFocusOptions.length > 0 && (
                  <>
                    <Text
                      style={[styles.refinementsLabel, { color: theme.textMuted }]}
                    >
                      Emphasis for {refineFocus}
                    </Text>
                    <View style={styles.chipGroup}>
                      {contextualSubFocusOptions.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          selected={manualPreferences.subFocus.includes(opt)}
                          disabled={
                            !manualPreferences.subFocus.includes(opt) &&
                            !canAddSubFocus
                          }
                          onPress={() => toggleSubFocus(opt)}
                        />
                      ))}
                    </View>
                  </>
                )}
                <Text
                  style={[
                    styles.refinementsLabel,
                    styles.refinementsLabelMargin,
                    { color: theme.textMuted },
                  ]}
                >
                  Micro-goals
                </Text>
                <View style={styles.chipGroup}>
                  {SUB_FOCUS_MICRO_GOALS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      selected={manualPreferences.subFocus.includes(opt)}
                      disabled={
                        !manualPreferences.subFocus.includes(opt) &&
                        !canAddSubFocus
                      }
                      onPress={() => toggleSubFocus(opt)}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Constraints: single section */}
            <SectionHeader
              title="Constraints (injuries / soreness)"
              subtitle="Areas to avoid. No restrictions clears others."
              style={{ marginTop: 20 }}
            />
            <View style={styles.chipGroup}>
              {CONSTRAINT_OPTIONS.map((opt) => (
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

            {/* Upcoming 1–3 days */}
            <SectionHeader
              title="Upcoming (1–3 days)"
              subtitle="Protect big days."
              style={{ marginTop: 20 }}
            />
            <View style={styles.chipGroup}>
              {UPCOMING_OPTIONS.map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={manualPreferences.upcoming.includes(u)}
                  onPress={() => toggleFromArray("upcoming")(u)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ——— Gym profile ——— */}
        <SectionHeader
          title="Gym profile"
          subtitle={
            activeProfile != null
              ? `Workouts use equipment from: ${activeProfile.name}`
              : "No profile selected. Add one in Profile."
          }
          style={{ marginTop: 24 }}
        />
        <View style={styles.gymProfileActions}>
          <PrimaryButton
            label="Change gym profile"
            variant="secondary"
            onPress={() => setShowChangeProfileModal(true)}
          />
          <PrimaryButton
            label="Edit gym profiles"
            variant="ghost"
            onPress={() => router.push("/profiles?from=workout")}
            style={{ marginTop: 8 }}
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
  },
  summary: {
    fontSize: 13,
    marginTop: 4,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modifierLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  refinementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  refinementsTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  refinementsToggle: {
    fontSize: 13,
    fontWeight: "500",
  },
  refinementsSection: {
    gap: 12,
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
    marginTop: 8,
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
