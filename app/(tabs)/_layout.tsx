import React from "react";
import { Platform, Pressable, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

function FilteredTabBar(props: BottomTabBarProps) {
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

const TAB_ICON_SIZE = 24;
const TAB_ICON_SIZE_ACTIVE = 26;

function HeaderBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from week plan: previous screen when possible, else preferences. */
function ManualWeekBackButton() {
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
function ManualExecuteBackButton() {
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
function EditWorkoutBackButton() {
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

function HeaderGymProfileButton() {
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
function RestartFlowButton() {
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

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { savedWorkouts } = useAppState();
  const libraryBadgeCount = savedWorkouts.length;

  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => <FilteredTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarActiveBackgroundColor: theme.primarySoft,
        tabBarInactiveBackgroundColor: "transparent",
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.cardOpaque,
          height: 88 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 12,
          ...(Platform.OS === "android" && { elevation: 8 }),
          boxShadow: "0 -2px 4px rgba(0,0,0,0.06)",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarShowLabel: true,
        tabBarItemStyle: {
          paddingVertical: 6,
          borderRadius: 16,
        },
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: theme.cardOpaque },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontWeight: "600" },
      }}
      initialRouteName="index"
    >
      {/* ── 3 visible tabs: Library | Today (center, home) | Profile ── */}
      <Tabs.Screen
        name="library/index"
        options={{
          title: "Library",
          tabBarLabel: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={focused ? TAB_ICON_SIZE_ACTIVE : TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarBadge: libraryBadgeCount > 0 ? libraryBadgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarLabel: "Today",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "fitness" : "fitness-outline"}
              size={focused ? TAB_ICON_SIZE_ACTIVE : TAB_ICON_SIZE}
              color={color}
            />
          ),
          headerRight: () => <HeaderGymProfileButton />,
        }}
      />
      <Tabs.Screen
        name="profiles/index"
        options={{
          title: "Gym Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={focused ? TAB_ICON_SIZE_ACTIVE : TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      {/* ── Flow screens – no tab button, back arrow in header ── */}
      <Tabs.Screen
        name="manual/preferences"
        options={{
          href: null,
          title: "Build workout",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/workout"
        options={{
          href: null,
          title: "Today's Workout",
          headerLeft: () => <EditWorkoutBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/execute"
        options={{
          href: null,
          title: "Execute",
          headerLeft: () => <ManualExecuteBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/week"
        options={{
          href: null,
          title: "This week's workouts",
          headerLeft: () => <ManualWeekBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="adaptive/index"
        options={{
          href: null,
          title: "Sport Mode",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="adaptive/schedule"
        options={{
          href: null,
          title: "Set your schedule",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="adaptive/recommendation"
        options={{
          href: null,
          title: "Recommended Session",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
    </Tabs>
  );
}
