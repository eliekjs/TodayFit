import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";

const LIGHT_PASTELS = {
  helpBg: "#B8D4F0",
  helpText: "#1E3A5F",
  helpSubtext: "#2D4A6F",
  buildBg: "#B8E0C8",
  buildText: "#1A3D2A",
  buildSubtext: "#2A4D3A",
};

const DARK_PASTELS = {
  helpBg: "#4A7A9A",
  helpText: "#E8F4FC",
  helpSubtext: "#C5DCF0",
  buildBg: "#4A8A5E",
  buildText: "#E8F8EC",
  buildSubtext: "#C5E8D0",
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { manualPreferences } = useAppState();
  const pastels = colorScheme === "dark" ? DARK_PASTELS : LIGHT_PASTELS;

  const primaryGoal =
    manualPreferences.primaryFocus[0] ?? "Not set";
  const secondaryGoal =
    manualPreferences.primaryFocus[1] ?? "Not set";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: theme.text }]}>
          What should we optimize today?
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Reduce decision fatigue with intelligent training decisions
        </Text>

        <View style={[styles.actionCard, { backgroundColor: pastels.buildBg }]}>
          <View style={styles.actionCardIcon}>
            <Ionicons
              name="barbell-outline"
              size={28}
              color={pastels.buildText}
            />
          </View>
          <Text style={[styles.actionCardTitle, { color: pastels.buildText }]}>
            Build My Workout
          </Text>
          <View style={styles.subButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.subButton,
                { backgroundColor: pastels.buildText, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/manual/preferences")}
            >
              <Text style={[styles.subButtonText, { color: pastels.buildBg }]}>
                One day
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.subButton,
                { backgroundColor: pastels.buildText, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/manual/preferences?scope=week")}
            >
              <Text style={[styles.subButtonText, { color: pastels.buildBg }]}>
                This week
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.actionCard, { backgroundColor: pastels.helpBg }]}>
          <View style={styles.actionCardIcon}>
            <Ionicons
              name="sparkles-outline"
              size={28}
              color={pastels.helpText}
            />
          </View>
          <Text style={[styles.actionCardTitle, { color: pastels.helpText }]}>
            Adaptive Mode — Train Toward a Goal
          </Text>
          <Text
            style={[styles.actionCardSubtitle, { color: pastels.helpSubtext }]}
          >
            Uses your goals, recovery, and upcoming sessions.
          </Text>
          <View style={styles.subButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.subButton,
                { backgroundColor: pastels.helpText, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/adaptive?scope=day")}
            >
              <Text style={[styles.subButtonText, { color: pastels.helpBg }]}>
                One day
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.subButton,
                { backgroundColor: pastels.helpText, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/adaptive")}
            >
              <Text style={[styles.subButtonText, { color: pastels.helpBg }]}>
                This week
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.goalSummary, { backgroundColor: theme.card }]}>
          <View style={styles.goalRow}>
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>
              Primary Goal:
            </Text>
            <Text style={[styles.goalValue, { color: theme.text }]}>
              {primaryGoal}
            </Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>
              Secondary Goal:
            </Text>
            <Text style={[styles.goalValue, { color: theme.text }]}>
              {secondaryGoal}
            </Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCardIcon: {
    alignSelf: "center",
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  actionCardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.9,
  },
  subButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    justifyContent: "center",
  },
  subButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  subButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  goalSummary: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalLabel: {
    fontSize: 14,
  },
  goalValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
