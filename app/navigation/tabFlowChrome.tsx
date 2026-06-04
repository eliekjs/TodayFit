import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { Header, getHeaderTitle } from "@react-navigation/elements";
import type { HeaderOptions } from "@react-navigation/elements";
import { useTheme } from "../../lib/theme";
import { manualGoalPreferencesHref } from "../../lib/manualGoalPreferencesHref";
import { useAppState } from "../../context/AppStateContext";
import { PrimaryButton } from "../../components/Button";

/** Order defines tab bar left-to-right; index (Today) is center and app home. */
const VISIBLE_TAB_NAMES = ["library", "index", "profiles"];

function isTabVisible(routeName: string): boolean {
  const base = String(routeName).split("/")[0];
  return VISIBLE_TAB_NAMES.includes(base);
}

type TabHeaderProps = {
  layout: { width: number; height: number };
  options: BottomTabNavigationOptions & HeaderOptions;
  route: { name: string; key: string };
};

/** RN Web keeps every tab route header mounted; hide unfocused ones to avoid title overlap. */
export function FocusAwareTabHeader({ layout, options, route }: TabHeaderProps) {
  const isFocused = useIsFocused();
  if (!isFocused) return null;
  return (
    <Header
      {...options}
      layout={layout}
      title={getHeaderTitle(options, route.name)}
    />
  );
}

export function FilteredTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const filteredRoutes = state.routes.filter((r) => isTabVisible(String(r.name)));
  const currentRoute = state.routes[state.index];
  const filteredIndex = filteredRoutes.findIndex((r) => r.key === currentRoute?.key);
  /** Flow screens (manual/*, sport-mode/*) are not tab routes; highlight Today, not Library. */
  const todayFilteredIndex = filteredRoutes.findIndex((r) => String(r.name) === "index");
  const activeIndex =
    filteredIndex >= 0
      ? filteredIndex
      : todayFilteredIndex >= 0
        ? todayFilteredIndex
        : 0;
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

/** Sport prep recommendation: preserve stack when possible; one-day falls back to sport setup with scope=day. */
export function AdaptiveRecommendationBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const { sportPrepWeekPlan } = useAppState();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        const oneDay = sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek === 1;
        if (oneDay) {
          router.push("/sport-mode?scope=day");
          return;
        }
        router.push("/sport-mode");
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
  const { manualGoalPreferencesScope } = useAppState();
  return (
    <Pressable
      onPress={() => {
        const href = manualGoalPreferencesHref(manualGoalPreferencesScope);
        if (router.canGoBack()) router.back();
        else router.push(href);
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
  const { manualGoalPreferencesScope } = useAppState();
  return (
    <Pressable
      onPress={() => {
        const href = manualGoalPreferencesHref(manualGoalPreferencesScope);
        router.dismissTo(href);
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
      <Text style={{ fontSize: 14, color: theme.text, maxWidth: 72, flexShrink: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
    </Pressable>
  );
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Short label for where the user is in daily vs weekly / sport flow. */
export function useFlowModeLabel(): string | null {
  const pathname = usePathname();
  const { manualGoalPreferencesScope, manualWeekPlan, sportPrepWeekPlan } = useAppState();

  const onFlowScreen =
    pathname.includes("/manual/") ||
    pathname.includes("/sport-mode/");
  if (!onFlowScreen) return null;

  if (sportPrepWeekPlan) {
    const gymDays = sportPrepWeekPlan.scheduleSnapshot?.gymDaysPerWeek ?? 0;
    const sportSlug =
      sportPrepWeekPlan.rankedSportSlugs?.[0] ??
      sportPrepWeekPlan.scheduleSnapshot?.sportSlug ??
      sportPrepWeekPlan.sportSlug;
    const sportPart = sportSlug ? ` · ${humanizeSlug(sportSlug)}` : "";
    return gymDays === 1 ? `Daily session${sportPart}` : `Week plan${sportPart}`;
  }

  if (manualWeekPlan != null || manualGoalPreferencesScope === "week") {
    return "Week plan";
  }

  if (pathname.includes("/sport-mode")) {
    return pathname.includes("scope=day") ? "Daily session · Sport" : "Week plan · Sport";
  }

  return "Daily session";
}

type FlowHeaderTitleProps = {
  title: string;
};

export function FlowHeaderTitle({ title }: FlowHeaderTitleProps) {
  const theme = useTheme();
  const modeLabel = useFlowModeLabel();
  return (
    <View style={flowHeaderTitleStyles.wrap}>
      <Text style={[flowHeaderTitleStyles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      {modeLabel ? (
        <Text style={[flowHeaderTitleStyles.mode, { color: theme.textMuted }]} numberOfLines={1}>
          {modeLabel}
        </Text>
      ) : null}
    </View>
  );
}

const flowHeaderTitleStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    maxWidth: "100%",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  mode: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});

function useRestartFlow() {
  const router = useRouter();
  const { discardActiveSession } = useAppState();

  return useCallback(() => {
    discardActiveSession();
    router.replace("/");
  }, [router, discardActiveSession]);
}

type RestartConfirmModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function RestartConfirmModal({ visible, onCancel, onConfirm }: RestartConfirmModalProps) {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={restartModalStyles.backdrop} onPress={onCancel}>
        <Pressable
          style={[restartModalStyles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[restartModalStyles.title, { color: theme.text }]}>Discard session?</Text>
          <Text style={[restartModalStyles.body, { color: theme.textMuted }]}>
            This clears your current workout or week plan and returns to Today. Saved library items are not
            deleted.
          </Text>
          <View style={restartModalStyles.actions}>
            <PrimaryButton label="Keep working" variant="secondary" compact onPress={onCancel} style={{ flex: 1 }} />
            <PrimaryButton label="Discard" compact onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const restartModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});

/** Clears in-progress workout/week state and navigates to Today. */
export function RestartFlowButton({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const restart = useRestartFlow();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setConfirmOpen(true)}
        style={{ paddingRight: compact ? 8 : 16, paddingLeft: compact ? 4 : 0 }}
      >
        <Text style={{ fontSize: compact ? 13 : 15, color: theme.primary, fontWeight: "600" }}>
          Start fresh
        </Text>
      </Pressable>
      <RestartConfirmModal
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          restart();
        }}
      />
    </>
  );
}

/** In-screen link to discard the current flow (same as header Start fresh). */
export function DiscardSessionLink({ style }: { style?: object }) {
  const theme = useTheme();
  const restart = useRestartFlow();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setConfirmOpen(true)} style={style}>
        <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: "500", textAlign: "center" }}>
          Discard session
        </Text>
      </Pressable>
      <RestartConfirmModal
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          restart();
        }}
      />
    </>
  );
}

export function FlowHeaderRight() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, maxWidth: 220 }}>
      <HeaderGymProfileButton />
    </View>
  );
}

/**
 * Expo Router treats files under app/ as routes.
 * This module is shared chrome utilities, so render nothing when visited directly.
 */
export default function TabFlowChromeRoute() {
  return null;
}
