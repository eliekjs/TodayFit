/**
 * Persona-driven user simulation loop harness.
 *
 * Picks a canonical persona (docs/USER_PERSONAS.md), runs app-parity generation,
 * scores against workout-simulation-validation-rules.md + persona success criteria,
 * and accumulates fix candidates for priority ranking.
 *
 * Usage:
 *   npx tsx scripts/personaLoopSimulation.ts [seed] [--tick N] [--max-ticks 6]
 *
 * Loop (10m × 1h = 6 ticks):
 *   bash scripts/persona-loop-scheduler.sh
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../lib/generator";
import { manualPreferencesToGenerateWorkoutInput } from "../lib/dailyGeneratorAdapter";
import { exerciseMatchesWorkoutTier } from "../lib/workoutLevel";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import { validateWorkoutAgainstConstraints } from "../logic/workoutIntelligence/validation/workoutValidator";
import type { Exercise, WorkoutSession } from "../logic/workoutGeneration/types";
import type { GeneratedWorkout } from "../lib/types";
import {
  gymForPersona,
  pickPersonaForLoop,
  type PersonaFixture,
  type PersonaTestPriority,
} from "../logic/workoutGeneration/personaSimulationFixtures";
import { multiSportBlendCheck } from "../logic/workoutGeneration/personaMultiSportSignals";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "persona-loop");
const AGGREGATE_PATH = path.join(ARTIFACTS_DIR, "aggregate.json");

type CheckResult = {
  id: string;
  pass: boolean;
  detail: string;
  weight: number;
  tier: "P0" | "P1" | "P2";
};

type PersonaIssue = {
  personaId: string;
  personaName: string;
  testPriority: PersonaTestPriority;
  issueId: string;
  severity: "critical" | "moderate" | "minor";
  message: string;
  fixScope: "global" | "narrow";
  productPriorityRef: string;
  tick: number;
  seed: number;
};

type TickReport = {
  tick: number;
  seed: number;
  persona: { id: string; name: string; testPriority: PersonaTestPriority; mode: string };
  score: number;
  band: "high" | "medium" | "low";
  summary: string;
  failedChecks: string[];
  personaIssues: PersonaIssue[];
  topFixesThisTick: Array<{ rank: number; issueId: string; message: string }>;
};

type AggregateState = {
  startedAt: string;
  ticks: TickReport[];
  issueCounts: Record<string, { count: number; severity: string; message: string; personaIds: string[] }>;
  topFixes: Array<{ rank: number; issueId: string; message: string; score: number }>;
};

const INTENT_LABEL_PATTERNS =
  /\b(strength|power|unilateral|bilateral|posterior|anterior|plyometric|mobility|stability|conditioning|endurance|hypertrophy)\b/i;

function workoutToSession(workout: GeneratedWorkout): WorkoutSession {
  return {
    title: workout.focus,
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
        reasoning_tags: item.reasoning_tags ?? [],
        session_intent_links: item.session_intent_links,
      })),
    })),
    estimated_duration_minutes: workout.durationMinutes,
    notes: workout.notes,
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
  const id = ex.id.toLowerCase();
  const name = ex.name.toLowerCase();
  return id.includes("leg_press") || name.includes("leg press");
}

function isHighImpactPlyo(ex: Exercise): boolean {
  const tags = (ex.tags?.attribute_tags ?? []).join(" ").toLowerCase();
  return /depth_jump|box_jump|plyometric|jump/.test(tags) && /high.?impact|landing/.test(tags);
}

function buildChecks(
  fixture: PersonaFixture,
  workout: GeneratedWorkout,
  resolvedInput: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>,
  pool: Exercise[],
  poolById: Map<string, Exercise>
): CheckResult[] {
  const session = workoutToSession(workout);
  const constraints = resolveWorkoutConstraints(resolvedInput);
  const validation = validateWorkoutAgainstConstraints(
    { title: session.title, blocks: session.blocks },
    constraints,
    pool
  );
  const checks: CheckResult[] = [];

  checks.push({
    id: "hard_constraints",
    pass: validation.violations.length === 0,
    detail: validation.violations.map((v) => v.type).join(", ") || "pass",
    weight: 20,
    tier: "P0",
  });

  const allItems = session.blocks.flatMap((b) =>
    (b.items ?? []).map((it) => ({ ...it, block_type: b.block_type }))
  );

  const equipFail = allItems.filter((it) => {
    const ex = poolById.get(it.exercise_id);
    return ex ? ex.equipment_required.some((eq) => !resolvedInput.available_equipment.includes(eq)) : false;
  });
  checks.push({
    id: "filter_transfer_equipment",
    pass: equipFail.length === 0,
    detail: equipFail.length ? `${equipFail.length} infeasible` : "pass",
    weight: 6,
    tier: "P0",
  });

  checks.push({
    id: "filter_transfer_injuries_constraints",
    pass: !validation.violations.some((v) => v.type === "injury_restriction"),
    detail: validation.violations.some((v) => v.type === "injury_restriction") ? "injury violation" : "pass",
    weight: 5,
    tier: "P0",
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
    weight: 5,
    tier: "P0",
  });

  const margin = (resolvedInput.duration_minutes ?? 45) <= 30 ? 8 : (resolvedInput.duration_minutes ?? 45) <= 45 ? 12 : 14;
  const est = session.estimated_duration_minutes ?? workout.durationMinutes ?? 0;
  checks.push({
    id: "filter_transfer_duration",
    pass: est <= (resolvedInput.duration_minutes ?? 45) + margin,
    detail: `target=${resolvedInput.duration_minutes} est=${est}`,
    weight: 4,
    tier: "P0",
  });

  const level = resolvedInput.style_prefs?.user_level;
  const levelItems = allItems.filter((it) => poolById.has(it.exercise_id));
  const levelMatch = level
    ? levelItems.filter((it) => {
        const ex = poolById.get(it.exercise_id)!;
        return exerciseMatchesWorkoutTier(ex.workout_level_tags, level);
      }).length
    : levelItems.length;
  checks.push({
    id: "filter_transfer_user_level",
    pass: !level || levelMatch / Math.max(1, levelItems.length) >= 0.75,
    detail: level ? `${levelMatch}/${levelItems.length}` : "n/a",
    weight: 3,
    tier: "P1",
  });

  const sportMode = !!resolvedInput.sport_slugs?.length;
  const sportCoverage = (workout as GeneratedWorkout & { debug?: { sport_pattern_transfer?: { coverage_ok?: boolean } } }).debug
    ?.sport_pattern_transfer?.coverage_ok;
  checks.push({
    id: "filter_transfer_sport_or_goal_context",
    pass: sportMode ? sportCoverage !== false : (resolvedInput.primary_goal?.length ?? 0) > 0,
    detail: sportMode ? `coverage_ok=${String(sportCoverage ?? "undefined")}` : `goal=${resolvedInput.primary_goal}`,
    weight: 6,
    tier: "P0",
  });

  const catalogInvalid = allItems.filter((it) => {
    const ex = poolById.get(it.exercise_id);
    if (!ex) return true;
    return looksLikeIntentLabel(it.exercise_name);
  });
  checks.push({
    id: "exercise_catalog_validity",
    pass: catalogInvalid.length === 0,
    detail: catalogInvalid.length ? `${catalogInvalid.length} invalid names` : "pass",
    weight: 8,
    tier: "P0",
  });

  checks.push({
    id: "structure_minimum_density",
    pass: session.blocks.length >= 3 && allItems.length >= 5,
    detail: `blocks=${session.blocks.length} items=${allItems.length}`,
    weight: 6,
    tier: "P0",
  });

  return checks;
}

function evaluatePersonaSignals(
  fixture: PersonaFixture,
  workout: GeneratedWorkout,
  poolById: Map<string, Exercise>,
  tick: number,
  seed: number
): PersonaIssue[] {
  const issues: PersonaIssue[] = [];
  const allItems = workout.blocks.flatMap((b) =>
    (b.items ?? []).map((it) => ({ ...it, block_type: b.block_type }))
  );
  const exercises = allItems
    .map((it) => poolById.get(it.exercise_id))
    .filter((ex): ex is Exercise => !!ex);

  const addIssue = (
    issueId: string,
    severity: PersonaIssue["severity"],
    message: string,
    fixScope: PersonaIssue["fixScope"],
    productPriorityRef: string
  ) => {
    issues.push({
      personaId: fixture.id,
      personaName: fixture.name,
      testPriority: fixture.testPriority,
      issueId,
      severity,
      message,
      fixScope,
      productPriorityRef,
      tick,
      seed,
    });
  };

  if (fixture.id === "P01") {
    const hasPlyo = allItems.some((it) => {
      const ex = poolById.get(it.exercise_id);
      return ex ? isPlyoOrJump(ex, it.block_type, it.exercise_name) : /jump|pogo|plyo/i.test(it.exercise_name);
    });
    const zone2Conditioning = allItems.filter(
      (it) =>
        it.block_type === "conditioning" &&
        /zone 2|treadmill|steady|long run|aerobic base|tempo run|tempo jog|threshold|cruise interval/i.test(it.exercise_name)
    );
    if (zone2Conditioning.length > 0) {
      addIssue(
        "P01:zone2_on_power_day",
        "moderate",
        `P01: Zone 2 steady-state conditioning on vertical-jump day (${zone2Conditioning.map((i) => i.exercise_name).join(", ")})`,
        "global",
        "PRODUCT_PRIORITIES P0#4 sport sub-focus + P1#4 prescription"
      );
    }
    const upperHypertrophyMain = allItems.filter(
      (it) =>
        isMainBlock(it.block_type) &&
        /press|row|curl|fly|lateral raise/i.test(it.exercise_name) &&
        fixture.manualPreferences.targetBody === "Lower"
    );
    if (!hasPlyo) {
      addIssue(
        "P01:no_plyo_jump_pattern",
        "critical",
        "P01: Vertical jump session lacks plyometric/jump-transfer exercises",
        "global",
        "PRODUCT_PRIORITIES P0#4 sport sub-focus"
      );
    }
    if (upperHypertrophyMain.length >= 2) {
      addIssue(
        "P01:upper_on_lower_day",
        "moderate",
        "P01: Heavy upper hypertrophy on lower-body day",
        "global",
        "PRODUCT_PRIORITIES P0#3 body focus"
      );
    }
  }

  if (fixture.id === "P02") {
    const slugs = fixture.sportGoalContext?.sport_slugs ?? [];
    const blend = multiSportBlendCheck(workout, slugs, poolById);
    if (!blend.pass) {
      addIssue(
        "P02:single_sport_dominance",
        "moderate",
        `P02: Multi-sport blend not reflected (${blend.evidence})`,
        "global",
        "PRODUCT_PRIORITIES P1#2 multi-sport blend"
      );
    }
    const legPressInPower = allItems.filter(
      (it) =>
        (it.block_type === "power" || isMainBlock(it.block_type)) &&
        (isLegPressFamily(poolById.get(it.exercise_id) ?? ({ id: it.exercise_id, name: it.exercise_name } as Exercise)) ||
          /leg press/i.test(it.exercise_name))
    );
    if (legPressInPower.length > 0) {
      addIssue(
        "P02:leg_press_in_athletic_block",
        "moderate",
        `P02: Leg-press family in athletic power/main work (${legPressInPower.map((i) => i.exercise_name).join(", ")})`,
        "global",
        "PRODUCT_PRIORITIES P1#1 sport vs bodybuilding tone"
      );
    }
  }

  if (fixture.id === "P04") {
    const legPressCount = exercises.filter(isLegPressFamily).length;
    if (legPressCount > 0) {
      addIssue(
        "P04:leg_press_family",
        "moderate",
        `P04: Leg-press family present (${legPressCount}) on climbing day`,
        "narrow",
        "PRODUCT_PRIORITIES P1#1 sport tone — climbing profile"
      );
    }
  }

  if (fixture.id === "P07") {
    const infeasible = allItems.filter((it) => {
      const ex = poolById.get(it.exercise_id);
      return ex?.equipment_required.some((eq) => !gymForPersona(fixture).equipment.includes(eq));
    });
    if (infeasible.length > 0) {
      addIssue(
        "P07:hotel_equipment_violation",
        "critical",
        `P07: ${infeasible.length} exercises require unavailable hotel equipment`,
        "global",
        "PRODUCT_PRIORITIES P0#1 equipment filter"
      );
    }
    if (allItems.length < 5) {
      addIssue(
        "P07:sparse_hotel_session",
        "moderate",
        "P07: Hotel session too sparse (<5 exercises)",
        "global",
        "PRODUCT_PRIORITIES P0#1 equipment filter"
      );
    }
  }

  if (fixture.id === "P08") {
    const highImpact = exercises.filter(isHighImpactPlyo);
    if (highImpact.length > 0) {
      addIssue(
        "P08:high_impact_on_joint_health",
        "critical",
        "P08: High-impact plyometrics in joint-health session",
        "global",
        "PRODUCT_PRIORITIES P0#2 injury/constraints"
      );
    }
  }

  if (fixture.id === "P10") {
    const intentLabels = allItems.filter((it) => looksLikeIntentLabel(it.exercise_name));
    if (intentLabels.length > 0) {
      addIssue(
        "P10:catalog_label_leak",
        "critical",
        "P10: Ontology/intent labels leaked as exercise names",
        "global",
        "PRODUCT_PRIORITIES P0#7 catalog validity"
      );
    }
  }

  for (const it of allItems) {
    if (looksLikeIntentLabel(it.exercise_name)) {
      addIssue(
        `${fixture.id}:intent_label_leak`,
        "critical",
        `${fixture.id}: Exercise name looks like intent label: "${it.exercise_name}"`,
        "global",
        "PRODUCT_PRIORITIES P0#7 catalog validity"
      );
      break;
    }
  }

  return issues;
}

function scoreChecks(checks: CheckResult[]): { score: number; band: "high" | "medium" | "low" } {
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
  const hardFail = checks.find((c) => c.id === "hard_constraints" && !c.pass);
  let score = Math.round((earned / Math.max(1, total)) * 100);
  if (hardFail) score = Math.min(score, 64);
  const band = score >= 85 ? "high" : score >= 65 ? "medium" : "low";
  return { score, band };
}

function severityWeight(sev: PersonaIssue["severity"]): number {
  return sev === "critical" ? 3 : sev === "moderate" ? 2 : 1;
}

function priorityWeight(tier: PersonaTestPriority): number {
  return tier === "P0" ? 3 : 1;
}

function rankIssues(issues: PersonaIssue[]): Array<{ issueId: string; message: string; score: number }> {
  const scored = new Map<string, { message: string; score: number }>();
  for (const issue of issues) {
    const pts = severityWeight(issue.severity) * priorityWeight(issue.testPriority) * 10;
    const prev = scored.get(issue.issueId);
    scored.set(issue.issueId, {
      message: issue.message,
      score: (prev?.score ?? 0) + pts,
    });
  }
  return [...scored.entries()]
    .map(([issueId, v]) => ({ issueId, message: v.message, score: v.score }))
    .sort((a, b) => b.score - a.score);
}

function loadAggregate(): AggregateState {
  if (!fs.existsSync(AGGREGATE_PATH)) {
    return { startedAt: new Date().toISOString(), ticks: [], issueCounts: {}, topFixes: [] };
  }
  return JSON.parse(fs.readFileSync(AGGREGATE_PATH, "utf8")) as AggregateState;
}

function saveAggregate(state: AggregateState): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(AGGREGATE_PATH, JSON.stringify(state, null, 2));
}

export async function runPersonaOutputTick(
  tick: number,
  seed: number,
  personaId?: string
): Promise<TickReport> {
  const persona = pickPersonaForLoop(seed, personaId);
  const gym = gymForPersona(persona);
  const injurySlugs = injurySlugsFromManualPreferences(persona.manualPreferences);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const poolById = new Map(pool.map((e) => [e.id, e]));

  const workout = await generateWorkoutAsync(
    persona.manualPreferences,
    gym,
    seed,
    undefined,
    persona.sportGoalContext,
    { exercisePool: pool }
  );

  const resolvedInput = manualPreferencesToGenerateWorkoutInput(
    persona.manualPreferences,
    gym,
    seed,
    undefined,
    persona.sportGoalContext
  );

  const checks = buildChecks(persona, workout, resolvedInput, pool, poolById);
  const personaIssues = evaluatePersonaSignals(persona, workout, poolById, tick, seed);

  for (const c of checks.filter((x) => !x.pass)) {
    personaIssues.push({
      personaId: persona.id,
      personaName: persona.name,
      testPriority: persona.testPriority,
      issueId: `${persona.id}:${c.id}`,
      severity: c.tier === "P0" ? "critical" : "moderate",
      message: `${persona.id}: ${c.id} failed — ${c.detail}`,
      fixScope: "global",
      productPriorityRef: `PRODUCT_PRIORITIES ${c.tier}`,
      tick,
      seed,
    });
  }

  const { score, band } = scoreChecks(checks);
  const failedChecks = checks.filter((c) => !c.pass).map((c) => c.id);
  const ranked = rankIssues(personaIssues);
  const topFixesThisTick = ranked.slice(0, 2).map((r, i) => ({
    rank: i + 1,
    issueId: r.issueId,
    message: r.message,
  }));

  const summary = `Simulation result: ${band.toUpperCase()} quality (${score}/100). Persona=${persona.id} (${persona.name}). Transfer: ${checks
    .filter((c) => c.id.startsWith("filter_transfer"))
    .map((c) => `${c.id}:${c.pass ? "pass" : "fail"}`)
    .join(", ")}. Key failures: ${failedChecks.length ? failedChecks.join(", ") : "none"}. Persona issues: ${personaIssues.length}.`;

  return {
    tick,
    seed,
    persona: {
      id: persona.id,
      name: persona.name,
      testPriority: persona.testPriority,
      mode: persona.mode,
    },
    score,
    band,
    summary,
    failedChecks,
    personaIssues,
    topFixesThisTick,
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const tickArg = process.argv.find((a) => a.startsWith("--tick="))?.split("=")[1];
  const maxTicksArg = process.argv.find((a) => a.startsWith("--max-ticks="))?.split("=")[1];

  const personaIdArg = process.argv.find((a) => a.startsWith("--persona="))?.split("=")[1];
  const tick = tickArg != null ? Number(tickArg) : 1;
  const maxTicks = maxTicksArg != null ? Number(maxTicksArg) : 6;
  const seed =
    seedArg != null && seedArg !== "" && !seedArg.startsWith("--")
      ? Number(seedArg)
      : Math.floor(Date.now() / 1000) % 1_000_000;

  if (Number.isNaN(seed) || Number.isNaN(tick)) {
    console.error(
      "Usage: npx tsx scripts/personaLoopSimulation.ts [seed] [--tick=N] [--max-ticks=6] [--persona=P01]"
    );
    process.exit(1);
  }

  const report = await runPersonaOutputTick(tick, seed + tick * 17, personaIdArg);
  const aggregate = loadAggregate();
  if (tick === 1 && aggregate.ticks.length === 0) {
    aggregate.startedAt = new Date().toISOString();
  }
  aggregate.ticks.push(report);

  for (const issue of report.personaIssues) {
    const prev = aggregate.issueCounts[issue.issueId];
    if (!prev) {
      aggregate.issueCounts[issue.issueId] = {
        count: 1,
        severity: issue.severity,
        message: issue.message,
        personaIds: [issue.personaId],
      };
    } else {
      prev.count += 1;
      if (!prev.personaIds.includes(issue.personaId)) prev.personaIds.push(issue.personaId);
    }
  }

  const allIssues: PersonaIssue[] = aggregate.ticks.flatMap((t) => t.personaIssues);
  aggregate.topFixes = rankIssues(allIssues)
    .slice(0, 2)
    .map((r, i) => ({ rank: i + 1, ...r }));

  saveAggregate(aggregate);

  const tickPath = path.join(ARTIFACTS_DIR, `tick-${String(tick).padStart(2, "0")}-seed${seed}.json`);
  fs.writeFileSync(tickPath, JSON.stringify(report, null, 2));

  const output = {
    loop: {
      tick,
      maxTicks,
      complete: tick >= maxTicks,
      nextTickAt: tick < maxTicks ? "in 10 minutes" : null,
    },
    report,
    aggregateTopFixes: aggregate.topFixes,
    artifacts: { tickPath, aggregatePath: AGGREGATE_PATH },
  };

  console.log(JSON.stringify(output, null, 2));
}

export type { PersonaIssue, TickReport };
export { rankIssues };

const isDirectRun =
  typeof process.argv[1] === "string" && process.argv[1].includes("personaLoopSimulation");

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
