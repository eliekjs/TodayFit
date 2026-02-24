import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";

const ADAPTIVE_GOALS = [
  { id: "strength", label: "Max strength foundation" },
  { id: "muscle", label: "Build visible muscle" },
  { id: "endurance", label: "Endurance engine" },
  { id: "conditioning", label: "Sport-specific conditioning" },
  { id: "mobility", label: "Mobility & joint health" },
  { id: "climbing", label: "Climbing / grip performance" },
];

const TIME_HORIZONS = [4, 8, 12];
const LOAD_OPTIONS = ["Light", "Normal", "Heavy"] as const;

export default function AdaptiveModeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [rankedGoals, setRankedGoals] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [horizon, setHorizon] = useState<number | null>(8);
  const [recentLoad, setRecentLoad] =
    useState<(typeof LOAD_OPTIONS)[number]>("Normal");

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
    const secondary = rankedGoals[1];

    let sessionType = "Balanced Full-Body Strength";

    if (primary === "strength" && recentLoad !== "Heavy") {
      sessionType = "Upper Strength + Short Zone 2";
    } else if (primary === "muscle") {
      sessionType = "Hypertrophy Push/Pull Mix";
    } else if (primary === "endurance") {
      sessionType = "Lower Strength + Zone 2 Engine";
    } else if (primary === "mobility") {
      sessionType = "Strength Support + Mobility Focus";
    } else if (primary === "conditioning") {
      sessionType = "Power Intervals + Mixed Conditioning";
    } else if (primary === "climbing") {
      sessionType = "Pull Strength + Grip Density";
    }

    if (recentLoad === "Heavy" && secondary === "mobility") {
      sessionType = "Easy Strength + Mobility Reset";
    }

    const focusForManual = (() => {
      if (primary === "strength") return ["Build Strength"];
      if (primary === "muscle") return ["Build Muscle (Hypertrophy)"];
      if (primary === "endurance") return ["Improve Endurance"];
      if (primary === "mobility") return ["Mobility & Joint Health"];
      if (primary === "conditioning") return ["Sport Conditioning"];
      if (primary === "climbing") return ["Athletic Performance", "Calisthenics"];
      return ["Body Recomposition"];
    })();

    const duration = horizon === 4 ? 45 : horizon === 8 ? 60 : 75;
    const energy =
      recentLoad === "Light"
        ? "high"
        : recentLoad === "Heavy"
          ? "low"
          : "medium";

    router.push({
      pathname: "/adaptive/recommendation",
      params: {
        sessionType,
        focus: focusForManual.join(","),
        duration: String(duration),
        energy,
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
          {TIME_HORIZONS.map((weeks) => (
            <Chip
              key={weeks}
              label={`${weeks} weeks`}
              selected={horizon === weeks}
              onPress={() => setHorizon(weeks)}
            />
          ))}
        </View>

        <SectionHeader
          title="Recent load"
          subtitle="How the last 2–3 days have felt."
          style={{ marginTop: 20 }}
        />
        <View style={styles.chipGroup}>
          {LOAD_OPTIONS.map((load) => (
            <Chip
              key={load}
              label={load}
              selected={recentLoad === load}
              onPress={() => setRecentLoad(load)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Recommend Today's Session"
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
