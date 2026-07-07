/**
 * Headless user-flow simulation: pages, taps, and filter changes as a state machine.
 * Validates route/phase/draft expectations and intent↔UI option parity (no browser).
 */

import type { AdaptiveSetup } from "../../context/appStateModel";
import type { ManualPreferences } from "../../lib/types";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";
import { normalizeSubFocusSlug } from "../../data/sportSubFocus/subFocusIntentRegistry";
import { PRIMARY_FOCUS_OPTIONS } from "../../lib/preferencesConstants";
import {
  getSessionResumeRoute,
  inferSessionPhase,
  sessionFlowFromManualScope,
  sessionFlowFromSportScope,
  type SessionFlow,
  type SessionPhase,
  type SportFormSnapshot,
  type WeekSetupDraft,
} from "../../lib/sessionDraft";
import {
  reviewRouteForFlow,
  setupRouteForFlow,
  sportReviewBackRoute,
} from "../../lib/sessionFlowNav";
import type { PersonaFixture } from "./personaSimulationFixtures";
import {
  buildTrainTodayGenerationParams,
  canUseTrainToday,
} from "../../lib/trainToday";
import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus/sportsWithSubFocuses";
import { getCanonicalSportSlug } from "../../data/sportSubFocus/canonicalSportSlug";
import { TARGET_OPTIONS, DURATIONS } from "../../lib/preferencesConstants";

export type FlowActionType =
  | "tap_home_card"
  | "navigate"
  | "set_manual_preferences"
  | "set_sport_form"
  | "set_week_setup"
  | "set_adaptive_setup"
  | "tap_build_workout"
  | "tap_next_week_days"
  | "tap_generate_week"
  | "tap_train_today"
  | "switch_gym_template"
  | "assert_on_screen"
  | "tap_sport"
  | "toggle_subfocus"
  | "tap_body_bias"
  | "tap_duration_chip"
  | "tap_intensity"
  | "tap_primary_goal"
  | "toggle_goal_subfocus"
  | "set_sport_split"
  | "set_injury_status"
  | "assert_cta_enabled"
  | "assert_flow_intent_parity"
  | "assert_gym_template"
  | "tap_start_workout";

export type FlowStep = {
  id: string;
  description: string;
  action: FlowActionType;
  /** Screen the user sees when performing this action. */
  screen?: string;
  /** What the user expects to happen (product language). */
  userExpectation?: string;
  /** Expected route after step (when applicable). */
  expectRoute?: string;
  expectPhase?: SessionPhase;
  /** Patch applied by set_* actions. */
  manualPatch?: Partial<ManualPreferences>;
  sportFormPatch?: Partial<SportFormSnapshot>;
  weekSetupPatch?: Partial<WeekSetupDraft>;
  adaptiveSetup?: AdaptiveSetup | null;
  navigateTo?: string;
  homeCard?: "goal_day" | "goal_week" | "sport_day" | "sport_week";
  gymTemplate?: string;
  sportSlug?: string;
  sportSlot?: 0 | 1;
  subFocusSlug?: string;
  bodyBias?: "upper" | "lower" | "full";
  durationMinutes?: number;
  intensityLevel?: string;
  goalLabel?: string;
  subFocusLabel?: string;
  sportFocusPct?: [number, number];
  injuryStatus?: string;
  injuryTypes?: string[];
  cta?: "build_workout" | "train_today" | "next_week";
};

export type UserFlowScenario = {
  id: string;
  label: string;
  personaId: string;
  flow: SessionFlow;
  testPriority: "P0" | "P1" | "P2";
  steps: FlowStep[];
  /** Narrative for deep simulation reports. */
  userStory?: string;
  expectedUserOutcome?: string;
  sportGoalContext?: SportGoalContext;
};

export type FlowStepTrace = {
  stepId: string;
  screen: string;
  action: FlowActionType;
  description: string;
  routeAfter: string;
  phaseAfter: SessionPhase;
  userExpectation?: string;
  ok: boolean;
  issue?: string;
};

