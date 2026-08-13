import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AUTH_COPY } from "../lib/authCopy";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

type Props = {
  visible: boolean;
  email: string | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Cross-platform delete-account checkpoint (Alert is unreliable on web).
 * Simple confirm — the copy states the action is permanent.
 */
export function DeleteAccountConfirmModal({
  visible,
  email,
  busy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const theme = useTheme();

  const handleCancel = () => {
    if (busy) return;
    onCancel();
  };

  const handleConfirm = () => {
    if (busy) return;
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            Are you sure you want to delete your account?
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {AUTH_COPY.deleteAccountBody(email)}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              compact
              onPress={handleCancel}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={handleConfirm}
              disabled={busy}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  opacity: busy ? 0.45 : pressed ? 0.85 : 1,
                  backgroundColor: "#9b2c2c",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete account"
              accessibilityState={{ disabled: busy }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteLabel}>Delete forever</Text>
              )}
            </Pressable>
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
  error: {
    fontSize: 13,
    color: "#9b2c2c",
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  deleteLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
