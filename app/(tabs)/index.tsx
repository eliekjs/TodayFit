import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton } from "../../components/Button";
import { useTheme } from "../../lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
});
