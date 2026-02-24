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
import type { EquipmentKey } from "../../../lib/types";

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

const EQUIPMENT_OPTIONS: { id: EquipmentKey; label: string }[] = [
  { id: "barbells", label: "Barbells" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "pullup_bar", label: "Pull-up Bar" },
  { id: "squat_rack", label: "Squat Rack" },
  { id: "bench", label: "Bench" },
  { id: "leg_press", label: "Leg Press" },
  { id: "bands", label: "Bands" },
  { id: "cardio_machines", label: "Cardio Machines" },
  { id: "hangboard", label: "Climbing Hangboard" },
  { id: "bodyweight", label: "Bodyweight" },
];

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
  const [showGymModal, setShowGymModal] = useState(false);
  const [showChangeProfileModal, setShowChangeProfileModal] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  const [modalProfileId, setModalProfileId] = useState<string>(
    () => activeProfile?.id ?? gymProfiles[0]?.id ?? ""
  );
  const [modalEquipment, setModalEquipment] = useState<EquipmentKey[]>(
    () => activeProfile?.equipment ?? gymProfiles[0]?.equipment ?? []
  );

  const selectModalProfile = (id: string) => {
    setModalProfileId(id);
    const p = gymProfiles.find((g) => g.id === id);
    setModalEquipment(p?.equipment ?? []);
  };

  const toggleModalEquipment = (key: EquipmentKey) => {
    setModalEquipment((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

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
    const profile = gymProfiles.find((g) => g.id === activeGymProfileId) ?? gymProfiles[0];
    setModalProfileId(profile?.id ?? "");
    setModalEquipment(profile?.equipment ?? []);
    setShowGymModal(true);
  };

  const onConfirmGenerate = () => {
    const selectedProfile = gymProfiles.find((g) => g.id === modalProfileId);
    const profileForWorkout = selectedProfile
      ? { ...selectedProfile, equipment: modalEquipment }
      : undefined;
    const workout = generateWorkout(manualPreferences, profileForWorkout);
    setGeneratedWorkout(workout);
    setShowGymModal(false);
    router.push("/manual/workout");
  };

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedOpen((v) => !v);
  };

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
            onPress={() => router.push("/profiles")}
            style={{ marginTop: 8 }}
          />
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
          </View>
        )}

        <View style={styles.footer}>
          <PrimaryButton label="Generate Workout" onPress={onGenerate} />
        </View>
      </ScrollView>

      {/* Gym Profile & Equipment Modal */}
      <Modal
        transparent
        visible={showGymModal}
        animationType="slide"
        onRequestClose={() => setShowGymModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setShowGymModal(false)}
          />
          <View
            style={[styles.modalSheet, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Choose your gym
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Select a profile, then fine-tune the equipment for this session.
            </Text>

            {/* Scrollable content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Profile selector */}
              <View style={styles.profileList}>
                {gymProfiles.map((profile) => {
                  const isSelected = profile.id === modalProfileId;
                  return (
                    <Pressable
                      key={profile.id}
                      onPress={() => selectModalProfile(profile.id)}
                      style={[
                        styles.profileRow,
                        {
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                          backgroundColor: isSelected
                            ? theme.primarySoft
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileRowText,
                          {
                            color: theme.text,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {profile.name}
                      </Text>
                      {isSelected && (
                        <Text style={{ color: theme.primary, fontSize: 12 }}>
                          Selected
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Equipment chips */}
              <Text style={[styles.equipLabel, { color: theme.textMuted }]}>
                Equipment for this workout
              </Text>
              <View style={styles.chipGroup}>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={modalEquipment.includes(option.id)}
                    onPress={() => toggleModalEquipment(option.id)}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Button always visible at the bottom */}
            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Generate Workout"
                onPress={onConfirmGenerate}
              />
            </View>
          </View>
        </View>
      </Modal>

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
                  <Pressable
                    key={profile.id}
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
  advancedSection: {
    gap: 12,
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
  equipLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
});
