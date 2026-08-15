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
import { useAppState } from "../../../context/AppStateContext";
import { themeRadius, useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { PillTabs } from "../../../components/PillTabs";
import { LinkPill } from "../../../components/LinkPill";
import { IconWell } from "../../../components/IconWell";
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
    defaultTrainTodayPreset,
    setDefaultTrainTodayPreset,
    activeSessionDraft,
    beginSessionFlow,
    replaceSessionFlow,
  } = useAppState();

  const initialKind: WorkoutPresetKind =
    params.kind === "sport" ? "sport" : "goal";
  const [kind, setKind] = useState<WorkoutPresetKind>(initialKind);
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
      : sportPresets.find((p) => p.id === selectedPresetId) ?? null;

  const goToScope = (scope: Scope) => {
    if (!selectedPresetId) return;

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
    if (!selectedPresetId) return;
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

  const summaries = kind === "goal" ? goalSummaries : sportSummaries;

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
        {selectedPresetId == null && (
          <>
            <Text style={[styles.headline, { color: theme.text }]}>
              Saved presets
            </Text>
            <Text style={[styles.subheadline, { color: theme.textMuted }]}>
              Goal-oriented or sport-focused setups you can reuse for a day or a week.
            </Text>
            <PillTabs
              tabs={[
                { key: "goal", label: "Goal-Oriented", icon: "barbell-outline" },
                { key: "sport", label: "Sport-Focused", icon: "sparkles-outline" },
              ]}
              value={kind}
              onChange={(next) => {
                setKind(next);
                setSelectedPresetId(null);
              }}
            />
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
                    <IconWell
                      name={kind === "goal" ? "barbell-outline" : "sparkles-outline"}
                      size={18}
                      wellSize={36}
                    />
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

        {selectedPreset != null && (
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
            {defaultTrainTodayPreset?.kind === kind &&
            defaultTrainTodayPreset.id === selectedPresetId ? (
                <Text style={[styles.defaultBadge, { color: theme.primary }]}>
                  Default for Train today
                </Text>
              ) : (
                <LinkPill
                  icon="star-outline"
                  label="Set as Train today default"
                  onPress={() =>
                    setDefaultTrainTodayPreset({ kind, id: selectedPresetId! })
                  }
                />
              )}
            <LinkPill
              icon="today-outline"
              label="One day"
              onPress={() => goToScope("day")}
            />
            <LinkPill
              icon="calendar-outline"
              label="This week"
              onPress={() => goToScope("week")}
            />
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

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  headline: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 13,
    fontWeight: "600",
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
  emptyCard: {
    borderRadius: themeRadius.card,
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
    borderRadius: themeRadius.card,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  presetRowMain: {
    flex: 1,
    gap: 4,
  },
  presetNameInput: {
    borderWidth: 1,
    borderRadius: themeRadius.control,
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
