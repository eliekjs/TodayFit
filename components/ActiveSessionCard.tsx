import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";
import {
  SESSION_FLOW_LABELS,
  SESSION_PHASES,
  isSessionResumeCardScreen,
  type SessionPhase,
} from "../lib/sessionDraft";
import { PrimaryButton } from "./Button";

function phaseIndex(phase: SessionPhase): number {
  return SESSION_PHASES.findIndex((p) => p.key === phase);
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
            This clears your current workout or week plan. Saved library items are not deleted. Your last
            filter choices for each mode are kept for next time.
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

/** Resume card with phase stepper — shown on tab roots when a session is in progress. */
export function ActiveSessionCard() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { activeSessionDraft, discardActiveSession } = useAppState();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!activeSessionDraft || !isSessionResumeCardScreen(pathname)) {
    return null;
  }

  const { flow, phase, summary, resumeRoute } = activeSessionDraft;
  const currentIdx = phaseIndex(phase);
  const flowLabel = SESSION_FLOW_LABELS[flow];

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: "rgba(15,23,42,0.72)",
            borderColor: "rgba(45,212,191,0.32)",
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.mainRow, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push(resumeRoute as never)}
          accessibilityRole="button"
          accessibilityLabel={`Continue ${flowLabel}, ${SESSION_PHASES[currentIdx]?.label ?? phase} phase`}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.flowLabel, { color: theme.textMuted }]}>{flowLabel}</Text>
            <View style={styles.continueHint}>
              <Text style={[styles.continueText, { color: theme.primary }]}>Continue</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </View>
          </View>
          <Text style={[styles.summary, { color: theme.text }]} numberOfLines={2}>
            {summary}
          </Text>
        </Pressable>

        <View style={styles.stepperRow}>
          {SESSION_PHASES.map((step, idx) => {
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <View key={step.key} style={styles.stepWrap}>
                <View style={styles.stepTrack}>
                  {idx > 0 ? (
                    <View
                      style={[
                        styles.connector,
                        {
                          backgroundColor: isPast || isCurrent ? theme.primary : theme.border,
                        },
                      ]}
                    />
                  ) : null}
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isCurrent
                          ? theme.primary
                          : isPast
                            ? "rgba(45,212,191,0.45)"
                            : theme.border,
                        borderColor: isCurrent ? theme.primary : "transparent",
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isCurrent ? theme.primary : theme.textMuted,
                      fontWeight: isCurrent ? "600" : "500",
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => setConfirmOpen(true)}
          style={({ pressed }) => [styles.discardRow, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Start fresh and discard session"
        >
          <Text style={[styles.discardText, { color: theme.textMuted }]}>Start fresh</Text>
        </Pressable>
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 4,
    overflow: "hidden",
  },
  mainRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  flowLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  continueHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  continueText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summary: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  stepperRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
  },
  stepWrap: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepTrack: {
    width: "100%",
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    position: "absolute",
    left: "-50%",
    right: "50%",
    height: 2,
    top: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  discardRow: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
  },
  discardText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default ActiveSessionCard;
