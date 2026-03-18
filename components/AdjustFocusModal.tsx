import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";

export type FocusSection = {
  title?: string;
  items: { id: string; label: string }[];
  percentages: number[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  sections: FocusSection[];
  onApply: (sections: FocusSection[]) => void;
  title?: string;
};

function clampPct(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export function AdjustFocusModal({
  visible,
  onClose,
  sections: initialSections,
  onApply,
  title = "Adjust focus areas",
}: Props) {
  const theme = useTheme();
  const [sections, setSections] = useState<FocusSection[]>(initialSections);

  useEffect(() => {
    if (visible) {
      setSections(
        initialSections.map((s) => {
          const len = s.items.length;
          const pcts = [...s.percentages];
          while (pcts.length < len) pcts.push(0);
          if (pcts.length > len) pcts.length = len;
          const sum = pcts.reduce((a, b) => a + b, 0);
          if (sum !== 100 && len > 0) {
            pcts[0] = Math.max(0, (pcts[0] ?? 0) + (100 - sum));
          }
          return { ...s, percentages: pcts };
        })
      );
    }
  }, [visible, initialSections]);

  const updatePct = (sectionIdx: number, itemIdx: number, value: number) => {
    const clamped = clampPct(value);
    setSections((prev) => {
      const next = prev.map((sec, si) => {
        if (si !== sectionIdx) return sec;
        const pcts = [...sec.percentages];
        while (pcts.length < sec.items.length) pcts.push(0);
        if (pcts.length > sec.items.length) pcts.length = sec.items.length;
        const n = pcts.length;
        if (n <= 1) {
          pcts[0] = n === 1 ? clamped : 0;
          return { ...sec, percentages: pcts };
        }
        const remaining = 100 - clamped;
        const otherIndices = [...Array(n).keys()].filter((i) => i !== itemIdx);
        const otherSum = otherIndices.reduce((s, i) => s + (pcts[i] ?? 0), 0);
        if (otherSum <= 0) {
          const each = Math.round(remaining / otherIndices.length);
          otherIndices.forEach((i, idx) => {
            pcts[i] = idx === 0 ? remaining - each * (otherIndices.length - 1) : each;
          });
        } else {
          const newOthers = otherIndices.map((i) =>
            Math.round((remaining * (pcts[i] ?? 0)) / otherSum)
          );
          const diff = remaining - newOthers.reduce((a, b) => a + b, 0);
          if (diff !== 0 && newOthers.length > 0) {
            newOthers[0] = Math.max(0, newOthers[0] + diff);
          }
          otherIndices.forEach((i, idx) => {
            pcts[i] = newOthers[idx];
          });
        }
        pcts[itemIdx] = clamped;
        return { ...sec, percentages: pcts };
      });
      return next;
    });
  };

  const normalizeSection = (sectionIdx: number) => {
    setSections((prev) => {
      const sec = prev[sectionIdx];
      if (!sec || sec.items.length === 0) return prev;
      const sum = sec.percentages.reduce((a, b) => a + b, 0);
      if (sum <= 0) return prev;
      const normalized = sec.percentages.map((p) =>
        Math.round((p / sum) * 100)
      );
      const diff = 100 - normalized.reduce((a, b) => a + b, 0);
      const next = [...prev];
      next[sectionIdx] = {
        ...sec,
        percentages:
          diff !== 0 && normalized.length > 0
            ? normalized.map((p, i) => (i === 0 ? p + diff : p))
            : normalized,
      };
      return next;
    });
  };

  const isValid = sections.every((sec) => {
    const sum = sec.percentages.reduce((a, b) => a + b, 0);
    return sum === 100;
  });

  const handleApply = () => {
    if (!isValid) return;
    onApply(sections);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.content, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Set percentages for each focus. They must add up to 100%.
          </Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {sections.map((section, sectionIdx) => (
              <View key={sectionIdx} style={styles.section}>
                {section.title ? (
                  <Text
                    style={[styles.sectionTitle, { color: theme.text }]}
                  >
                    {section.title}
                  </Text>
                ) : null}
                {section.items.map((item, itemIdx) => (
                  <View
                    key={item.id}
                    style={[styles.row, { borderBottomColor: theme.border }]}
                  >
                    <Text
                      style={[styles.label, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                        value={String(section.percentages[itemIdx] ?? 0)}
                        onChangeText={(t) => {
                          const n = parseInt(t.replace(/\D/g, ""), 10);
                          updatePct(sectionIdx, itemIdx, isNaN(n) ? 0 : n);
                        }}
                        keyboardType={Platform.OS === "web" ? "numeric" : "number-pad"}
                        maxLength={3}
                        selectTextOnFocus
                      />
                      <Text style={[styles.pctSuffix, { color: theme.textMuted }]}>
                        %
                      </Text>
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={() => normalizeSection(sectionIdx)}
                  style={({ pressed }) => ({
                    marginTop: 8,
                    paddingVertical: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={[styles.normalizeLink, { color: theme.primary }]}>
                    Auto-balance to 100%
                  </Text>
                </Pressable>
                <Text style={[styles.sumText, { color: theme.textMuted }]}>
                  Sum:{" "}
                  {section.percentages.reduce((a, b) => a + b, 0)}%
                  {section.percentages.reduce((a, b) => a + b, 0) === 100
                    ? " ✓"
                    : ""}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label="Apply"
              onPress={handleApply}
              disabled={!isValid}
              style={styles.applyBtn}
            />
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              onPress={onClose}
              style={styles.cancelBtn}
            />
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
    maxHeight: "80%",
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
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  label: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    width: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    textAlign: "right",
  },
  pctSuffix: {
    marginLeft: 4,
    fontSize: 14,
  },
  normalizeLink: {
    fontSize: 13,
  },
  sumText: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    marginTop: 8,
    gap: 8,
  },
  applyBtn: {},
  cancelBtn: {},
});
