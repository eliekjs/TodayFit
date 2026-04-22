import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";
import {
  AdaptiveRecommendationBackButton,
  EditWorkoutBackButton,
  FilteredTabBar,
  FlowHeaderRight,
  HeaderBackButton,
  HeaderGymProfileButton,
  ManualExecuteBackButton,
  ManualWeekBackButton,
  TAB_ICON_SIZE,
  TAB_ICON_SIZE_ACTIVE,
} from "../navigation/tabFlowChrome";

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
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/workout"
        options={{
          href: null,
          title: "Today's Workout",
          headerLeft: () => <EditWorkoutBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/execute"
        options={{
          href: null,
          title: "Execute",
          headerLeft: () => <ManualExecuteBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/week"
        options={{
          href: null,
          title: "This week's workouts",
          headerLeft: () => <ManualWeekBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="adaptive/index"
        options={{
          href: null,
          title: "Sport Mode",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="adaptive/schedule"
        options={{
          href: null,
          title: "Set your schedule",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="adaptive/recommendation"
        options={{
          href: null,
          title: "Recommended Session",
          headerLeft: () => <AdaptiveRecommendationBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
    </Tabs>
  );
}
