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
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { getSupabase } from "../../../lib/db";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import {
  EQUIPMENT_BY_CATEGORY,
  getDefaultEquipmentForTemplate,
  SPACE_TYPE_OPTIONS,
  type GymProfileTemplate,
} from "../../../data/gymProfiles";
import type { EquipmentKey } from "../../../lib/types";
import { normalizeStoredGymEquipment } from "../../../lib/gymEquipment";

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
  const { email, displayName } = useAuth();
  const {
    gymProfiles,
    activeGymProfileId,
    setActiveGymProfile,
    addGymProfile,
    updateGymProfile,
    removeGymProfile,
  } = useAppState();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddSpaceTypes, setShowAddSpaceTypes] = useState(false);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const selectProfile = (id: string) => {
    if (id !== activeGymProfileId) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveGymProfile(id);
    }
  };

  const toggleEquipment = (profileId: string, key: EquipmentKey) => {
    const profile = gymProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    const next = normalizeStoredGymEquipment(
      profile.equipment.includes(key)
        ? profile.equipment.filter((e) => e !== key)
        : [...profile.equipment, key]
    );
    updateGymProfile(profileId, { equipment: next });
  };

  const setDumbbellMax = (profileId: string, value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    updateGymProfile(profileId, {
      dumbbellMaxWeight: num !== undefined && !isNaN(num) ? num : undefined,
    });
  };

  const defaultNameForTemplate = (template: GymProfileTemplate): string => {
    const option = SPACE_TYPE_OPTIONS.find((opt) => opt.template === template);
    return option?.label ?? "New Gym";
  };

  const onAddProfile = (template: GymProfileTemplate) => {
    const equipment = normalizeStoredGymEquipment(
      getDefaultEquipmentForTemplate(template)
    );
    const profileName =
      template === "custom_gym" ? "My Gym" : defaultNameForTemplate(template);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAddSpaceTypes(false);
    addGymProfile(
      {
        name: profileName,
        equipment,
      },
      {
        setActive: true,
        onCreated: (id) => setExpandedId(id),
      }
    );
  };

  const goBackToFlow = () => {
    if (from === "sport-mode") {
      router.push("/sport-mode");
      return;
    }
    if (from === "manual" || from === "workout") {
      router.push("/manual/preferences");
      return;
    }
    router.push("/");
  };

  const onSignOut = () => {
    getSupabase()?.auth.signOut();
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {from === "workout" && (
          <View style={styles.backToWorkout}>
            <PrimaryButton
              label="Continue workout creation"
              variant="secondary"
              onPress={goBackToFlow}
            />
          </View>
        )}

        {from === "manual" && (
          <View style={styles.backToWorkout}>
            <PrimaryButton
              label="Continue workout creation"
              variant="secondary"
              onPress={goBackToFlow}
            />
          </View>
        )}

        {from === "sport-mode" && (
          <View style={styles.backToWorkout}>
            <PrimaryButton
              label="Continue Sport Mode setup"
              variant="secondary"
              onPress={goBackToFlow}
            />
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.profileInfoSectionTitle, { color: theme.text }]}>
          Profile
        </Text>
        <Card title="Account">
          {(displayName ?? email) ? (
            <>
              {displayName != null && displayName !== "" && (
                <>
                  <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Name</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{displayName}</Text>
                </>
              )}
              {email != null && email !== "" && (
                <>
                  <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Email</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{email}</Text>
                </>
              )}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: theme.textMuted }}>
              Sign in to see your profile and sync data.
            </Text>
          )}
          <PrimaryButton
            label="Sign out"
            variant="ghost"
            onPress={onSignOut}
            style={styles.signOutButton}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Membership
        </Text>
        <Card title="Membership" subtitle="Free plan. More plans coming soon." />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Gyms
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
          Workouts use equipment from your active profile.
        </Text>
        <View style={styles.profileList}>
          {gymProfiles.map((profile) => {
            const isActive = profile.id === activeGymProfileId;
            const isExpanded = expandedId === profile.id;

            return (
              <View key={profile.id} style={styles.profileBlock}>
                <View
                  style={[
                    styles.profileHeader,
                    {
                      borderColor: theme.border,
                      backgroundColor: isActive ? theme.primarySoft : theme.card,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => selectProfile(profile.id)}
                    style={styles.profileHeaderMain}
                  >
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
                      {isActive ? "Active" : "Tap to select"} •{" "}
                      {profile.equipment.length} items
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleExpand(profile.id)}
                    hitSlop={8}
                    style={styles.expandButton}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: 20, fontWeight: "600" }}>
                      {isExpanded ? "−" : "+"}
                    </Text>
                  </Pressable>
                </View>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.nameLabel, { color: theme.textMuted }]}>
                        Name
                      </Text>
                      <TextInput
                        value={profile.name}
                        onChangeText={(name) =>
                          updateGymProfile(profile.id, { name: name.trim() || profile.name })
                        }
                        placeholder="Gym name"
                        placeholderTextColor={theme.textMuted}
                        style={[
                          styles.nameInput,
                          {
                            borderColor: theme.border,
                            color: theme.text,
                          },
                        ]}
                      />
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

                    <View
                      style={[
                        styles.deleteRow,
                        { borderTopColor: theme.border },
                      ]}
                    >
                      <PrimaryButton
                        label="Delete gym"
                        variant="ghost"
                        onPress={() => {
                          if (gymProfiles.length <= 1) {
                            Alert.alert(
                              "Can't delete",
                              "You need at least one gym profile. Add another first if you want to remove this one."
                            );
                            return;
                          }
                          Alert.alert(
                            "Delete gym?",
                            `Remove "${profile.name}"? Workouts using this profile will no longer have it available.`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () => {
                                  removeGymProfile(profile.id);
                                  setExpandedId(null);
                                },
                              },
                            ]
                          );
                        }}
                        style={styles.deleteButton}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.addSection}>
          {!showAddSpaceTypes ? (
            <PrimaryButton
              label="Add a gym"
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowAddSpaceTypes(true);
              }}
              style={styles.addGymButton}
            />
