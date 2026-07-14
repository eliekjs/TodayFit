/**
 * Deep persona output analysis: filter transfer, expectation contracts, narrative fidelity.
 */

import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import { exerciseMatchesWorkoutTier } from "../../lib/workoutLevel";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../workoutIntelligence/constraints/eligibilityHelpers";
import { validateWorkoutAgainstConstraints } from "../workoutIntelligence/validation/workoutValidator";
import type { Exercise, WorkoutSession } from "../workoutGeneration/types";
import type { GeneratedWorkout } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import type { PersonaFixture } from "./personaSimulationFixtures";
import { singleDayPrefsForPersona } from "./personaSimulationFixtures";
import { multiSportBlendCheck } from "./personaMultiSportSignals";
import {
  expectationsForPersona,
  personaStory,
  type PersonaExpectation,
} from "./personaExpectationContracts";
import {
  buildAssignmentReasoningFromSession,
  buildWeightedAlignmentChecks,
} from "./weightedAlignmentScoring";

export type AnalysisCheck = {
  id: string;
  pass: boolean;
  detail: string;
  weight: number;
  tier: "P0" | "P1";
  category: "transfer" | "structure" | "persona" | "catalog";
};

export type ExpectationResult = {
  expectationId: string;
  label: string;
  dimension: PersonaExpectation["dimension"];
  pass: boolean;
  severity: PersonaExpectation["severity"];
  evidence: string;
};

export type PersonaOutputAnalysis = {
  personaId: string;
  personaName: string;
  story: string;
  score: number;
  band: "high" | "medium" | "low";
  checks: AnalysisCheck[];
  expectationResults: ExpectationResult[];
  failedCheckIds: string[];
  failedExpectations: string[];
  narrativeSummary: string;
  intentFidelity: {
    filterTransfer: number;
    personaIntent: number;
    sessionUsability: number;
  };
  exerciseHighlights: {
    mainWork: string[];
    conditioning: string[];
    concerns: string[];
  };
};

const INTENT_LABEL_PATTERNS =
  /\b(strength|power|unilateral|bilateral|posterior|anterior|plyometric|mobility|stability|conditioning|endurance|hypertrophy)\b/i;

function workoutToSession(workout: GeneratedWorkout): WorkoutSession {
  const title = Array.isArray(workout.focus)
    ? workout.focus.filter(Boolean).join(" · ") || "Workout"
    : String(workout.focus ?? "Workout");
  return {
    title,
    blocks: workout.blocks.map((b) => ({
      block_type: b.block_type,
      title: b.title,
      format: b.format,
      reasoning: b.reasoning,
      estimated_minutes: b.estimated_minutes,
      items: (b.items ?? []).map((item) => ({
        exercise_id: item.exercise_id,
        exercise_name: item.exercise_name,
        sets: item.sets,
        reps: item.reps,
        time_seconds: item.time_seconds,
        rest_seconds: item.rest_seconds,
        coaching_cues: item.coaching_cues ?? "",
        reasoning_tags: item.reasoning_tags ?? [],
        session_intent_links: item.session_intent_links,
      })),
    })),
    estimated_duration_minutes: workout.durationMinutes ?? 45,
  };
}

function looksLikeIntentLabel(name: string): boolean {
  const n = name.trim();
  const exerciseNoun =
    /rdl|press|squat|deadlift|row|curl|lunge|pogo|shuffle|jump|raise|thrust|carry|walk|hold|plank|throw|clean|snatch/i;
  if (!n.includes(" ")) {
    return INTENT_LABEL_PATTERNS.test(n) && !/\d/.test(n) && !exerciseNoun.test(n);
  }
  if (/^(unilateral|bilateral|posterior chain|core stability|single leg)$/i.test(n)) return true;
  const words = n.split(" ");
  if (words.length <= 2 && INTENT_LABEL_PATTERNS.test(n) && !/\d/.test(n)) {
    return !exerciseNoun.test(n);
  }
  return false;
}

