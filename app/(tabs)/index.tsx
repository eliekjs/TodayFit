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

type ActionCardProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  oneDayHref: string;
  weekHref: string;
  oneDayLabel?: string;
  weekLabel?: string;
  pastels: typeof LIGHT_PASTELS;
  variant: "build" | "help";
};

function ActionCard({
  icon,
  title,
  subtitle,
  oneDayHref,
  weekHref,
  oneDayLabel = "One day",
  weekLabel = "This week",
  pastels,
  variant,
}: ActionCardProps) {
  const router = useRouter();
  const isBuild = variant === "build";
  const bg = isBuild ? pastels.buildBg : pastels.helpBg;
  const text = isBuild ? pastels.buildText : pastels.helpText;
  const subtext = isBuild ? pastels.buildSubtext : pastels.helpSubtext;

  return (
    <View style={[styles.actionCard, { backgroundColor: bg }]}>
      <View style={styles.actionCardIcon}>
        <Ionicons name={icon} size={28} color={text} />
      </View>
      <Text style={[styles.actionCardTitle, { color: text }]}>{title}</Text>
      <Text style={[styles.actionCardSubtitle, { color: subtext }]}>
        {subtitle}
      </Text>
      <View style={styles.subButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.subButton,
            { backgroundColor: text, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push(oneDayHref)}
        >
          <Text style={[styles.subButtonText, { color: bg }]}>{oneDayLabel}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.subButton,
            { backgroundColor: text, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push(weekHref)}
        >
          <Text style={[styles.subButtonText, { color: bg }]}>{weekLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { manualPreferences, manualWeekPlan, sportPrepWeekPlan, generatedWorkout } = useAppState();
  const pastels = colorScheme === "dark" ? DARK_PASTELS : LIGHT_PASTELS;

  const primaryGoal =
    manualPreferences.primaryFocus[0] ?? "Not set";
  const secondaryGoal =
    manualPreferences.primaryFocus[1] ?? "Not set";

  const hasInProgress =
    manualWeekPlan != null || sportPrepWeekPlan != null || generatedWorkout != null;

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

        {hasInProgress && (
          <Pressable
            style={({ pressed }) => [
              styles.continueCard,
              { backgroundColor: theme.primarySoft ?? pastels.helpBg, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => {
              if (manualWeekPlan != null) router.push("/manual/week");
              else if (sportPrepWeekPlan != null) router.push("/adaptive/recommendation");
              else if (generatedWorkout != null) router.push("/manual/execute");
            }}
          >
            <Text style={[styles.continueCardTitle, { color: theme.primary }]}>
              {manualWeekPlan != null
                ? "Continue your week"
                : sportPrepWeekPlan != null
                  ? "Continue your week plan"
                  : "Continue workout"}
            </Text>
            <Text style={[styles.continueCardSubtitle, { color: theme.textMuted }]}>
              {manualWeekPlan != null
                ? "Back to this week's workouts"
                : sportPrepWeekPlan != null
                  ? "Back to your adaptive week"
                  : "Back to workout in progress"}
            </Text>
          </Pressable>
        )}

        <ActionCard
          icon="barbell-outline"
          title="Build My Workout"
          subtitle="Choose exercises and structure for one day or plan the whole week."
          oneDayHref="/manual/preferences"
          weekHref="/manual/preferences?scope=week"
          pastels={pastels}
          variant="build"
        />
        <ActionCard
          icon="sparkles-outline"
          title="Adaptive Mode — Train Toward a Goal"
          subtitle="Uses your goals, recovery, and upcoming sessions."
          oneDayHref="/adaptive?scope=day"
          weekHref="/adaptive"
          pastels={pastels}
          variant="help"
        />

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
  continueCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  continueCardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  continueCardSubtitle: {
    fontSize: 13,
    marginTop: 4,
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