<<<<<<< HEAD
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
=======
          ) : (
            <>
              <Text style={[styles.addSectionTitle, { color: theme.text }]}>
                Choose space type
              </Text>
              <Text style={[styles.stepLabel, { color: theme.textMuted }]}>
                We&apos;ll set this as your active gym so you can name it and pick equipment.
              </Text>
              <View style={styles.chipRow}>
                {SPACE_TYPE_OPTIONS.map((opt) => (
                  <View key={opt.template}>
                    <Chip
                      label={opt.label}
                      selected={false}
                      onPress={() => onAddProfile(opt.template)}
                    />
                  </View>
                ))}
              </View>
>>>>>>> feature/week-session-drag-reorder
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => {
<<<<<<< HEAD
                  setAddMode(null);
                  setCustomName("");
                }}
              />
            </View>
          </View>
        ) : typeof addMode === "object" && "template" in addMode ? (
          <View style={styles.addSection}>
            <Text
              style={[styles.addSectionTitle, { color: theme.text }]}
            >
              Save as
            </Text>
            <TextInput
              placeholder={addMode.suggestedName}
              placeholderTextColor={theme.textMuted}
              value={saveAsName}
              onChangeText={setSaveAsName}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <PrimaryButton
                label="Create"
                onPress={() =>
                  onAddProfile(addMode.template, saveAsName.trim() || addMode.suggestedName)
                }
              />
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setAddMode(null);
                  setSaveAsName("");
                }}
              />
            </View>
          </View>
        ) : null}
=======
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowAddSpaceTypes(false);
                }}
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </View>
>>>>>>> feature/week-session-drag-reorder
      </ScrollView>
    </AppScreenWrapper>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 4,
  },
  profileInfoSectionTitle: {
    marginTop: 0,
  },
  profileInfoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  profileInfoValue: {
    fontSize: 15,
    marginBottom: 12,
  },
  signOutButton: {
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
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
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileHeaderMain: {
    flex: 1,
  },
  expandButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
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
  nameRow: {
    gap: 6,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  deleteRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  deleteButton: {
    alignSelf: "flex-start",
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
  addGymButton: {
    alignSelf: "stretch",
  },
  addSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  stepLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
});
