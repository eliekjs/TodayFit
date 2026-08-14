import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { themeRadius, useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { SaveNamedPlanModal } from "../../../components/SaveNamedPlanModal";
import { Card } from "../../../components/Card";
import { SectionLabel } from "../../../components/SectionLabel";
import { getTodayLocalDateString } from "../../../lib/dateUtils";
import {
  buildWeekProgressSnapshot,
  formatWeekDayLong,
  formatWeekRangeLabel,
  markManualWeekDayByWorkoutId,
  markSportWeekDayByPlannedDayId,
  type WeekProgressDay,
} from "../../../lib/weekProgress";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import {
  saveDayButtonLabel,
  saveWeekButtonLabel,
  savedDayFingerprint,
  savedPlanDaysFromSportPrep,
  savedWeekFingerprint,
} from "../../../lib/saveNamedPlan";
import { useNamedPlanSave } from "../../../lib/useNamedPlanSave";

function DayRow({
  day,
  isNext,
  isToday,
  theme,
  saveLabel,
  saveDisabled,
  onSave,
}: {
  day: WeekProgressDay;
  isNext: boolean;
  isToday: boolean;
  theme: ReturnType<typeof useTheme>;
  saveLabel?: string;
  saveDisabled?: boolean;
  onSave?: () => void;
}) {
  const isComplete = day.status === "completed";
  const isSkipped = day.status === "skipped";

  return (
    <View
      style={[
        styles.dayRow,
        {
          borderColor: isNext ? theme.primary : theme.border,
          backgroundColor: isNext ? theme.primarySoft : theme.card,
        },
      ]}
    >
      <View
        style={[
          styles.statusCircle,
          {
          borderColor: isComplete ? theme.primary : theme.borderStrong,
          backgroundColor: isComplete ? theme.primary : "transparent",
          borderStyle: isComplete || isSkipped ? "solid" : "dashed",
        },
      ]}
      >
        {isComplete ? (
          <Ionicons name="checkmark" size={16} color={theme.onPrimary} />
        ) : isSkipped ? (
          <Ionicons name="remove" size={14} color={theme.textMuted} />
        ) : null}
      </View>

      <View style={styles.dayTextCol}>
        <View style={styles.dayTitleRow}>
          <Text style={[styles.dayName, { color: theme.text }]}>{formatWeekDayLong(day.date)}</Text>
          {isToday ? (
            <Text style={[styles.badge, { color: theme.primary, borderColor: theme.primary }]}>
              Today
            </Text>
          ) : null}
          {isNext ? (
            <Text style={[styles.badge, { color: theme.primary, borderColor: theme.primary }]}>
              Next up
            </Text>
          ) : null}
        </View>
        <Text style={[styles.dayTitle, { color: theme.textMuted }]} numberOfLines={2}>
          {day.title}
        </Text>
        {isSkipped ? (
          <Text style={[styles.skippedLabel, { color: theme.textMuted }]}>Skipped</Text>
        ) : null}
      </View>
      {onSave && saveLabel ? (
        <PrimaryButton
          label={saveLabel}
          variant="secondary"
          compact
          onPress={onSave}
          disabled={saveDisabled}
          style={styles.daySaveBtn}
        />
      ) : null}
    </View>
  );
}

export default function WeekProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const todayIso = getTodayLocalDateString();
  const {
    manualWeekPlan,
    sportPrepWeekPlan,
    setManualWeekPlan,
    setSportPrepWeekPlan,
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

  const onStartNext = useCallback(() => {
    if (!snapshot?.nextDay) return;
    const next = snapshot.nextDay;

    if (snapshot.flow === "goal_week" && next.workout) {
      setGeneratedWorkout(next.workout);
      setResumeProgress(null);
      setManualSessionProgress(null);
      setManualExecutionStarted(true);
      router.push("/manual/execute");
      return;
    }

    if (snapshot.flow === "sport_week" && next.workout && next.plannedDay) {
      setGeneratedWorkout(normalizeGeneratedWorkout(next.workout));
      setResumeProgress(null);
      setManualSessionProgress(null);
      setManualExecutionStarted(true);
      router.push("/manual/execute");
      return;
    }

    router.push(snapshot.fullWeekRoute as never);
  }, [
    snapshot,
    setGeneratedWorkout,
    setResumeProgress,
    setManualSessionProgress,
    setManualExecutionStarted,
    router,
  ]);

  const onSkipNext = useCallback(() => {
    if (!snapshot?.nextDay) return;
    const next = snapshot.nextDay;

    if (snapshot.flow === "goal_week" && manualWeekPlan && next.workout) {
      setManualWeekPlan(markManualWeekDayByWorkoutId(manualWeekPlan, next.workout.id, "skipped"));
      return;
    }

    if (snapshot.flow === "sport_week" && sportPrepWeekPlan && next.plannedDay) {
      setSportPrepWeekPlan(
        markSportWeekDayByPlannedDayId(sportPrepWeekPlan, next.plannedDay.id, "skipped")
      );
    }
  }, [snapshot, manualWeekPlan, sportPrepWeekPlan, setManualWeekPlan, setSportPrepWeekPlan]);

  if (!snapshot) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={[styles.centered, styles.container]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No week plan in progress. Build a week from Today to get started.
          </Text>
          <PrimaryButton label="Go to Today" onPress={() => router.replace("/")} />
        </View>
      </AppScreenWrapper>
    );
  }

  const nextDay = snapshot.nextDay;
  const startLabel = nextDay
    ? nextDay.hasGymWorkout
      ? `Start ${formatWeekDayLong(nextDay.date)}'s workout`
      : `Open ${formatWeekDayLong(nextDay.date)}`
    : snapshot.isWeekComplete
      ? "Week complete"
      : "View full week";
  const saveSource = snapshot.flow === "goal_week" ? "manual" : "adaptive";
  const weekSaveDays =
    snapshot.flow === "goal_week"
      ? (manualWeekPlan?.days ?? [])
      : sportPrepWeekPlan
        ? savedPlanDaysFromSportPrep(sportPrepWeekPlan)
        : [];
  const weekSaveFingerprint = savedWeekFingerprint(snapshot.weekStartDate, weekSaveDays);

  const onSaveDay = (day: WeekProgressDay) => {
    if (!day.workout) return;
    requestSaveDay({
      date: day.date,
      workout: day.workout,
      weekStartDate: snapshot.weekStartDate,
      source: saveSource,
      displayTitle: day.title,
    });
  };

  const onSaveWeek = () => {
    requestSaveWeek({
      weekStartDate: snapshot.weekStartDate,
      days: weekSaveDays,
      source: saveSource,
    });
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>This week</SectionLabel>
        <Text
          style={[
            styles.heading,
            { color: theme.text },
          ]}
        >
          {formatWeekRangeLabel(snapshot.weekStartDate)}
        </Text>
        <Text style={[styles.progressSummary, { color: theme.textMuted }]}>
          {snapshot.completedCount} of {snapshot.totalCount} workouts complete
        </Text>

        <View style={styles.heatmap}>
          {snapshot.days.map((day) => {
            const filled = day.status === "completed";
            const letter = formatWeekDayLong(day.date).charAt(0);
            return (
              <View key={`heat-${day.id}`} style={styles.heatmapCellWrap}>
                <Text style={[styles.heatmapLabel, { color: theme.textMuted }]}>{letter}</Text>
                <View
                  style={[
                    styles.heatmapCell,
                    {
                      backgroundColor: filled ? theme.primary : theme.secondarySoft,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.dayList}>
          {snapshot.days.map((day) => {
            const fingerprint =
              day.status === "completed" && day.workout
                ? savedDayFingerprint(day.date, day.workout.id)
                : null;
            return (
              <DayRow
                key={day.id}
                day={day}
                isNext={nextDay?.id === day.id}
                isToday={day.date === todayIso}
                theme={theme}
                saveLabel={
                  fingerprint
                    ? saveDayButtonLabel({
                        saved: isSaved(fingerprint),
                        busy: saveBusy && saveDialog?.fingerprint === fingerprint,
                        compact: true,
                      })
                    : undefined
                }
                saveDisabled={
                  !fingerprint || saveBusy || saveDialog != null || isSaved(fingerprint)
                }
                onSave={fingerprint ? () => onSaveDay(day) : undefined}
              />
            );
          })}
        </View>

        {snapshot.isWeekComplete ? (
          <Card
            title="All done!"
            subtitle="You finished every session this week."
            primaryActionLabel="Back to Today"
            onPrimaryAction={() => router.replace("/")}
          />
        ) : null}

        <View style={styles.actions}>
          {!snapshot.isWeekComplete && nextDay ? (
            <>
              <PrimaryButton
                label={startLabel}
                onPress={onStartNext}
                disabled={!nextDay.hasGymWorkout && snapshot.flow === "goal_week"}
              />
              {nextDay.hasGymWorkout || snapshot.flow === "sport_week" ? (
                <Pressable onPress={onSkipNext} style={styles.skipLink}>
                  <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip this day</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          <PrimaryButton
            label="View full week"
            variant="secondary"
            onPress={() => router.push(snapshot.fullWeekRoute as never)}
          />
          <PrimaryButton
            label={saveWeekButtonLabel({
              saved: isSaved(weekSaveFingerprint),
              busy: saveBusy && saveDialog?.kind === "week",
            })}
            variant="secondary"
            onPress={onSaveWeek}
            disabled={
              weekSaveDays.length === 0 ||
              saveBusy ||
              saveDialog != null ||
              isSaved(weekSaveFingerprint)
            }
          />
        </View>
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
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 15,
    marginBottom: 4,
  },
  progressSummary: {
    fontSize: 14,
    marginBottom: 4,
  },
  heatmap: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  heatmapCellWrap: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  heatmapLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heatmapCell: {
    width: "100%",
    height: 18,
    borderRadius: 8,
  },
  dayList: {
    gap: 10,
    marginBottom: 20,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: themeRadius.card,
    borderWidth: 1,
  },
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dayTextCol: {
    flex: 1,
    gap: 4,
  },
  daySaveBtn: {
    minWidth: 76,
    paddingHorizontal: 10,
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
  skippedLabel: {
    fontSize: 12,
    fontStyle: "italic",
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  skipLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
