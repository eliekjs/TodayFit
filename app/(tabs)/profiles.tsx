import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";
import { Card } from "../../components/Card";
import { Chip } from "../../components/Chip";
import { PrimaryButton } from "../../components/Button";
import type { EquipmentKey } from "../../lib/types";

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
];

export default function GymProfilesScreen() {
  const theme = useTheme();
  const {
    gymProfiles,
    activeGymProfileId,
    setActiveGymProfile,
    addGymProfile,
  } = useAppState();

  const [newName, setNewName] = useState("");
  const [newEquipment, setNewEquipment] = useState<EquipmentKey[]>([]);

  const toggleEquipment = (key: EquipmentKey) => {
    setNewEquipment((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  const onAddProfile = () => {
    if (newName.trim().length === 0) return;
    addGymProfile({
      name: newName.trim(),
      equipment: newEquipment.length > 0 ? newEquipment : ["bodyweight"],
    });
    setNewName("");
    setNewEquipment([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card title="Gym Profiles">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Profiles let TodayFit understand what you actually have access to in
            different contexts — home, commercial gym, or travel. Manual and
            adaptive workouts can then respect those constraints.
          </Text>
        </Card>

        <View style={{ marginTop: 20, gap: 12 }}>
          {gymProfiles.map((profile) => {
            const isActive = profile.id === activeGymProfileId;
            const equipmentLabel =
              profile.equipment != null && profile.equipment.length > 0
                ? profile.equipment
                    .map(
                      (id) =>
                        EQUIPMENT_OPTIONS.find((e) => e.id === id)?.label ?? id
                    )
                    .join(" • ")
                : "Bodyweight only";

            return (
              <Card
                key={profile.id}
                title={profile.name}
                subtitle={equipmentLabel}
                primaryActionLabel={isActive ? "Active" : "Set Active"}
                onPrimaryAction={
                  isActive ? undefined : () => setActiveGymProfile(profile.id)
                }
                style={{ opacity: isActive ? 1 : 0.9 }}
              />
            );
          })}
        </View>

        <View style={styles.addSection}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              marginBottom: 8,
              color: theme.text,
            }}
          >
            Add profile
          </Text>
          <TextInput
            placeholder="Profile name (e.g., Hotel Gym)"
            placeholderTextColor={theme.textMuted}
            value={newName}
            onChangeText={setNewName}
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text },
            ]}
          />
          <Text
            style={{
              fontSize: 13,
              marginTop: 8,
              marginBottom: 4,
              color: theme.textMuted,
            }}
          >
            Equipment available
          </Text>
          <View style={styles.chipGroup}>
            {EQUIPMENT_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={newEquipment.includes(option.id)}
                onPress={() => toggleEquipment(option.id)}
              />
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Add Profile" onPress={onAddProfile} />
          </View>
        </View>
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
  },
  addSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
