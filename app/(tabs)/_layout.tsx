import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../lib/theme";
import { ActiveSessionBanner } from "../../components/ActiveSessionCard";
import {
  AdaptiveRecommendationBackButton,
  EditWorkoutBackButton,
  FilteredTabBar,
  FlowHeaderRight,
  FlowHeaderTitle,
  FocusAwareTabHeader,
  OpaqueHeaderBackground,
  HeaderBackButton,
  HeaderGymProfileButton,
  ManualExecuteBackButton,
  ManualPreferencesBackButton,
  ManualWeekBackButton,
  SportScheduleBackButton,
  TAB_ICON_SIZE,
  TAB_ICON_SIZE_ACTIVE,
} from "../navigation/tabFlowChrome";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
    <Tabs
      tabBar={(props: BottomTabBarProps) => <FilteredTabBar {...props} />}
      screenOptions={{
        /**
         * Do not freeze inactive web scenes. AppScreenWrapper already unmounts unfocused
         * content; freezeOnBlur snapshots stale UI (old chrome + generic setup copy).
         */
        freezeOnBlur: false,
        sceneStyle: {
          backgroundColor: "transparent",
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarActiveBackgroundColor: theme.primarySoft,
        tabBarInactiveBackgroundColor: "transparent",
        tabBarStyle: {
          borderTopColor: theme.border,
          borderTopWidth: 1,
          backgroundColor: theme.cardOpaque,
          height: 88 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 12,
          ...(Platform.OS === "android" && { elevation: 8 }),
          // Avoid always-on blurry box-shadow on web — hairline border is enough.
          ...(Platform.OS === "web"
            ? null
            : { boxShadow: "0 -8px 24px rgba(44,38,32,0.08)" }),
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
          borderRadius: 999,
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackground: (props) => <OpaqueHeaderBackground {...props} />,
        headerBackgroundContainerStyle: { backgroundColor: theme.cardOpaque },
        ...(Platform.OS === "web"
          ? {
              header: (props) => <FocusAwareTabHeader {...props} />,
              headerTitleContainerStyle: { maxWidth: "52%" },
            }
          : null),
        headerStyle: {
          backgroundColor: theme.cardOpaque,
        },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontWeight: "600" },
      }}
      initialRouteName="index"
    >
      {/* ── 4 visible tabs in workflow order: Create | Workout | Library | Profile ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Create",
          tabBarLabel: "Create",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              size={focused ? TAB_ICON_SIZE_ACTIVE : TAB_ICON_SIZE}
              color={color}
            />
          ),
          headerRight: () => <HeaderGymProfileButton />,
        }}
      />
      <Tabs.Screen
        name="workout/index"
        options={{
          title: "Your workouts",
          tabBarLabel: "Workout",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "barbell" : "barbell-outline"}
              size={focused ? TAB_ICON_SIZE_ACTIVE : TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
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
        name="presets/index"
        options={{
          href: null,
          title: "Saved Presets",
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Tabs.Screen
        name="manual/preferences"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Build workout" />,
          headerLeft: () => <ManualPreferencesBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/workout"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Workout" />,
          headerLeft: () => <EditWorkoutBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/execute"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Train" />,
          headerLeft: () => <ManualExecuteBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="manual/week"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="This week's workouts" />,
          headerLeft: () => <ManualWeekBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="sport-mode/index"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Sport" />,
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="sport-mode/schedule"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Set your schedule" />,
          headerLeft: () => <SportScheduleBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="sport-mode/recommendation"
        options={{
          href: null,
          headerTitle: () => <FlowHeaderTitle title="Today's session" />,
          headerLeft: () => <AdaptiveRecommendationBackButton />,
          headerRight: () => <FlowHeaderRight />,
        }}
      />
    </Tabs>
    <ActiveSessionBanner />
    </>
  );
}
