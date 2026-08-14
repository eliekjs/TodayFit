import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import type { SavedPlanKind } from "../lib/saveNamedPlan";
import { PrimaryButton } from "./Button";

type Props = {
  visible: boolean;
  kind: SavedPlanKind;
  defaultName: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
};

export function SaveNamedPlanModal({
  visible,
  kind,
  defaultName,
  busy,
  onCancel,
  onSave,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (visible) setName(defaultName);
  }, [visible, defaultName]);

  const title = kind === "day" ? "Save this day" : "Save this week";
  const subtitle =
    kind === "day"
      ? "Name this session so you can redo it from Library."
      : "Name this week so you can redo it from Library.";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoid}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.cardOpaque, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>{subtitle}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={defaultName}
              placeholderTextColor={theme.textMuted}
              autoFocus
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!busy) onSave(name);
              }}
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.sectionSurface,
                },
              ]}
            />
            <View style={styles.actions}>
              <PrimaryButton
                label="Cancel"
                variant="secondary"
                compact
                onPress={onCancel}
                disabled={busy}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={busy ? "Saving…" : "Save"}
                compact
                onPress={() => onSave(name)}
                disabled={busy}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
  avoid: {
    width: "100%",
    maxWidth: 360,
  },
  sheet: {
    width: "100%",
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
  input: {
    borderWidth: 1,
    borderRadius: themeRadius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