function isMainBlock(blockType: string): boolean {
  return blockType === "main_strength" || blockType === "main_hypertrophy" || blockType === "power";
}

function isPlyoOrJump(ex: Exercise, blockType?: string, exerciseName?: string): boolean {
  if (blockType === "power") return true;
  const name = (exerciseName ?? ex.name).toLowerCase();
  if (/pogo|jump|bound|hop|plyo|vertical/.test(name)) return true;
  const tags = [
    ...(ex.tags?.attribute_tags ?? []),
    ...(ex.tags?.stimulus ?? []),
    ex.modality ?? "",
    ex.movement_pattern ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return /plyo|jump|vertical|explosive|bound|hop/.test(tags);
}

function isLegPressFamily(ex: Exercise): boolean {
  return ex.id.toLowerCase().includes("leg_press") || ex.name.toLowerCase().includes("leg press");
}

function isHighImpactPlyo(ex: Exercise): boolean {
  const tags = (ex.tags?.attribute_tags ?? []).join(" ").toLowerCase();
  return /depth_jump|box_jump|plyometric|jump/.test(tags) && /high.?impact|landing/.test(tags);
}

function parseRepMid(reps: string | number | undefined): number | null {
  if (reps == null) return null;
  if (typeof reps === "number") return reps;
  const m = String(reps).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function evaluateExpectations(
  fixture: PersonaFixture,
  workout: GeneratedWorkout,
  poolById: Map<string, Exercise>,
  gym: GymProfile,
  resolvedInput: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>
): ExpectationResult[] {
  const allItems = workout.blocks.flatMap((b) =>
    (b.items ?? []).map((it) => ({ ...it, block_type: b.block_type }))
  );
  const exercises = allItems
    .map((it) => poolById.get(it.exercise_id))
    .filter((ex): ex is Exercise => !!ex);

  const results: ExpectationResult[] = [];

  for (const exp of expectationsForPersona(fixture.id)) {
    let pass = true;
    let evidence = "Criteria met.";

    switch (exp.id) {
      case "plyo_jump_transfer": {
        const hasPlyo = allItems.some((it) => {
          const ex = poolById.get(it.exercise_id);
          return ex ? isPlyoOrJump(ex, it.block_type, it.exercise_name) : /jump|pogo|plyo/i.test(it.exercise_name);
        });
        pass = hasPlyo;
        evidence = pass
          ? `Jump/plyo present (${allItems.filter((it) => /jump|pogo|plyo|bound/i.test(it.exercise_name)).map((i) => i.exercise_name).slice(0, 3).join(", ") || "power blocks"})`
          : "No plyometric or jump-transfer exercises in session";
        break;
      }
      case "no_zone2_on_explosive_day": {
        const zone2 = allItems.filter(
          (it) =>
            it.block_type === "conditioning" &&
            /zone 2|treadmill|steady|long run|aerobic base|tempo run|tempo jog|threshold|cruise interval/i.test(
              it.exercise_name
            )
        );
        pass = zone2.length === 0;
        evidence = pass ? "No steady-state Zone 2 conditioning" : `Zone 2 found: ${zone2.map((i) => i.exercise_name).join(", ")}`;
        break;
      }
      case "multi_sport_representation": {
        const slugs = fixture.sportGoalContext?.sport_slugs ?? [];
        if (slugs.length < 2) {
          pass = true;
          evidence = "Single sport session";
          break;
        }
        const blend = multiSportBlendCheck(
          workout,
          slugs.map((s) => s.toLowerCase()),
          poolById
        );
        pass = blend.pass;
        evidence = blend.evidence;
        break;
      }
      case "no_leg_press_athletic_power": {
        const legPress = allItems.filter(
          (it) =>
            (it.block_type === "power" || isMainBlock(it.block_type)) &&
            (isLegPressFamily(poolById.get(it.exercise_id) ?? ({ id: it.exercise_id, name: it.exercise_name } as Exercise)) ||
              /leg press/i.test(it.exercise_name))
        );
        pass = legPress.length === 0;
        evidence = pass ? "No leg-press in power/main" : legPress.map((i) => i.exercise_name).join(", ");
        break;
      }
      case "hypertrophy_rep_range": {
        const hypoMain = allItems.filter((it) => it.block_type === "main_hypertrophy" || it.block_type === "main_strength");
        const reps = hypoMain.map((it) => parseRepMid(it.reps)).filter((r): r is number => r != null);
        const inRange = reps.filter((r) => r >= 8 && r <= 15).length;
        const median =
          reps.length > 0
            ? [...reps].sort((a, b) => a - b)[Math.floor(reps.length / 2)]!
            : 0;
        pass = reps.length === 0 || (inRange / reps.length >= 0.6 && median >= 10);
        evidence = `main rep samples: ${reps.slice(0, 5).join(", ") || "n/a"} (${inRange}/${reps.length} in 8–15, median ${median})`;
        break;
      }
      case "lower_body_honored": {
        const constraints = resolveWorkoutConstraints(resolvedInput);
        const mainItems = allItems.filter((it) => isMainBlock(it.block_type));
        const match = mainItems.filter((it) => {
          const ex = poolById.get(it.exercise_id);
          return ex ? matchesBodyPartFocus(ex, constraints, it.block_type) : false;
        });
        pass = mainItems.length === 0 || match.length / mainItems.length >= 0.7;
        evidence = `${match.length}/${mainItems.length} main exercises match body focus`;
        break;
      }
      case "hotel_equipment_only": {
        const allowed = new Set(gym.equipment.map(String));
        const bad = allItems.filter((it) => {
          const ex = poolById.get(it.exercise_id);
          return ex?.equipment_required.some((eq) => !allowed.has(String(eq)));
        });
        pass = bad.length === 0;
        evidence = pass ? "All exercises hotel-feasible" : `${bad.length} infeasible: ${bad.map((i) => i.exercise_name).slice(0, 3).join(", ")}`;
        break;
      }
      case "hotel_session_density": {
        pass = workout.blocks.length >= 3 && allItems.length >= 5;
        evidence = `${workout.blocks.length} blocks, ${allItems.length} exercises`;
        break;
      }
      case "joint_health_no_high_impact": {
        const hi = exercises.filter(isHighImpactPlyo);
        pass = hi.length === 0;
        evidence = pass ? "No high-impact plyos" : hi.map((e) => e.name).join(", ");
        break;
      }
      case "injury_contraindications_respected": {
        const constraints = resolveWorkoutConstraints(resolvedInput);
        const session = workoutToSession(workout);
        const validation = validateWorkoutAgainstConstraints(
          { title: session.title, blocks: session.blocks },
          constraints,
          [...poolById.values()]
        );
        pass = !validation.violations.some((v) => v.type === "injury_restriction");
        evidence = pass ? "No injury violations" : validation.violations.map((v) => v.type).join(", ");
        break;
      }
      case "no_intent_label_leak": {
        const leaks = allItems.filter((it) => looksLikeIntentLabel(it.exercise_name));
        pass = leaks.length === 0;
        evidence = pass ? "Catalog names valid" : leaks.map((i) => i.exercise_name).join(", ");
        break;
      }
      case "athletic_not_bodybuilding": {
        const isoCount = allItems.filter(
          (it) =>
            isMainBlock(it.block_type) &&
            /curl|fly|lateral raise|extension|kickback/i.test(it.exercise_name) &&
            !/jump|sprint|throw|bound|shuffle/.test(it.exercise_name)
        ).length;
        const athleticCount = allItems.filter(
          (it) =>
            isMainBlock(it.block_type) &&
            /jump|sprint|throw|bound|shuffle|pogo|clean|snatch|med.?ball/i.test(it.exercise_name)
        ).length;
        pass = athleticCount >= 1 || isoCount < 3;
        evidence = `athletic main=${athleticCount}, isolation main=${isoCount}`;
        break;
      }
      case "train_today_reflects_saved":
        pass = workout.blocks.length >= 3;
        evidence = pass ? "Session generated from saved prefs" : "Empty or trivial session";
        break;
      case "p05_dedicated_day_primary_dominates": {
        const primary = resolvedInput.primary_goal;
        const working = allItems.filter(
          (it) => !["warmup", "cooldown", "mobility", "recovery"].includes(it.block_type)
        );
        const primaryHits = working.filter((it) => {
          const links = it.session_intent_links;
          if (links?.matched_intents?.some((l) => (l.parent_slug ?? l.slug) === primary || l.slug === primary)) {
            return true;
          }
          if (links?.goals?.some((g) => g === primary || g.includes(primary))) {
            return true;
          }
          const tags = (it.reasoning_tags ?? []).join(" ").toLowerCase();
          return tags.includes(primary.replace(/_/g, " ")) || tags.includes(primary);
        }).length;
        const share = primaryHits / Math.max(1, working.length);
        pass = working.length === 0 || share >= 0.25 || workout.blocks.some((b) => /athletic|power|hypertrophy|strength|glute|sprint|jump/i.test(b.title ?? ""));
        evidence = `primary=${primary} tagged_share=${share.toFixed(2)} blocks=${workout.blocks.map((b) => b.title).slice(0, 4).join(" | ")}`;
        break;
      }
      case "p05_athletic_power_not_zone2": {
        const zone2 = allItems.filter(
          (it) =>
            it.block_type === "conditioning" &&
            /zone\s*2|aerobic base|tempo run|tempo jog|cruise interval|long run|steady.?state/i.test(
              it.exercise_name
            )
        );
        pass = zone2.length === 0;
        evidence = pass
          ? "No steady Zone 2 on athletic/power day"
          : `Zone 2 found: ${zone2.map((i) => i.exercise_name).join(", ")}`;
        break;
      }
      default:
        pass = true;
        evidence = "Not evaluated for this persona run";
    }

    results.push({
      expectationId: exp.id,
      label: exp.label,
      dimension: exp.dimension,
      pass,
      severity: exp.severity,
      evidence,
    });
  }

  return results;
}

function buildTransferChecks(
  fixture: PersonaFixture,
  workout: GeneratedWorkout,
  resolvedInput: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>,
  pool: Exercise[],
  poolById: Map<string, Exercise>
): AnalysisCheck[] {
  const session = workoutToSession(workout);
  const constraints = resolveWorkoutConstraints(resolvedInput);
  const validation = validateWorkoutAgainstConstraints(
    { title: session.title, blocks: session.blocks },
    constraints,
    pool
  );
  const checks: AnalysisCheck[] = [];
  const allItems = session.blocks.flatMap((b) =>
    (b.items ?? []).map((it) => ({ ...it, block_type: b.block_type }))
  );

  checks.push({
    id: "hard_constraints",
    pass: validation.violations.length === 0,
    detail: validation.violations.map((v) => v.type).join(", ") || "pass",
    weight: 20,
    tier: "P0",
    category: "transfer",
  });

  const equipFail = allItems.filter((it) => {
    const ex = poolById.get(it.exercise_id);
    return ex ? ex.equipment_required.some((eq) => !resolvedInput.available_equipment.includes(eq)) : false;
  });
  checks.push({
    id: "filter_transfer_equipment",
    pass: equipFail.length === 0,
    detail: equipFail.length ? `${equipFail.length} infeasible` : "pass",
    weight: 8,
    tier: "P0",
    category: "transfer",
  });

  checks.push({
    id: "filter_transfer_injuries_constraints",
    pass: !validation.violations.some((v) => v.type === "injury_restriction"),
    detail: validation.violations.some((v) => v.type === "injury_restriction") ? "injury violation" : "pass",
    weight: 7,
    tier: "P0",
    category: "transfer",
  });

  const mainItems = allItems.filter((it) => isMainBlock(it.block_type));
  const mainFocusMatch = mainItems.filter((it) => {
    const ex = poolById.get(it.exercise_id);
    return ex ? matchesBodyPartFocus(ex, constraints, it.block_type) : false;
  });
  checks.push({
    id: "filter_transfer_body_focus",
    pass: mainItems.length === 0 || mainFocusMatch.length / mainItems.length >= 0.7,
    detail: `main focus ${mainFocusMatch.length}/${Math.max(1, mainItems.length)}`,
    weight: 6,
    tier: "P0",
    category: "transfer",
  });

  const margin = (resolvedInput.duration_minutes ?? 45) <= 30 ? 8 : (resolvedInput.duration_minutes ?? 45) <= 45 ? 12 : 14;
  const est = session.estimated_duration_minutes ?? workout.durationMinutes ?? 0;
  checks.push({
    id: "filter_transfer_duration",
    pass: est <= (resolvedInput.duration_minutes ?? 45) + margin,
    detail: `target=${resolvedInput.duration_minutes} est=${est}`,
    weight: 5,
    tier: "P0",
    category: "transfer",
  });

  const sportMode = !!resolvedInput.sport_slugs?.length;
  const sportCoverage = (workout as GeneratedWorkout & { debug?: { sport_pattern_transfer?: { coverage_ok?: boolean } } }).debug
    ?.sport_pattern_transfer?.coverage_ok;
  checks.push({
    id: "filter_transfer_sport_or_goal_context",
    pass: sportMode ? sportCoverage !== false : (resolvedInput.primary_goal?.length ?? 0) > 0,
    detail: sportMode ? `coverage_ok=${String(sportCoverage ?? "undefined")}` : `goal=${resolvedInput.primary_goal}`,
    weight: 8,
    tier: "P0",
    category: "transfer",
  });

  checks.push({
    id: "structure_minimum_density",
    pass: session.blocks.length >= 3 && allItems.length >= 5,
    detail: `blocks=${session.blocks.length} items=${allItems.length}`,
    weight: 6,
    tier: "P0",
    category: "structure",
  });

  const level = resolvedInput.style_prefs?.user_level;
  const levelItems = allItems.filter((it) => poolById.has(it.exercise_id));
  const levelMatch = level
    ? levelItems.filter((it) => exerciseMatchesWorkoutTier(poolById.get(it.exercise_id)!.workout_level_tags, level)).length
    : levelItems.length;
  checks.push({
    id: "filter_transfer_user_level",
    pass: !level || levelMatch / Math.max(1, levelItems.length) >= 0.75,
    detail: level ? `${levelMatch}/${levelItems.length}` : "n/a",
    weight: 4,
    tier: "P1",
    category: "transfer",
  });

  const assignments = buildAssignmentReasoningFromSession(resolvedInput, session, pool);
  for (const wa of buildWeightedAlignmentChecks(resolvedInput, assignments)) {
    checks.push({
      id: wa.id,
      pass: wa.pass,
      detail: wa.detail,
      weight: wa.weight,
      tier: "P1",
      category: "structure",
    });
  }

  return checks;
}

function scoreAnalysis(checks: AnalysisCheck[], expectations: ExpectationResult[]): {
  score: number;
  band: "high" | "medium" | "low";
} {
  const checkTotal = checks.reduce((a, c) => a + c.weight, 0);
  const checkEarned = checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
  const expTotal = expectations.length * 10;
  const expEarned = expectations.reduce((a, e) => {
    if (e.pass) return a + 10;
    if (e.severity === "critical") return a;
    if (e.severity === "moderate") return a + 4;
    return a + 6;
  }, 0);
  const combined = checkTotal + expTotal;
  const earned = checkEarned + expEarned;
  let score = Math.round((earned / Math.max(1, combined)) * 100);
  const hardFail = checks.find((c) => c.id === "hard_constraints" && !c.pass);
  const critFail = expectations.some((e) => !e.pass && e.severity === "critical");
  if (hardFail || critFail) score = Math.min(score, 64);
  const band = score >= 85 ? "high" : score >= 65 ? "medium" : "low";
  return { score, band };
}

function buildNarrative(
  fixture: PersonaFixture,
  band: string,
  failedChecks: string[],
  failedExp: ExpectationResult[],
  highlights: PersonaOutputAnalysis["exerciseHighlights"]
): string {
  const story = personaStory(fixture);
  const failParts: string[] = [];
  if (failedExp.length) {
    failParts.push(
      `Intent gaps: ${failedExp.map((e) => `${e.label} (${e.evidence})`).join("; ")}`
    );
  }
  if (failedChecks.length) {
    failParts.push(`Transfer failures: ${failedChecks.join(", ")}`);
  }
  const weightedFails = failedChecks.filter((id) => id.startsWith("weighted_alignment"));
  if (weightedFails.length) {
    failParts.push(`Weighted alignment drift: ${weightedFails.join(", ")}`);
  }
  const main = highlights.mainWork.slice(0, 4).join(", ") || "none";
  const tone =
    band === "high"
      ? "Output aligns with persona intent."
      : band === "medium"
        ? "Output partially matches intent — review gaps."
        : "Output does not meet persona expectations.";
  return `${story} ${tone} Main work: ${main}.${failParts.length ? ` ${failParts.join(". ")}.` : ""}`;
}

export function analyzePersonaOutput(
  fixture: PersonaFixture,
  workout: GeneratedWorkout,
  gym: GymProfile,
  pool: Exercise[],
  poolById: Map<string, Exercise>,
  seed: number,
  sportGoalContext?: import("../../lib/dailyGeneratorAdapter").SportGoalContext
): PersonaOutputAnalysis {
  const dayPrefs = singleDayPrefsForPersona(fixture);
  const resolvedInput = manualPreferencesToGenerateWorkoutInput(
    dayPrefs,
    gym,
    seed,
    undefined,
    sportGoalContext ?? fixture.sportGoalContext
  );

  const checks = buildTransferChecks(fixture, workout, resolvedInput, pool, poolById);
  const expectationResults = evaluateExpectations(fixture, workout, poolById, gym, resolvedInput);
  const { score, band } = scoreAnalysis(checks, expectationResults);

  const allItems = workout.blocks.flatMap((b) =>
    (b.items ?? []).map((it) => ({ ...it, block_type: b.block_type }))
  );
  const mainWork = allItems
    .filter((it) => isMainBlock(it.block_type) || it.block_type === "power")
    .map((it) => it.exercise_name)
    .slice(0, 8);
  const conditioning = allItems.filter((it) => it.block_type === "conditioning").map((it) => it.exercise_name);
  const concerns = expectationResults.filter((e) => !e.pass).map((e) => `${e.label}: ${e.evidence}`);

  const transferChecks = checks.filter((c) => c.category === "transfer");
  const transferScore =
    transferChecks.length === 0
      ? 100
      : Math.round(
          (transferChecks.filter((c) => c.pass).reduce((a, c) => a + c.weight, 0) /
            transferChecks.reduce((a, c) => a + c.weight, 0)) *
            100
        );
  const personaScore =
    expectationResults.length === 0
      ? 100
      : Math.round((expectationResults.filter((e) => e.pass).length / expectationResults.length) * 100);
  const usabilityCheck = checks.find((c) => c.id === "structure_minimum_density");

  return {
    personaId: fixture.id,
    personaName: fixture.name,
    story: personaStory(fixture),
    score,
    band,
    checks,
    expectationResults,
    failedCheckIds: checks.filter((c) => !c.pass).map((c) => c.id),
    failedExpectations: expectationResults.filter((e) => !e.pass).map((e) => e.expectationId),
    narrativeSummary: buildNarrative(
      fixture,
      band,
      checks.filter((c) => !c.pass).map((c) => c.id),
      expectationResults.filter((e) => !e.pass),
      { mainWork, conditioning, concerns }
    ),
    intentFidelity: {
      filterTransfer: transferScore,
      personaIntent: personaScore,
      sessionUsability: usabilityCheck?.pass ? 100 : 40,
    },
    exerciseHighlights: { mainWork, conditioning, concerns },
  };
}
