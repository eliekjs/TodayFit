import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { themeFonts, themeRadius, useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { SectionLabel } from "../../../components/SectionLabel";
import { SaveNamedPlanModal } from "../../../components/SaveNamedPlanModal";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { WeekDesignationPicker } from "../../../components/WeekDesignationPicker";
import { getTodayLocalDateString } from "../../../lib/dateUtils";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import {
  buildWeekProgressSnapshot,
  formatWeekDayLong,
  markManualWeekDayByWorkoutId,
  markSportWeekDayByPlannedDayId,
  type WeekProgressDay,
} from "../../../lib/weekProgress";
import { editActivePlanHref } from "../../../lib/sessionFlowNav";
import {
  saveDayButtonLabel,
  saveWeekButtonLabel,
  savedDayFingerprint,
  savedPlanDaysFromSportPrep,
  savedWeekFingerprint,
} from "../../../lib/saveNamedPlan";
import { useNamedPlanSave } from "../../../lib/useNamedPlanSave";
import {
  remapManualWeekToStart,
  remapSportPrepWeekToStart,
} from "../../../lib/weekDesignation";

function statusLabel(day: WeekProgressDay): string | null {
  if (day.status === "completed") return "Done";
  if (day.status === "skipped") return "Skipped";
  return null;
}

function DayCard({
  day,
  expanded,
  isNext,
  isToday,
  theme,
  onPress,
}: {
  day: WeekProgressDay;
  expanded: boolean;
  isNext: boolean;
  isToday: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const done = day.status === "completed";
  const skipped = day.status === "skipped";
  const label = statusLabel(day);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.dayRow,
        {
          borderColor: expanded ? theme.primary : theme.border,
          backgroundColor: expanded ? theme.primarySoft : theme.card,
          borderWidth: expanded ? 2 : 1,
          opacity: pressed ? 0.9 : skipped ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.statusCircle,
          {
            borderColor: done ? theme.primary : theme.borderStrong,
            backgroundColor: done ? theme.primary : "transparent",
            borderStyle: done || skipped ? "solid" : "dashed",
          },
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color={theme.onPrimary} />
        ) : skipped ? (
          <Ionicons name="remove" size={14} color={theme.textMuted} />
        ) : null}
      </View>

      <View style={styles.dayTextCol}>
        <View style={styles.dayTitleRow}>
          <Text style={[styles.dayName, { color: theme.text }]}>
            {formatWeekDayLong(day.date)}
          </Text>
          {isToday ? (
            <Text style={[styles.badge, { color: theme.primary, borderColor: theme.primary }]}>
              Today
            </Text>
          ) : null}
          {isNext && !isToday ? (
            <Text style={[styles.badge, { color: theme.primary, borderColor: theme.primary }]}>
              Next up
            </Text>
          ) : null}
          {label ? (
            <Text style={[styles.badge, { color: theme.textMuted, borderColor: theme.border }]}>
              {label}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.dayTitle, { color: theme.textMuted }]} numberOfLines={2}>
          {day.title}
        </Text>
      </View>

      <Ionicons
        name={expanded ? "chevron-down" : "chevron-forward"}
        size={16}
        color={theme.textMuted}
      />
    </Pressable>
  );
}

