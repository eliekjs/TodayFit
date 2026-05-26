import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

type Props = {
  visible: boolean;
  exerciseName: string;
  setupText: string | null;
  onClose: () => void;
};

export function ExerciseSetupModal({
  visible,
  exerciseName,
  setupText,
  onClose,
}: Props) {
  const theme = useTheme();
  const text = setupText?.trim();

  if (!visible || !text) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Setup</Text>
          <Text style={[styles.title, { color: theme.text }]}>{exerciseName}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.body, { color: theme.text }]}>{text}</Text>
          </ScrollView>
          <PrimaryButton
            label="Close"
            variant="secondary"
            compact
            onPress={onClose}
            style={styles.closeButton}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#061026",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "82%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 320,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  closeButton: {
    marginTop: 18,
  },
});
