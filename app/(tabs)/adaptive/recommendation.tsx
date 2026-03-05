import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { PlannedDay, PlanWeekResult } from "../../../services/sportPrepPlanner";
import { getWorkout } from "../../../lib/db/workoutRepository";
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

function RowWithShift({
  translateYShared,
  children,
}: {
  translateYShared: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYShared.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const ROW_HEIGHT = 56;

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
  const [draggingDayIndex, setDraggingDayIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const weekListContainerRef = useRef<View>(null);
  const rowLayoutsRef = useRef<Record<number, { y: number; height: number }>>({});
  const containerYRef = useRef(0);
  const dragActivationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActivatedRef = useRef(false);
  const draggingIndexRef = useRef<number>(0);
  const hoverIndexRef = useRef<number>(-1);

  const containerYShared = useSharedValue(0);
  const dragYShared = useSharedValue(0);
  const rowTranslate0 = useSharedValue(0);
  const rowTranslate1 = useSharedValue(0);
  const rowTranslate2 = useSharedValue(0);
  const rowTranslate3 = useSharedValue(0);
  const rowTranslate4 = useSharedValue(0);
  const rowTranslate5 = useSharedValue(0);
  const rowTranslate6 = useSharedValue(0);
  const rowTranslates = useRef([rowTranslate0, rowTranslate1, rowTranslate2, rowTranslate3, rowTranslate4, rowTranslate5, rowTranslate6]).current;

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

  const swapPlanDays = useCallback(
    (plan: PlanWeekResult, fromIndex: number, toIndex: number): PlanWeekResult => {
      const days = [...plan.days];
      const a = days[fromIndex];
      const b = days[toIndex];
      if (!a || !b || fromIndex === toIndex) return plan;

      const newA: PlannedDay = {
        ...a,
        intentLabel: b.intentLabel,
        status: b.status,
        generatedWorkoutId: b.generatedWorkoutId,
      };
      const newB: PlannedDay = {
        ...b,
        intentLabel: a.intentLabel,
        status: a.status,
        generatedWorkoutId: a.generatedWorkoutId,
      };
      days[fromIndex] = newA;
      days[toIndex] = newB;

      let guestWorkouts = plan.guestWorkouts;
      if (guestWorkouts && (guestWorkouts[a.date] != null || guestWorkouts[b.date] != null)) {
        guestWorkouts = { ...guestWorkouts };
        const atA = guestWorkouts[a.date];
        const atB = guestWorkouts[b.date];
        if (atB != null) guestWorkouts[a.date] = atB;
        else delete guestWorkouts[a.date];
        if (atA != null) guestWorkouts[b.date] = atA;
        else delete guestWorkouts[b.date];
      }

      const todayDay = days.find((d) => d.date === todayIso) ?? null;
      const todayWorkout = guestWorkouts?.[todayIso] ?? (todayDay?.date === plan.today?.date ? plan.todayWorkout : undefined);

      return {
        ...plan,
        days,
        guestWorkouts: guestWorkouts ?? plan.guestWorkouts,
        today: todayDay,
        todayWorkout: todayWorkout ?? plan.todayWorkout,
      };
    },
    [todayIso]
  );

  const reorderPlanDays = useCallback(
    (plan: PlanWeekResult, fromIndex: number, toIndex: number): PlanWeekResult => {
      if (fromIndex === toIndex || toIndex < 0 || toIndex > 6) return plan;
      const days = [...plan.days];
      const [removed] = days.splice(fromIndex, 1);
      days.splice(toIndex, 0, removed);
      return { ...plan, days };
    },
    []
  );

  const scheduleDragActivation = useCallback((index: number) => {
    dragActivatedRef.current = false;
    if (dragActivationTimeoutRef.current) clearTimeout(dragActivationTimeoutRef.current);
    dragActivationTimeoutRef.current = setTimeout(() => {
      dragActivatedRef.current = true;
      draggingIndexRef.current = index;
      setDraggingDayIndex(index);
      setHoverIndex(index);
      for (let i = 0; i < 7; i++) rowTranslates[i].value = 0;
      weekListContainerRef.current?.measureInWindow((_x, y) => {
        containerYRef.current = y;
        containerYShared.value = y;
      });
      dragActivationTimeoutRef.current = null;
    }, 400);
  }, [containerYShared]);

  const clearDragActivation = useCallback(() => {
    if (dragActivationTimeoutRef.current) {
      clearTimeout(dragActivationTimeoutRef.current);
      dragActivationTimeoutRef.current = null;
    }
  }, []);

  const ROW_STEP = ROW_HEIGHT + 8;

  const floatingRowAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    transform: [
      { translateY: dragYShared.value - ROW_HEIGHT / 2 },
      { scale: 1.08 },
    ],
  }));

  const updateDragState = useCallback((absoluteY: number) => {
    const D = draggingIndexRef.current;
    const containerY = containerYRef.current;
    const offsetInList = absoluteY - containerY;
    const layouts = rowLayoutsRef.current;
    let H = D;
    for (let i = 0; i < 7; i++) {
      const r = layouts[i];
      if (r && offsetInList >= r.y && offsetInList < r.y + r.height) {
        H = i;
        break;
      }
    }
    hoverIndexRef.current = H;
    setHoverIndex(H);
    const rowStep = layouts[0] ? layouts[0].height + 8 : ROW_STEP;
    for (let i = 0; i < 7; i++) {
      let shift = 0;
      if (D < H) {
        if (i > D && i <= H) shift = -rowStep;
      } else if (D > H) {
        if (i >= H && i < D) shift = rowStep;
      }
      rowTranslates[i].value = shift;
    }
  }, [rowTranslates]);

  const handleWeekDragEnd = useCallback(
    (_absoluteY: number, fromIndex: number) => {
      const didActivate = dragActivatedRef.current;
      const toIndex = hoverIndexRef.current;

      const resetDragState = () => {
        dragYShared.value = 0;
        for (let i = 0; i < 7; i++) {
          rowTranslates[i].value = withTiming(0, { duration: 200 });
        }
        setDraggingDayIndex(null);
        setHoverIndex(-1);
        dragActivatedRef.current = false;
      };

      if (!didActivate || !sportPrepWeekPlan) {
        resetDragState();
        return;
      }
      if (toIndex < 0 || toIndex === fromIndex) {
        resetDragState();
        return;
      }

      setSportPrepWeekPlan(reorderPlanDays(sportPrepWeekPlan, fromIndex, toIndex));
      resetDragState();
    },
    [sportPrepWeekPlan, setSportPrepWeekPlan, reorderPlanDays, rowTranslates]
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={draggingDayIndex === null}
        >
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
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Card title="Week overview" style={{ marginTop: 16 }} subtitle="Long-press the handle, then drag to reorder days.">
            <View
              ref={weekListContainerRef}
              style={{ position: "relative" }}
              onLayout={() => {
                weekListContainerRef.current?.measureInWindow(() => {});
              }}
            >
              {sportPrepWeekPlan.days.map((day, index) => {
                const isToday = day.date === todayIso;
                const isSelected = day.date === selectedDay.date;
                const dateObj = new Date(day.date);
                const weekday = dateObj.toLocaleDateString(undefined, {
                  weekday: "short",
                });
                const label = day.intentLabel ?? "Rest / low-load day";
                const statusBadge = day.status === "completed" ? "Completed" : day.status === "skipped" ? "Skipped" : null;
                const longPressDrag = Gesture.Pan()
                  .minDistance(0)
                  .onStart(() => {
                    runOnJS(scheduleDragActivation)(index);
                  })
                  .onUpdate((e) => {
                    dragYShared.value = e.absoluteY - containerYShared.value;
                    runOnJS(updateDragState)(e.absoluteY);
                  })
                  .onEnd((e) => {
                    runOnJS(clearDragActivation)();
                    runOnJS(handleWeekDragEnd)(e.absoluteY, index);
                  })
                  .onFinalize(() => {
                    runOnJS(clearDragActivation)();
                  });

                if (draggingDayIndex === index) {
                  return (
                    <View
                      key={day.id}
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        rowLayoutsRef.current[index] = { y, height };
                      }}
                      style={{ minHeight: ROW_HEIGHT, marginBottom: 8 }}
                    />
                  );
                }

                return (
                  <RowWithShift key={day.id} translateYShared={rowTranslates[index]}>
                    <View
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        rowLayoutsRef.current[index] = { y, height };
                      }}
                    >
                      <Pressable
                        onPress={() => onSelectDate(day.date)}
                        style={[
                          styles.dayRow,
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.primarySoft : "transparent",
                          },
                        ]}
                      >
                        <GestureDetector gesture={longPressDrag}>
                          <View style={{ paddingVertical: 8, paddingRight: 12, marginLeft: -8 }}>
                            <Text style={{ fontSize: 18, color: theme.textMuted }}>⋮⋮</Text>
                          </View>
                        </GestureDetector>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text
                              style={[
                                styles.dayWeekday,
                                { color: theme.text, opacity: isToday ? 1 : 0.85 },
                              ]}
                            >
                              {weekday}
                            </Text>
                            {isToday && (
                              <Text
                                style={[
                                  styles.todayBadge,
                                  { color: theme.primary, borderColor: theme.primary },
                                ]}
                              >
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
                          <Text
                            style={[styles.dayLabel, { color: theme.textMuted }]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </RowWithShift>
                );
              })}
              {draggingDayIndex !== null && (() => {
                const day = sportPrepWeekPlan.days[draggingDayIndex];
                const isToday = day.date === todayIso;
                const dateObj = new Date(day.date);
                const weekday = dateObj.toLocaleDateString(undefined, { weekday: "short" });
                const label = day.intentLabel ?? "Rest / low-load day";
                const statusBadge = day.status === "completed" ? "Completed" : day.status === "skipped" ? "Skipped" : null;
                return (
                  <Animated.View
                    style={[
                      styles.dayRow,
                      floatingRowAnimatedStyle,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        borderColor: theme.primary,
                        backgroundColor: theme.primarySoft,
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 8,
                      },
                    ]}
                  >
                    <View style={{ paddingVertical: 8, paddingRight: 12, marginLeft: -8 }}>
                      <Text style={{ fontSize: 18, color: theme.textMuted }}>⋮⋮</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={[styles.dayWeekday, { color: theme.text }]}>{weekday}</Text>
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
                  </Animated.View>
                );
              })()}
            </View>
        </Card>

        <Card
          title={
            selectedDay.date === todayIso
              ? "Today's session"
              : `Session for ${selectedDay.date}`
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
                  <Text
                    style={[styles.sectionTitle, { color: theme.text }]}
                  >
                    {block.title ?? block.block_type}
                  </Text>
                  {block.reasoning ? (
                    <Text
                      style={[
                        styles.sectionReasoning,
                        { color: theme.textMuted },
                      ]}
                    >
                      {block.reasoning}
                    </Text>
                  ) : null}
                  {block.items.map((item) => (
                    <View key={item.exercise_id} style={styles.exerciseRow}>
                      <Text
                        style={[styles.exerciseName, { color: theme.text }]}
                      >
                        {item.exercise_name}
                      </Text>
                      <Text
                        style={[
                          styles.exercisePrescription,
                          { color: theme.textMuted },
                        ]}
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
              label={
                isRegenerating
                  ? "Regenerating…"
                  : "Regenerate this day"
              }
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
        </ScrollView>
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