export default function WorkoutTabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const todayIso = getTodayLocalDateString();
  const {
    manualWeekPlan,
    sportPrepWeekPlan,
    setManualWeekPlan,
    setSportPrepWeekPlan,
    generatedWorkout,
    manualExecutionStarted,
    setGeneratedWorkout,
    setResumeProgress,
    setManualSessionProgress,
    setManualExecutionStarted,
  } = useAppState();
  const {
    dialog: saveDialog,
    busy: saveBusy,
    isSaved,
    requestSaveDay,
    requestSaveWeek,
    confirmSave,
    cancelSave,
  } = useNamedPlanSave();

  const snapshot = useMemo(
    () => buildWeekProgressSnapshot({ manualWeekPlan, sportPrepWeekPlan }),
    [manualWeekPlan, sportPrepWeekPlan]
  );

  const [expandedDayIds, setExpandedDayIds] = useState<Set<string>>(() => new Set());
  const initializedExpandKeyRef = useRef<string | null>(null);

  /** Default-expand next-up once per plan shape; allow collapsing any day afterward. */
  useEffect(() => {
    if (!snapshot) {
      initializedExpandKeyRef.current = null;
      setExpandedDayIds(new Set());
      return;
    }
    const weekKey = `${snapshot.weekStartDate}:${snapshot.days.map((d) => d.id).join(",")}`;
    if (initializedExpandKeyRef.current !== weekKey) {
      initializedExpandKeyRef.current = weekKey;
      const initial = snapshot.nextDay?.id ?? snapshot.days[0]?.id;
      setExpandedDayIds(initial ? new Set([initial]) : new Set());
      return;
    }
    setExpandedDayIds((prev) => {
      const valid = new Set(snapshot.days.map((d) => d.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size && [...next].every((id) => prev.has(id)) ? prev : next;
    });
  }, [snapshot]);

  const toggleDayExpanded = useCallback((dayId: string) => {
    setExpandedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }, []);

  const onChangeDesignatedWeek = useCallback(
    (nextWeekStart: string) => {
      if (manualWeekPlan) {
        setManualWeekPlan(remapManualWeekToStart(manualWeekPlan, nextWeekStart));
        return;
      }
      if (sportPrepWeekPlan) {
        setSportPrepWeekPlan(remapSportPrepWeekToStart(sportPrepWeekPlan, nextWeekStart));
      }
    },
    [manualWeekPlan, sportPrepWeekPlan, setManualWeekPlan, setSportPrepWeekPlan]
  );

  const resumeInProgress = manualExecutionStarted && generatedWorkout != null;

  const startDay = useCallback(
    (day: WeekProgressDay) => {
      if (!day.workout) return;
      setGeneratedWorkout(normalizeGeneratedWorkout(day.workout));
      setResumeProgress(null);
      setManualSessionProgress(null);
      setManualExecutionStarted(true);
      router.push("/manual/execute");
    },
    [
      setGeneratedWorkout,
      setResumeProgress,
      setManualSessionProgress,
      setManualExecutionStarted,
      router,
    ]
  );

  const setDayStatus = useCallback(
    (day: WeekProgressDay, status: "planned" | "skipped") => {
      if (snapshot?.flow === "goal_week" && manualWeekPlan && day.workout) {
        setManualWeekPlan(markManualWeekDayByWorkoutId(manualWeekPlan, day.workout.id, status));
        return;
      }
      if (snapshot?.flow === "sport_week" && sportPrepWeekPlan) {
        setSportPrepWeekPlan(markSportWeekDayByPlannedDayId(sportPrepWeekPlan, day.id, status));
      }
    },
    [
      snapshot?.flow,
      manualWeekPlan,
      sportPrepWeekPlan,
      setManualWeekPlan,
      setSportPrepWeekPlan,
    ]
  );

  if (!snapshot) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <SectionLabel>Your week</SectionLabel>
          <Text style={[styles.heading, { color: theme.text }]}>No active week yet</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Build a week or a single workout from Home, then it will show up here.
          </Text>
          <View style={styles.actions}>
            <PrimaryButton label="Go to Home" onPress={() => router.replace("/")} />
          </View>
        </View>
      </AppScreenWrapper>
    );
  }

  const isSingleDay = snapshot.days.length === 1;
  const saveSource = snapshot.flow === "goal_week" ? "manual" : "adaptive";
  const weekSaveDays =
    snapshot.flow === "goal_week"
      ? (manualWeekPlan?.days ?? [])
      : sportPrepWeekPlan
        ? savedPlanDaysFromSportPrep(sportPrepWeekPlan)
        : [];
  const weekSaveFingerprint = savedWeekFingerprint(snapshot.weekStartDate, weekSaveDays);

  const startLabelForDay = (day: WeekProgressDay): string =>
    day.date === todayIso
      ? "Do this workout now"
      : `Do ${formatWeekDayLong(day.date)}'s workout now`;

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>{isSingleDay ? "Your workout" : "Your week"}</SectionLabel>
        <WeekDesignationPicker
          weekStartDate={snapshot.weekStartDate}
          onChangeWeekStart={onChangeDesignatedWeek}
          label="Designated for"
        />
        <Text style={[styles.progressSummary, { color: theme.textMuted }]}>
          {snapshot.completedCount} of {snapshot.totalCount} workouts complete
        </Text>

        {resumeInProgress ? (
          <Card
            title="You have a workout underway"
            subtitle="Pick up where you left off — your logged sets are still there."
            primaryActionLabel="Resume workout"
            onPrimaryAction={() => router.push("/manual/execute")}
            style={{ marginTop: 4 }}
          />
        ) : null}

        <View style={styles.dayList}>
          {snapshot.days.map((day) => {
            const expanded = expandedDayIds.has(day.id);
            const dayFingerprint =
              day.workout != null ? savedDayFingerprint(day.date, day.workout.id) : null;
            return (
              <View key={day.id}>
                <DayCard
                  day={day}
                  expanded={expanded}
                  isNext={snapshot.nextDay?.id === day.id}
                  isToday={day.date === todayIso}
                  theme={theme}
                  onPress={() => toggleDayExpanded(day.id)}
                />
                {expanded ? (
                  <View style={styles.dayDetail}>
                    {day.workout ? (
                      <WorkoutBlockList workout={normalizeGeneratedWorkout(day.workout)} />
                    ) : (
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                        {day.isSportDay
                          ? "This is a sport day — training happens outside the app."
                          : "No session generated for this day yet."}
                      </Text>
                    )}
                    <View style={styles.dayActions}>
                      <PrimaryButton
                        label={startLabelForDay(day)}
                        onPress={() => startDay(day)}
                        disabled={day.workout == null || day.status === "completed"}
                      />
                      {day.status === "skipped" ? (
                        <PrimaryButton
                          label="Put this day back"
                          variant="secondary"
                          onPress={() => setDayStatus(day, "planned")}
                        />
                      ) : day.status === "planned" ? (
                        <PrimaryButton
                          label="Skip this day"
                          variant="ghost"
                          onPress={() => setDayStatus(day, "skipped")}
                        />
                      ) : null}
                      {dayFingerprint ? (
                        <PrimaryButton
                          label={saveDayButtonLabel({
                            saved: isSaved(dayFingerprint),
                            busy: saveBusy && saveDialog?.kind === "day",
                          })}
                          variant="ghost"
                          onPress={() => {
                            if (!day.workout) return;
                            requestSaveDay({
                              date: day.date,
                              workout: day.workout,
                              weekStartDate: snapshot.weekStartDate,
                              source: saveSource,
                              displayTitle: day.title,
                            });
                          }}
                          disabled={
                            saveBusy || saveDialog != null || isSaved(dayFingerprint)
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Card
          title={isSingleDay ? "Change this workout" : "Change this week"}
          subtitle={
            isSingleDay
              ? "Swap exercises, adjust sets and reps, or rebuild the session."
              : "Move sessions between days, swap exercises, or regenerate a day."
          }
          primaryActionLabel={isSingleDay ? "Edit this workout" : "Edit this week"}
          onPrimaryAction={() => router.push(editActivePlanHref(snapshot.fullWeekRoute) as never)}
        >
          <View style={styles.secondaryActions}>
            <PrimaryButton
              label={saveWeekButtonLabel({
                saved: isSaved(weekSaveFingerprint),
                busy: saveBusy && saveDialog?.kind === "week",
              })}
              variant="secondary"
              onPress={() =>
                requestSaveWeek({
                  weekStartDate: snapshot.weekStartDate,
                  days: weekSaveDays,
                  source: saveSource,
                })
              }
              disabled={
                weekSaveDays.length === 0 ||
                saveBusy ||
                saveDialog != null ||
                isSaved(weekSaveFingerprint)
              }
            />
            <PrimaryButton
              label="Start something different"
              variant="secondary"
              onPress={() => router.replace("/")}
            />
          </View>
        </Card>

        {snapshot.isWeekComplete ? (
          <Card
            title="All done!"
            subtitle="You finished every session in this plan."
            primaryActionLabel="Build your next one"
            onPrimaryAction={() => router.replace("/")}
            style={{ marginTop: 4 }}
          />
        ) : null}
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
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  heading: {
    fontFamily: themeFonts.displayBold,
    fontSize: 22,
    letterSpacing: 0.2,
  },
  progressSummary: {
    fontSize: 14,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  dayList: {
    gap: 10,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: themeRadius.card,
  },
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTextCol: {
    flex: 1,
    gap: 4,
  },
  dayTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  dayDetail: {
    marginTop: 10,
    marginBottom: 4,
    gap: 16,
  },
  dayActions: {
    gap: 10,
  },
  secondaryActions: {
    gap: 10,
    marginTop: 12,
  },
});
