/**
 * Deep user-flow loop: detect → fix queue → (agent) implement → verify.
 *
 * Usage:
 *   npx tsx scripts/deepUserFlowLoop.ts [seed] [--tick=N] [--max-ticks=18] [--fix-top] [--verify] [--scenario=id]
 *
 * Exit codes:
 *   0 — all scenarios pass (or verify succeeded)
 *   2 — issues found; fix-queue written; agent should implement top fix
 *   1 — runtime error
 *
 * Scheduled tick workflow (--fix-top):
 *   1. Run all deep scenarios (detect)
 *   2. Rank top flow + output fix
 *   3. Write fix-queue.json with implementation hints
 *   4. Exit 2 if pending fixes → agent implements code change
 *   5. Re-run with --verify to confirm fix
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { runDeepSimulation, type DeepSimulationResult, type ScenarioReport } from "./deepUserFlowSimulation";
import { runPressureTest } from "./deepPressureTest";
import { fixGuidanceForIssue } from "../logic/workoutGeneration/deepLoopFixRegistry";
import { DEEP_USER_FLOW_SCENARIOS } from "../logic/workoutGeneration/deepUserFlowScenarios";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "deep-user-flow");
const FIX_QUEUE_PATH = path.join(ARTIFACTS_DIR, "fix-queue.json");
const LOOP_STATE_PATH = path.join(ARTIFACTS_DIR, "loop-state.json");

type RankedFix = {
  rank: number;
  issueId: string;
  category: "flow" | "output";
  message: string;
  scenarioId: string;
  personaId: string;
  score: number;
  guidance?: ReturnType<typeof fixGuidanceForIssue>;
};

type FixQueue = {
  tick: number;
  seed: number;
  runAt: string;
  mode: "detect" | "verify";
  pendingFix: boolean;
  allScenariosPass: boolean;
  topFixes: RankedFix[];
  agentInstruction: string | null;
  implementationSteps: string[];
  verifyCommand: string | null;
  lastRunArtifact: string;
};

type LoopState = {
  ticks: Array<{ tick: number; seed: number; pendingFix: boolean; allPass: boolean; at: string }>;
  fixesApplied: Array<{ issueId: string; tick: number; at: string; verified: boolean }>;
};

function loadLoopState(): LoopState {
  if (!fs.existsSync(LOOP_STATE_PATH)) return { ticks: [], fixesApplied: [] };
  return JSON.parse(fs.readFileSync(LOOP_STATE_PATH, "utf8")) as LoopState;
}

function saveLoopState(state: LoopState): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(LOOP_STATE_PATH, JSON.stringify(state, null, 2));
}

function rankGlobalFixes(reports: ScenarioReport[]): RankedFix[] {
  const all: Array<Omit<RankedFix, "rank">> = [];

  for (const report of reports) {
    for (const f of report.flowIssues) {
      const critical = f.issueId.includes("critical");
      all.push({
        issueId: f.issueId,
        category: "flow",
        message: f.message,
        scenarioId: report.scenarioId,
        personaId: report.personaId,
        score: critical ? 90 : 55,
        guidance: fixGuidanceForIssue(f.issueId),
      });
    }
    for (const e of report.outputAnalysis.expectationResults.filter((x) => !x.pass)) {
      const id = `expect:${e.id}`;
      all.push({
        issueId: id,
        category: "output",
        message: `${e.label} — ${e.evidence}`,
        scenarioId: report.scenarioId,
        personaId: report.personaId,
        score: 85,
        guidance: fixGuidanceForIssue(id) ?? fixGuidanceForIssue(e.id),
      });
    }
    for (const c of report.outputAnalysis.failedChecks) {
      all.push({
        issueId: c,
        category: "output",
        message: `Check failed: ${c}`,
        scenarioId: report.scenarioId,
        personaId: report.personaId,
        score: 75,
        guidance: fixGuidanceForIssue(c),
      });
    }
    for (const t of report.topFixes) {
      if (!all.some((x) => x.issueId === t.issueId)) {
        all.push({
          issueId: t.issueId,
          category: t.category,
          message: t.message,
          scenarioId: report.scenarioId,
          personaId: report.personaId,
          score: 60,
          guidance: fixGuidanceForIssue(t.issueId),
        });
      }
    }
  }

  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((f, i) => ({ rank: i + 1, ...f }));
}

function buildFixQueue(
  tick: number,
  seed: number,
  mode: "detect" | "verify",
  result: DeepSimulationResult,
  topFixes: RankedFix[]
): FixQueue {
  const pendingFix = topFixes.length > 0;
  const allScenariosPass = result.reports.every((r) => r.band === "high" && r.flowIssueCount === 0 && r.outputAnalysis.failedExpectations.length === 0);
  const top = topFixes[0];
  const g = top?.guidance;

  const implementationSteps = pendingFix && top
    ? [
        `1. Issue: ${top.issueId} (${top.category}) — ${top.message}`,
        `2. Scenario: ${top.scenarioId} / persona ${top.personaId}`,
        g ? `3. Likely files: ${g.likelyFiles.join(", ")}` : "3. Search codebase for issue pattern",
        g ? `4. Fix: ${g.implementationHint}` : "4. Implement smallest end-to-end fix aligned with USER_PERSONAS.md",
        `5. Verify: ${g?.verifyCommand ?? `npx tsx scripts/deepUserFlowLoop.ts ${seed} --verify`}`,
      ]
    : [];

  const agentInstruction = pendingFix && top
    ? `IMPLEMENT FIX for ${top.issueId}: ${top.message}. ${g?.implementationHint ?? "See fix-queue.json implementationSteps."} Then verify with: ${g?.verifyCommand ?? "npx tsx scripts/deepUserFlowLoop.ts --verify"}`
    : null;

  return {
    tick,
    seed,
    runAt: new Date().toISOString(),
    mode,
    pendingFix,
    allScenariosPass,
    topFixes,
    agentInstruction,
    implementationSteps,
    verifyCommand: g?.verifyCommand ?? (top ? `npx tsx scripts/deepUserFlowLoop.ts ${seed} --verify` : null),
    lastRunArtifact: result.artifactPath,
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const tickArg = process.argv.find((a) => a.startsWith("--tick="))?.split("=")[1];
  const maxTicksArg = process.argv.find((a) => a.startsWith("--max-ticks="))?.split("=")[1];
  const scenarioArg = process.argv.find((a) => a.startsWith("--scenario="))?.split("=")[1];
  const fixTop = process.argv.includes("--fix-top");
  const verify = process.argv.includes("--verify");
  const pressure = process.argv.includes("--pressure");
  const seedsArg = process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1];

  const tick = tickArg != null ? Number(tickArg) : 1;
  const maxTicks = maxTicksArg != null ? Number(maxTicksArg) : 18;
  const seed =
    seedArg != null && seedArg !== "" && !seedArg.startsWith("--")
      ? Number(seedArg)
      : Math.floor(Date.now() / 1000) % 1_000_000;

  if (pressure) {
    const seedCount = seedsArg != null ? Number(seedsArg) : 48;
    const pressureResult = await runPressureTest({ baseSeed: seed, seedCount, personaFilter: scenarioArg });
    const topFixes: RankedFix[] = pressureResult.rankedFixes.slice(0, 4).map((r, i) => ({
      rank: i + 1,
      issueId: r.issueId,
      category: "output" as const,
      message: `${r.issueId} (${r.count} failures across ${r.personas.join(", ")}) — ${r.sample}`,
      scenarioId: "pressure",
      personaId: r.personas[0] ?? "?",
      score: r.count * 10,
      guidance: fixGuidanceForIssue(r.issueId),
    }));

    const queue: FixQueue = {
      tick,
      seed,
      runAt: new Date().toISOString(),
      mode: verify ? "verify" : "detect",
      pendingFix: pressureResult.failureCount > 0,
      allScenariosPass: pressureResult.failureCount === 0,
      topFixes,
      agentInstruction:
        pressureResult.failureCount > 0 && topFixes[0]
          ? `IMPLEMENT FIX for ${topFixes[0].issueId}: ${topFixes[0].message}. ${topFixes[0].guidance?.implementationHint ?? ""}`
          : null,
      implementationSteps:
        topFixes[0]?.guidance != null
          ? [
              `1. Issue: ${topFixes[0].issueId} (${pressureResult.failureCount}/${pressureResult.totalRuns} runs failed)`,
              `2. Likely files: ${topFixes[0].guidance.likelyFiles.join(", ")}`,
              `3. Fix: ${topFixes[0].guidance.implementationHint}`,
              `4. Verify: npx tsx scripts/deepUserFlowLoop.ts ${seed} --pressure --verify --seeds=${seedCount}`,
            ]
          : [],
      verifyCommand: `npx tsx scripts/deepUserFlowLoop.ts ${seed} --pressure --verify --seeds=${seedCount}`,
      lastRunArtifact: pressureResult.artifactPath,
    };

    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    fs.writeFileSync(FIX_QUEUE_PATH, JSON.stringify(queue, null, 2));

    console.log(
      JSON.stringify(
        {
          mode: "pressure",
          totalRuns: pressureResult.totalRuns,
          failureCount: pressureResult.failureCount,
          failRate: `${((pressureResult.failureCount / Math.max(1, pressureResult.totalRuns)) * 100).toFixed(1)}%`,
          rankedFixes: pressureResult.rankedFixes.slice(0, 6),
          fixQueue: queue,
          artifact: pressureResult.artifactPath,
        },
        null,
        2
      )
    );
    if (pressureResult.failureCount > 0) process.exit(2);
    return;
  }

  const result = await runDeepSimulation(seed, scenarioArg);
  const topFixes = rankGlobalFixes(result.reports);
  const queue = buildFixQueue(tick, seed, verify ? "verify" : "detect", result, topFixes);

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(FIX_QUEUE_PATH, JSON.stringify(queue, null, 2));

  const loopState = loadLoopState();
  loopState.ticks.push({
    tick,
    seed,
    pendingFix: queue.pendingFix,
    allPass: queue.allScenariosPass,
    at: queue.runAt,
  });
  if (verify && queue.allScenariosPass && topFixes.length === 0) {
    const lastFix = loopState.fixesApplied[loopState.fixesApplied.length - 1];
    if (lastFix) lastFix.verified = true;
  }
  saveLoopState(loopState);

  const output = {
    loop: {
      tick,
      maxTicks,
      mode: verify ? "verify" : fixTop ? "detect+fix-top" : "detect",
      complete: tick >= maxTicks,
      nextTickAt: tick < maxTicks ? "in 10 minutes" : null,
    },
    summary: result.summary,
    fixQueue: {
      pendingFix: queue.pendingFix,
      allScenariosPass: queue.allScenariosPass,
      topFix: queue.topFixes[0] ?? null,
      agentInstruction: queue.agentInstruction,
      implementationSteps: queue.implementationSteps,
      verifyCommand: queue.verifyCommand,
      path: FIX_QUEUE_PATH,
    },
    artifacts: result.artifactPath,
  };

  console.log(JSON.stringify(output, null, 2));

  if (queue.pendingFix) {
    if (fixTop) {
      console.error("\n--- FIX REQUIRED ---");
      console.error(queue.agentInstruction);
      console.error("--- END FIX REQUIRED ---\n");
    }
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
