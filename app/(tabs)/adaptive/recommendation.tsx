import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import type { GeneratedWorkout } from "../../../lib/types";
import { formatPrescription, normalizeGeneratedWorkout } from "../../../lib/types";
import { regenerateDay, updateDayStatus } from "../../../services/sportPrepPlanner";
import type { PlannedDay } from "../../../services/sportPrepPlanner";
import { getWorkout } from "../../../lib/db/workoutRepository";

/** Format ISO date as day of week (e.g. "Monday"). */
function formatDayOfWeek(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long",
  });
}
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

export default function AdaptiveWeekPlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const { sportPrepWeekPlan, setSportPrepWeekPlan, manualPreferences } = useAppState();

  const [selectedDate, setSelectedDate] = useState<string | null>(
    sportPrepWeekPlan?.today?.date ?? sportPrepWeekPlan?.days[0]?.date ?? null
  );
  const [selectedWorkout, setSelectedWorkout] = useState<GeneratedWorkout | null>(
    sportPrepWeekPlan?.todayWorkout ?? null
  );
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sportPrepWeekPlan) return;
    if (!selectedDate) {
      setSelectedDate(
        sportPrepWeekPlan.today?.date ?? sportPrepWeekPlan.days[0]?.date ?? null
      );
    }
  }, [sportPrepWeekPlan, selectedDate]);

  useEffect(() => {
    const loadWorkout = async () => {
      if (!sportPrepWeekPlan || !selectedDate) return;
      const day = sportPrepWeekPlan.days.find((d) => d.date === selectedDate);
      if (!day) {
        setSelectedWorkout(null);
        return;
      }

      // Guest mode: use in-memory workouts
      if (sportPrepWeekPlan.guestWorkouts?.[selectedDate]) {
        setSelectedWorkout(sportPrepWeekPlan.guestWorkouts[selectedDate]);
        return;
      }
      // Reuse cached today workout when possible
      if (
        sportPrepWeekPlan.today &&
        sportPrepWeekPlan.today.date === selectedDate &&
        sportPrepWeekPlan.todayWorkout
      ) {
        setSelectedWorkout(sportPrepWeekPlan.todayWorkout);
        return;
      }
      // Persisted plan: fetch from DB
      if (!userId || !day.generatedWorkoutId) {
        setSelectedWorkout(null);
        return;
      }

      setIsLoadingWorkout(true);
      try {
        const workout = await getWorkout(userId, day.generatedWorkoutId);
        setSelectedWorkout(workout);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    loadWorkout();
  }, [sportPrepWeekPlan, selectedDate, userId]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /** Week days in fixed order Mon–Sun for display; drag reassigns workouts between days. */
  const daysInWeekOrder = useMemo(() => {
    if (!sportPrepWeekPlan) return [];
    const start = new Date(sportPrepWeekPlan.weekStartDate + "T12:00:00");
    const byDate = new Map(sportPrepWeekPlan.days.map((d) => [d.date, d]));
    const out: PlannedDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const day = byDate.get(iso) ?? {
        id: `placeholder-${iso}`,
        date: iso,
        intentLabel: null,
        status: "planned" as const,
        generatedWorkoutId: null,
      };
      out.push(day);
    }
    return out;
  }, [sportPrepWeekPlan]);

  if (!sportPrepWeekPlan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No week plan yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Set your training priorities first, then we’ll build a 7-day plan.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Set Training Priorities"
              onPress={() => router.replace("/adaptive")}
            />
          </View>
        </View>
      </View>
    );
  }

  const selectedDay =
    sportPrepWeekPlan.days.find((d) => d.date === selectedDate) ??
    sportPrepWeekPlan.days[0];

  const onSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const onDragEnd = useCallback(
    ({ from, to }: { data: PlannedDay[]; from: number; to: number }) => {
      if (!sportPrepWeekPlan || from === to) return;
      const ordered = daysInWeekOrder;
      const dateFrom = ordered[from]?.date;
      const dateTo = ordered[to]?.date;
      if (!dateFrom || !dateTo) return;
      const dayA = sportPrepWeekPlan.days.find((d) => d.date === dateFrom);
      const dayB = sportPrepWeekPlan.days.find((d) => d.date === dateTo);
      if (!dayA || !dayB) return;
      const swappedDays = sportPrepWeekPlan.days.map((d) => {
        if (d.date === dateFrom)
          return { ...d, intentLabel: dayB.intentLabel, status: dayB.status, generatedWorkoutId: dayB.generatedWorkoutId };
        if (d.date === dateTo)
          return { ...d, intentLabel: dayA.intentLabel, status: dayA.status, generatedWorkoutId: dayA.generatedWorkoutId };
        return d;
      });
      let guestWorkouts = sportPrepWeekPlan.guestWorkouts;
      if (guestWorkouts && (guestWorkouts[dateFrom] != null || guestWorkouts[dateTo] != null)) {
        guestWorkouts = { ...guestWorkouts };
        const wFrom = guestWorkouts[dateFrom];
        const wTo = guestWorkouts[dateTo];
        if (wFrom != null) guestWorkouts[dateTo] = wFrom;
        if (wTo != null) guestWorkouts[dateFrom] = wTo;
      }
      const newToday = swappedDays.find((d) => d.date === todayIso) ?? sportPrepWeekPlan.today;
      const newTodayWorkout = guestWorkouts ? guestWorkouts[todayIso] : sportPrepWeekPlan.todayWorkout;
      setSportPrepWeekPlan({
        ...sportPrepWeekPlan,
        days: swappedDays,
        ...(guestWorkouts && { guestWorkouts }),
        today: newToday,
        todayWorkout: newTodayWorkout,
      });
    },
    [sportPrepWeekPlan, setSportPrepWeekPlan, daysInWeekOrder, todayIso]
  );

  const onRegenerate = async () => {
    if (!sportPrepWeekPlan || !selectedDay) return;
    setError(null);
    setIsRegenerating(true);
    try {
      const result = await regenerateDay({
        userId: userId ?? undefined,
        weeklyPlanInstanceId: sportPrepWeekPlan.weeklyPlanInstanceId,
        date: selectedDay.date,
        sportSlug: sportPrepWeekPlan.sportSlug ?? undefined,
        goalSlugs: sportPrepWeekPlan.goalSlugs,
        sportSubFocusSlugs: sportPrepWeekPlan.sportSubFocusSlugs,
        intentLabel: selectedDay.intentLabel,
        goalWeightsPct: [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ],
      });

      const updatedDays = sportPrepWeekPlan.days.map((d) =>
        d.date === result.day.date ? result.day : d
      );
      const updatedGuestWorkouts =
        sportPrepWeekPlan.guestWorkouts && result.workout
          ? { ...sportPrepWeekPlan.guestWorkouts, [result.day.date]: result.workout }
          : sportPrepWeekPlan.guestWorkouts;
      const updatedPlan = {
        ...sportPrepWeekPlan,
        days: updatedDays,
        today:
          sportPrepWeekPlan.today &&
          sportPrepWeekPlan.today.date === result.day.date
            ? result.day
            : sportPrepWeekPlan.today,
        todayWorkout:
          sportPrepWeekPlan.today &&
          sportPrepWeekPlan.today.date === result.day.date
            ? result.workout
            : sportPrepWeekPlan.todayWorkout,
        ...(updatedGuestWorkouts && { guestWorkouts: updatedGuestWorkouts }),
      };
      setSportPrepWeekPlan(updatedPlan);
      setSelectedWorkout(result.workout);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRegenerating(false);
    }
  };

  const onUpdateDayStatus = async (status: "planned" | "completed" | "skipped") => {
    if (!sportPrepWeekPlan || !selectedDay) return;
    setError(null);
    const updatedDay: typeof selectedDay = { ...selectedDay, status };
    const updatedDays = sportPrepWeekPlan.days.map((d) =>
      d.date === updatedDay.date ? updatedDay : d
    );
    const nextPlan = {
      ...sportPrepWeekPlan,
      days: updatedDays,
      today:
        sportPrepWeekPlan.today && sportPrepWeekPlan.today.date === updatedDay.date
          ? updatedDay
          : sportPrepWeekPlan.today,
    };
    if (userId) {
      setIsUpdatingStatus(true);
      try {
        const persisted = await updateDayStatus({
          userId,
          weeklyPlanInstanceId: sportPrepWeekPlan.weeklyPlanInstanceId,
          date: selectedDay.date,
          status,
        });
        setSportPrepWeekPlan({
          ...nextPlan,
          days: nextPlan.days.map((d) => (d.date === persisted.date ? persisted : d)),
          today: nextPlan.today?.date === persisted.date ? persisted : nextPlan.today,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsUpdatingStatus(false);
      }
    } else {
      setSportPrepWeekPlan(nextPlan);
    }
  };

  const summaryLines: string[] = [];
  if (selectedWorkout?.focus?.length) {
    summaryLines.push(selectedWorkout.focus.join(" • "));
  }
  if (selectedWorkout?.durationMinutes != null) {
    summaryLines.push(`${selectedWorkout.durationMinutes} min`);
  }
  if (selectedWorkout?.energyLevel) {
    const e = selectedWorkout.energyLevel;
    summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
  }

  const renderDayRow = useCallback(
    ({
      item: day,
      drag,
      isActive,
    }: {
      item: PlannedDay;
      drag: () => void;
      isActive: boolean;
    }) => {
      const isToday = day.date === todayIso;
      const isSelected = day.date === selectedDay.date;
      const dateObj = new Date(day.date);
      const weekday = dateObj.toLocaleDateString(undefined, { weekday: "short" });
      const label = day.intentLabel ?? "Rest / low-load day";
      const statusBadge = day.status === "completed" ? "Completed" : day.status === "skipped" ? "Skipped" : null;
      return (
        <ScaleDecorator>
          <View style={{ marginBottom: 8 }}>
            <Pressable
              onPress={() => !isActive && onSelectDate(day.date)}
              onLongPress={drag}
              delayLongPress={200}
              style={[
                styles.dayRow,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isActive ? theme.primarySoft : isSelected ? theme.primarySoft : "transparent",
                },
              ]}
            >
              <View style={{ paddingVertical: 8, paddingRight: 12, marginLeft: -8 }}>
                <Text style={{ fontSize: 18, color: theme.textMuted }}>⋮⋮</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={[styles.dayWeekday, { color: theme.text, opacity: isToday ? 1 : 0.85 }]}
                  >
                    {weekday}
                  </Text>
                  {isToday && (
                    <Text style={[styles.todayBadge, { color: theme.primary, borderColor: theme.primary }]}>
                      Today
                    </Text>
                  )}
                  {statusBadge ? (
                    <Text
                      style={[
                        styles.todayBadge,
                        {
                          color: day.status === "completed" ? theme.success ?? theme.primary : theme.textMuted,
                          borderColor: day.status === "completed" ? (theme.success ?? theme.primary) : theme.border,
                          marginLeft: 8,
                        },
                      ]}
                    >
                      {statusBadge}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.dayLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Pressable>
          </View>
        </ScaleDecorator>
      );
    },
    [theme, todayIso, selectedDay.date, onSelectDate]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NestableScrollContainer contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card
            title="Your Week Plan"
            subtitle={`Week starting ${sportPrepWeekPlan.weekStartDate}`}
          >
            <Text style={{ fontSize: 13, color: theme.textMuted }}>
              Tap a day to view its session. Today is highlighted. You can
              regenerate an individual day without changing the rest of the plan.
            </Text>
          </Card>

          {error ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          ) : null}

          <Card
            title="Week overview"
            style={{ marginTop: 16 }}
            subtitle="Long-press and drag to move a workout to a different day. Days stay in order."
          >
            <NestableDraggableFlatList
              data={daysInWeekOrder}
              keyExtractor={(d) => d.date}
              onDragEnd={onDragEnd}
              renderItem={renderDayRow}
              activationDistance={8}
            />
            </Card>

          <Card
            title={
              selectedDay.date === todayIso
                ? "Today's session"
                : `Session for ${formatDayOfWeek(selectedDay.date)}`
            }
            subtitle={summaryLines.join(" • ")}
            style={{ marginTop: 16 }}
          >
            {isLoadingWorkout && (
              <Text style={{ fontSize: 13, color: theme.textMuted }}>
                Loading workout…
              </Text>
            )}
            {!isLoadingWorkout && !selectedWorkout && (
              <Text style={{ fontSize: 13, color: theme.textMuted }}>
                No workout generated for this day (rest / low-load day).
              </Text>
            )}
            {!isLoadingWorkout &&
              selectedWorkout &&
              (() => {
                const displayWorkout = normalizeGeneratedWorkout(selectedWorkout);
                return displayWorkout.blocks.map((block, blockIdx) => (
                  <View key={`${block.block_type}-${blockIdx}`} style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {block.title ?? block.block_type}
                    </Text>
                    {block.reasoning ? (
                      <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>
                        {block.reasoning}
                      </Text>
                    ) : null}
                    {block.items.map((item) => (
                      <View key={item.exercise_id} style={styles.exerciseRow}>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {item.exercise_name}
                        </Text>
                        <Text
                          style={[styles.exercisePrescription, { color: theme.textMuted }]}
                        >
                          {formatPrescription(item)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ));
              })()}

            <View style={styles.footer}>
              {selectedDay.status === "planned" ? (
                <>
                  <PrimaryButton
                    label={isUpdatingStatus ? "Updating…" : "Mark completed"}
                    variant="secondary"
                    onPress={() => onUpdateDayStatus("completed")}
                    disabled={isUpdatingStatus}
                  />
                  <PrimaryButton
                    label="Skip"
                    variant="ghost"
                    onPress={() => onUpdateDayStatus("skipped")}
                    disabled={isUpdatingStatus}
                    style={{ marginTop: 8 }}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={isUpdatingStatus ? "Updating…" : "Mark as planned"}
                  variant="ghost"
                  onPress={() => onUpdateDayStatus("planned")}
                  disabled={isUpdatingStatus}
                />
              )}
              <PrimaryButton
                label={isRegenerating ? "Regenerating…" : "Regenerate this day"}
                variant="secondary"
                onPress={onRegenerate}
                disabled={
                  isRegenerating ||
                  (!selectedDay.generatedWorkoutId &&
                    !sportPrepWeekPlan?.guestWorkouts?.[selectedDay.date])
                }
                style={{ marginTop: 8 }}
              />
              <PrimaryButton
                label="Back to Setup"
                variant="ghost"
                onPress={() => router.replace("/adaptive")}
                style={{ marginTop: 8 }}
              />
            </View>
          </Card>
        </NestableScrollContainer>
      </GestureHandlerRootView>
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
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
  },
  dayRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayWeekday: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionReasoning: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  exerciseRow: {
    marginTop: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 16,
  },
});
