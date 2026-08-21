import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themeFonts, useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
import { DiscardConfirmModal } from "./DiscardConfirmModal";
import {
  discardActionLabel,
  discardTargetFromFlow,
} from "../lib/discardConfirmCopy";
import {
  SESSION_BANNER_HEIGHT,
  buildContinueEditingLabel,
  buildSessionBannerDetails,
  shouldShowSessionResumeBanner,
} from "../lib/sessionDraft";

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
 * Full-width strip flush under the nav header on the Create tab when the user
 * left mid-build. Hidden on Workout / Library / Profile and while training.
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

  if (!activeSessionDraft || !shouldShowSessionResumeBanner(pathname, activeSessionDraft)) {
    return null;
  }

  const { resumeRoute } = activeSessionDraft;
  const title = buildContinueEditingLabel(activeSessionDraft);
  const details = buildSessionBannerDetails(activeSessionDraft);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.strip,
        {
          top,
          height: SESSION_BANNER_HEIGHT,
          backgroundColor: theme.cardOpaque,
          borderBottomColor: theme.primary,
        },
      ]}
    >
      <View style={styles.bannerRow}>
        <Pressable
          style={({ pressed }) => [styles.mainTap, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => router.push(resumeRoute as never)}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <Ionicons name="create-outline" size={22} color={theme.primary} style={styles.leadIcon} />
          <View style={styles.textColumn}>
            <Text style={[styles.titleLine, { color: theme.text }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.detailLine, { color: theme.textMuted }]} numberOfLines={1}>
              {details}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.primary} style={styles.chevron} />
        </Pressable>
        <Pressable
          onPress={() => setConfirmOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={discardActionLabel(discardTarget)}
          style={({ pressed }) => [styles.discardTap, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.discardLabel, { color: theme.danger }]}>Discard</Text>
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
  if (!activeSessionDraft || !shouldShowSessionResumeBanner(pathname, activeSessionDraft)) {
    return 0;
  }
  return SESSION_BANNER_HEIGHT;
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 2,
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
    paddingVertical: 10,
    gap: 10,
    minWidth: 0,
  },
  leadIcon: {
    flexShrink: 0,
  },
  discardTap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    flexShrink: 0,
  },
  discardLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  textColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleLine: {
    fontFamily: themeFonts.displaySemi,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  detailLine: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.9,
  },
});

export default ActiveSessionBanner;
