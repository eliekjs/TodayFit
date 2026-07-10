import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../../lib/theme";
import { AppScreenWrapper } from "../../../../components/AppScreenWrapper";
import { useAppState } from "../../../../context/AppStateContext";
import { useAuth } from "../../../../context/AuthContext";
import { PrimaryButton } from "../../../../components/Button";
import { getWeeklyPlanWithWorkouts, listWeeklyPlanInstances } from "../../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../../lib/db";
import {
  savedWeekToManualWeekPlan,
  savedWeekToSportPrepWeekPlan,
} from "../../../../lib/savedWeekUtils";
import type { SavedWeek } from "../../../../lib/types";

export default function SavedWeekDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { savedWeeks, setSportPrepWeekPlan, setManualWeekPlan } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const inMemory = savedWeeks.find((week) => week.id === id);
    if (inMemory) {
      openSavedWeek(inMemory);
      return;
    }

    if (!userId || !isDbConfigured()) {
      setError("Sign in and enable sync to load weeks.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all([
      getWeeklyPlanWithWorkouts(userId, id),
      listWeeklyPlanInstances(userId),
    ])
      .then(([planWith, summaries]) => {
        if (cancelled) return;
        if (!planWith) {
          setError("Week not found.");
          setLoading(false);
          return;
        }
        const summary = summaries.find((item) => item.id === id);
        const source =
          (summary?.goals_snapshot?.source as string) === "manual" ? "manual" : "adaptive";
        const savedWeek: SavedWeek = {
          id: planWith.weeklyPlanInstanceId,
          savedAt: summary?.created_at ?? new Date().toISOString(),
          weekStartDate: planWith.weekStartDate,
          days: planWith.days
            .map((day) => {
              const workout = planWith.guestWorkouts[day.date];
              if (!workout) return null;
              return {
                date: day.date,
                workout,
                displayTitle: day.intentLabel ?? day.title ?? undefined,
              };
            })
            .filter((day): day is NonNullable<typeof day> => day != null),
          source,
        };
        openSavedWeek(savedWeek);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };

    function openSavedWeek(week: SavedWeek) {
      if (week.source === "manual") {
        setManualWeekPlan(savedWeekToManualWeekPlan(week));
        router.replace("/manual/week");
        return;
      }
      setSportPrepWeekPlan(savedWeekToSportPrepWeekPlan(week));
      router.replace("/sport-mode/recommendation");
    }
  }, [id, userId, savedWeeks, setSportPrepWeekPlan, setManualWeekPlan, router]);

  if (loading) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading week…
        </Text>
      </View>
      </AppScreenWrapper>
    );
  }

  if (error) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <PrimaryButton label="Back" onPress={() => router.back()} />
      </View>
      </AppScreenWrapper>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
});
