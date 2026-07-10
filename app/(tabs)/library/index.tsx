import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { WorkoutLibraryTitle } from "../../../components/WorkoutLibraryTitle";
import { getCurrentWeekStartMonday } from "../../../lib/dateUtils";
import { workoutLibraryDedupKey } from "../../../lib/workoutLibraryLabel";
import {
  savedWeekToManualWeekPlan,
  savedWeekToSportPrepWeekPlan,
} from "../../../lib/savedWeekUtils";
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
    addSavedWeek,
    reloadSavedWeeks,
  } = useAppState();

  useFocusEffect(
    useCallback(() => {
      reloadSavedWeeks();
    }, [reloadSavedWeeks])
  );

  const currentWeekStart = getCurrentWeekStartMonday();
  const manualStale =
    manualWeekPlan != null && manualWeekPlan.weekStartDate < currentWeekStart;
  const sportPrepStale =
    sportPrepWeekPlan != null && sportPrepWeekPlan.weekStartDate < currentWeekStart;
  const hasStaleInProgress = manualStale || sportPrepStale;

  const onResumeSaved = (saved: (typeof savedWorkouts)[0]) => {
    setGeneratedWorkout(saved.workout);
    setResumeProgress(saved.progress ?? null);
    setManualExecutionStarted(true);
    router.push("/manual/execute");
  };

  const onRedoSavedWeek = (week: SavedWeek) => {
    if (week.source === "manual") {
      setManualWeekPlan(savedWeekToManualWeekPlan(week));
      router.push("/manual/week");
      return;
    }
    setSportPrepWeekPlan(savedWeekToSportPrepWeekPlan(week));
    router.push("/sport-mode/recommendation");
  };

  const items = [...workoutHistory].sort((a, b) =>
    a.date.localeCompare(b.date)
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

  const hasAny =
    savedWorkouts.length > 0 || savedWeeks.length > 0 || items.length > 0;

  const onMoveManualToLibrary = () => {
    if (!manualWeekPlan) {
      setManualWeekPlan(null);
      return;
    }
    addSavedWeek({
      savedAt: new Date().toISOString(),
      weekStartDate: manualWeekPlan.weekStartDate,
      days: manualWeekPlan.days,
      source: "manual",
    });
    setManualWeekPlan(null);
  };

  const onMoveSportPrepToLibrary = () => {
    setSportPrepWeekPlan(null);
    setAdaptiveSetup(null);
  };

  const formatSavedWeekLabel = (week: SavedWeek) => {
    const weekStart = new Date(week.weekStartDate + "T12:00:00");
    return `Week of ${weekStart.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
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
              Save a workout for later from the execute screen, save a week
              plan from manual or sport mode, or finish a session — they will
              show up here.
            </Text>
          </View>
        )}

        {hasStaleInProgress && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              In progress
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Past week still in progress. Open to continue or move to library.
            </Text>
            {manualStale && manualWeekPlan && (
              <View style={[styles.savedCard, { borderColor: theme.border }]}>
                <Text style={[styles.savedTitle, { color: theme.text }]}>
                  Week of {new Date(manualWeekPlan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (Manual)
                </Text>
                <View style={styles.savedActions}>
                  <PrimaryButton
                    label="Open"
                    onPress={() => router.push("/manual/week")}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label="Move to library"
                    variant="secondary"
                    onPress={onMoveManualToLibrary}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
            {sportPrepStale && sportPrepWeekPlan && (
              <View style={[styles.savedCard, { borderColor: theme.border }]}>
                <Text style={[styles.savedTitle, { color: theme.text }]}>
                  Week of {new Date(sportPrepWeekPlan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (Adaptive)
                </Text>
                <View style={styles.savedActions}>
                  <PrimaryButton
                    label="Open"
                    onPress={() => router.push("/sport-mode/recommendation")}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label="Move to library"
                    variant="secondary"
                    onPress={onMoveSportPrepToLibrary}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {savedWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved for later
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Resume or discard workouts you did not finish.
            </Text>
            {savedWorkouts.map((saved) => {
              const logSummary = summarizeWorkoutLog(
                saved.workout,
                undefined,
                undefined,
                saved.progress
              );
              return (
                <View
                  key={saved.id}
                  style={[styles.savedCard, { borderColor: theme.border }]}
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
                      onPress={() => removeSavedWorkout(saved.id)}
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {savedWeeks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved weeks
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Redo a saved week plan or discard it when you are done.
            </Text>
            {savedWeeks.map((week) => {
              return (
                <View
                  key={week.id}
                  style={[styles.savedCard, { borderColor: theme.border }]}
                >
                  <Text style={[styles.savedTitle, { color: theme.text }]}>
                    {formatSavedWeekLabel(week)}
                  </Text>
                  <Text style={[styles.savedMeta, { color: theme.textMuted }]}>
                    {week.source === "manual" ? "Manual" : "Adaptive"} ·{" "}
                    {week.days.length} session{week.days.length !== 1 ? "s" : ""}
                  </Text>
                  <View style={styles.savedActions}>
                    <PrimaryButton
                      label="Redo week"
                      onPress={() => onRedoSavedWeek(week)}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      label="Discard"
                      variant="ghost"
                      onPress={() => removeSavedWeek(week.id)}
                      style={styles.discardBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Completed
            </Text>
            {items.map((item, index) => {
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
                <View key={item.id} style={{ marginBottom: 12 }}>
                  <Card
                    titleNode={
                      <WorkoutLibraryTitle
                        date={item.date}
                        focusAreas={item.focus}
                        primaryLabel={item.name}
                        suffix={getDuplicateSuffix(item, index)}
                      />
                    }
                    subtitle={subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined}
                  />
                  {canViewOrRepeat && (
                    <View style={styles.completedActions}>
                      <PrimaryButton
                        label="View details"
                        variant="secondary"
                        onPress={() => router.push(`/history/${item.id}`)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label="Repeat session"
                        onPress={() => {
                          if (!item.workout) return;
                          setGeneratedWorkout({
                            ...item.workout,
                            id: `workout_${Date.now()}`,
                          });
                          setResumeProgress(null);
                          router.push("/manual/execute");
                        }}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label="Edit + re-run"
                        variant="ghost"
                        onPress={() => router.push("/manual/preferences")}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  savedCard: {
    padding: 14,
    borderRadius: 12,
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  completedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
});
