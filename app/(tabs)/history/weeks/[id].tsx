import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../../lib/theme";
import { useAppState } from "../../../../context/AppStateContext";
import { useAuth } from "../../../../context/AuthContext";
import { PrimaryButton } from "../../../../components/Button";
import { getWeeklyPlanWithWorkouts } from "../../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../../lib/db";
import type { PlanWeekResult } from "../../../../services/sportPrepPlanner";

export default function SavedWeekDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { setSportPrepWeekPlan } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !userId || !isDbConfigured()) {
      if (!userId || !isDbConfigured()) setError("Sign in and enable sync to load weeks.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    getWeeklyPlanWithWorkouts(userId, id)
      .then((planWith) => {
        if (cancelled) return;
        if (!planWith) {
          setError("Week not found.");
          setLoading(false);
          return;
        }
        const todayIso = new Date().toISOString().slice(0, 10);
        const todayDay = planWith.days.find((d) => d.date === todayIso) ?? planWith.days[0] ?? null;
        const todayWorkout = todayDay
          ? planWith.guestWorkouts[todayDay.date] ?? null
          : null;
        const plan: PlanWeekResult = {
          weeklyPlanInstanceId: planWith.weeklyPlanInstanceId,
          weekStartDate: planWith.weekStartDate,
          days: planWith.days,
          today: todayDay,
          todayWorkout,
          guestWorkouts: planWith.guestWorkouts,
        };
        setSportPrepWeekPlan(plan);
        router.replace("/adaptive/recommendation");
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id, userId, setSportPrepWeekPlan, router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading week…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <PrimaryButton label="Back" onPress={() => router.back()} />
      </View>
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
