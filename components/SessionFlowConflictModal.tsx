import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";
import { SESSION_FLOW_LABELS, type SessionFlow } from "../lib/sessionDraft";

export type SessionFlowConflict = {
  currentFlow: SessionFlow;
  nextFlow: SessionFlow;
  resumeRoute: string;
  targetHref: string;
};

type Props = {
  conflict: SessionFlowConflict | null;
  onCancel: () => void;
  onContinue: () => void;
  onStartNew: () => void;
};

/** Cross-platform confirm when starting a different session flow while one is in progress. */
export function SessionFlowConflictModal({ conflict, onCancel, onContinue, onStartNew }: Props) {
  const theme = useTheme();
  if (!conflict) return null;

  const currentLabel = SESSION_FLOW_LABELS[conflict.currentFlow];
  const nextLabel = SESSION_FLOW_LABELS[conflict.nextFlow];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>Session in progress</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            You&apos;re already building {currentLabel}. Continue that or start a new {nextLabel} session?
          </Text>
          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" compact onPress={onCancel} style={{ flex: 1 }} />
            <PrimaryButton label="Continue" variant="secondary" compact onPress={onContinue} style={{ flex: 1 }} />
          </View>
          <PrimaryButton label="Start new" compact onPress={onStartNew} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 4,
  },
});
