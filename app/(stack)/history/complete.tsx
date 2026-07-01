import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { PrimaryButton } from "../../../components/Button";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";

export default function WorkoutCompleteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { workoutHistory } = useAppState();

  const last = workoutHistory[workoutHistory.length - 1];

  const summary =
    last != null
      ? `${new Date(last.date).toLocaleDateString()} • ${
          last.focus.join(" • ") || "General training"
        }`
      : "Workout summary will appear here once you finish a session.";

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Workout Saved
        </Text>
        <Text style={[styles.summary, { color: theme.textMuted }]}>
          {summary}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton label="Train again" onPress={() => router.replace("/")} />
          <PrimaryButton
            label="View Library"
            variant="secondary"
            onPress={() => router.replace("/library")}
          />
        </View>
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  summary: {
    fontSize: 14,
    textAlign: "center",
  },
  actions: {
    marginTop: 24,
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
});
