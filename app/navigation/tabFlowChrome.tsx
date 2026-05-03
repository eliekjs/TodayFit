import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";

/** Order defines tab bar left-to-right; index (Today) is center and app home. */
const VISIBLE_TAB_NAMES = ["library", "index", "profiles"];

function isTabVisible(routeName: string): boolean {
  const base = String(routeName).split("/")[0];
  return VISIBLE_TAB_NAMES.includes(base);
}

export function FilteredTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const filteredRoutes = state.routes.filter((r) => isTabVisible(String(r.name)));
  const currentRoute = state.routes[state.index];
  const filteredIndex = filteredRoutes.findIndex((r) => r.key === currentRoute?.key);
  const activeIndex = filteredIndex >= 0 ? filteredIndex : 0;
  const filteredState = {
    ...state,
    routes: filteredRoutes,
    index: activeIndex,
  };
  return <BottomTabBar {...props} state={filteredState} />;
}

export const TAB_ICON_SIZE = 24;
export const TAB_ICON_SIZE_ACTIVE = 26;

export function HeaderBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Sport prep one-day flow uses replace(); blind back can land on Library. Send user to Sport setup instead. */
export function AdaptiveRecommendationBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const { sportPrepWeekPlan } = useAppState();
  return (
    <Pressable
      onPress={() => {
        const oneDay = sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek === 1;
        if (oneDay) {
          router.replace("/sport-mode?scope=day");
          return;
        }
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace("/sport-mode");
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from week plan: previous screen when possible, else preferences. */
export function ManualWeekBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.push("/manual/preferences");
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from execute: week overview if this session came from a week plan, else workout editor. */
export function ManualExecuteBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const { manualWeekPlan } = useAppState();
  return (
    <Pressable
      onPress={() => {
        if (manualWeekPlan != null) router.push("/manual/week");
        else router.push("/manual/workout");
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from editing today's workout: previous screen (usually preferences), not Today home. */
export function EditWorkoutBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.push("/manual/preferences");
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

export function HeaderGymProfileButton() {
  const theme = useTheme();
  const router = useRouter();
  const { gymProfiles, activeGymProfileId } = useAppState();
  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
  const label = activeProfile ? activeProfile.name : "Gym Profile";

  return (
    <Pressable
      onPress={() => router.push("/profiles")}
      style={{ flexDirection: "row", alignItems: "center", paddingRight: 16, gap: 4 }}
    >
      <Text style={{ fontSize: 14, color: theme.text, maxWidth: 120 }} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
    </Pressable>
  );
}

/** Clears in-progress workout/week state and navigates to Generator. Use on flow screens (preferences, week, execute, adaptive). */
export function RestartFlowButton() {
  const theme = useTheme();
  const router = useRouter();
  const {
    setManualWeekPlan,
    setGeneratedWorkout,
    setResumeProgress,
    setManualSessionProgress,
    setManualExecutionStarted,
    setSportPrepWeekPlan,
    setAdaptiveSetup,
  } = useAppState();
  const onRestart = () => {
    setManualWeekPlan(null);
    setGeneratedWorkout(null);
    setResumeProgress(null);
    setManualSessionProgress(null);
    setManualExecutionStarted(false);
    setSportPrepWeekPlan(null);
    setAdaptiveSetup(null);
    router.replace("/");
  };
  return (
    <Pressable onPress={onRestart} style={{ paddingRight: 16 }}>
      <Text style={{ fontSize: 15, color: theme.primary, fontWeight: "500" }}>
        Start over
      </Text>
    </Pressable>
  );
}

export function FlowHeaderRight() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <HeaderGymProfileButton />
      <RestartFlowButton />
    </View>
  );
}
