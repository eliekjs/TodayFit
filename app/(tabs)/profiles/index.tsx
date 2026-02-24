import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import {
  EQUIPMENT_BY_CATEGORY,
  getDefaultEquipmentForTemplate,
  type GymProfile,
  type GymProfileTemplate,
} from "../../../data/gymProfiles";
import type { EquipmentKey } from "../../../lib/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GymProfilesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const {
    gymProfiles,
    activeGymProfileId,
    setActiveGymProfile,
    addGymProfile,
    updateGymProfile,
  } = useAppState();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<GymProfileTemplate | null>(null);
  const [customName, setCustomName] = useState("");

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleEquipment = (profileId: string, key: EquipmentKey) => {
    const profile = gymProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    const next = profile.equipment.includes(key)
      ? profile.equipment.filter((e) => e !== key)
      : [...profile.equipment, key];
    updateGymProfile(profileId, { equipment: next });
  };

  const setDumbbellMax = (profileId: string, value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    updateGymProfile(profileId, {
      dumbbellMaxWeight: num !== undefined && !isNaN(num) ? num : undefined,
    });
  };

  const onAddProfile = (template: GymProfileTemplate, name?: string) => {
    const equipment = getDefaultEquipmentForTemplate(template);
    const profileName =
      name?.trim() ||
      (template === "your_gym"
        ? "Your Gym"
        : template === "home_gym"
          ? "Home Gym"
          : template === "hotel_gym"
            ? "Hotel Gym"
            : "New Gym");
    addGymProfile({
      name: profileName,
      equipment,
      ...(template === "your_gym" || template === "custom" ? {} : {}),
    });
    setAddMode(null);
    setCustomName("");
  };

  const goBackToWorkout = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {from === "workout" && (
          <View style={styles.backToWorkout}>
            <PrimaryButton
              label="Back to workout you were creating"
              variant="secondary"
              onPress={goBackToWorkout}
            />
          </View>
        )}

        <Card title="Gym Profiles">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Workouts use only equipment from your active profile. Select a
            profile to edit its equipment, or add a new gym.
          </Text>
        </Card>

        <View style={styles.profileList}>
          {gymProfiles.map((profile) => {
            const isActive = profile.id === activeGymProfileId;
            const isExpanded = expandedId === profile.id;

            return (
              <View key={profile.id} style={styles.profileBlock}>
                <Pressable
                  onPress={() => toggleExpand(profile.id)}
                  style={[
                    styles.profileHeader,
                    {
                      borderColor: theme.border,
                      backgroundColor: isActive ? theme.primarySoft : theme.card,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.profileName,
                        { color: theme.text },
                      ]}
                    >
                      {profile.name}
                    </Text>
                    <Text
                      style={[styles.profileMeta, { color: theme.textMuted }]}
                    >
                      {isActive ? "Active" : "Tap to edit"} •{" "}
                      {profile.equipment.length} items
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 18 }}>
                    {isExpanded ? "−" : "+"}
                  </Text>
                </Pressable>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderColor: theme.border }]}>
                    <View style={styles.setActiveRow}>
                      {!isActive && (
                        <PrimaryButton
                          label="Set as active"
                          variant="secondary"
                          onPress={() => setActiveGymProfile(profile.id)}
                        />
                      )}
                    </View>

                    {EQUIPMENT_BY_CATEGORY.map((cat) => (
                      <View key={cat.category} style={styles.categoryBlock}>
                        <Text
                          style={[
                            styles.categoryTitle,
                            { color: theme.textMuted },
                          ]}
                        >
                          {cat.category}
                        </Text>
                        <View style={styles.chipRow}>
                          {cat.options.map((opt) => (
                            <View key={opt.id}>
                              <Chip
                                label={
                                  opt.hasInput === "dumbbell_max"
                                    ? "Dumbbells"
                                    : opt.label
                                }
                                selected={profile.equipment.includes(opt.id)}
                                onPress={() =>
                                  toggleEquipment(profile.id, opt.id)
                                }
                              />
                            </View>
                          ))}
                        </View>
                        {cat.options.some(
                          (o) => o.hasInput === "dumbbell_max"
                        ) &&
                          profile.equipment.includes("dumbbells") && (
                            <View style={styles.dumbbellRow}>
                              <Text
                                style={[
                                  styles.dumbbellLabel,
                                  { color: theme.textMuted },
                                ]}
                              >
                                Max weight (kg)
                              </Text>
                              <TextInput
                                placeholder="e.g. 25"
                                placeholderTextColor={theme.textMuted}
                                keyboardType="number-pad"
                                value={
                                  profile.dumbbellMaxWeight != null
                                    ? String(profile.dumbbellMaxWeight)
                                    : ""
                                }
                                onChangeText={(t) =>
                                  setDumbbellMax(profile.id, t)
                                }
                                style={[
                                  styles.dumbbellInput,
                                  {
                                    borderColor: theme.border,
                                    color: theme.text,
                                  },
                                ]}
                              />
                            </View>
                          )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {addMode == null ? (
          <View style={styles.addSection}>
            <Text
              style={[styles.addSectionTitle, { color: theme.text }]}
            >
              Add a gym
            </Text>
            <View style={styles.addButtons}>
              <PrimaryButton
                label="Home Gym"
                variant="secondary"
                onPress={() => onAddProfile("home_gym")}
              />
              <PrimaryButton
                label="Hotel Gym"
                variant="secondary"
                onPress={() => onAddProfile("hotel_gym")}
                style={{ marginTop: 8 }}
              />
              <PrimaryButton
                label="Custom (name your gym)"
                variant="ghost"
                onPress={() => setAddMode("custom")}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        ) : addMode === "custom" ? (
          <View style={styles.addSection}>
            <Text
              style={[styles.addSectionTitle, { color: theme.text }]}
            >
              Name your gym
            </Text>
            <TextInput
              placeholder="e.g. CrossFit Box"
              placeholderTextColor={theme.textMuted}
              value={customName}
              onChangeText={setCustomName}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <PrimaryButton
                label="Create"
                onPress={() => onAddProfile("custom", customName || "My Gym")}
              />
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setAddMode(null);
                  setCustomName("");
                }}
              />
            </View>
          </View>
        ) : null}
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
    paddingBottom: 32,
  },
  backToWorkout: {
    marginBottom: 16,
  },
  profileList: {
    marginTop: 20,
    gap: 12,
  },
  profileBlock: {
    gap: 0,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  expandedContent: {
    padding: 14,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -1,
    gap: 16,
  },
  setActiveRow: {
    marginBottom: 4,
  },
  categoryBlock: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dumbbellInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 70,
  },
  dumbbellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  dumbbellLabel: {
    fontSize: 13,
  },
  addSection: {
    marginTop: 28,
  },
  addSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  addButtons: {
    gap: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
