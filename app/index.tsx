import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../context/AppStateContext";
import { PrimaryButton } from "../components/Button";
import { Card } from "../components/Card";
import { useTheme } from "../lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { activeGymProfileId, gymProfiles, setActiveGymProfile } = useAppState();
  const theme = useTheme();
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeProfile != null && (
          <Card
            title="Active Gym Profile"
            subtitle={activeProfile.name}
            primaryActionLabel="Change"
            onPrimaryAction={() => setProfileModalVisible(true)}
          />
        )}

        <Text style={[styles.headline, { color: theme.text }]}>
          What should we optimize today?
        </Text>

        <View style={styles.section}>
          <PrimaryButton
            label="Build My Workout"
            onPress={() => router.push("/manual/preferences")}
          />
        </View>

        <View style={styles.section}>
          <PrimaryButton
            label="Adaptive Mode — Train Toward a Goal"
            variant="secondary"
            onPress={() => router.push("/adaptive")}
          />
          <Text style={[styles.subtext, { color: theme.textMuted }]}>
            Uses your goals, recovery, and upcoming sessions.
          </Text>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={profileModalVisible}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setProfileModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select active gym
            </Text>
            <ScrollView
              style={{ maxHeight: 280 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {gymProfiles.map((profile) => {
                const isActive = profile.id === activeGymProfileId;
                return (
                  <Pressable
                    key={profile.id}
                    onPress={() => {
                      setActiveGymProfile(profile.id);
                      setProfileModalVisible(false);
                    }}
                    style={[
                      styles.profileRow,
                      {
                        borderColor: theme.border,
                        backgroundColor: isActive
                          ? theme.primarySoft
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {profile.name}
                    </Text>
                    {isActive && (
                      <Text
                        style={{
                          color: theme.textMuted,
                          fontSize: 12,
                        }}
                      >
                        Active
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <PrimaryButton
              label="Manage profiles"
              variant="ghost"
              onPress={() => {
                setProfileModalVisible(false);
                router.push("/profiles");
              }}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    gap: 8,
  },
  subtext: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  profileRow: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
});