export type FlowIssue = {
  issueId: string;
  category: "flow";
  severity: "critical" | "moderate" | "minor";
  message: string;
  stepId?: string;
  fixScope: "global" | "narrow";
  productPriorityRef: string;
};

export type FlowSimState = {
  route: string;
  flow: SessionFlow | null;
  phase: SessionPhase;
  manualPreferences: ManualPreferences;
  sportForm: SportFormSnapshot | null;
  weekSetup: WeekSetupDraft | null;
  adaptiveSetup: AdaptiveSetup | null;
  gymTemplate: string;
  generatedWorkout: unknown | null;
  manualWeekPlan: { days: unknown[] } | null;
  sportPrepWeekPlan: unknown | null;
  manualExecutionStarted: boolean;
  trainTodayAttempted: boolean;
  trainTodayAllowed: boolean;
};

const EMPTY_SPORT_PREFS: ManualPreferences = {
  primaryFocus: [],
  subFocusByGoal: {},
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
};

function defaultSportForm(): SportFormSnapshot {
  return {
    rankedGoals: [null, null, null],
    intensityLevel: "medium",
    injuryStatus: "none",
    injuryTypes: [],
    sportFocusPct: [60, 40],
    sportVsGoalPct: 55,
    rankedSportSlugs: [null, null],
    subFocusBySport: {},
    oneDayDuration: 45,
    oneDayBodyBias: "lower",
  };
}

function sportSlugsInUi(): Set<string> {
  return new Set(SPORTS_WITH_SUB_FOCUSES.map((s) => getCanonicalSportSlug(s.slug)));
}

function subFocusSlugsForSport(sportSlug: string): Set<string> {
  const canon = getCanonicalSportSlug(sportSlug);
  const row = SPORTS_WITH_SUB_FOCUSES.find((s) => getCanonicalSportSlug(s.slug) === canon);
  return new Set((row?.sub_focuses ?? []).map((sf) => sf.slug));
}

function validateIntentOptions(fixture: PersonaFixture, state: FlowSimState, issues: FlowIssue[]): void {
  for (const label of fixture.manualPreferences.primaryFocus ?? []) {
    if (!PRIMARY_FOCUS_OPTIONS.includes(label as (typeof PRIMARY_FOCUS_OPTIONS)[number])) {
      issues.push({
        issueId: "flow:goal_option_unavailable",
        category: "flow",
        severity: "critical",
        message: `Primary goal "${label}" is not in PRIMARY_FOCUS_OPTIONS — user cannot select this intent in UI`,
        fixScope: "global",
        productPriorityRef: "PRODUCT_PRIORITIES P0#5 goal structure",
      });
    }
  }
  const body = fixture.manualPreferences.targetBody;
  if (body && !TARGET_OPTIONS.includes(body)) {
    issues.push({
      issueId: "flow:body_focus_unavailable",
      category: "flow",
      severity: "moderate",
      message: `Body focus "${body}" not in TARGET_OPTIONS`,
      fixScope: "global",
      productPriorityRef: "PRODUCT_PRIORITIES P0#3 body focus",
    });
  }
  const ctx = fixture.sportGoalContext;
  if (!ctx?.sport_slugs?.length) return;
  const uiSports = sportSlugsInUi();
  for (const slug of ctx.sport_slugs) {
    const canon = getCanonicalSportSlug(slug);
    if (!uiSports.has(canon)) {
      issues.push({
        issueId: "flow:sport_not_in_ui",
        category: "flow",
        severity: "critical",
        message: `Sport "${slug}" not listed in SPORTS_WITH_SUB_FOCUSES — user cannot pick this sport`,
        fixScope: "narrow",
        productPriorityRef: "PRODUCT_PRIORITIES P0#4 sport sub-focus",
      });
    }
    const subs = ctx.sport_sub_focus?.[slug] ?? ctx.sport_sub_focus?.[canon] ?? [];
    const allowed = subFocusSlugsForSport(canon);
    for (const sub of subs) {
      const canonSub = normalizeSubFocusSlug(sub);
      if (!allowed.has(sub) && !allowed.has(canonSub)) {
        issues.push({
          issueId: "flow:sport_subfocus_not_in_ui",
          category: "flow",
          severity: "critical",
          message: `Sub-focus "${sub}" for ${slug} not in sport UI options (${[...allowed].slice(0, 5).join(", ")}…)`,
          fixScope: "narrow",
          productPriorityRef: "PRODUCT_PRIORITIES P0#4 sport sub-focus",
        });
      }
    }
  }
}

