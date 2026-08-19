import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
import { DiscardConfirmModal } from "./DiscardConfirmModal";
import {
  discardActionLabel,
  discardTargetFromFlow,
} from "../lib/discardConfirmCopy";
import {
  SESSION_PHASES,
  SESSION_BANNER_HEIGHT,
  buildSessionBannerDetails,
  shouldShowSessionResumeBanner,
  type SessionPhase,
} from "../lib/sessionDraft";

function phaseIndex(phase: SessionPhase): number {
  return SESSION_PHASES.findIndex((p) => p.key === phase);
}

const NAV_BAR_HEIGHT = Platform.select({ ios: 44, android: 56, web: 52, default: 44 }) ?? 44;

/** Header bottom Y when mounted outside a screen (e.g. tabs layout). */
function useNavHeaderBottomOffset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + NAV_BAR_HEIGHT;
}

type ActiveSessionBannerProps = {
  /** Override distance from top of screen (below status bar + nav bar). */
  topOffset?: number;
};

/**
 * Full-width strip flush under the nav header when the user leaves an in-progress session.
 * Hidden while they are on flow screens (preferences, week, sport setup, etc.).
 */
export function ActiveSessionBanner({ topOffset }: ActiveSessionBannerProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const navHeaderBottom = useNavHeaderBottomOffset();
  const { activeSessionDraft, discardActiveSession } = useAppState();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const top = topOffset ?? navHeaderBottom;
  const discardTarget = discardTargetFromFlow(activeSessionDraft?.flow);

  const onDiscard = useCallback(() => {
    setConfirmOpen(false);
    discardActiveSession();
    router.replace("/");
  }, [discardActiveSession, router]);

  if (!activeSessionDraft || !shouldShowSessionResumeBanner(pathname)) {
    return null;
  }

  const { phase, resumeRoute } = activeSessionDraft;
  const currentIdx = phaseIndex(phase);
  const details = buildSessionBannerDetails(activeSessionDraft);
  const currentPhaseLabel = SESSION_PHASES[currentIdx]?.label ?? phase;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.strip,
        {
          top,
          height: SESSION_BANNER_HEIGHT,
          backgroundColor: theme.secondary,
          borderBottomColor: theme.primary,
        },
      ]}
    >
      <View style={styles.bannerRow}>
        <Pressable
          style={({ pressed }) => [styles.mainTap, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => router.push(resumeRoute as never)}
          accessibilityRole="button"
          accessibilityLabel={`Continue workout building, ${details}, ${currentPhaseLabel} phase`}
        >
          <Ionicons name="play-circle" size={22} color={theme.primary} style={styles.leadIcon} />
          <View style={styles.textColumn}>
            <Text style={[styles.titleLine, { color: theme.primary }]} numberOfLines={1}>
              Continue workout building
            </Text>
            <Text style={[styles.detailLine, { color: theme.text }]} numberOfLines={1}>
              {details}
              <Text style={{ color: theme.textMuted }}>{`  ·  ${currentPhaseLabel}`}</Text>
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} style={styles.chevron} />
        </Pressable>
        <Pressable
          onPress={() => setConfirmOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={discardActionLabel(discardTarget)}
          style={({ pressed }) => [styles.discardTap, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.discardLabel, { color: theme.primary }]}>Discard</Text>
        </Pressable>
      </View>
      <DiscardConfirmModal
        visible={confirmOpen}
        target={discardTarget}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onDiscard}
      />
    </View>
  );
}

/** @deprecated Use ActiveSessionBanner — kept as no-op for any stale imports. */
export function ActiveSessionCard() {
  return null;
}

export function useSessionBannerInset(): number {
  const pathname = usePathname();
  const { activeSessionDraft } = useAppState();
  if (!activeSessionDraft || !shouldShowSessionResumeBanner(pathname)) return 0;
  return SESSION_BANNER_HEIGHT;
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ pointerEvents: "auto" } as const) : null),
  },
  bannerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingVertical: 8,
    gap: 10,
    minWidth: 0,
  },
  leadIcon: {
    flexShrink: 0,
  },
  discardTap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    flexShrink: 0,
  },
  discardLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  textColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleLine: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  detailLine: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.85,
  },
});

export default ActiveSessionBanner;
