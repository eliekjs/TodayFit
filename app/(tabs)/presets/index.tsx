import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import {
  SessionFlowConflictModal,
  type SessionFlowConflict,
} from "../../../components/SessionFlowConflictModal";
import { navigateToSessionFlow } from "../../../lib/sessionFlowNavigation";
import { setupRouteForFlow } from "../../../lib/sessionFlowNav";
import type { SportPreset, WorkoutPresetKind } from "../../../lib/sessionDraft";
import {
  validateSportFormForScope,
  type SportFormScopeIssue,
} from "../../../lib/sportModeOneDayValidation";
import type { PreferencePreset } from "../../../lib/types";

type Scope = "day" | "week";

type PresetSummary = {
  id: string;
  name: string;
  savedAt: string;
  detail: string;
};

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function goalPresetSummary(preset: PreferencePreset): PresetSummary {
  const goals = preset.preferences.primaryFocus;
  const detail =
    goals.length === 0
      ? "No goals set"
      : goals.length === 1
        ? goals[0]!
        : `${goals[0]} +${goals.length - 1} more`;
  return { id: preset.id, name: preset.name, savedAt: preset.savedAt, detail };
}

function sportPresetSummary(preset: SportPreset): PresetSummary {
  const sports = preset.sportForm.rankedSportSlugs.filter((s): s is string => s != null);
  const goals = preset.sportForm.rankedGoals.filter((g): g is string => g != null);
  const parts: string[] = [];
  if (sports.length > 0) parts.push(sports.join(" + "));
  if (goals.length > 0) parts.push(`${goals.length} goal${goals.length > 1 ? "s" : ""}`);
  return {
    id: preset.id,
    name: preset.name,
    savedAt: preset.savedAt,
    detail: parts.length > 0 ? parts.join(" · ") : "No sports set",
  };
}

