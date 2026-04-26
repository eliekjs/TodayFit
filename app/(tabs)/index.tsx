import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../context/AppStateContext";
import { useTheme } from "../../lib/theme";
import { useWelcome } from "../../context/WelcomeContext";
import { AppScreenWrapper } from "../../components/AppScreenWrapper";

type ActionCardProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  oneDayHref: string;
  weekHref: string;
  oneDayLabel?: string;
  weekLabel?: string;
  variant: "build" | "help";
  theme: ReturnType<typeof useTheme>;
};

function ActionCard({
  icon,
  title,
  subtitle,
  oneDayHref,
  weekHref,
  oneDayLabel = "One day",
  weekLabel = "This week",
  variant,
  theme,
}: ActionCardProps) {
  const router = useRouter();
  const isBuild = variant === "build";
  const accent = isBuild ? "rgba(45,212,191,0.86)" : "rgba(96,165,250,0.82)";
  const accentSoft = isBuild ? "rgba(45,212,191,0.12)" : "rgba(96,165,250,0.12)";

  return (
    <View
      style={[
        styles.actionCard,
        {
          backgroundColor: theme.card,
          borderColor: accentSoft,
        },
      ]}
    >
      <View style={[styles.actionCardIcon, { backgroundColor: accentSoft }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.actionCardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.actionCardSubtitle, { color: theme.textMuted }]}>
        {subtitle}
      </Text>
      <View style={styles.subButtons}>
        <Pressable
          style={({ pressed }) => [styles.subButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push(oneDayHref)}
        >
          <LinearGradient
            colors={["rgba(45,212,191,0.7)", "rgba(59,130,246,0.66)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subButton}
          >
            <Text style={styles.subButtonText}>{oneDayLabel}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.subButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push(weekHref)}
        >
          <View style={[styles.subButton, styles.subButtonSecondary]}>
            <Text style={styles.subButtonText}>{weekLabel}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasEntered, isHydrated } = useWelcome();
  const {
    manualPreferences,
    manualWeekPlan,
    sportPrepWeekPlan,
    generatedWorkout,
    setGeneratedWorkout,
    setManualWeekPlan,
    manualExecutionStarted,
    setManualExecutionStarted,
  } = useAppState();
  const primaryGoal =
    manualPreferences.primaryFocus[0] ?? "Not set";
  const secondaryGoal =
    manualPreferences.primaryFocus[1] ?? "Not set";

  const hasInProgress =
    manualWeekPlan != null || sportPrepWeekPlan != null || generatedWorkout != null;

  /** Single-day "week" is treated as one workout; no week view. */
  const isSingleWorkout =
    generatedWorkout != null ||
    (manualWeekPlan != null && manualWeekPlan.days.length === 1);
  const continueEditingManualWorkout = () => {
    router.push("/manual/workout");
  };

  const continueOrStartManualExecution = () => {
    setManualExecutionStarted(true);
    if (generatedWorkout != null) {
      router.push("/manual/execute");
      return;
    }
    if (manualWeekPlan != null && manualWeekPlan.days.length === 1) {
      setGeneratedWorkout(manualWeekPlan.days[0].workout);
      setManualWeekPlan(null);
      router.push("/manual/execute");
    }
  };
  const continueWeek = () => router.push("/manual/week");

  if (!isHydrated) {
    return null;
  }
  if (!hasEntered) {
    return <Redirect href="/welcome" />;
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: theme.text }]}>
          Customize your gym session:
        </Text>

        {hasInProgress && (
          <View
            style={[
              styles.continueCard,
              { backgroundColor: "rgba(15,23,42,0.52)" },
            ]}
          >
            {isSingleWorkout && generatedWorkout != null ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.continueCardRow,
                    { opacity: pressed ? 0.88 : 1 },
                  ]}
                  onPress={continueEditingManualWorkout}
                >
                  <Text style={[styles.continueCardTitle, { color: theme.primary }]}>
                    Continue editing workout
                  </Text>
                  <Text style={[styles.continueCardSubtitle, { color: theme.textMuted }]}>
                    Adjust exercises, regenerate, or change preferences
                  </Text>
                </Pressable>
                {manualExecutionStarted ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.continueCardRow,
                      styles.continueCardRowSecond,
                      {
                        opacity: pressed ? 0.88 : 1,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border,
                      },
                    ]}
                    onPress={continueOrStartManualExecution}
                  >
                    <Text style={[styles.continueCardTitle, { color: theme.primary }]}>
                      {"Continue today's workout"}
                    </Text>
                    <Text style={[styles.continueCardSubtitle, { color: theme.textMuted }]}>
                      Resume sets and checkboxes where you left off
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.continueCardRow,
                      styles.continueCardRowSecond,
                      {
                        opacity: pressed ? 0.88 : 1,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border,
                      },
                    ]}
                    onPress={continueOrStartManualExecution}
                  >
                    <Text style={[styles.continueCardTitle, { color: theme.primary }]}>
                      Start workout
                    </Text>
                    <Text style={[styles.continueCardSubtitle, { color: theme.textMuted }]}>
                      Open the execution screen and log your session
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                onPress={() => {
                  if (isSingleWorkout) continueOrStartManualExecution();
                  else if (manualWeekPlan != null) continueWeek();
                  else if (sportPrepWeekPlan != null) router.push("/adaptive/recommendation");
                }}
              >
                <Text style={[styles.continueCardTitle, { color: theme.primary }]}>
                  {isSingleWorkout
                    ? "Continue workout"
                    : manualWeekPlan != null
                      ? "Continue your week"
                      : sportPrepWeekPlan != null
                        ? "Continue your sport plan"
                        : "Continue workout"}
                </Text>
                <Text style={[styles.continueCardSubtitle, { color: theme.textMuted }]}>
                  {isSingleWorkout
                    ? "Back to workout in progress"
                    : manualWeekPlan != null
                      ? "Back to this week's workouts"
                      : sportPrepWeekPlan != null
                        ? "Back to your sport plan"
                        : "Back to workout in progress"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <ActionCard
          icon="barbell-outline"
          title="Goal-Oriented Training"
          subtitle="Build workouts tailored to one or multiple goals (strength, physique, etc.)"
          oneDayHref="/manual/preferences"
          weekHref="/manual/preferences?scope=week"
          variant="build"
          theme={theme}
        />
        <ActionCard
          icon="sparkles-outline"
          title="Sport-Focused Training"
          subtitle="Train for your sport(s) to prevent injuries and improve performance."
          oneDayHref="/adaptive?scope=day"
          weekHref="/adaptive"
          variant="help"
          theme={theme}
        />

        <View style={[styles.goalSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.28)",
    backgroundColor: "rgba(15,23,42,0.65)",
  },
  continueCardRow: {
    paddingVertical: 10,
  },
  continueCardRowSecond: {
    marginTop: 4,
    paddingTop: 14,
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
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  actionCardIcon: {
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 10,
    justifyContent: "center",
  },
  subButtonWrap: {
    minWidth: 118,
  },
  subButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subButtonSecondary: {
    backgroundColor: "rgba(15,23,42,0.4)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
  },
  subButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  goalSummary: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
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
