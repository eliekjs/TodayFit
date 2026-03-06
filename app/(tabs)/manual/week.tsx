import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { saveManualWeek } from "../../../lib/db/weekPlanRepository";
import { getLocalDateString, getTodayLocalDateString } from "../../../lib/dateUtils";
import { isDbConfigured } from "../../../lib/db";
import { generateWorkoutAsync } from "../../../lib/generator";
import {
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "../../../lib/preferencesConstants";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";
import type { ManualWeekPlan } from "../../../lib/types";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateToISO(d: Date): string {
  return getLocalDateString(d);
}

/** 0 = Monday, 6 = Sunday (matches week display order). */
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Flat list item: day header (fixed) or draggable session. */
type WeekListItem =
  | { type: "day-header"; date: string }
  | { type: "session"; date: string; workout: ManualWeekPlan["days"][0]["workout"] };

export default function ManualWeekScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    manualWeekPlan,
    setManualWeekPlan,
    setGeneratedWorkout,
    setResumeProgress,
  } = useAppState();
  const { userId } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which weekdays to generate workouts for. 0 = Mon, 6 = Sun. Default Mon, Wed, Fri. */
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<number[]>([0, 2, 4]);

  const toggleTrainingDay = useCallback((dow: number) => {
    setSelectedTrainingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }, []);

  const generateWeek = useCallback(async () => {
    setError(null);
    setGenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const weekStart = startOfWeekMonday(new Date());
    const weekStartStr = dateToISO(weekStart);

    let preferredNames: string[] | undefined;
    if (isDbConfigured() && manualPreferences.primaryFocus.length > 0) {
      try {
        const goalSlugs = manualPreferences.primaryFocus
          .map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f])
          .filter(Boolean);
        const goalWeightsPct = [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ];
        preferredNames = await getPreferredExerciseNamesForSportAndGoals(
          null,
          goalSlugs,
          goalWeightsPct.slice(0, goalSlugs.length)
        );
      } catch {
        preferredNames = undefined;
      }
    }

    try {
      const days: ManualWeekPlan["days"] = [];
      for (const dow of selectedTrainingDays) {
        const date = addDays(weekStart, dow);
        const workout = await generateWorkoutAsync(
          manualPreferences,
          profile,
          dateToISO(date),
          preferredNames
        );
        days.push({ date: dateToISO(date), workout });
      }
      setManualWeekPlan({ weekStartDate: weekStartStr, days });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setManualWeekPlan,
    selectedTrainingDays,
  ]);

  const todayIso = getTodayLocalDateString();

  /** Week dates Mon–Sun in order. */
  const weekDates = useMemo(() => {
    const plan = manualWeekPlan;
    if (!plan) {
      const start = startOfWeekMonday(new Date());
      return Array.from({ length: 7 }, (_, i) => dateToISO(addDays(start, i)));
    }
    const start = new Date(plan.weekStartDate + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => dateToISO(addDays(start, i)));
  }, [manualWeekPlan]);

  /** Group plan days by date (7 slots Mon–Sun). */
  const daySlots = useMemo(() => {
    if (!manualWeekPlan) return weekDates.map((date) => ({ date, sessions: [] as { date: string; workout: ManualWeekPlan["days"][0]["workout"] }[] }));
    const byDate = new Map<string, { date: string; workout: ManualWeekPlan["days"][0]["workout"] }[]>();
    for (const date of weekDates) byDate.set(date, []);
    for (const day of manualWeekPlan.days) {
      if (byDate.has(day.date)) byDate.get(day.date)!.push(day);
      else byDate.set(day.date, [day]);
    }
    return weekDates.map((date) => ({ date, sessions: byDate.get(date) ?? [] }));
  }, [manualWeekPlan, weekDates]);

  /** Flat list: day header then sessions for each of 7 days. */
  const flatListItems = useMemo((): WeekListItem[] => {
    const out: WeekListItem[] = [];
    for (const slot of daySlots) {
      out.push({ type: "day-header", date: slot.date });
      for (const s of slot.sessions) {
        out.push({ type: "session", date: s.date, workout: s.workout });
      }
    }
    return out;
  }, [daySlots]);

  const onDragEnd = useCallback(
    ({ data }: { data: WeekListItem[] }) => {
      if (!manualWeekPlan || weekDates.length === 0) return;
      let currentDate = weekDates[0];
      const newDays: ManualWeekPlan["days"] = [];
      for (const item of data) {
        if (item.type === "day-header") {
          currentDate = item.date;
        } else {
          newDays.push({ date: currentDate, workout: item.workout });
        }
      }
      setManualWeekPlan({ ...manualWeekPlan, days: newDays });
    },
    [manualWeekPlan, setManualWeekPlan, weekDates]
  );

  const onStartDay = (date: string, workout: ManualWeekPlan["days"][0]["workout"]) => {
    setGeneratedWorkout(workout);
    setResumeProgress(null);
    router.push("/manual/execute");
  };

  const onSaveWeek = async () => {
    const weekPlan = manualWeekPlan;
    if (!weekPlan || !userId || !isDbConfigured()) {
      if (!userId || !isDbConfigured()) {
        setError("Sign in and enable sync to save weeks.");
      }
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveManualWeek(userId, weekPlan.weekStartDate, weekPlan.days);
      setManualWeekPlan(null);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (generating && !manualWeekPlan) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Generating this week's workouts…
        </Text>
      </View>
    );
  }

  if (error && !manualWeekPlan) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <PrimaryButton label="Retry" onPress={generateWeek} />
      </View>
    );
  }

  const plan = manualWeekPlan;

  const renderWeekItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: {
      item: WeekListItem;
      drag: () => void;
      isActive: boolean;
    }) => {
      if (item.type === "day-header") {
        const dateObj = new Date(item.date + "T12:00:00");
        const weekday = dateObj.toLocaleDateString(undefined, { weekday: "long" });
        const isToday = item.date === todayIso;
        return (
          <View style={[styles.dayHeaderRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.dayHeaderText, { color: theme.text }]}>
              {weekday}
            </Text>
            {isToday && (
              <Text style={[styles.todayBadge, { color: theme.primary, borderColor: theme.primary, marginLeft: 8 }]}>
                Today
              </Text>
            )}
          </View>
        );
      }
      const { date, workout } = item;
      const focus = workout.focus.join(" • ") || "General";
      const dur = workout.durationMinutes != null ? `${workout.durationMinutes} min` : "—";
      return (
        <ScaleDecorator>
          <View style={{ marginBottom: 6, marginLeft: 12 }}>
            <Pressable
              onLongPress={drag}
              delayLongPress={200}
              style={[
                styles.dayRow,
                {
                  borderColor: theme.border,
                  backgroundColor: isActive ? theme.primarySoft : theme.card,
                },
              ]}
            >
              <View style={{ paddingVertical: 8, paddingRight: 12, marginLeft: -8 }}>
                <Text style={{ fontSize: 18, color: theme.textMuted }}>⋮⋮</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.dayLabel, { color: theme.text }]} numberOfLines={1}>
                  {focus}
                </Text>
                <Text style={[styles.dayMeta, { color: theme.textMuted }]}>{dur}</Text>
                <PrimaryButton
                  label="Start"
                  onPress={() => !isActive && onStartDay(date, workout)}
                  style={styles.startBtn}
                />
              </View>
            </Pressable>
          </View>
        </ScaleDecorator>
      );
    },
    [theme, todayIso, onStartDay]
  );

  const keyExtractor = useCallback((item: WeekListItem) => {
    if (item.type === "day-header") return `header-${item.date}`;
    return `session-${item.date}-${item.workout.id}`;
  }, []);

  if (!plan || plan.days.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.centered]}
          showsVerticalScrollIndicator={false}
        >
          <Card title="Generate your week" subtitle="Choose which days you want workouts for. You can change this and regenerate anytime.">
            <Text style={{ fontSize: 13, marginBottom: 10, color: theme.textMuted }}>
              Training days
            </Text>
            <View style={styles.chipGroup}>
              {WEEKDAY_LABELS.map((label, dow) => (
                <Chip
                  key={dow}
                  label={label}
                  selected={selectedTrainingDays.includes(dow)}
                  onPress={() => toggleTrainingDay(dow)}
                />
              ))}
            </View>
          </Card>
          {error ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          ) : null}
          <PrimaryButton
            label={generating ? "Generating…" : "Generate week"}
            onPress={generateWeek}
            disabled={generating || selectedTrainingDays.length === 0}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NestableScrollContainer contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.text }]}>
            Week of {new Date(plan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </Text>

          <Card title="Training days" subtitle="Change which days get workouts, then tap Regenerate week to rebuild the plan." style={{ marginTop: 12 }}>
            <View style={styles.chipGroup}>
              {WEEKDAY_LABELS.map((label, dow) => (
                <Chip
                  key={dow}
                  label={label}
                  selected={selectedTrainingDays.includes(dow)}
                  onPress={() => toggleTrainingDay(dow)}
                />
              ))}
            </View>
            <PrimaryButton
              label={generating ? "Regenerating…" : "Regenerate week"}
              variant="ghost"
              onPress={generateWeek}
              disabled={generating}
              style={{ marginTop: 12 }}
            />
          </Card>

          <Card
            title="Week overview"
            style={{ marginTop: 16 }}
            subtitle="Long-press a workout and drag it under a different day to move it."
          >
            <NestableDraggableFlatList
              data={flatListItems}
              keyExtractor={keyExtractor}
              onDragEnd={onDragEnd}
              renderItem={renderWeekItem}
              activationDistance={10}
              scrollEnabled={false}
            />
          </Card>

          <PrimaryButton
            label={saving ? "Saving…" : "Save week"}
            onPress={onSaveWeek}
            variant="secondary"
            style={styles.saveWeekBtn}
            disabled={saving}
          />
          {error ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          ) : null}
        </NestableScrollContainer>
      </GestureHandlerRootView>
    </View>
  );
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  dayHeaderText: {
    fontSize: 15,
    fontWeight: "700",
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  dayMeta: {
    fontSize: 13,
  },
  startBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  saveWeekBtn: {
    marginTop: 24,
  },
});
