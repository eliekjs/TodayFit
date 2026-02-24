import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/Button";

export default function FactorsTabScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="TodayFit factors"
          subtitle="Goal priority, recovery status, upcoming sessions, and constraints."
        >
          <Text style={[styles.body, { color: theme.textMuted }]}>
            This area will evolve into a dashboard of the things that shape
            what you should do today — how rested you are, what's coming up in
            the next 1–3 days, and what long-term targets you're steering
            toward.
          </Text>
        </Card>

        <Card title="Adaptive Mode">
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Use Adaptive Mode when you want TodayFit to choose the right
            session type given your goals, recent load, and time horizon.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label="Open Adaptive Mode"
              variant="secondary"
              onPress={() => router.push("/adaptive")}
            />
          </View>
        </Card>
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
    gap: 20,
  },
  body: {
    fontSize: 13,
  },
});

