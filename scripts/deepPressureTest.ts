/**
 * Hard pressure test: all personas × many seeds + stricter gates.
 *
 * Usage:
 *   npx tsx scripts/deepPressureTest.ts [baseSeed] [--seeds=48] [--persona=P02]
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
  PERSONA_FIXTURES,
  gymForPersona,
  type PersonaFixture,
} from "../logic/workoutGeneration/personaSimulationFixtures";
import { analyzePersonaOutput } from "../logic/workoutGeneration/personaOutputAnalysis";
import { simulateUserFlow } from "../logic/workoutGeneration/userFlowSimulator";
import { DEEP_USER_FLOW_SCENARIOS } from "../logic/workoutGeneration/deepUserFlowScenarios";
import { fixGuidanceForIssue } from "../logic/workoutGeneration/deepLoopFixRegistry";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "deep-user-flow");

type PressureFailure = {
  personaId: string;
  seed: number;
  score: number;
  band: string;
  flowIssues: string[];
  failedChecks: string[];
  failedExpectations: string[];
  evidence: string[];
  topIssueId: string;
  guidance?: string;
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedList(base: number, count: number): number[] {
  const rng = mulberry32(base);
  const out = new Set<number>();
  out.add(base);
  while (out.size < count) {
    out.add(Math.floor(rng() * 999_983) + 1);
  }
  return [...out];
}

/** Stricter than default band — any moderate persona signal fails pressure gate. */
function pressureGate(analysis: ReturnType<typeof analyzePersonaOutput>): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (analysis.score < 90) reasons.push(`score=${analysis.score}`);
  if (analysis.failedCheckIds.length) reasons.push(...analysis.failedCheckIds.map((c) => `check:${c}`));
  for (const e of analysis.expectationResults.filter((x) => !x.pass)) {
    reasons.push(`expect:${e.expectationId}(${e.severity})`);
  }
  return { pass: reasons.length === 0, reasons };
}

async function pressurePersona(
  persona: PersonaFixture,
  seeds: number[]
): Promise<PressureFailure[]> {
  const gym = gymForPersona(persona);
  const pool = await getExercisePoolForManualGeneration(
    injurySlugsFromManualPreferences(persona.manualPreferences)
  );
  const poolById = new Map(pool.map((e) => [e.id, e]));
  const failures: PressureFailure[] = [];

  const flowScenario = DEEP_USER_FLOW_SCENARIOS.find((s) => s.personaId === persona.id);
  if (flowScenario) {
    const { issues } = simulateUserFlow(flowScenario, persona);
    if (issues.length) {
      failures.push({
        personaId: persona.id,
        seed: persona.defaultSeed,
        score: 0,
        band: "low",
        flowIssues: issues.map((i) => i.issueId),
        failedChecks: [],
        failedExpectations: [],
        evidence: issues.map((i) => i.message),
        topIssueId: issues[0]!.issueId,
        guidance: fixGuidanceForIssue(issues[0]!.issueId)?.implementationHint,
      });
    }
  }

  for (const seed of seeds) {
    const scenarioSeed = seed + persona.id.charCodeAt(1) * 1000;
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
    const gate = pressureGate(analysis);
    if (!gate.pass) {
      const topExp = analysis.expectationResults.find((e) => !e.pass);
      const topIssueId =
        topExp?.expectationId ??
        analysis.failedCheckIds[0] ??
        `${persona.id}:pressure_score`;
      failures.push({
        personaId: persona.id,
        seed: scenarioSeed,
        score: analysis.score,
        band: analysis.band,
        flowIssues: [],
        failedChecks: analysis.failedCheckIds,
        failedExpectations: analysis.failedExpectations,
        evidence: [
          ...analysis.expectationResults.filter((e) => !e.pass).map((e) => `${e.label}: ${e.evidence}`),
          analysis.narrativeSummary,
        ],
        topIssueId,
        guidance: fixGuidanceForIssue(topIssueId)?.implementationHint ?? fixGuidanceForIssue(`expect:${topIssueId}`)?.implementationHint,
      });
    }
  }
  return failures;
}

export async function runPressureTest(opts: {
  baseSeed: number;
  seedCount: number;
  personaFilter?: string;
}): Promise<{
  totalRuns: number;
  failureCount: number;
  failures: PressureFailure[];
  rankedFixes: Array<{ issueId: string; count: number; personas: string[]; sample: string }>;
  artifactPath: string;
}> {
  const personas = opts.personaFilter
    ? PERSONA_FIXTURES.filter((p) => p.id === opts.personaFilter)
    : PERSONA_FIXTURES;
  if (personas.length === 0) throw new Error(`Unknown persona ${opts.personaFilter}`);

  const seeds = seedList(opts.baseSeed, opts.seedCount);
  const allFailures: PressureFailure[] = [];

  for (const persona of personas) {
    const f = await pressurePersona(persona, seeds);
    allFailures.push(...f);
  }

  const issueCounts = new Map<string, { count: number; personas: Set<string>; sample: string }>();
  for (const f of allFailures) {
    const key = f.topIssueId;
    const prev = issueCounts.get(key) ?? { count: 0, personas: new Set<string>(), sample: f.evidence[0] ?? "" };
    prev.count += 1;
    prev.personas.add(f.personaId);
    issueCounts.set(key, prev);
  }

  const rankedFixes = [...issueCounts.entries()]
    .map(([issueId, v]) => ({
      issueId,
      count: v.count,
      personas: [...v.personas],
      sample: v.sample,
    }))
    .sort((a, b) => b.count - a.count);

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const artifactPath = path.join(ARTIFACTS_DIR, `pressure-seed${opts.baseSeed}-n${opts.seedCount}.json`);
  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        baseSeed: opts.baseSeed,
        seedCount: opts.seedCount,
        totalRuns: personas.length * seeds.length,
        failureCount: allFailures.length,
        rankedFixes,
        failures: allFailures,
      },
      null,
      2
    )
  );

  return {
    totalRuns: personas.length * seeds.length,
    failureCount: allFailures.length,
    failures: allFailures,
    rankedFixes,
    artifactPath,
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const baseArg = process.argv[2];
  const seedsArg = process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1];
  const personaArg = process.argv.find((a) => a.startsWith("--persona="))?.split("=")[1];

  const baseSeed =
    baseArg != null && baseArg !== "" && !baseArg.startsWith("--")
      ? Number(baseArg)
      : Math.floor(Date.now() / 1000) % 1_000_000;
  const seedCount = seedsArg != null ? Number(seedsArg) : 48;

  const result = await runPressureTest({ baseSeed, seedCount, personaFilter: personaArg });
  console.log(
    JSON.stringify(
      {
        totalRuns: result.totalRuns,
        failureCount: result.failureCount,
        failRate: `${((result.failureCount / Math.max(1, result.totalRuns)) * 100).toFixed(1)}%`,
        rankedFixes: result.rankedFixes.slice(0, 8),
        topFailures: result.failures.slice(0, 5),
        artifact: result.artifactPath,
      },
      null,
      2
    )
  );
  if (result.failureCount > 0) process.exit(2);
}

const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].includes("deepPressureTest");
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
