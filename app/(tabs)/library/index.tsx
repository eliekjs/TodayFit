import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { listWeeklyPlanInstances, saveManualWeek } from "../../../lib/db/weekPlanRepository";
import type { SavedWeekSummary } from "../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../lib/db";
import { getLocalDateString } from "../../../lib/dateUtils";

function getCurrentWeekStartIso(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return getLocalDateString(monday);
}

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const {
    workoutHistory,
    savedWorkouts,
    setGeneratedWorkout,
    setResumeProgress,
    removeSavedWorkout,
    manualWeekPlan,
    sportPrepWeekPlan,
    setManualWeekPlan,
    setSportPrepWeekPlan,
    setAdaptiveSetup,
  } = useAppState();
  const [savedWeeks, setSavedWeeks] = useState<SavedWeekSummary[]>([]);
  const [movingToLibrary, setMovingToLibrary] = useState(false);

  const currentWeekStart = getCurrentWeekStartIso();
  const manualStale =
    manualWeekPlan != null && manualWeekPlan.weekStartDate < currentWeekStart;
  const sportPrepStale =
    sportPrepWeekPlan != null && sportPrepWeekPlan.weekStartDate < currentWeekStart;
  const hasStaleInProgress = manualStale || sportPrepStale;

  useEffect(() => {
    if (!userId || !isDbConfigured()) return;
    let cancelled = false;
    listWeeklyPlanInstances(userId)
      .then((list) => {
        if (!cancelled) setSavedWeeks(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  const onResumeSaved = (saved: (typeof savedWorkouts)[0]) => {
    setGeneratedWorkout(saved.workout);
    setResumeProgress(saved.progress ?? null);
    router.push("/manual/execute");
  };

  const items = [...workoutHistory].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const getItemKey = (item: (typeof items)[0]) =>
    `${new Date(item.date).toLocaleDateString()} • ${item.focus.join(" • ") || "General training"}`;
  const keyToIndices = items.reduce<Record<string, number[]>>((acc, item, i) => {
    const key = getItemKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {});
  const getDisplayLabel = (item: (typeof items)[0], index: number) => {
    const key = getItemKey(item);
    const indices = keyToIndices[key] ?? [index];
    if (indices.length <= 1) return key;
    const which = indices.indexOf(index) + 1;
    return `${key} (${which})`;
  };
  const getCompletedItemLabel = (item: (typeof items)[0], index: number) =>
    item.name?.trim() || getDisplayLabel(item, index);

  const hasAny =
    savedWorkouts.length > 0 || savedWeeks.length > 0 || items.length > 0;

  const onMoveManualToLibrary = async () => {
    if (!manualWeekPlan || !userId || !isDbConfigured()) {
      setManualWeekPlan(null);
      return;
    }
    setMovingToLibrary(true);
    try {
      await saveManualWeek(userId, manualWeekPlan.weekStartDate, manualWeekPlan.days);
      setManualWeekPlan(null);
      const list = await listWeeklyPlanInstances(userId);
      setSavedWeeks(list);
    } catch {
      setManualWeekPlan(null);
    } finally {
      setMovingToLibrary(false);
    }
  };

  const onMoveSportPrepToLibrary = () => {
    setSportPrepWeekPlan(null);
    setAdaptiveSetup(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
              plan from manual or adaptive mode, or finish a session — they'll
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
                    label={movingToLibrary ? "Saving…" : "Move to library"}
                    variant="secondary"
                    onPress={onMoveManualToLibrary}
                    disabled={movingToLibrary}
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
                    onPress={() => router.push("/adaptive/recommendation")}
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
              Resume or discard workouts you didn't finish.
            </Text>
            {savedWorkouts.map((saved) => {
              const date = new Date(saved.savedAt);
              const label = `${date.toLocaleDateString()} • ${
                saved.workout.focus.join(" • ") || "General"
              }`;
              return (
                <View
                  key={saved.id}
                  style={[styles.savedCard, { borderColor: theme.border }]}
                >
                  <Text
                    style={[styles.savedTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[styles.savedMeta, { color: theme.textMuted }]}
                  >
                    {saved.workout.durationMinutes != null
                      ? `${saved.workout.durationMinutes} min`
                      : "—"}
                  </Text>
                  <View style={styles.savedActions}>
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
              Load a saved week plan to view or continue.
            </Text>
            {savedWeeks.map((week) => {
              const weekStart = new Date(week.week_start_date + "T12:00:00");
              const label = `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
              const isManual = (week.goals_snapshot?.source as string) === "manual";
              return (
                <Pressable
                  key={week.id}
                  style={[styles.savedCard, { borderColor: theme.border }]}
                  onPress={() => router.push(`/history/weeks/${week.id}`)}
                >
                  <Text style={[styles.savedTitle, { color: theme.text }]}>
                    {label}
                  </Text>
                  <Text style={[styles.savedMeta, { color: theme.textMuted }]}>
                    {isManual ? "Manual" : "Adaptive"}
                  </Text>
                </Pressable>
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
              const label = getCompletedItemLabel(item, index);
              const canViewOrRepeat = item.workout != null;
              const subtitleParts = [
                item.durationMinutes != null ? `${item.durationMinutes} min` : null,
                item.workout
                  ? `${item.workout.blocks.length} block${item.workout.blocks.length !== 1 ? "s" : ""}`
                  : null,
              ].filter(Boolean);
              return (
                <View key={item.id} style={{ marginBottom: 12 }}>
                  <Card
                    title={label}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