function recomputePhase(state: FlowSimState): void {
  if (!state.flow) {
    state.phase = "setup";
    return;
  }
  state.phase = inferSessionPhase({
    flow: state.flow,
    generatedWorkout: state.generatedWorkout,
    manualWeekPlan: state.manualWeekPlan,
    sportPrepWeekPlan: state.sportPrepWeekPlan,
    manualExecutionStarted: state.manualExecutionStarted,
    weekSetup: state.weekSetup,
    adaptiveSetup: state.adaptiveSetup,
  });
}

function draftForResume(state: FlowSimState) {
  return {
    flow: state.flow!,
    phase: state.phase,
    weekSetup: state.weekSetup,
    adaptiveSetup: state.adaptiveSetup,
  };
}

function assertFlowIntentParity(
  fixture: PersonaFixture,
  state: FlowSimState,
  stepId: string,
  issues: FlowIssue[]
): void {
  const ctx = fixture.sportGoalContext;
  if (ctx?.sport_slugs?.length && state.sportForm) {
    const selected = state.sportForm.rankedSportSlugs.filter((s): s is string => s != null);
    for (const slug of ctx.sport_slugs) {
      const canon = getCanonicalSportSlug(slug);
      if (!selected.some((s) => getCanonicalSportSlug(s) === canon)) {
        issues.push({
          issueId: "flow:intent_sport_not_in_form",
          category: "flow",
          severity: "critical",
          message: `After UI flow, sport "${slug}" missing from form — user selection would not reach generator`,
          stepId,
          fixScope: "global",
          productPriorityRef: "PRODUCT_PRIORITIES P0#8 filter transfer",
        });
      }
    }
    for (const [sport, subs] of Object.entries(ctx.sport_sub_focus ?? {})) {
      const formSubs = state.sportForm.subFocusBySport[sport] ?? state.sportForm.subFocusBySport[getCanonicalSportSlug(sport)] ?? [];
      for (const sub of subs) {
        const canonSub = normalizeSubFocusSlug(sub);
        const matched = formSubs.some((fs) => fs === sub || normalizeSubFocusSlug(fs) === canonSub);
        if (!matched) {
          issues.push({
            issueId: "flow:intent_subfocus_not_in_form",
            category: "flow",
            severity: "critical",
            message: `Sub-focus "${sub}" for ${sport} not in form after clicks — generation would miss user intent`,
            stepId,
            fixScope: "global",
            productPriorityRef: "PRODUCT_PRIORITIES P0#4 sport sub-focus",
          });
        }
      }
    }
  }
  if (fixture.manualPreferences.primaryFocus.length > 0) {
    for (const g of fixture.manualPreferences.primaryFocus) {
      if (!state.manualPreferences.primaryFocus.includes(g)) {
        issues.push({
          issueId: "flow:intent_goal_not_in_prefs",
          category: "flow",
          severity: "critical",
          message: `Goal "${g}" not in manualPreferences after goal flow — user selection lost`,
          stepId,
          fixScope: "global",
          productPriorityRef: "PRODUCT_PRIORITIES P0#5 goal structure",
        });
      }
    }
  }
}

