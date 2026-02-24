import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/Button";

export default function BuildTabScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Build today's session"
          subtitle="Choose how you want to design what you do today."
        />

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>
            Manual builder
          </Text>
          <PrimaryButton
            label="Build My Workout"
            onPress={() => router.push("/manual/preferences")}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>
            Adaptive mode
          </Text>
          <PrimaryButton
            label="Adaptive Mode — Train Toward a Goal"
            variant="secondary"
            onPress={() => router.push("/adaptive")}
          />
          <Text style={[styles.subtext, { color: theme.textMuted }]}>
            Uses your long-term goals, recent load, and time horizon to pick
            the most useful session type for today.
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
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtext: {
    fontSize: 13,
  },
});