export default function SavedPresetsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ kind?: string }>();
  const {
    preferencePresets,
    sportPresets,
    removePreferencePreset,
    removeSportPreset,
    updatePreferencePreset,
    updateSportPreset,
    applyPreferencePreset,
    applySportPreset,
    activeSessionDraft,
    beginSessionFlow,
    replaceSessionFlow,
  } = useAppState();

  const initialKind: WorkoutPresetKind | null =
    params.kind === "goal" || params.kind === "sport" ? params.kind : null;
  const [kind, setKind] = useState<WorkoutPresetKind | null>(initialKind);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<{
    scope: Scope;
    issues: SportFormScopeIssue[];
  } | null>(null);
  const [flowConflict, setFlowConflict] = useState<SessionFlowConflict | null>(null);
  const pendingPresetApplyRef = useRef<(() => void) | null>(null);

  const goalSummaries = useMemo(() => preferencePresets.map(goalPresetSummary), [preferencePresets]);
  const sportSummaries = useMemo(() => sportPresets.map(sportPresetSummary), [sportPresets]);

  const selectedPreset =
    kind === "goal"
      ? preferencePresets.find((p) => p.id === selectedPresetId) ?? null
      : kind === "sport"
        ? sportPresets.find((p) => p.id === selectedPresetId) ?? null
        : null;

  const goToScope = (scope: Scope) => {
    if (!kind || !selectedPresetId) return;

    if (kind === "sport") {
      const preset = sportPresets.find((p) => p.id === selectedPresetId);
      if (!preset) return;
      const issues = validateSportFormForScope(preset.sportForm, scope);
      if (issues.length > 0) {
        setBlockingIssues({ scope, issues });
        return;
      }
    }

    proceedWithPreset(scope);
  };

  const proceedWithPreset = (scope: Scope) => {
    if (!kind || !selectedPresetId) return;
    const flow =
      kind === "goal"
        ? scope === "week"
          ? "goal_week"
          : "goal_day"
        : scope === "week"
          ? "sport_week"
          : "sport_day";
    const href = setupRouteForFlow(flow);
    const applyPreset = () => {
      if (kind === "goal") {
        applyPreferencePreset(selectedPresetId);
      } else {
        applySportPreset(selectedPresetId);
      }
    };
    navigateToSessionFlow(
      router,
      flow,
      href,
      beginSessionFlow,
      replaceSessionFlow,
      activeSessionDraft,
      applyPreset,
      (conflict) => {
        pendingPresetApplyRef.current = applyPreset;
        setFlowConflict(conflict);
      }
    );
    setBlockingIssues(null);
  };

  const onRenamePreset = (id: string, name: string, fallback: string) => {
    const trimmed = name.trim() || fallback;
    if (kind === "goal") {
      updatePreferencePreset(id, { name: trimmed });
    } else if (kind === "sport") {
      updateSportPreset(id, { name: trimmed });
    }
  };

  const onDeletePreset = (id: string, name: string) => {
    Alert.alert("Delete preset?", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (kind === "goal") removePreferencePreset(id);
          else if (kind === "sport") removeSportPreset(id);
          if (selectedPresetId === id) setSelectedPresetId(null);
        },
      },
    ]);
  };

  const summaries = kind === "goal" ? goalSummaries : kind === "sport" ? sportSummaries : [];

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <SessionFlowConflictModal
        conflict={flowConflict}
        onCancel={() => {
          setFlowConflict(null);
          pendingPresetApplyRef.current = null;
        }}
        onContinue={() => {
          if (!flowConflict) return;
          const resume = flowConflict.resumeRoute;
          setFlowConflict(null);
          pendingPresetApplyRef.current = null;
          router.push(resume as never);
        }}
        onStartNew={() => {
          if (!flowConflict) return;
          const { nextFlow, targetHref } = flowConflict;
          setFlowConflict(null);
          replaceSessionFlow(nextFlow);
          pendingPresetApplyRef.current?.();
          pendingPresetApplyRef.current = null;
          router.push(targetHref as never);
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {kind == null && (
          <>
            <Text style={[styles.headline, { color: theme.text }]}>
              Choose a saved preset
            </Text>
            <Text style={[styles.subheadline, { color: theme.textMuted }]}>
              Pick goal-oriented or sport-focused presets, then a preset, then day or week.
            </Text>
            <KindCard
              icon="barbell-outline"
              title="Goal-Oriented Presets"
              subtitle="Saved filter sets for strength, physique, and other goals."
              count={goalSummaries.length}
              theme={theme}
              onPress={() => setKind("goal")}
            />
            <KindCard
              icon="sparkles-outline"
              title="Sport-Focused Presets"
              subtitle="Saved sport, goal, and intensity setups."
              count={sportSummaries.length}
              theme={theme}
              onPress={() => setKind("sport")}
            />
          </>
        )}

        {kind != null && selectedPresetId == null && (
          <>
            <Pressable onPress={() => setKind(null)} style={styles.backLinkWrap}>
              <Ionicons name="chevron-back" size={16} color={theme.primary} />
              <Text style={[styles.backLinkText, { color: theme.primary }]}>
                Goal vs sport
              </Text>
            </Pressable>
            <Text style={[styles.headline, { color: theme.text }]}>
              {kind === "goal" ? "Goal-oriented presets" : "Sport-focused presets"}
            </Text>
            {summaries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {kind === "goal"
                    ? "No goal presets saved yet. Save one from Build workout (Goal-Oriented Training) using the \"Save preset\" link at the bottom."
                    : "No sport presets saved yet. Save one from Sport-Focused Training using the \"Save preset\" link at the bottom."}
                </Text>
                <PrimaryButton
                  label={kind === "goal" ? "Go build a workout" : "Go set up sport training"}
                  variant="secondary"
                  onPress={() => router.push(kind === "goal" ? "/manual/preferences" : "/sport-mode")}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <View style={styles.presetList}>
                {summaries.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.presetRow,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.presetRowMain}>
                      <TextInput
                        value={s.name}
                        onChangeText={(name) => onRenamePreset(s.id, name, s.name)}
                        placeholder="Preset name"
                        placeholderTextColor={theme.textMuted}
                        style={[
                          styles.presetNameInput,
                          { borderColor: theme.border, color: theme.text },
                        ]}
                      />
                      <Text style={[styles.presetDetail, { color: theme.textMuted }]}>
                        {s.detail}
                        {s.savedAt ? ` · Saved ${formatSavedAt(s.savedAt)}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={10}
                      onPress={() => onDeletePreset(s.id, s.name)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                    </Pressable>
                    <Pressable hitSlop={10} onPress={() => setSelectedPresetId(s.id)}>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {kind != null && selectedPreset != null && (
          <>
            <Pressable onPress={() => setSelectedPresetId(null)} style={styles.backLinkWrap}>
              <Ionicons name="chevron-back" size={16} color={theme.primary} />
              <Text style={[styles.backLinkText, { color: theme.primary }]}>
                Choose a different preset
              </Text>
            </Pressable>
            <Text style={[styles.headline, { color: theme.text }]}>{selectedPreset.name}</Text>
            <Text style={[styles.subheadline, { color: theme.textMuted }]}>
              Use this preset for a single day, or for a full week plan.
            </Text>
            <View style={styles.scopeButtons}>
              <Pressable
                style={({ pressed }) => [styles.scopeButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => goToScope("day")}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primarySolid]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scopeButton}
                >
                  <Text style={styles.scopeButtonText}>One day</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.scopeButtonWrap, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => goToScope("week")}
              >
                <View style={[styles.scopeButton, styles.scopeButtonSecondary, { borderColor: theme.border }]}>
                  <Text style={[styles.scopeButtonText, { color: theme.text }]}>This week</Text>
                </View>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={blockingIssues != null}
        animationType="fade"
        onRequestClose={() => setBlockingIssues(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setBlockingIssues(null)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              This preset needs adjusting for one day
            </Text>
            {blockingIssues?.issues.map((issue) => (
              <Text key={issue.id} style={[styles.modalIssueText, { color: theme.textMuted }]}>
                • {issue.message}
              </Text>
            ))}
            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Use as a week plan instead"
                variant="secondary"
                onPress={() => proceedWithPreset("week")}
                style={styles.modalFooterBtn}
              />
              <PrimaryButton
                label="Take me there to fix it"
                onPress={() => proceedWithPreset("day")}
                style={styles.modalFooterBtn}
              />
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => setBlockingIssues(null)}
                style={styles.modalFooterBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenWrapper>
  );
}

function KindCard({
  icon,
  title,
  subtitle,
  count,
  theme,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  count: number;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.kindCard,
        { backgroundColor: theme.card, borderColor: theme.primarySoft, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.kindCardIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <Text style={[styles.kindCardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.kindCardSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      <Text style={[styles.kindCardCount, { color: theme.primary }]}>
        {count} saved preset{count === 1 ? "" : "s"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 4,
  },
  backLinkWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: -4,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  kindCard: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
  },
  kindCardIcon: {
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  kindCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  kindCardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.9,
  },
  kindCardCount: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  presetList: {
    gap: 10,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  presetRowMain: {
    flex: 1,
    gap: 4,
  },
  presetNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "600",
  },
  presetDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  scopeButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    justifyContent: "center",
  },
  scopeButtonWrap: {
    flex: 1,
  },
  scopeButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeButtonSecondary: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
  },
  scopeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fffdf8",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalIssueText: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalFooter: {
    gap: 10,
    marginTop: 8,
  },
  modalFooterBtn: {},
});
