import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";
import {
  DayFocusOverrideChips,
  type DayFocusOverrideChipsProps,
} from "./DayFocusOverrideChips";

type Props = Omit<DayFocusOverrideChipsProps, "alwaysExpanded" | "expandSignal" | "showChips"> & {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export function ChangeDayFocusModal({
  visible,
  onClose,
  title = "Change focus",
  subtitle = "Adjust this session's focus, then regenerate.",
  onRegenerate,
  ...chipsProps
}: Props) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.content, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <DayFocusOverrideChips
              {...chipsProps}
              alwaysExpanded
              showChips
              onRegenerate={() => {
                onRegenerate();
                onClose();
              }}
            />
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label="Close" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  footer: {
    marginTop: 8,
  },
});
