/**
 * Full user-flow + output intent loop: simulates page/filter navigation, validates
 * generation output, ranks high-priority flow and output fixes, and records fix queue.
 *
 * Usage:
 *   npx tsx scripts/userFlowOutputLoop.ts [seed] [--tick=N] [--max-ticks=6] [--fix-top]
 *
 * Deep simulation (5 precise journeys + persona output analysis):
 *   npx tsx scripts/deepUserFlowSimulation.ts [seed] [--scenario=id]
 *
 * Loop (10m × 1h):
 *   bash scripts/user-flow-loop-scheduler.sh
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import {
  PERSONA_FIXTURES,
  gymForPersona,
  type PersonaFixture,
} from "../logic/workoutGeneration/personaSimulationFixtures";
import {
  pickFlowScenarioForTick,
  simulateUserFlow,
  type FlowIssue,
  USER_FLOW_SCENARIOS,
} from "../logic/workoutGeneration/userFlowSimulator";
import {
  rankIssues,
  runPersonaOutputTick,
  type PersonaIssue,
} from "./personaLoopSimulation";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "user-flow-loop");
const AGGREGATE_PATH = path.join(ARTIFACTS_DIR, "aggregate.json");
const FIX_QUEUE_PATH = path.join(ARTIFACTS_DIR, "fix-queue.json");

type UnifiedIssue = {
  category: "flow" | "output";
  issueId: string;
  severity: "critical" | "moderate" | "minor";
  message: string;
  fixScope: "global" | "narrow";
  productPriorityRef: string;
  personaId: string;
  tick: number;
  seed: number;
  testPriority: "P0" | "P1" | "P2";
};

type TickReport = {
  tick: number;
  seed: number;
  flowScenario: { id: string; label: string; personaId: string };
  flowSteps: number;
  flowScore: number;
  outputScore: number;
  combinedScore: number;
  band: "high" | "medium" | "low";
  summary: string;
  flowIssues: FlowIssue[];
  outputIssues: PersonaIssue[];
  topFlowFixes: Array<{ rank: number; issueId: string; message: string }>;
  topOutputFixes: Array<{ rank: number; issueId: string; message: string }>;
  topFixesOverall: Array<{ rank: number; issueId: string; message: string; category: "flow" | "output" }>;
};

type AggregateState = {
  startedAt: string;
  ticks: TickReport[];
  issueCounts: Record<string, { count: number; category: string; severity: string; message: string }>;
  topFixes: Array<{ rank: number; issueId: string; message: string; score: number; category: string }>;
};

function personaById(id: string): PersonaFixture {
  const p = PERSONA_FIXTURES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona ${id}`);
  return p;
}

function severityWeight(sev: UnifiedIssue["severity"]): number {
  return sev === "critical" ? 3 : sev === "moderate" ? 2 : 1;
}

function priorityWeight(tier: UnifiedIssue["testPriority"]): number {
  return tier === "P0" ? 3 : tier === "P1" ? 2 : 1;
}

function rankUnified(issues: UnifiedIssue[]): Array<{ issueId: string; message: string; score: number; category: "flow" | "output" }> {
  const scored = new Map<string, { message: string; score: number; category: "flow" | "output" }>();
  for (const issue of issues) {
    const pts = severityWeight(issue.severity) * priorityWeight(issue.testPriority) * 10;
    const prev = scored.get(issue.issueId);
    scored.set(issue.issueId, {
      message: issue.message,
      category: issue.category,
      score: (prev?.score ?? 0) + pts,
    });
  }
  return [...scored.entries()]
    .map(([issueId, v]) => ({ issueId, message: v.message, score: v.score, category: v.category }))
    .sort((a, b) => b.score - a.score);
}

function flowScoreFromIssues(issues: FlowIssue[]): number {
  if (issues.length === 0) return 100;
  let penalty = 0;
  for (const i of issues) {
    penalty += i.severity === "critical" ? 25 : i.severity === "moderate" ? 12 : 5;
  }
  return Math.max(0, 100 - penalty);
}

function toUnifiedFlow(issue: FlowIssue, persona: PersonaFixture, tick: number, seed: number): UnifiedIssue {
  return {
    category: "flow",
    issueId: issue.issueId,
    severity: issue.severity,
    message: issue.message,
    fixScope: issue.fixScope,
    productPriorityRef: issue.productPriorityRef,
    personaId: persona.id,
    tick,
    seed,
    testPriority: persona.testPriority,
  };
}

function toUnifiedOutput(issue: PersonaIssue): UnifiedIssue {
  return {
    category: "output",
    issueId: issue.issueId,
    severity: issue.severity,
    message: issue.message,
    fixScope: issue.fixScope,
    productPriorityRef: issue.productPriorityRef,
    personaId: issue.personaId,
    tick: issue.tick,
    seed: issue.seed,
    testPriority: issue.testPriority,
  };
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

export async function runUserFlowOutputTick(
  tick: number,
  seed: number,
  scenarioId?: string
): Promise<TickReport> {
  const scenario =
    scenarioId != null
      ? USER_FLOW_SCENARIOS.find((s) => s.id === scenarioId) ?? pickFlowScenarioForTick(seed, tick)
      : pickFlowScenarioForTick(seed, tick);
  const persona = personaById(scenario.personaId);

  const { issues: flowIssues } = simulateUserFlow(scenario, persona);
  const flowScore = flowScoreFromIssues(flowIssues);

  const outputReport = await runPersonaOutputTick(tick, seed + tick * 17, persona.id);
  const outputScore = outputReport.score;

  const unified: UnifiedIssue[] = [
    ...flowIssues.map((i) => toUnifiedFlow(i, persona, tick, seed)),
    ...outputReport.personaIssues.map(toUnifiedOutput),
  ];
  const ranked = rankUnified(unified);
  const topOverall = ranked.slice(0, 2).map((r, i) => ({
    rank: i + 1,
    issueId: r.issueId,
    message: r.message,
    category: r.category,
  }));
  const topFlow = ranked
    .filter((r) => r.category === "flow")
    .slice(0, 2)
    .map((r, i) => ({ rank: i + 1, issueId: r.issueId, message: r.message }));
  const topOutput = ranked
    .filter((r) => r.category === "output")
    .slice(0, 2)
    .map((r, i) => ({ rank: i + 1, issueId: r.issueId, message: r.message }));

  const combinedScore = Math.round(flowScore * 0.35 + outputScore * 0.65);
  const band = combinedScore >= 85 ? "high" : combinedScore >= 65 ? "medium" : "low";

  const summary = [
    `Flow+Output tick ${tick}: ${band.toUpperCase()} (combined ${combinedScore}/100, flow ${flowScore}, output ${outputScore}).`,
    `Scenario=${scenario.id} persona=${persona.id}.`,
    `Flow issues=${flowIssues.length}; output issues=${outputReport.personaIssues.length}.`,
    `Top fix: ${topOverall[0]?.issueId ?? "none"}.`,
  ].join(" ");

  return {
    tick,
    seed,
    flowScenario: { id: scenario.id, label: scenario.label, personaId: persona.id },
    flowSteps: scenario.steps.length,
    flowScore,
    outputScore,
    combinedScore,
    band,
    summary,
    flowIssues,
    outputIssues: outputReport.personaIssues,
    topFlowFixes: topFlow,
    topOutputFixes: topOutput,
    topFixesOverall: topOverall,
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const tickArg = process.argv.find((a) => a.startsWith("--tick="))?.split("=")[1];
  const maxTicksArg = process.argv.find((a) => a.startsWith("--max-ticks="))?.split("=")[1];
  const scenarioArg = process.argv.find((a) => a.startsWith("--scenario="))?.split("=")[1];
  const fixTop = process.argv.includes("--fix-top");

  const tick = tickArg != null ? Number(tickArg) : 1;
  const maxTicks = maxTicksArg != null ? Number(maxTicksArg) : 6;
  const seed =
    seedArg != null && seedArg !== "" && !seedArg.startsWith("--")
      ? Number(seedArg)
      : Math.floor(Date.now() / 1000) % 1_000_000;

  if (Number.isNaN(seed) || Number.isNaN(tick)) {
    console.error(
      "Usage: npx tsx scripts/userFlowOutputLoop.ts [seed] [--tick=N] [--max-ticks=6] [--scenario=id] [--fix-top]"
    );
    process.exit(1);
  }

  const report = await runUserFlowOutputTick(tick, seed, scenarioArg);
  const aggregate = loadAggregate();
  if (tick === 1 && aggregate.ticks.length === 0) {
    aggregate.startedAt = new Date().toISOString();
  }
  aggregate.ticks.push(report);

  for (const issue of [...report.flowIssues, ...report.outputIssues]) {
    const id = "issueId" in issue && typeof issue.issueId === "string" ? issue.issueId : "";
    const prev = aggregate.issueCounts[id];
    const category = report.flowIssues.some((f) => f.issueId === id) ? "flow" : "output";
    if (!prev) {
      aggregate.issueCounts[id] = {
        count: 1,
        category,
        severity: issue.severity,
        message: issue.message,
      };
    } else {
      prev.count += 1;
    }
  }

  const allUnified: UnifiedIssue[] = aggregate.ticks.flatMap((t) => [
    ...t.flowIssues.map((i) => toUnifiedFlow(i, personaById(t.flowScenario.personaId), t.tick, t.seed)),
    ...t.outputIssues.map(toUnifiedOutput),
  ]);
  aggregate.topFixes = rankUnified(allUnified)
    .slice(0, 4)
    .map((r, i) => ({ rank: i + 1, ...r }));

  saveAggregate(aggregate);

  const fixQueue = {
    tick,
    seed,
    fixTopRequested: fixTop,
    topFixesOverall: report.topFixesOverall,
    topFlowFixes: report.topFlowFixes,
    topOutputFixes: report.topOutputFixes,
    agentInstruction:
      fixTop && report.topFixesOverall[0]
        ? `Fix highest-priority ${report.topFixesOverall[0].category} issue: ${report.topFixesOverall[0].issueId} — ${report.topFixesOverall[0].message}`
        : null,
  };
  fs.writeFileSync(FIX_QUEUE_PATH, JSON.stringify(fixQueue, null, 2));

  const tickPath = path.join(ARTIFACTS_DIR, `tick-${String(tick).padStart(2, "0")}-seed${seed}.json`);
  fs.writeFileSync(tickPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        loop: { tick, maxTicks, complete: tick >= maxTicks, nextTickAt: tick < maxTicks ? "in 10 minutes" : null },
        report,
        fixQueue,
        aggregateTopFixes: aggregate.topFixes,
        artifacts: { tickPath, aggregatePath: AGGREGATE_PATH, fixQueuePath: FIX_QUEUE_PATH },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
