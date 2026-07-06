import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
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

type PhaseStepRowProps = {
  currentIdx: number;
  primaryColor: string;
  mutedColor: string;
};

function PhaseStepRow({ currentIdx, primaryColor, mutedColor }: PhaseStepRowProps) {
  return (
    <View style={styles.phaseRow}>
      {SESSION_PHASES.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            {idx > 0 ? (
              <Text style={[styles.phaseArrow, { color: "rgba(148,163,184,0.4)" }]}>→</Text>
            ) : null}
            <Text
              style={[
                styles.phaseLabel,
                isCurrent && { color: primaryColor, fontWeight: "600" },
                isPast && !isCurrent && { color: "rgba(45,212,191,0.55)" },
                !isPast && !isCurrent && { color: mutedColor },
              ]}
            >
              {step.label}
            </Text>
          </React.Fragment>
        );
      })}
    </View>
  );
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
  const { activeSessionDraft } = useAppState();

  const top = topOffset ?? navHeaderBottom;

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
          backgroundColor: theme.cardOpaque,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.mainTap, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => router.push(resumeRoute as never)}
        accessibilityRole="button"
        accessibilityLabel={`Continue in progress workout, ${details}, ${currentPhaseLabel} phase`}
      >
        <View style={styles.textColumn}>
          <Text style={[styles.titleLine, { color: theme.text }]} numberOfLines={1}>
            <Text style={{ color: theme.textMuted }}>In progress workout: </Text>
            {details}
          </Text>
          <PhaseStepRow
            currentIdx={currentIdx}
            primaryColor={theme.primary}
            mutedColor={theme.textMuted}
          />
        </View>
        <Ionicons name="chevron-forward" size={14} color={theme.primary} style={styles.chevron} />
      </Pressable>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ pointerEvents: "auto" } as const) : null),
  },
  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  textColumn: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleLine: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  phaseLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  phaseArrow: {
    fontSize: 11,
    marginHorizontal: 4,
    lineHeight: 14,
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.85,
  },
});

export default ActiveSessionBanner;
