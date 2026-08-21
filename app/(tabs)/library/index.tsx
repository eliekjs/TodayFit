import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { themeFonts, themeRadius, useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { DiscardConfirmModal } from "../../../components/DiscardConfirmModal";
import { SaveNamedPlanModal } from "../../../components/SaveNamedPlanModal";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { WorkoutLibraryTitle } from "../../../components/WorkoutLibraryTitle";
import { PillTabs } from "../../../components/PillTabs";
import { SectionLabel } from "../../../components/SectionLabel";
import { getDesignatedWeekStartMonday } from "../../../lib/dateUtils";
import type { DiscardTarget } from "../../../lib/discardConfirmCopy";
import { workoutLibraryDedupKey } from "../../../lib/workoutLibraryLabel";
import {
  cloneWorkoutForRedo,
  completedSessionsToSavedWeek,
  savedWeekToManualWeekPlan,
  savedWeekToSportPrepWeekPlan,
} from "../../../lib/savedWeekUtils";
import {
  defaultSavedWeekName,
  isSavedDayPlan,
  isSavedWeekTheActivePlan,
  savedPlanDaysFromSportPrep,
  savedPlanLibraryTitle,
  savedPlanSourceLabel,
} from "../../../lib/saveNamedPlan";
import {
  groupCompletedHistoryByWeek,
  historyWeekCanRedo,
  sortBySavedAtNewestFirst,
} from "../../../lib/libraryCollections";
import { ACTIVE_WEEK_ROUTE } from "../../../lib/weekProgress";
import { useNamedPlanSave } from "../../../lib/useNamedPlanSave";
import type { SavedWeek } from "../../../lib/types";
import { summarizeWorkoutLog } from "../../../lib/workoutCompletionLog";

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    workoutHistory,
    savedWorkouts,
    savedWeeks,
    setGeneratedWorkout,
    setResumeProgress,
    setManualExecutionStarted,
    removeSavedWorkout,
    removeSavedWeek,
    manualWeekPlan,
    sportPrepWeekPlan,
    setManualWeekPlan,
    setSportPrepWeekPlan,
    setAdaptiveSetup,
    reloadSavedWeeks,
  } = useAppState();
  const {
    dialog: saveDialog,
    busy: saveBusy,
    requestSaveWeek,
    confirmSave,
    cancelSave,
  } = useNamedPlanSave();

  useFocusEffect(
    useCallback(() => {
      reloadSavedWeeks();
    }, [reloadSavedWeeks])
  );

  const designatedWeekStart = getDesignatedWeekStartMonday();
  const manualStale =
    manualWeekPlan != null && manualWeekPlan.weekStartDate < designatedWeekStart;
  const sportPrepStale =
    sportPrepWeekPlan != null && sportPrepWeekPlan.weekStartDate < designatedWeekStart;
  const hasStaleInProgress = manualStale || sportPrepStale;

  const onResumeSaved = (saved: (typeof savedWorkouts)[0]) => {
    setGeneratedWorkout(saved.workout);
    setResumeProgress(saved.progress ?? null);
    setManualExecutionStarted(true);
    router.push("/manual/execute");
  };

  const onStartSavedWeek = (week: SavedWeek) => {
    const alreadyActive = isSavedWeekTheActivePlan(week, {
      manualWeekPlan,
      sportPrepWeekPlan,
    });
    if (alreadyActive) {
      router.push(ACTIVE_WEEK_ROUTE as never);
      return;
    }
    if (week.source === "manual") {
      setSportPrepWeekPlan(null);
      setManualWeekPlan(savedWeekToManualWeekPlan(week));
    } else {
      setManualWeekPlan(null);
      setSportPrepWeekPlan(savedWeekToSportPrepWeekPlan(week));
    }
    router.push(ACTIVE_WEEK_ROUTE as never);
  };

  const onStartSavedDay = (dayPlan: SavedWeek) => {
    const day = dayPlan.days[0];
    if (!day) return;
    setGeneratedWorkout(cloneWorkoutForRedo(day.workout));
    setResumeProgress(null);
    setManualExecutionStarted(true);
    router.push("/manual/execute");
  };

  const onRedoHistoryWeek = (weekStartDate: string, weekItems: typeof workoutHistory) => {
    const week = completedSessionsToSavedWeek(weekStartDate, weekItems);
    if (!week) return;
    onStartSavedWeek(week);
  };

  const items = [...workoutHistory].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
  const getItemKey = (item: (typeof items)[0]) =>
    workoutLibraryDedupKey(item.date, item.focus);
  const keyToIndices = items.reduce<Record<string, number[]>>((acc, item, i) => {
    const key = getItemKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {});
  const getDuplicateSuffix = (item: (typeof items)[0], index: number) => {
    const key = getItemKey(item);
    const indices = keyToIndices[key] ?? [index];
    if (indices.length <= 1) return undefined;
    const which = indices.indexOf(index) + 1;
    return `(${which})`;
  };

  const savedDayPlans = sortBySavedAtNewestFirst(savedWeeks.filter(isSavedDayPlan));
  const savedWeekPlans = sortBySavedAtNewestFirst(
    savedWeeks.filter((week) => !isSavedDayPlan(week))
  );
  const savedForLater = sortBySavedAtNewestFirst(savedWorkouts);
  const historyWeeks = groupCompletedHistoryByWeek(items);
  const hasAny =
    savedWorkouts.length > 0 || savedWeeks.length > 0 || items.length > 0;

  type LibraryTab = "progress" | "days" | "weeks" | "saved" | "history";
  const libraryTabs = useMemo(() => {
    const tabs: { key: LibraryTab; label: string; icon: "play-circle-outline" | "bookmark-outline" | "today-outline" | "calendar-outline" | "time-outline" }[] = [];
    if (hasStaleInProgress) tabs.push({ key: "progress", label: "In progress", icon: "play-circle-outline" });
    if (savedDayPlans.length > 0) tabs.push({ key: "days", label: "Days", icon: "today-outline" });
    if (savedWeekPlans.length > 0) tabs.push({ key: "weeks", label: "Weeks", icon: "calendar-outline" });
    if (savedWorkouts.length > 0) tabs.push({ key: "saved", label: "Saved", icon: "bookmark-outline" });
    if (items.length > 0) tabs.push({ key: "history", label: "History", icon: "time-outline" });
    return tabs;
  }, [hasStaleInProgress, savedWorkouts.length, savedDayPlans.length, savedWeekPlans.length, items.length]);

  const [libraryTab, setLibraryTab] = useState<LibraryTab | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState<{
    target: DiscardTarget;
    onConfirm: () => void;
  } | null>(null);
  const activeLibraryTab =
    libraryTab && libraryTabs.some((t) => t.key === libraryTab)
      ? libraryTab
      : libraryTabs[0]?.key;

  const requestDiscard = (target: DiscardTarget, onConfirm: () => void) => {
    setDiscardConfirm({ target, onConfirm });
  };

  const onMoveManualToLibrary = () => {
    if (!manualWeekPlan) {
      setManualWeekPlan(null);
      return;
    }
    requestSaveWeek({
      weekStartDate: manualWeekPlan.weekStartDate,
      days: manualWeekPlan.days,
      source: "manual",
      onSaved: () => setManualWeekPlan(null),
    });
  };

  const onMoveSportPrepToLibrary = () => {
    if (!sportPrepWeekPlan) {
      setAdaptiveSetup(null);
      return;
    }
    const days = savedPlanDaysFromSportPrep(sportPrepWeekPlan);
    if (days.length === 0) {
      setSportPrepWeekPlan(null);
      setAdaptiveSetup(null);
      return;
    }
    requestSaveWeek({
      weekStartDate: sportPrepWeekPlan.weekStartDate,
      days,
      source: "adaptive",
      onSaved: () => {
        setSportPrepWeekPlan(null);
        setAdaptiveSetup(null);
      },
    });
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasAny && !hasStaleInProgress && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nothing in your library yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Save a day or week from review, then start it from here or the
              Workout tab. Finished sessions land in History, where you can redo
              a week after you complete it.
            </Text>
          </View>
        )}

        {libraryTabs.length > 0 ? (
          <>
            <SectionLabel>Library</SectionLabel>
            <PillTabs
              tabs={libraryTabs}
              value={activeLibraryTab ?? libraryTabs[0]!.key}
              onChange={(key) => setLibraryTab(key)}
              style={{ marginBottom: 16 }}
            />
          </>
        ) : null}

        {activeLibraryTab === "progress" && hasStaleInProgress && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              In progress
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Past week still in progress. Open to continue or move to library.
            </Text>
            {manualStale && manualWeekPlan && (
              <View style={[styles.savedCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Text style={[styles.savedTitle, { color: theme.text }]}>
                  Week of {new Date(manualWeekPlan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (Goal)
                </Text>
                <View style={styles.savedActions}>
                  <PrimaryButton
                    label="Open"
                    onPress={() => router.push(ACTIVE_WEEK_ROUTE as never)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label={saveBusy ? "Saving…" : "Move to library"}
                    variant="secondary"
                    onPress={onMoveManualToLibrary}
                    disabled={saveBusy}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
            {sportPrepStale && sportPrepWeekPlan && (
              <View style={[styles.savedCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Text style={[styles.savedTitle, { color: theme.text }]}>
                  Week of {new Date(sportPrepWeekPlan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (Sport)
                </Text>
                <View style={styles.savedActions}>
                  <PrimaryButton
                    label="Open"
                    onPress={() => router.push(ACTIVE_WEEK_ROUTE as never)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label={saveBusy ? "Saving…" : "Move to library"}
                    variant="secondary"
                    onPress={onMoveSportPrepToLibrary}
                    disabled={saveBusy}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {activeLibraryTab === "saved" && savedForLater.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved for later
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Resume or discard workouts you did not finish.
            </Text>
            {savedForLater.map((saved) => {
              const logSummary = summarizeWorkoutLog(
                saved.workout,
                undefined,
                undefined,
                saved.progress
              );
              return (
                <View
                  key={saved.id}
                  style={[styles.savedCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <WorkoutLibraryTitle
                    date={saved.savedAt}
                    focusAreas={saved.workout.focus}
                    fallbackFocus="General"
                  />
                  <Text
                    style={[styles.savedMeta, { color: theme.textMuted }]}
                  >
                    {saved.workout.durationMinutes != null
                      ? `${saved.workout.durationMinutes} min`
                      : "—"}
                    {logSummary ? ` · ${logSummary}` : ""}
                  </Text>
                  <View style={styles.savedActions}>
                    <PrimaryButton
                      label="View"
                      variant="secondary"
                      onPress={() => router.push(`/library/saved/${saved.id}`)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Resume"
                      onPress={() => onResumeSaved(saved)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Discard"
                      variant="ghost"
                      onPress={() =>
                        requestDiscard("session", () => removeSavedWorkout(saved.id))
                      }
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeLibraryTab === "days" && savedDayPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved days
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Start a saved session, or discard it when you no longer need it.
            </Text>
            {savedDayPlans.map((dayPlan) => {
              const day = dayPlan.days[0];
              return (
                <View
                  key={dayPlan.id}
                  style={[styles.savedCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <Text style={[styles.savedTitle, { color: theme.text }]}>
                    {savedPlanLibraryTitle(dayPlan)}
                  </Text>
                  <Text style={[styles.savedMeta, { color: theme.textMuted }]}>
                    {savedPlanSourceLabel(dayPlan.source)}
                    {day?.workout.durationMinutes != null
                      ? ` · ${day.workout.durationMinutes} min`
                      : ""}
                  </Text>
                  <View style={styles.savedActions}>
                    <PrimaryButton
                      label="Start day"
                      onPress={() => onStartSavedDay(dayPlan)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Discard"
                      variant="ghost"
                      onPress={() =>
                        requestDiscard("session", () => removeSavedWeek(dayPlan.id))
                      }
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeLibraryTab === "weeks" && savedWeekPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved weeks
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Start a saved week from the Workout tab. Redo is for finished
              weeks in History.
            </Text>
            {savedWeekPlans.map((week) => {
              const alreadyActive = isSavedWeekTheActivePlan(week, {
                manualWeekPlan,
                sportPrepWeekPlan,
              });
              return (
                <View
                  key={week.id}
                  style={[styles.savedCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <Text style={[styles.savedTitle, { color: theme.text }]}>
                    {savedPlanLibraryTitle(week)}
                  </Text>
                  <Text style={[styles.savedMeta, { color: theme.textMuted }]}>
                    {savedPlanSourceLabel(week.source)} ·{" "}
                    {week.days.length} session{week.days.length !== 1 ? "s" : ""}
                  </Text>
                  <View style={styles.savedActions}>
                    <PrimaryButton
                      label={alreadyActive ? "Open week" : "Start week"}
                      onPress={() => onStartSavedWeek(week)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Discard"
                      variant="ghost"
                      onPress={() =>
                        requestDiscard("week", () => removeSavedWeek(week.id))
                      }
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeLibraryTab === "history" && items.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Completed
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Newest first. After you finish a multi-session week, redo it here.
            </Text>
            {historyWeeks.map((group) => {
              const canRedoWeek = historyWeekCanRedo(group);
              return (
                <View key={group.weekStartDate} style={styles.historyWeek}>
                  <View style={styles.historyWeekHeader}>
                    <Text style={[styles.historyWeekTitle, { color: theme.text }]}>
                      {defaultSavedWeekName(group.weekStartDate)}
                    </Text>
                    {canRedoWeek ? (
                      <PrimaryButton
                        label="Redo week"
                        compact
                        onPress={() => onRedoHistoryWeek(group.weekStartDate, group.items)}
                        style={styles.redoWeekBtn}
                      />
                    ) : null}
                  </View>
                  {group.items.map((item) => {
                    const index = items.findIndex((entry) => entry.id === item.id);
                    const canViewOrRepeat = item.workout != null;
                    const logSummary =
                      item.workout != null
                        ? summarizeWorkoutLog(
                            item.workout,
                            item.exerciseNotes,
                            item.exercisePerformance
                          )
                        : null;
                    const subtitleParts = [
                      item.durationMinutes != null ? `${item.durationMinutes} min` : null,
                      item.workout
                        ? `${item.workout.blocks.length} block${item.workout.blocks.length !== 1 ? "s" : ""}`
                        : null,
                      logSummary,
                    ].filter(Boolean);
                    return (
                      <View key={item.id} style={styles.historyItem}>
                        <Card
                          style={styles.historyCard}
                          titleNode={
                            <WorkoutLibraryTitle
                              date={item.date}
                              focusAreas={item.focus}
                              primaryLabel={item.name}
                              suffix={getDuplicateSuffix(item, index)}
                              dense
                            />
                          }
                          subtitle={
                            subtitleParts.length > 0
                              ? subtitleParts.join(" · ")
                              : undefined
                          }
                        >
                          {canViewOrRepeat ? (
                            <View style={styles.completedActions}>
                              <PrimaryButton
                                label="Details"
                                variant="secondary"
                                compact
                                onPress={() => router.push(`/history/${item.id}`)}
                                style={styles.historyActionBtn}
                              />
                              <PrimaryButton
                                label="Repeat"
                                compact
                                onPress={() => {
                                  if (!item.workout) return;
                                  setGeneratedWorkout({
                                    ...item.workout,
                                    id: `workout_${Date.now()}`,
                                  });
                                  setResumeProgress(null);
                                  router.push("/manual/execute");
                                }}
                                style={styles.historyActionBtn}
                              />
                              <PrimaryButton
                                label="Edit"
                                variant="ghost"
                                compact
                                onPress={() => router.push("/manual/preferences")}
                                style={styles.historyActionBtn}
                              />
                            </View>
                          ) : null}
                        </Card>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      {saveDialog ? (
        <SaveNamedPlanModal
          visible
          kind={saveDialog.kind}
          defaultName={saveDialog.defaultName}
          busy={saveBusy}
          onCancel={cancelSave}
          onSave={confirmSave}
        />
      ) : null}
      <DiscardConfirmModal
        visible={discardConfirm != null}
        target={discardConfirm?.target ?? "session"}
        onCancel={() => setDiscardConfirm(null)}
        onConfirm={() => {
          discardConfirm?.onConfirm();
          setDiscardConfirm(null);
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: themeFonts.displayBold,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  savedCard: {
    padding: 20,
    borderRadius: themeRadius.card,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  savedMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  savedActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  discardBtn: {
    minWidth: 80,
  },
  historyWeek: {
    marginBottom: 16,
  },
  historyWeekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  historyWeekTitle: {
    fontFamily: themeFonts.displayBold,
    fontSize: 14,
    flex: 1,
  },
  redoWeekBtn: {
    paddingHorizontal: 12,
  },
  historyItem: {
    marginBottom: 10,
  },
  historyCard: {
    padding: 14,
  },
  historyActionBtn: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  emptyTitle: {
    fontFamily: themeFonts.displayBold,
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  completedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
