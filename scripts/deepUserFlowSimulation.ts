/**
 * Deep user-flow + persona output simulation — five precise end-to-end journeys.
 *
 * Usage:
 *   npx tsx scripts/deepUserFlowSimulation.ts [seed] [--scenario=deep_p01_maya_vertical_jump]
 *
 * Runs fewer, richer scenarios: granular click traces, flow intent parity, and
 * deep persona expectation analysis on generated workouts.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../lib/generator";
import {
  gymForPersona,
  PERSONA_FIXTURES,
  type PersonaFixture,
} from "../logic/workoutGeneration/personaSimulationFixtures";
import { DEEP_USER_FLOW_SCENARIOS } from "../logic/workoutGeneration/deepUserFlowScenarios";
import { simulateUserFlow } from "../logic/workoutGeneration/userFlowSimulator";
import { analyzePersonaOutput } from "../logic/workoutGeneration/personaOutputAnalysis";
import { expectationsForPersona } from "../logic/workoutGeneration/personaExpectationContracts";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "deep-user-flow");

type ScenarioReport = {
  scenarioId: string;
  label: string;
  personaId: string;
  seed: number;
  userStory?: string;
  expectedUserOutcome?: string;
  flowScore: number;
  outputScore: number;
  combinedScore: number;
  band: "high" | "medium" | "low";
  flowIssueCount: number;
  flowIssues: Array<{ issueId: string; message: string; stepId?: string }>;
  stepTraces: Array<{
    stepId: string;
    screen: string;
    action: string;
    description: string;
    routeAfter: string;
    phaseAfter: string;
    userExpectation?: string;
    ok: boolean;
    issue?: string;
  }>;
  outputAnalysis: {
    narrativeSummary: string;
    intentFidelity: { filterTransfer: number; personaIntent: number; sessionUsability: number };
    failedChecks: string[];
    failedExpectations: string[];
    expectationResults: Array<{ id: string; label: string; pass: boolean; evidence: string }>;
    exerciseHighlights: { mainWork: string[]; conditioning: string[]; concerns: string[] };
  };
  topFixes: Array<{ rank: number; category: "flow" | "output"; issueId: string; message: string }>;
};

function personaById(id: string): PersonaFixture {
  const p = PERSONA_FIXTURES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona ${id}`);
  return p;
}

function flowScore(issueCount: number, criticalCount: number): number {
  return Math.max(0, 100 - criticalCount * 25 - (issueCount - criticalCount) * 10);
}

function rankFixes(
  flowIssues: ScenarioReport["flowIssues"],
  outputAnalysis: ScenarioReport["outputAnalysis"]
): ScenarioReport["topFixes"] {
  const fixes: Array<{ category: "flow" | "output"; issueId: string; message: string; score: number }> = [];
  for (const f of flowIssues) {
    const critical = f.issueId.includes("critical") || f.message.includes("critical");
    fixes.push({ category: "flow", issueId: f.issueId, message: f.message, score: critical ? 90 : 50 });
  }
  for (const e of outputAnalysis.expectationResults.filter((x) => !x.pass)) {
    fixes.push({
      category: "output",
      issueId: `expect:${e.id}`,
      message: `${e.label} — ${e.evidence}`,
      score: 80,
    });
  }
  for (const c of outputAnalysis.failedChecks) {
    fixes.push({ category: "output", issueId: c, message: `Check failed: ${c}`, score: 70 });
  }
  return fixes
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((f, i) => ({ rank: i + 1, category: f.category, issueId: f.issueId, message: f.message }));
}

async function runScenario(
  scenario: (typeof DEEP_USER_FLOW_SCENARIOS)[number],
  seed: number
): Promise<ScenarioReport> {
  const persona = personaById(scenario.personaId);
  const scenarioSeed = seed + scenario.personaId.charCodeAt(1) * 1000;

  const { issues: flowIssues, stepTraces } = simulateUserFlow(scenario, persona);
  const criticalFlow = flowIssues.filter((i) => i.severity === "critical").length;
  const fScore = flowScore(flowIssues.length, criticalFlow);

  const gym = gymForPersona(persona);
  const injurySlugs = injurySlugsFromManualPreferences(persona.manualPreferences);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const poolById = new Map(pool.map((e) => [e.id, e]));

  const workout = await generateWorkoutAsync(
    persona.manualPreferences,
    gym,
    scenarioSeed,
    undefined,
    persona.sportGoalContext,
    { exercisePool: pool }
  );

  const analysis = analyzePersonaOutput(
    persona,
    workout,
    gym,
    pool,
    poolById,
    scenarioSeed,
    persona.sportGoalContext
  );

  const combinedScore = Math.round(fScore * 0.3 + analysis.score * 0.7);
  const band = combinedScore >= 85 ? "high" : combinedScore >= 65 ? "medium" : "low";

  const outputAnalysis = {
    narrativeSummary: analysis.narrativeSummary,
    intentFidelity: analysis.intentFidelity,
    failedChecks: analysis.failedCheckIds,
    failedExpectations: analysis.failedExpectations,
    expectationResults: analysis.expectationResults.map((e) => ({
      id: e.expectationId,
      label: e.label,
      pass: e.pass,
      evidence: e.evidence,
    })),
    exerciseHighlights: analysis.exerciseHighlights,
  };

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    personaId: scenario.personaId,
    seed: scenarioSeed,
    userStory: scenario.userStory,
    expectedUserOutcome: scenario.expectedUserOutcome,
    flowScore: fScore,
    outputScore: analysis.score,
    combinedScore,
    band,
    flowIssueCount: flowIssues.length,
    flowIssues: flowIssues.map((i) => ({
      issueId: i.issueId,
      message: i.message,
      stepId: i.stepId,
    })),
    stepTraces: stepTraces.map((t) => ({
      stepId: t.stepId,
      screen: t.screen,
      action: t.action,
      description: t.description,
      routeAfter: t.routeAfter,
      phaseAfter: t.phaseAfter,
      userExpectation: t.userExpectation,
      ok: t.ok,
      issue: t.issue,
    })),
    outputAnalysis,
    topFixes: rankFixes(
      flowIssues.map((i) => ({ issueId: i.issueId, message: i.message, stepId: i.stepId })),
      outputAnalysis
    ),
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const scenarioArg = process.argv.find((a) => a.startsWith("--scenario="))?.split("=")[1];
  const seed =
    seedArg != null && seedArg !== "" && !seedArg.startsWith("--")
      ? Number(seedArg)
      : Math.floor(Date.now() / 1000) % 1_000_000;

  const scenarios = scenarioArg
    ? DEEP_USER_FLOW_SCENARIOS.filter((s) => s.id === scenarioArg)
    : DEEP_USER_FLOW_SCENARIOS;

  if (scenarios.length === 0) {
    console.error(`Unknown scenario "${scenarioArg}". Available: ${DEEP_USER_FLOW_SCENARIOS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const reports: ScenarioReport[] = [];
  for (const scenario of scenarios) {
    reports.push(await runScenario(scenario, seed));
  }

  const aggregate = {
    runAt: new Date().toISOString(),
    seed,
    scenarioCount: reports.length,
    summary: reports.map((r) => ({
      scenarioId: r.scenarioId,
      personaId: r.personaId,
      band: r.band,
      combinedScore: r.combinedScore,
      flowScore: r.flowScore,
      outputScore: r.outputScore,
      flowIssues: r.flowIssueCount,
      failedExpectations: r.outputAnalysis.failedExpectations.length,
      topFix: r.topFixes[0]?.message ?? "none",
    })),
    reports,
  };

  const outPath = path.join(ARTIFACTS_DIR, `deep-run-seed${seed}.json`);
  fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2));

  console.log(JSON.stringify({ artifacts: outPath, aggregate: aggregate.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