function sportCtaReady(state: FlowSimState): boolean {
  const sports = (state.sportForm?.rankedSportSlugs ?? []).filter((s): s is string => s != null);
  return sports.length >= 1;
}

function goalCtaReady(state: FlowSimState): boolean {
  return state.manualPreferences.primaryFocus.length >= 1;
}

export function simulateUserFlow(
  scenario: UserFlowScenario,
  fixture: PersonaFixture
): { state: FlowSimState; issues: FlowIssue[]; stepTraces: FlowStepTrace[] } {
  const issues: FlowIssue[] = [];
  const stepTraces: FlowStepTrace[] = [];
  const state: FlowSimState = {
    route: "/",
    flow: null,
    phase: "setup",
    manualPreferences: { ...EMPTY_SPORT_PREFS, ...fixture.manualPreferences },
    sportForm: defaultSportForm(),
    weekSetup: null,
    adaptiveSetup: null,
    gymTemplate: fixture.gymTemplate ?? "your_gym",
    generatedWorkout: null,
    manualWeekPlan: null,
    sportPrepWeekPlan: null,
    manualExecutionStarted: false,
    trainTodayAttempted: false,
    trainTodayAllowed: false,
  };

  validateIntentOptions(fixture, state, issues);

  if (fixture.sportGoalContext?.sport_slugs?.length) {
    state.sportForm.rankedSportSlugs = [
      fixture.sportGoalContext.sport_slugs[0] ?? null,
      fixture.sportGoalContext.sport_slugs[1] ?? null,
    ];
    state.sportForm.subFocusBySport = { ...(fixture.sportGoalContext.sport_sub_focus ?? {}) };
    state.sportForm.sportVsGoalPct = Math.round((fixture.sportGoalContext.sport_weight ?? 0.55) * 100);
    if (fixture.sportGoalContext.sport_focus_pct) {
      state.sportForm.sportFocusPct = fixture.sportGoalContext.sport_focus_pct;
    }
    state.sportForm.oneDayDuration = fixture.manualPreferences.durationMinutes ?? 45;
    state.sportForm.oneDayBodyBias =
      fixture.manualPreferences.targetBody === "Upper"
        ? "upper"
        : fixture.manualPreferences.targetBody === "Full"
          ? "full"
          : "lower";
  }

  for (const step of scenario.steps) {
    const stepIssuesBefore = issues.length;

    switch (step.action) {
      case "assert_on_screen":
        break;
      case "tap_sport": {
        if (!state.sportForm) state.sportForm = defaultSportForm();
        const slot = step.sportSlot ?? 0;
        const slugs = [...state.sportForm.rankedSportSlugs];
        slugs[slot] = step.sportSlug ?? null;
        state.sportForm.rankedSportSlugs = [slugs[0] ?? null, slugs[1] ?? null];
        break;
      }
      case "toggle_subfocus": {
        if (!state.sportForm) state.sportForm = defaultSportForm();
        const sport = step.sportSlug!;
        const sub = step.subFocusSlug!;
        const existing = state.sportForm.subFocusBySport[sport] ?? [];
        const next = existing.includes(sub) ? existing : [...existing, sub].slice(0, 3);
        state.sportForm.subFocusBySport = { ...state.sportForm.subFocusBySport, [sport]: next };
        break;
      }
      case "tap_body_bias":
        if (state.sportForm) state.sportForm.oneDayBodyBias = step.bodyBias ?? "lower";
        state.manualPreferences.targetBody =
          step.bodyBias === "upper" ? "Upper" : step.bodyBias === "full" ? "Full" : "Lower";
        break;
      case "tap_duration_chip":
        if (state.sportForm) state.sportForm.oneDayDuration = step.durationMinutes ?? 45;
        state.manualPreferences.durationMinutes = step.durationMinutes ?? 45;
        break;
      case "tap_intensity":
        if (state.sportForm) state.sportForm.intensityLevel = step.intensityLevel ?? "Medium";
        state.manualPreferences.energyLevel =
          step.intensityLevel === "Fresh" ? "high" : step.intensityLevel === "Fatigued" ? "low" : "medium";
        break;
      case "tap_primary_goal":
        if (step.goalLabel) {
          state.manualPreferences.primaryFocus = [step.goalLabel];
        }
        break;
      case "toggle_goal_subfocus": {
        const goal = step.goalLabel!;
        const sub = step.subFocusLabel!;
        const existing = state.manualPreferences.subFocusByGoal[goal] ?? [];
        const next = existing.includes(sub) ? existing : [...existing, sub];
        state.manualPreferences.subFocusByGoal = { ...state.manualPreferences.subFocusByGoal, [goal]: next };
        break;
      }
      case "set_sport_split":
        if (state.sportForm && step.sportFocusPct) {
          state.sportForm.sportFocusPct = step.sportFocusPct;
        }
        break;
      case "set_injury_status":
        if (state.sportForm) {
          state.sportForm.injuryStatus = step.injuryStatus ?? "Managing";
          state.sportForm.injuryTypes = step.injuryTypes ?? [];
        }
        state.manualPreferences.injuries = step.injuryTypes?.length ? step.injuryTypes : ["No restrictions"];
        break;
      case "assert_cta_enabled": {
        const cta = step.cta ?? "build_workout";
        const ok =
          cta === "build_workout"
            ? state.flow?.startsWith("sport")
              ? sportCtaReady(state)
              : goalCtaReady(state)
            : cta === "train_today"
              ? canUseTrainToday(state.manualPreferences, state.sportForm, true)
              : true;
        if (!ok) {
          issues.push({
            issueId: "flow:cta_disabled_unexpected",
            category: "flow",
            severity: "critical",
            message: `User expects "${cta}" enabled but prerequisites missing (sport=${sportCtaReady(state)}, goals=${goalCtaReady(state)})`,
            stepId: step.id,
            fixScope: "global",
            productPriorityRef: "PRODUCT_PRIORITIES P0#8 E2E smoke",
          });
        }
        break;
      }
      case "assert_flow_intent_parity":
        assertFlowIntentParity(fixture, state, step.id, issues);
        break;
      case "assert_gym_template":
        if (step.gymTemplate && state.gymTemplate !== step.gymTemplate) {
          issues.push({
            issueId: "flow:gym_template_mismatch",
            category: "flow",
            severity: "critical",
            message: `Expected gym template ${step.gymTemplate}, got ${state.gymTemplate}`,
            stepId: step.id,
            fixScope: "global",
            productPriorityRef: "PRODUCT_PRIORITIES P0#1 equipment",
          });
        }
        break;
      case "tap_start_workout":
        state.manualExecutionStarted = true;
        state.route = "/manual/execute";
        recomputePhase(state);
        break;
      case "tap_home_card": {
        const card = step.homeCard!;
        if (card === "goal_day") {
          state.flow = "goal_day";
          state.route = setupRouteForFlow("goal_day");
        } else if (card === "goal_week") {
          state.flow = "goal_week";
          state.route = setupRouteForFlow("goal_week");
        } else if (card === "sport_day") {
          state.flow = "sport_day";
          state.route = setupRouteForFlow("sport_day");
        } else {
          state.flow = "sport_week";
          state.route = setupRouteForFlow("sport_week");
        }
        recomputePhase(state);
        break;
      }
      case "navigate":
        state.route = step.navigateTo ?? state.route;
        break;
      case "set_manual_preferences":
        state.manualPreferences = { ...state.manualPreferences, ...step.manualPatch };
        break;
      case "set_sport_form": {
        state.sportForm = { ...(state.sportForm ?? defaultSportForm()), ...step.sportFormPatch };
        const ctx = fixture.sportGoalContext;
        if (ctx?.sport_slugs?.length) {
          state.sportForm.rankedSportSlugs = [
            ctx.sport_slugs[0] ?? null,
            ctx.sport_slugs[1] ?? null,
          ];
          state.sportForm.subFocusBySport = { ...(ctx.sport_sub_focus ?? {}) };
          state.sportForm.oneDayDuration = fixture.manualPreferences.durationMinutes ?? 45;
          state.sportForm.oneDayBodyBias =
            fixture.manualPreferences.targetBody === "Upper"
              ? "upper"
              : fixture.manualPreferences.targetBody === "Full"
                ? "full"
                : "lower";
        }
        break;
      }
      case "set_week_setup":
        state.weekSetup = {
          enteredWeekScreen: false,
          step: "pickDays",
          selectedTrainingDays: [],
          dayFocusChoiceIds: [],
          ...(state.weekSetup ?? {}),
          ...step.weekSetupPatch,
        };
        break;
      case "set_adaptive_setup":
        state.adaptiveSetup = step.adaptiveSetup ?? null;
        break;
      case "tap_next_week_days":
        if (state.flow !== "goal_week") {
          issues.push({
            issueId: "flow:wrong_flow_for_week_next",
            category: "flow",
            severity: "moderate",
            message: "Week 'Next: Choose training days' tapped outside goal_week flow",
            stepId: step.id,
            fixScope: "global",
            productPriorityRef: "PRODUCT_PRIORITIES P1#4 weekly dedication",
          });
        } else {
          state.weekSetup = {
            enteredWeekScreen: true,
            step: "pickDays",
            selectedTrainingDays: [0, 1, 3, 4],
            dayFocusChoiceIds: [],
          };
          state.route = "/manual/week";
        }
        recomputePhase(state);
        break;
      case "tap_build_workout":
        if (state.flow === "goal_day") {
          state.generatedWorkout = { stub: true };
          state.route = reviewRouteForFlow("goal_day");
        } else if (state.flow === "sport_day") {
          state.sportPrepWeekPlan = { days: [{ stub: true }] };
          state.generatedWorkout = { stub: true };
          state.route = reviewRouteForFlow("sport_day");
        } else if (state.flow === "sport_week" && state.adaptiveSetup) {
          state.sportPrepWeekPlan = { days: [{ stub: true }] };
          state.route = reviewRouteForFlow("sport_week");
        } else {
          issues.push({
            issueId: "flow:generate_without_prerequisites",
            category: "flow",
            severity: "critical",
            message: `Generate tapped without prerequisites (flow=${state.flow}, adaptiveSetup=${!!state.adaptiveSetup})`,
            stepId: step.id,
            fixScope: "global",
            productPriorityRef: "PRODUCT_PRIORITIES P0#8 E2E smoke",
          });
        }
        recomputePhase(state);
        break;
      case "tap_generate_week":
        state.manualWeekPlan = { days: [{}, {}, {}, {}] };
        state.route = reviewRouteForFlow("goal_week");
        recomputePhase(state);
        break;
      case "tap_train_today":
        state.trainTodayAttempted = true;
        state.trainTodayAllowed = canUseTrainToday(state.manualPreferences, state.sportForm, true);
        if (state.trainTodayAllowed) {
          const { sessionFlow } = buildTrainTodayGenerationParams(
            state.manualPreferences,
            state.sportForm
          );
          state.flow = sessionFlow;
          state.generatedWorkout = { stub: true };
          state.route = "/manual/workout";
          recomputePhase(state);
        }
        break;
      case "switch_gym_template":
        state.gymTemplate = step.gymTemplate ?? state.gymTemplate;
        break;
      default:
        break;
    }

    if (step.expectRoute && state.route !== step.expectRoute) {
      issues.push({
        issueId: "flow:route_mismatch",
        category: "flow",
        severity: "critical",
        message: `Step "${step.id}": expected route ${step.expectRoute}, got ${state.route}`,
        stepId: step.id,
        fixScope: "global",
        productPriorityRef: "PRODUCT_PRIORITIES P0#8 E2E smoke",
      });
    }
    if (step.expectPhase && state.phase !== step.expectPhase) {
      issues.push({
        issueId: "flow:phase_mismatch",
        category: "flow",
        severity: "moderate",
        message: `Step "${step.id}": expected phase ${step.expectPhase}, got ${state.phase}`,
        stepId: step.id,
        fixScope: "global",
        productPriorityRef: "PRODUCT_PRIORITIES P0#8 E2E smoke",
      });
    }

    const newIssues = issues.slice(stepIssuesBefore);
    stepTraces.push({
      stepId: step.id,
      screen: step.screen ?? state.route,
      action: step.action,
      description: step.description,
      routeAfter: state.route,
      phaseAfter: state.phase,
      userExpectation: step.userExpectation,
      ok: newIssues.length === 0 && (!step.expectRoute || state.route === step.expectRoute),
      issue: newIssues[0]?.message,
    });
  }

  if (state.flow) {
    const resume = getSessionResumeRoute(draftForResume(state), state.sportPrepWeekPlan);
    if (state.phase === "review" && state.route !== resume && !state.route.includes("workout")) {
      const back = state.flow.startsWith("sport")
        ? sportReviewBackRoute({ adaptiveSetup: state.adaptiveSetup, sportPrepWeekPlan: state.sportPrepWeekPlan as { scheduleSnapshot?: { gymDaysPerWeek?: number } } })
        : null;
      if (back && !issues.some((i) => i.issueId === "flow:resume_route_drift")) {
        issues.push({
          issueId: "flow:resume_route_drift",
          category: "flow",
          severity: "minor",
          message: `Resume route ${resume} differs from simulated ${state.route}; back=${back ?? "n/a"}`,
          fixScope: "global",
          productPriorityRef: "PRODUCT_PRIORITIES P1 navigation",
        });
      }
    }
  }

  const dur = state.manualPreferences.durationMinutes;
  if (dur != null && !DURATIONS.includes(dur as (typeof DURATIONS)[number])) {
    issues.push({
      issueId: "flow:duration_not_in_ui",
      category: "flow",
      severity: "minor",
      message: `Duration ${dur} not in DURATIONS chips — nearest UI option may drift from intent`,
      fixScope: "global",
      productPriorityRef: "PRODUCT_PRIORITIES P0#6 duration",
    });
  }
  const energy = state.manualPreferences.energyLevel;
  const energyNorm = energy?.toLowerCase() as "low" | "medium" | "high" | undefined;
  if (energyNorm && !["low", "medium", "high"].includes(energyNorm)) {
    issues.push({
      issueId: "flow:energy_not_in_ui",
      category: "flow",
      severity: "minor",
      message: `Energy "${energy}" not in ENERGY_LEVELS`,
      fixScope: "global",
      productPriorityRef: "PRODUCT_PRIORITIES P0#6 energy",
    });
  }

  return { state, issues, stepTraces };
}

