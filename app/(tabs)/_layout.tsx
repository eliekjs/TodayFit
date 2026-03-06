import React from "react";
import { Pressable, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";
import { useAppState } from "../../context/AppStateContext";

function HeaderBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
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
      <Text style={{ fontSize: 12, color: theme.textMuted }}>▾</Text>
    </Pressable>
  );
}

/** Clears in-progress workout/week state and navigates to Home. Use on flow screens (preferences, week, execute, adaptive). */
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.card,
        },
        headerTitleAlign: "center",
      }}
    >
      {/* ── Visible tabs: Profile | Home | History | Workout ── */}
      <Tabs.Screen
        name="profiles"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerRight: () => <HeaderGymProfileButton />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Current Workout",
          tabBarLabel: "Workout",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
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
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/execute"
        options={{
          href: null,
          title: "Execute",
          headerLeft: () => <HeaderBackButton />,
          headerRight: () => <RestartFlowButton />,
        }}
      />
      <Tabs.Screen
        name="manual/week"
        options={{
          href: null,
          title: "This week's workouts",
          headerLeft: () => <HeaderBackButton />,
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
