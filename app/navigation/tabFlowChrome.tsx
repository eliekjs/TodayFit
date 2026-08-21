import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { Header, getHeaderTitle, PlatformPressable } from "@react-navigation/elements";
import type { HeaderOptions } from "@react-navigation/elements";
import { themeFonts, useTheme } from "../../lib/theme";
import {
  navigateToManualGoalPreferences,
} from "../../lib/manualGoalPreferencesHref";
import { isCreateEditingFlowScreen, weekSetupAtPickDays } from "../../lib/sessionDraft";
import {
  activeTrainingOverviewHref,
  isEditFromWorkoutTab,
  sportReviewBackRoute,
} from "../../lib/sessionFlowNav";
import {
  isAlreadyAtTabTarget,
  tabBarHomeHref,
  workoutTabTargetHref,
  TAB_BAR_HOME_HREF,
} from "../../lib/tabBarHome";
import {
  discardActionLabel,
  discardTargetFromFlow,
} from "../../lib/discardConfirmCopy";
import { useAppState } from "../../context/AppStateContext";
import { DiscardConfirmModal } from "../../components/DiscardConfirmModal";
import { SaveCreateProgressModal } from "../../components/SaveCreateProgressModal";

/** Which route groups get a tab button; bar order follows the Tabs.Screen order in _layout. */
const VISIBLE_TAB_NAMES = ["index", "workout", "library", "profiles"];

function isTabVisible(routeName: string): boolean {
  const base = String(routeName).split("/")[0];
  return VISIBLE_TAB_NAMES.includes(base);
}

/** Executing a session reads as the Workout tab, not Create. */
function isExecuteFlowScreen(routeName: string): boolean {
  return routeName === "manual/execute";
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

/**
 * Opaque header fill with the bottom edge painted on top of the fill.
 * RN-web `borderBottomWidth` leaves a transparent gap between fill and outline.
 */
export function OpaqueHeaderBackground({ style }: { style?: object }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.cardOpaque },
        style,
        { borderBottomWidth: 0, borderBottomColor: "transparent" },
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          backgroundColor: theme.border,
        }}
      />
    </View>
  );
}

