import React from "react";
import { Platform, Pressable, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";

const TAB_ICON_SIZE = 24;

function HeaderBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from manual flow (week/workout/execute): go to first preference screen, not home. */
function ManualFlowBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.push("/manual/preferences")} style={{ paddingLeft: 16 }}>
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
    setSportPrepWeekPlan,
    setAdaptiveSetup,
  } = useAppState();
  const onRestart = () => {
    setManualWeekPlan(null);
    setGeneratedWorkout(null);
    setResumeProgress(null);
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
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.card,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...(Platform.OS === "android" && { elevation: 8 }),
          ...(Platform.OS === "ios" && {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        tabBarShowLabel: true,
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerTitleAlign: "center",
      }}
    >
      {/* ── Visible tabs: Generate | Library | History | Settings ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Generator",
          tabBarLabel: "Generate",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          headerRight: () => <HeaderGymProfileButton />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarLabel: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarBadge: libraryBadgeCount > 0 ? libraryBadgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Workout History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
          title: "Saved Workouts",
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          href: null,
          title: "Current Workout",
        }}
      />

      {/* ── Flow screens – no tab button, back arrow in header ── */}
      <Tabs.Screen
        name="manual/preferences"
        options={{
          href: null,
          title: "Workout Preferences",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/workout"
        options={{
          href: null,
          title: "Today's Workout",
          headerLeft: () => <ManualFlowBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/execute"
        options={{
          href: null,
          title: "Execute",
          headerLeft: () => <ManualFlowBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/week"
        options={{
          href: null,
          title: "This week's workouts",
          headerLeft: () => <ManualFlowBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="adaptive/index"
        options={{
          href: null,
          title: "Adaptive Mode",
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
      <Tabs.Screen
        name="history/complete"
        options={{
          href: null,
          title: "Workout Saved",
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Tabs.Screen
        name="history/[id]"
        options={{
          href: null,
          title: "Completed Workout",
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Tabs.Screen
        name="history/weeks/[id]"
        options={{
          href: null,
          title: "Saved week",
          headerLeft: () => <HeaderBackButton />,
        }}
      />

      {/* ── Other hidden ── */}
      <Tabs.Screen name="build" options={{ href: null }} />
      <Tabs.Screen name="factors" options={{ href: null }} />
      <Tabs.Screen
        name="sport-dev"
        options={{ href: null, title: "Sport DB (Dev)" }}
      />
    </Tabs>
  );
}
