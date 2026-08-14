/**
 * Confirm dialog when a body-focus mode switch or day body pick would override existing choices.
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Optional extra action (e.g. drop conflicting sub-goals while keeping the new body pick). */
  secondaryConfirmLabel?: string;
  onSecondaryConfirm?: () => void;
};

export function BodyFocusOverrideModal({
  visible,
  title,
  message,
  confirmLabel = "Override",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
  secondaryConfirmLabel,
  onSecondaryConfirm,
}: Props) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>{message}</Text>
          <View style={styles.actions}>
            <PrimaryButton
              label={cancelLabel}
              variant="secondary"
              compact
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={confirmLabel}
              compact
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
          {secondaryConfirmLabel && onSecondaryConfirm ? (
            <PrimaryButton
              label={secondaryConfirmLabel}
              variant="secondary"
              compact
              onPress={onSecondaryConfirm}
            />
          ) : null}
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
