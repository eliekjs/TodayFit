import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { listWeeklyPlanInstances } from "../../../lib/db/weekPlanRepository";
import type { SavedWeekSummary } from "../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../lib/db";

export default function SavedWorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const {
    savedWorkouts,
    setGeneratedWorkout,
    setResumeProgress,
    removeSavedWorkout,
  } = useAppState();
  const [savedWeeks, setSavedWeeks] = useState<SavedWeekSummary[]>([]);

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

  const hasAny = savedWorkouts.length > 0 || savedWeeks.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {savedWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Saved workouts
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

        {!hasAny && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nothing saved yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Save a workout for later from the execute screen, or save a week
              plan from manual or adaptive mode. They'll show up here.
            </Text>
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
});