export function FilteredTabBar(props: BottomTabBarProps) {
  const router = useRouter();
  const {
    generatedWorkout,
    manualExecutionStarted,
    activeSessionDraft,
    discardActiveSession,
  } = useAppState();
  const hasActiveExecution = manualExecutionStarted && generatedWorkout != null;
  const [leavePromptTarget, setLeavePromptTarget] = useState<string | null>(null);
  const { state, descriptors } = props;
  const filteredRoutes = state.routes.filter((r) => isTabVisible(String(r.name)));
  const currentRoute = state.routes[state.index];
  const currentName = String(currentRoute?.name ?? "");
  const filteredIndex = filteredRoutes.findIndex((r) => r.key === currentRoute?.key);
  /**
   * Flow screens (manual/*, sport-mode/*) are not tab routes. Executing a session belongs
   * to the Workout tab; everything else in a build flow belongs to Create.
   */
  const fallbackName = isExecuteFlowScreen(currentName) ? "workout" : "index";
  const fallbackIndex = filteredRoutes.findIndex(
    (r) => String(r.name).split("/")[0] === fallbackName
  );
  const activeIndex =
    filteredIndex >= 0 ? filteredIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
  const filteredState = {
    ...state,
    routes: filteredRoutes,
    index: activeIndex,
  };

  const shouldPromptLeaveCreate =
    activeSessionDraft != null &&
    activeSessionDraft.phase !== "train" &&
    isCreateEditingFlowScreen(currentName);

  const navigateToTarget = useCallback(
    (target: string) => {
      router.replace(target as never);
    },
    [router]
  );

  const patchedDescriptors = { ...descriptors };
  for (const route of filteredRoutes) {
    const desc = patchedDescriptors[route.key];
    if (!desc) continue;
    const home = tabBarHomeHref(String(route.name));
    /** Workout tab jumps back into a session already underway rather than its overview. */
    const target =
      home === TAB_BAR_HOME_HREF.workout
        ? workoutTabTargetHref({ hasActiveExecution })
        : home;
    const originalButton = desc.options.tabBarButton;
    patchedDescriptors[route.key] = {
      ...desc,
      options: {
        ...desc.options,
        tabBarButton: (buttonProps) => {
          const goToTab = (e?: { preventDefault?: () => void }) => {
            e?.preventDefault?.();
            if (isAlreadyAtTabTarget(currentName, target)) return;
            if (shouldPromptLeaveCreate) {
              setLeavePromptTarget(target);
              return;
            }
            navigateToTarget(target);
          };
          const nextProps = {
            ...buttonProps,
            href: target,
            onPress: goToTab,
          };
          if (originalButton) return originalButton(nextProps);
          return <PlatformPressable {...nextProps} />;
        },
      },
    };
  }

  return (
    <>
      <BottomTabBar {...props} state={filteredState} descriptors={patchedDescriptors} />
      <SaveCreateProgressModal
        visible={leavePromptTarget != null}
        onCancel={() => setLeavePromptTarget(null)}
        onSaveProgress={() => {
          const target = leavePromptTarget;
          setLeavePromptTarget(null);
          if (target) navigateToTarget(target);
        }}
        onDiscard={() => {
          const target = leavePromptTarget;
          setLeavePromptTarget(null);
          discardActiveSession();
          if (target) navigateToTarget(target);
        }}
      />
    </>
  );
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

/** Sport prep recommendation: explicit previous step (schedule or setup), not history stack. */
export function AdaptiveRecommendationBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ from?: string }>();
  const { sportPrepWeekPlan, adaptiveSetup } = useAppState();
  const fromWorkoutTab = isEditFromWorkoutTab(params);
  return (
    <Pressable
      onPress={() => {
        router.replace(
          sportReviewBackRoute({
            sportPrepWeekPlan,
            adaptiveSetup,
            fromWorkoutTab,
          }) as never
        );
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/**
 * Back from week plan: Workout overview when opened via Edit on the Workout tab;
 * otherwise filters (Create setup). Never rely on router.back().
 */
export function ManualWeekBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ from?: string }>();
  const {
    manualGoalPreferencesScope,
    activeSessionDraft,
    updateActiveSessionDraft,
  } = useAppState();
  const fromWorkoutTab = isEditFromWorkoutTab(params);
  return (
    <Pressable
      onPress={() => {
        if (fromWorkoutTab) {
          router.replace(activeTrainingOverviewHref() as never);
          return;
        }
        const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
        if (next && next !== activeSessionDraft?.weekSetup) {
          updateActiveSessionDraft({ weekSetup: next });
        }
        navigateToManualGoalPreferences(router, manualGoalPreferencesScope, { replace: true });
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from sport schedule to sport filters — reopen gym-day picking on the next forward. */
export function SportScheduleBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const { activeSessionDraft, updateActiveSessionDraft } = useAppState();
  return (
    <Pressable
      onPress={() => {
        const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
        if (next && next !== activeSessionDraft?.weekSetup) {
          updateActiveSessionDraft({ weekSetup: next });
        }
        router.replace("/sport-mode" as never);
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from goal filters to Create — explicit exit so history stack cannot bounce to week review. */
export function ManualPreferencesBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.replace("/")} style={{ paddingLeft: 16 }}>
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/** Back from Train: always the Workout-tab overview — never Create editors. */
export function ManualExecuteBackButton() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        router.replace(activeTrainingOverviewHref() as never);
      }}
      style={{ paddingLeft: 16 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.text} />
    </Pressable>
  );
}

/**
 * Back from day review: Workout overview when opened from the Workout tab or after
 * the day was promoted onto that tab; otherwise filters (first-time Create).
 */
export function EditWorkoutBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ from?: string }>();
  const { manualGoalPreferencesScope, manualWeekPlan } = useAppState();
  const fromWorkoutTab = isEditFromWorkoutTab(params);
  const hasActivePlan = (manualWeekPlan?.days.length ?? 0) > 0;
  return (
    <Pressable
      onPress={() => {
        if (fromWorkoutTab || hasActivePlan) {
          router.replace(activeTrainingOverviewHref() as never);
          return;
        }
        navigateToManualGoalPreferences(router, manualGoalPreferencesScope);
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
    fontFamily: themeFonts.displaySemi,
    fontSize: 17,
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

function useActiveDiscardTarget() {
  const { activeSessionDraft } = useAppState();
  return discardTargetFromFlow(activeSessionDraft?.flow);
}

/** Clears in-progress workout/week state and navigates to Create. */
export function RestartFlowButton({
  compact = false,
  label,
}: {
  compact?: boolean;
  label?: string;
}) {
  const theme = useTheme();
  const restart = useRestartFlow();
  const target = useActiveDiscardTarget();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const resolvedLabel = label ?? "Discard";

  return (
    <>
      <Pressable
        onPress={() => setConfirmOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={discardActionLabel(target)}
        hitSlop={8}
        style={{ paddingRight: compact ? 8 : 16, paddingLeft: compact ? 4 : 0 }}
      >
        <Text style={{ fontSize: compact ? 13 : 15, color: theme.primary, fontWeight: "600" }}>
          {resolvedLabel}
        </Text>
      </Pressable>
      <DiscardConfirmModal
        visible={confirmOpen}
        target={target}
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
  const target = useActiveDiscardTarget();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setConfirmOpen(true)}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={discardActionLabel(target)}
      >
        <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: "500", textAlign: "center" }}>
          {discardActionLabel(target)}
        </Text>
      </Pressable>
      <DiscardConfirmModal
        visible={confirmOpen}
        target={target}
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
    <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, maxWidth: 260, gap: 2 }}>
      <RestartFlowButton compact />
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
