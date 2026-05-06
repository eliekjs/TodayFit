import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle } from "react-native-svg";
import { AppScreenWrapper } from "./AppScreenWrapper";
import { useTheme } from "../lib/theme";
import type { IntentSplitEntry } from "../lib/workoutIntentSplit";

type Props = {
  message: string;
  subtitle?: string;
  /** Top-3 focus areas with percentages for the donut chart. */
  focusSplit?: IntentSplitEntry[];
  /** Human-readable workout title derived from the focus split. */
  workoutTitle?: string;
  /** When provided, shows a "Adjust priorities" back button. */
  onGoBack?: () => void;
};

const DONUT_SIZE = 120;
const DONUT_RADIUS = 46;
const DONUT_STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function DonutChart({ split }: { split: IntentSplitEntry[] }) {
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;

  let offset = 0;
  const segments = split.map((entry) => {
    const dashArray = (entry.pct / 100) * CIRCUMFERENCE;
    const dashOffset = -(offset / 100) * CIRCUMFERENCE;
    offset += entry.pct;
    return { ...entry, dashArray, dashOffset };
  });

  // Fill unused space with muted color
  const usedPct = split.reduce((s, e) => s + e.pct, 0);
  const gap = 100 - usedPct;

  return (
    <View style={styles.donutWrap}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {/* Background ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={DONUT_RADIUS}
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={DONUT_STROKE}
          fill="none"
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={DONUT_RADIUS}
            stroke={seg.color}
            strokeWidth={DONUT_STROKE}
            fill="none"
            strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
            strokeDashoffset={seg.dashOffset - CIRCUMFERENCE / 4}
            strokeLinecap="butt"
          />
        ))}
      </Svg>
    </View>
  );
}

function SplitLegend({ split }: { split: IntentSplitEntry[] }) {
  return (
    <View style={styles.legendWrap}>
      {split.map((entry, i) => (
        <View key={i} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {entry.label}
          </Text>
          <Text style={[styles.legendPct, { color: entry.color }]}>{entry.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

export function GenerationLoadingScreen({
  message,
  subtitle,
  focusSplit,
  workoutTitle,
  onGoBack,
}: Props) {
  const theme = useTheme();
  const breathe = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.65, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const hasSplit = focusSplit && focusSplit.length > 0;

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <View style={styles.centered}>
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.card, borderColor: theme.border },
            hasSplit && styles.panelWide,
          ]}
        >
          {/* Spinner */}
          <Animated.View style={[styles.spinnerWrap, { opacity: breathe }]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>{message}</Text>

          {subtitle != null && subtitle.length > 0 ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}

          {/* Workout name */}
          {workoutTitle ? (
            <Text style={[styles.workoutTitle, { color: theme.primary }]}>{workoutTitle}</Text>
          ) : null}

          {/* Pie chart + legend */}
          {hasSplit ? (
            <View style={styles.chartSection}>
              <Text style={[styles.chartLabel, { color: theme.textMuted }]}>
                Workout focus split
              </Text>
              <View style={styles.chartRow}>
                <DonutChart split={focusSplit} />
                <SplitLegend split={focusSplit} />
              </View>
            </View>
          ) : null}

          {/* Go back */}
          {onGoBack ? (
            <Pressable
              onPress={onGoBack}
              style={({ pressed }) => [
                styles.backButton,
                { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.backButtonText, { color: theme.textMuted }]}>
                Adjust priorities
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  panelWide: {
    maxWidth: 400,
  },
  spinnerWrap: {
    marginBottom: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 14,
    letterSpacing: -0.1,
  },
  chartSection: {
    marginTop: 24,
    width: "100%",
    alignItems: "center",
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  legendWrap: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#f8fafc",
  },
  legendPct: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
  backButton: {
    marginTop: 22,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
