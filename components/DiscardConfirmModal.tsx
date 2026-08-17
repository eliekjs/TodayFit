import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import {
  discardConfirmBody,
  discardConfirmTitle,
  type DiscardTarget,
} from "../lib/discardConfirmCopy";
import { PrimaryButton } from "./Button";

type DiscardConfirmModalProps = {
  visible: boolean;
  target: DiscardTarget;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirm before discarding an in-progress or saved week/session. */
export function DiscardConfirmModal({
  visible,
  target,
  onCancel,
  onConfirm,
}: DiscardConfirmModalProps) {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>{discardConfirmTitle(target)}</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>{discardConfirmBody(target)}</Text>
          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" compact onPress={onCancel} style={{ flex: 1 }} />
            <PrimaryButton label="Discard" compact onPress={onConfirm} style={{ flex: 1 }} />
          </View>
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
    borderRadius: themeRadius.modal,
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
