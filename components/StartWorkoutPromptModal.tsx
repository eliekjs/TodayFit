import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";
import {
  START_PROMPT_DISMISS_LABEL,
  START_PROMPT_FOOTNOTE,
  startPromptBody,
  startPromptConfirmLabel,
  startPromptTitle,
} from "../lib/weekReviewCopy";
import type { WeekDayToStart } from "../lib/weekProgress";

type Props = {
  /** Null hides the modal. */
  target: WeekDayToStart | null;
  onStart: () => void;
  onDismiss: () => void;
};

/** Shown after a plan is saved: offer to train today's session straight away. */
export function StartWorkoutPromptModal({ target, onStart, onDismiss }: Props) {
  const theme = useTheme();
  if (!target) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>{startPromptTitle(target)}</Text>
          <Text style={[styles.body, { color: theme.text }]}>{startPromptBody(target)}</Text>
          <Text style={[styles.footnote, { color: theme.textMuted }]}>
            {START_PROMPT_FOOTNOTE}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton
              label={START_PROMPT_DISMISS_LABEL}
              variant="secondary"
              compact
              onPress={onDismiss}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={startPromptConfirmLabel(target)}
              compact
              onPress={onStart}
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
    backgroundColor: "rgba(0,0,0,0.55)",
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
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
