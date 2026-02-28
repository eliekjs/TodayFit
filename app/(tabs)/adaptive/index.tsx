import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";

/** Spec-aligned: Performance, Physique, Resilience, Energy System (representative set). */
const ADAPTIVE_GOALS = [
  { id: "strength", label: "Max strength foundation", category: "Performance" },
  { id: "muscle", label: "Build visible muscle", category: "Physique" },
  { id: "endurance", label: "Endurance engine", category: "Energy System" },
  { id: "conditioning", label: "Sport-specific conditioning", category: "Energy System" },
  { id: "mobility", label: "Mobility & joint health", category: "Resilience" },
  { id: "climbing", label: "Climbing / grip performance", category: "Performance" },
  { id: "trail_running", label: "Trail running", category: "Performance" },
  { id: "ski", label: "Ski / snow", category: "Performance" },
  { id: "physique", label: "Physique / body comp", category: "Physique" },
  { id: "resilience", label: "Resilience / recovery", category: "Resilience" },
];

/** Spec: No Deadline, 1–3 Weeks, 4–8 Weeks, 2–4 Months, In-Season. */
const TIME_HORIZON_OPTIONS = [
  { id: "no_deadline", label: "No Deadline" },
  { id: "1_3_weeks", label: "1–3 Weeks" },
  { id: "4_8_weeks", label: "4–8 Weeks" },
  { id: "2_4_months", label: "2–4 Months" },
  { id: "in_season", label: "In-Season" },
] as const;

/** Spec: recent load (past 3–5 days). */
const RECENT_LOAD_OPTIONS = [
  "Heavy Lower",
  "Heavy Upper",
  "Long Run",
  "Big Hike",
  "Ski Day",
  "Climbing Day",
  "Light / Off",
  "Normal / Mixed",
] as const;

const INJURY_STATUS_OPTIONS = [
  "No Concerns",
  "Managing",
  "Rebuilding",
] as const;

const FATIGUE_OPTIONS = ["Fresh", "Moderate", "Fatigued"] as const;

export default function AdaptiveModeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [rankedGoals, setRankedGoals] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [horizon, setHorizon] = useState<string>("4_8_weeks");
  const [recentLoad, setRecentLoad] =
    useState<(typeof RECENT_LOAD_OPTIONS)[number]>("Normal / Mixed");
  const [injuryStatus, setInjuryStatus] =
    useState<(typeof INJURY_STATUS_OPTIONS)[number]>("No Concerns");
  const [fatigue, setFatigue] =
    useState<(typeof FATIGUE_OPTIONS)[number]>("Moderate");

  const selectGoalForRank = (rankIndex: number, goalId: string) => {
    setRankedGoals((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i += 1) {
        if (i !== rankIndex && next[i] === goalId) {
          next[i] = null;
        }
      }
      next[rankIndex] = goalId;
      return next;
    });
  };

  const onRecommend = () => {
    const primary = rankedGoals[0] ?? "strength";
    const secondary = rankedGoals[1] ?? null;

    router.push({
      pathname: "/adaptive/recommendation",
      params: {
        primary,
        secondary: secondary ?? "",
        horizon,
        recentLoad,
        injuryStatus,
        fatigue,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card title="How Adaptive Mode works">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Rank your long-term goals, tell TodayFit how your last few days felt,
            and we'll pick the most useful session type for today. Later, this
            will plug into a full strategic engine.
          </Text>
        </Card>

        <SectionHeader
          title="Rank your goals"
          subtitle="Most important at the top."
          style={{ marginTop: 20 }}
        />

        {[0, 1, 2].map((rankIndex) => (
          <View key={rankIndex} style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                marginBottom: 6,
                color: theme.textMuted,
              }}
            >
              Rank {rankIndex + 1}
            </Text>
            <View style={styles.chipGroup}>
              {ADAPTIVE_GOALS.map((goal) => (
                <Chip
                  key={`${goal.id}-${rankIndex}`}
                  label={goal.label}
                  selected={rankedGoals[rankIndex] === goal.id}
                  onPress={() => selectGoalForRank(rankIndex, goal.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <SectionHeader
          title="Time horizon"
          subtitle="How long we're steering for."
          style={{ marginTop: 12 }}
        />
        <View style={styles.chipGroup}>
          {TIME_HORIZON_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.label}
              selected={horizon === opt.id}
              onPress={() => setHorizon(opt.id)}
            />
          ))}
        </View>

        <SectionHeader
          title="Recent load"
          subtitle="Past 3–5 days."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {RECENT_LOAD_OPTIONS.map((load) => (
            <Chip
              key={load}
              label={load}
              selected={recentLoad === load}
              onPress={() => setRecentLoad(load)}
            />
          ))}
        </View>

        <SectionHeader
          title="Injury status"
          subtitle="Rebuilding, managing, or no concerns."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {INJURY_STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={injuryStatus === opt}
              onPress={() => setInjuryStatus(opt)}
            />
          ))}
        </View>

        <SectionHeader
          title="Fatigue"
          subtitle="How you feel today."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {FATIGUE_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={fatigue === opt}
              onPress={() => setFatigue(opt)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Generate Adaptive Session"
            onPress={onRecommend}
          />
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
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  footer: {
    marginTop: 24,
    marginBottom: 24,
  },
});
