import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

type Props = {
  visible: boolean;
  onCancel: () => void;
  /** Keep the in-progress create draft and leave the editing flow. */
  onSaveProgress: () => void;
  /** Discard the create draft and leave. */
  onDiscard: () => void;
};

/** Prompt when leaving create-flow editing before the plan is finished. */
export function SaveCreateProgressModal({
  visible,
  onCancel,
  onSaveProgress,
  onDiscard,
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
          <Text style={[styles.title, { color: theme.text }]}>Save your progress?</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Do you want to save progress on this workout being created? You can continue editing
            from the Create tab later.
          </Text>
          <PrimaryButton label="Save progress" compact onPress={onSaveProgress} />
          <View style={styles.row}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              compact
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Don't save"
              variant="secondary"
              compact
              onPress={onDiscard}
              style={{ flex: 1 }}
            />
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
});
