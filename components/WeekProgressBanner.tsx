import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
import {
  buildWeekProgressSnapshot,
  formatWeekDayLong,
  shouldShowWeekProgressBanner,
  WEEK_PROGRESS_BANNER_HEIGHT,
  WEEK_PROGRESS_ROUTE,
} from "../lib/weekProgress";

const TAB_BAR_HEIGHT = 88;

function useTabBarBottomOffset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom;
}

export function WeekProgressBanner() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const bottomOffset = useTabBarBottomOffset();
  const { manualWeekPlan, sportPrepWeekPlan } = useAppState();

  const snapshot = buildWeekProgressSnapshot({ manualWeekPlan, sportPrepWeekPlan });

  if (!shouldShowWeekProgressBanner(pathname, snapshot)) {
    return null;
  }

  const nextLabel = snapshot?.nextDay
    ? `Next: ${formatWeekDayLong(snapshot.nextDay.date)}`
    : `${snapshot?.completedCount ?? 0} of ${snapshot?.totalCount ?? 0} done`;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.strip,
        {
          bottom: bottomOffset,
          height: WEEK_PROGRESS_BANNER_HEIGHT,
          backgroundColor: theme.primarySoft,
          borderTopColor: theme.border,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.mainTap, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => router.push(WEEK_PROGRESS_ROUTE as never)}
        accessibilityRole="button"
        accessibilityLabel="Continue this week's workouts"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar" size={18} color={theme.primary} />
        </View>
        <View style={styles.textColumn}>
          <Text style={[styles.titleLine, { color: theme.text }]} numberOfLines={1}>
            Continue this week&apos;s workouts
          </Text>
          <Text style={[styles.subtitleLine, { color: theme.textMuted }]} numberOfLines={1}>
            {nextLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.primary} style={styles.chevron} />
      </Pressable>
    </View>
  );
}

export function useWeekProgressBannerInset(): number {
  const pathname = usePathname();
  const { manualWeekPlan, sportPrepWeekPlan } = useAppState();
  const snapshot = buildWeekProgressSnapshot({ manualWeekPlan, sportPrepWeekPlan });
  if (!shouldShowWeekProgressBanner(pathname, snapshot)) return 0;
  return WEEK_PROGRESS_BANNER_HEIGHT;
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 49,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ pointerEvents: "auto" } as const) : null),
  },
  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  iconWrap: {
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleLine: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  subtitleLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.85,
  },
});