/** Canonical flow scenarios mapped to personas (docs/USER_PERSONAS.md). */
export const USER_FLOW_SCENARIOS: UserFlowScenario[] = [
  {
    id: "sport_day_vj",
    label: "Sport one day → filters → generate → review",
    personaId: "P01",
    flow: "sport_day",
    testPriority: "P0",
    steps: [
      { id: "home_sport_day", description: "Today → Sport one day", action: "tap_home_card", homeCard: "sport_day", expectRoute: "/sport-mode?scope=day", expectPhase: "setup" },
      { id: "set_sport_filters", description: "Set sport + sub-focus + body", action: "set_sport_form" },
      { id: "set_duration", description: "Duration / energy", action: "set_manual_preferences", manualPatch: { targetBody: "Lower", durationMinutes: 45, energyLevel: "medium" } },
      { id: "generate", description: "Build workout", action: "tap_build_workout", expectRoute: "/sport-mode/recommendation", expectPhase: "review" },
    ],
  },
  {
    id: "sport_day_multi",
    label: "Multi-sport blend flow",
    personaId: "P02",
    flow: "sport_day",
    testPriority: "P0",
    steps: [
      { id: "home", action: "tap_home_card", homeCard: "sport_day", description: "Sport one day", expectRoute: "/sport-mode?scope=day" },
      { id: "filters", action: "set_sport_form", description: "Basketball + soccer sub-focuses" },
      { id: "generate", action: "tap_build_workout", description: "Generate", expectRoute: "/sport-mode/recommendation", expectPhase: "review" },
    ],
  },
  {
    id: "goal_week_dedicate",
    label: "Goal week → preferences → week planner → generate",
    personaId: "P06",
    flow: "goal_week",
    testPriority: "P0",
    steps: [
      { id: "home_week", action: "tap_home_card", homeCard: "goal_week", description: "Goal this week", expectRoute: "/manual/preferences?scope=week" },
      { id: "prefs", action: "set_manual_preferences", description: "Multi-goal dedicate days" },
      { id: "week_next", action: "tap_next_week_days", description: "Next: training days", expectRoute: "/manual/week" },
      { id: "gen_week", action: "tap_generate_week", description: "Generate week", expectPhase: "review" },
    ],
  },
  {
    id: "train_today_sport_persona",
    label: "Train today from home (sport-only saved prefs)",
    personaId: "P02",
    flow: "goal_day",
    testPriority: "P1",
    steps: [
      { id: "train_today", action: "tap_train_today", description: "Tap Train today with sport-only prefs" },
    ],
  },
  {
    id: "hotel_gym_profile",
    label: "Switch to hotel gym then generate",
    personaId: "P07",
    flow: "sport_day",
    testPriority: "P0",
    steps: [
      { id: "profile", action: "switch_gym_template", description: "Hotel gym profile", gymTemplate: "hotel_gym" },
      { id: "sport", action: "tap_home_card", homeCard: "sport_day", description: "Sport day", expectRoute: "/sport-mode?scope=day" },
      { id: "filters", action: "set_sport_form", description: "Sport filters" },
      { id: "gen", action: "tap_build_workout", description: "Generate", expectPhase: "review" },
    ],
  },
  {
    id: "sport_week_schedule",
    label: "Sport week → schedule → recommendation",
    personaId: "P03",
    flow: "sport_week",
    testPriority: "P0",
    steps: [
      { id: "home", action: "tap_home_card", homeCard: "sport_week", description: "Sport week", expectRoute: "/sport-mode" },
      {
        id: "setup",
        action: "set_adaptive_setup",
        description: "Adaptive setup snapshot",
        adaptiveSetup: {
          rankedGoals: [null, null, null],
          intensityLevel: "medium",
          injuryStatus: "none",
          injuryTypes: [],
          rankedSportSlugs: ["trail_running", null],
          subFocusBySport: { trail_running: ["uphill_endurance"] },
          sportFocusPct: [100, 0],
          sportVsGoalPct: 55,
        },
      },
      { id: "schedule", action: "navigate", description: "Open schedule", navigateTo: "/sport-mode/schedule" },
      { id: "gen", action: "tap_build_workout", description: "Generate week plan", expectRoute: "/sport-mode/recommendation", expectPhase: "review" },
    ],
  },
];

export function pickFlowScenarioForTick(seed: number, tick: number): UserFlowScenario {
  const idx = Math.abs((seed + tick * 31) % USER_FLOW_SCENARIOS.length);
  return USER_FLOW_SCENARIOS[idx]!;
}

export function flowFromPersonaMode(mode: PersonaFixture["mode"]): SessionFlow {
  return mode === "goal_day" ? "goal_day" : "sport_day";
}

export function manualScopeForFlow(flow: SessionFlow): "day" | "week" {
  return flow.endsWith("_week") ? "week" : "day";
}

export { sessionFlowFromManualScope, sessionFlowFromSportScope };
