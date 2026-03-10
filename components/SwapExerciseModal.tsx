import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../lib/theme";
import { PrimaryButton } from "./Button";
import { searchExercises } from "../lib/exerciseSearch";

export type SwapOption = { id: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  /** Up to 3 suggested alternatives (e.g. progressions + regressions). */
  suggested: SwapOption[];
  loading?: boolean;
  onChoose: (id: string, name: string) => void;
};

export function SwapExerciseModal({
  visible,
  onClose,
  exerciseId,
  exerciseName,
  suggested,
  loading = false,
  onChoose,
}: Props) {
  const theme = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const raw = searchExercises(searchQuery);
    return raw.filter((e) => e.id !== exerciseId);
  }, [searchQuery, exerciseId]);

  const suggestionsFiltered = useMemo(
    () => suggested.filter((s) => s.id !== exerciseId).slice(0, 3),
    [suggested, exerciseId]
  );

  const handleChoose = (id: string, name: string) => {
    onChoose(id, name);
    setShowSearch(false);
    setSearchQuery("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery("");
        } else onClose();
      }}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => (showSearch ? setShowSearch(false) : onClose())}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {showSearch ? (
            <>
              <View style={styles.searchHeader}>
                <Pressable
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: theme.text, flex: 1 }]}>
                  Search exercise
                </Text>
              </View>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
                placeholder="Type exercise name…"
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {searchResults.length === 0 && searchQuery.trim() ? (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    No exercises match "{searchQuery}"
                  </Text>
                ) : (
                  searchResults.map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[styles.optionRow, { borderColor: theme.border }]}
                      onPress={() => handleChoose(opt.id, opt.name)}
                    >
                      <Text style={[styles.optionName, { color: theme.text }]}>{opt.name}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Swap: {exerciseName}
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 24 }} />
              ) : (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {suggestionsFiltered.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                        Suggested
                      </Text>
                      {suggestionsFiltered.map((opt) => (
                        <Pressable
                          key={opt.id}
                          style={[styles.optionRow, { borderColor: theme.border }]}
                          onPress={() => handleChoose(opt.id, opt.name)}
                        >
                          <Text style={[styles.optionName, { color: theme.text }]}>{opt.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Pressable
                    style={[styles.searchCta, { borderColor: theme.primary }]}
                    onPress={() => setShowSearch(true)}
                  >
                    <Text style={[styles.searchCtaText, { color: theme.primary }]}>
                      Search for an exercise
                    </Text>
                  </Pressable>
                  {suggestionsFiltered.length === 0 && (
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      No suggestions. Use search to pick another exercise.
                    </Text>
                  )}
                </ScrollView>
              )}
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={onClose}
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 320,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 15,
    fontWeight: "500",
  },
  searchCta: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  searchCtaText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
});
