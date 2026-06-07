import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
import {
  SESSION_FLOW_LABELS,
  SESSION_PHASES,
  SESSION_BANNER_HEIGHT,
  shouldShowSessionResumeBanner,
  type SessionPhase,
} from "../lib/sessionDraft";
import { PrimaryButton } from "./Button";

const HEADER_BG = "rgba(15,23,42,0.8)";
const HEADER_BORDER = "rgba(148,163,184,0.2)";

function phaseIndex(phase: SessionPhase): number {
  return SESSION_PHASES.findIndex((p) => p.key === phase);
}

type FlowProgressTrackProps = {
  currentIdx: number;
  primaryColor: string;
};

function FlowProgressTrack({ currentIdx, primaryColor }: FlowProgressTrackProps) {
  return (
    <View style={styles.trackRow} accessibilityElementsHidden>
      {SESSION_PHASES.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <View
            key={step.key}
            style={[
              styles.trackSegment,
              {
                backgroundColor: isCurrent
                  ? primaryColor
                  : isPast
                    ? "rgba(45,212,191,0.42)"
                    : "rgba(148,163,184,0.16)",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

type StepLabelsProps = {
  currentIdx: number;
  primaryColor: string;
  mutedColor: string;
};

function StepLabels({ currentIdx, primaryColor, mutedColor }: StepLabelsProps) {
  return (
    <View style={styles.stepLabels}>
      {SESSION_PHASES.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            {idx > 0 ? (
              <Text style={[styles.stepSep, { color: "rgba(148,163,184,0.35)" }]}>·</Text>
            ) : null}
            <Text
              style={[
                styles.stepLabel,
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
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable
          style={[modalStyles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[modalStyles.title, { color: theme.text }]}>Discard session?</Text>
          <Text style={[modalStyles.body, { color: theme.textMuted }]}>
            This clears your current workout or week plan. Saved library items are not deleted.
          </Text>
          <View style={modalStyles.actions}>
            <PrimaryButton label="Keep working" variant="secondary" compact onPress={onCancel} style={{ flex: 1 }} />
            <PrimaryButton label="Discard" compact onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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

  if (!activeSessionDraft || !shouldShowSessionResumeBanner(pathname)) {
    return null;
  }

  const { phase, summary, resumeRoute } = activeSessionDraft;
  const currentIdx = phaseIndex(phase);
  const flowShort =
    SESSION_FLOW_LABELS[activeSessionDraft.flow].split(" · ")[1] ?? "Session";

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.strip, { top, height: SESSION_BANNER_HEIGHT }]}
      >
        <FlowProgressTrack currentIdx={currentIdx} primaryColor={theme.primary} />

        <View style={styles.contentRow}>
          <Pressable
            style={({ pressed }) => [styles.mainTap, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.push(resumeRoute as never)}
            accessibilityRole="button"
            accessibilityLabel={`Continue session, ${SESSION_PHASES[currentIdx]?.label ?? phase} phase`}
          >
            <StepLabels
              currentIdx={currentIdx}
              primaryColor={theme.primary}
              mutedColor={theme.textMuted}
            />
            <Text style={[styles.summary, { color: theme.textMuted }]} numberOfLines={1}>
              {flowShort}
              <Text style={{ color: "rgba(148,163,184,0.45)" }}> · </Text>
              <Text style={{ color: theme.text }}>{summary}</Text>
            </Text>
            <Ionicons name="chevron-forward" size={12} color={theme.primary} style={styles.chevron} />
          </Pressable>

          <Pressable
            onPress={() => setConfirmOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
            style={({ pressed }) => [styles.dismissTap, { opacity: pressed ? 0.65 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Start fresh"
          >
            <Text style={[styles.dismissText, { color: theme.textMuted }]}>Fresh</Text>
          </Pressable>
        </View>
      </View>
      <RestartConfirmModal
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          discardActiveSession();
        }}
      />
    </>
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
    backgroundColor: HEADER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HEADER_BORDER,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ pointerEvents: "auto" } as const) : null),
  },
  trackRow: {
    flexDirection: "row",
    height: 2,
    gap: 2,
    paddingHorizontal: 0,
  },
  trackSegment: {
    flex: 1,
    height: 2,
    borderRadius: 0,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: SESSION_BANNER_HEIGHT - 2,
  },
  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 6,
    gap: 8,
    minHeight: 38,
  },
  stepLabels: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  stepSep: {
    fontSize: 11,
    marginHorizontal: 3,
  },
  summary: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.85,
  },
  dismissTap: {
    justifyContent: "center",
    paddingRight: 14,
    paddingLeft: 4,
    minHeight: 38,
  },
  dismissText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

export default ActiveSessionBanner;
