/**
 * Human-readable review: running family (road_running vs trail_running).
 *
 * For each seed + sport, prints title, mains, accessories/support, gate/fallback tiers,
 * main-slot transfer tiers, repair heuristics, session summary signals, and selector trace.
 *
 * Run:
 *   npx tsx scripts/print-running-family-review.ts
 *
 * Optional: comma-separated seeds
 *   RUNNING_REVIEW_SEEDS=11,22,33,44,55 npx tsx scripts/print-running-family-review.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput, WorkoutSession } from "../logic/workoutGeneration/types";
import { sessionIntentContractForSportSlug } from "../logic/workoutGeneration/sessionIntentContract";
import type { SportPatternSessionSummary } from "../logic/workoutGeneration/sportPattern/sportPatternSessionAudit";

type RunningSport = "road_running" | "trail_running";

function exercisePool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function parseSeeds(): number[] {
  const raw = process.env.RUNNING_REVIEW_SEEDS?.trim();
  if (raw) {
    const parts = raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
    if (parts.length) return parts;
  }
  return [101, 102, 103, 104, 105];
}

function baseInput(seed: number, sport: RunningSport): GenerateWorkoutInput {
  const contract = sessionIntentContractForSportSlug(sport);
  if (!contract) throw new Error(`missing session contract for ${sport}`);
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "kettlebells",
      "bench",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "stair_climber",
      "assault_bike",
      "rowing_machine",
      "cable_machine",
      "ski_erg",
    ],
    injuries_or_constraints: [],
    seed,
    sport_weight: 0.55,
    sport_slugs: [sport],
    session_intent_contract: contract,
  };
}

function blockLines(session: WorkoutSession, types: Set<string>): { type: string; title?: string; names: string }[] {
  const out: { type: string; title?: string; names: string }[] = [];
  for (const b of session.blocks) {
    if (!types.has(b.block_type)) continue;
    const names = b.items.map((i) => i.exercise_name ?? i.exercise_id).join(" · ");
    out.push({ type: b.block_type, title: b.title, names });
  }
  return out;
}

function formatGateSlot(
  label: string,
  snap:
    | {
        poolMode?: string;
        selectionTier?: string;
        usedFullPoolFallback?: boolean;
      }
    | undefined
): string {
  if (!snap) return `${label}: (none)`;
  const tier = snap.selectionTier ?? "?";
  const mode = snap.poolMode ?? "?";
  const fb = snap.usedFullPoolFallback === true ? " yes" : "";
  return `${label}: poolMode=${mode} selectionTier=${tier} fullPoolFallback${fb}`;
}

function mainTransferTiers(session: WorkoutSession): string {
  const items = session.debug?.sport_pattern_transfer?.items ?? [];
  const mains = items.filter((i) => i.block_type === "main_strength" || i.block_type === "main_hypertrophy");
  if (!mains.length) return "(no main items in transfer debug)";
  return mains.map((i) => `${i.tier}`).join(", ");
}

function detectRepairBlock(session: WorkoutSession): { yes: boolean; titles: string[] } {
  const titles: string[] = [];
  for (const b of session.blocks) {
    const t = (b.title ?? "").toLowerCase();
    if (t.includes("road running support") || t.includes("trail running support")) {
      titles.push(b.title ?? b.block_type);
    }
  }
  return { yes: titles.length > 0, titles };
}

function leakageHeuristics(session: WorkoutSession): string[] {
  const notes: string[] = [];
  const upper =
    /\b(bench|overhead|ohp|strict press|push.?press|muscle.?up|pull.?up|chin.?up|row|curl|fly|arnold|skull)\b/i;
  const lateral = /\b(skater|shuffle|lateral|cut|cone|agility)\b/i;
  const metcon = /\b(burpee|thruster|wall ball|manmaker)\b/i;

  for (const b of session.blocks) {
    if (b.block_type !== "main_strength" && b.block_type !== "main_hypertrophy") continue;
    for (const it of b.items) {
      const n = it.exercise_name ?? "";
      if (upper.test(n)) notes.push(`main name suggests upper/pressing: ${n}`);
      if (lateral.test(n)) notes.push(`main name suggests lateral/agility: ${n}`);
      if (metcon.test(n)) notes.push(`main name suggests metcon-style: ${n}`);
    }
  }
  return [...new Set(notes)];
}

function topHits(rec: Record<string, number>, k: number): string {
  const entries = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  return entries
    .slice(0, k)
    .map(([key, n]) => `${key}=${n}`)
    .join(", ");
}

function sumHits(sessions: { sum: SportPatternSessionSummary }[], keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  for (const { sum } of sessions) {
    for (const k of keys) {
      out[k] += (sum.main_category_hits[k] ?? 0) + (sum.accessory_category_hits[k] ?? 0);
    }
  }
  return out;
}

function sumOverlap(
  sessions: { sum: SportPatternSessionSummary }[],
  key: keyof SportPatternSessionSummary["overlap_families"]
): number {
  return sessions.reduce((a, s) => a + (s.sum.overlap_families[key] ?? 0), 0);
}

const SIGNAL_KEYS = [
  "downhill_eccentric_control",
  "uphill_locomotion_support",
  "unilateral_running_stability",
  "calf_soleus_durability",
  "ankle_foot_stability",
  "locomotion_core_stability",
  "lateral_agility_flashy",
  "unrelated_upper_body_dominant",
  "overly_complex_skill_lift",
  "hiking_step_stair_identity",
] as const;

function describeMainSelector(session: WorkoutSession): string {
  const entries = session.debug?.main_selector?.entries ?? [];
  if (!entries.length) return "no main_selector trace (e.g. non-strength primary)";
  const strength = entries.filter((e) => e.phase === "main_strength");
  const hypertrophy = entries.filter((e) => e.phase === "main_hypertrophy");
  const parts: string[] = [];
  if (strength.length) {
    parts.push(
      `main_strength: ${strength.map((e) => `${e.selector}${e.sport_slug ? `(${e.sport_slug})` : ""}`).join(" | ")}`
    );
  }
  if (hypertrophy.length) {
    parts.push(
      `main_hypertrophy: ${hypertrophy.map((e) => `${e.selector}${e.sport_slug ? `(${e.sport_slug})` : ""}`).join(" | ")}`
    );
  }
  const note =
    "Running sports use the generic main selector with running-family slot rules + scoring (not alpine-style sport_owned mains).";
  return `${parts.join("; ")}. ${note}`;
}

function printSessionReport(sport: RunningSport, seed: number, session: WorkoutSession) {
  const dbg = session.debug?.sport_pattern_transfer;
  const snap = dbg?.enforcement_snapshot;

  console.log("\n" + "-".repeat(76));
  console.log(`SPORT: ${sport}  SEED: ${seed}`);
  console.log("-".repeat(76));
  console.log("Title:", session.title);
  console.log("Coverage OK:", dbg?.coverage_ok ?? "(no dbg)");
  if (dbg?.violations?.length) {
    console.log("Residual violations:", dbg.violations.map((v) => v.ruleId).join(", "));
  }

  console.log("Main selector:", describeMainSelector(session));

  console.log(formatGateSlot("Main strength gate", snap?.main_strength));
  console.log(formatGateSlot("Accessory gate", snap?.accessory));
  console.log(formatGateSlot("Secondary main (if any)", snap?.secondary_main_strength));

  console.log("Main-slot transfer tiers (required|preferred|fallback):", mainTransferTiers(session));

  const repair = detectRepairBlock(session);
  console.log("Repair block added (heuristic):", repair.yes ? `yes — ${repair.titles.join(", ")}` : "no");

  const mains = blockLines(session, new Set(["main_strength", "main_hypertrophy"]));
  console.log("Main exercises:");
  for (const row of mains) {
    console.log(`  [${row.type}]${row.title ? ` ${row.title}` : ""}: ${row.names}`);
  }

  const acc = blockLines(session, new Set(["accessory"]));
  console.log("Accessory / support blocks:");
  if (!acc.length) console.log("  (none)");
  else {
    for (const row of acc) {
      console.log(`  [${row.type}]${row.title ? ` ${row.title}` : ""}: ${row.names}`);
    }
  }

  const sum = dbg?.session_summary;
  if (sum) {
    console.log("Session summary — top main categories:", topHits(sum.main_category_hits, 8));
    console.log("Session summary — top accessory categories:", topHits(sum.accessory_category_hits, 6));
    console.log(
      "Session summary — overlap families:",
      `lunge_split=${sum.overlap_families.lunge_split_family} step_stair=${sum.overlap_families.step_stair_family} carry=${sum.overlap_families.carry_family} calf_ankle_text=${sum.overlap_families.calf_ankle_family} cond_run=${sum.overlap_families.conditioning_treadmill_run} cond_stair=${sum.overlap_families.conditioning_stair_incline} cond_erg=${sum.overlap_families.conditioning_bike_row_ski}`
    );
    console.log(
      `Signature vs non-signature selections (session-wide non warm/cool): sig=${sum.signature_pattern_selections} non=${sum.non_signature_selections}`
    );
  }

  const leak = leakageHeuristics(session);
  if (leak.length) console.log("Heuristic leakage flags:", leak.join(" | "));
}

function main() {
  const seeds = parseSeeds();
  const sports: RunningSport[] = ["road_running", "trail_running"];
  const pool = exercisePool();
  console.log("Running family review");
  console.log("Pool size:", pool.length, "| Seeds:", seeds.join(", "));
  console.log(
    "\nNote: Alpine/rock use sport_owned main selectors; road/trail use generic mains with running-family gates + within-pool quality scoring.\n"
  );

  const collected: { sport: RunningSport; seed: number; session: WorkoutSession }[] = [];

  for (const sport of sports) {
    for (const seed of seeds) {
      const session = generateWorkoutSession(baseInput(seed, sport), pool);
      collected.push({ sport, seed, session });
      printSessionReport(sport, seed, session);
    }
  }

  // --- Distinctness aggregate ---
  console.log("\n" + "=".repeat(76));
  console.log("DISTINCTNESS AGGREGATE (sums over all printed sessions)");
  console.log("=".repeat(76));

  const bySport = (s: RunningSport) =>
    collected
      .filter((c) => c.sport === s)
      .map((c) => ({ sum: c.session.debug?.sport_pattern_transfer?.session_summary! }))
      .filter((x) => x.sum != null);

  for (const sport of sports) {
    const rows = bySport(sport);
    const hits = sumHits(rows, SIGNAL_KEYS);
    console.log(`\n${sport} (n=${rows.length} sessions) — category hits (main+accessory):`);
    console.log(
      Object.entries(hits)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    );
    console.log(
      `  overlap: lunge_split=${sumOverlap(rows, "lunge_split_family")} step_stair=${sumOverlap(rows, "step_stair_family")} carry=${sumOverlap(rows, "carry_family")} cond_stair=${sumOverlap(rows, "conditioning_stair_incline")} cond_run=${sumOverlap(rows, "conditioning_treadmill_run")}`
    );
  }

  const roadRows = bySport("road_running");
  const trailRows = bySport("trail_running");
  const roadHits = sumHits(roadRows, SIGNAL_KEYS);
  const trailHits = sumHits(trailRows, SIGNAL_KEYS);
  console.log("\n--- Comparison (trail − road) for selected signals ---");
  for (const k of SIGNAL_KEYS) {
    const d = (trailHits[k] ?? 0) - (roadHits[k] ?? 0);
    if (d !== 0) console.log(`  ${k}: ${d > 0 ? "+" : ""}${d}`);
  }

  const roadRepairs = collected.filter((c) => c.sport === "road_running" && detectRepairBlock(c.session).yes).length;
  const trailRepairs = collected.filter((c) => c.sport === "trail_running" && detectRepairBlock(c.session).yes).length;
  const roadFallbacks = collected.filter(
    (c) => c.sport === "road_running" && c.session.debug?.sport_pattern_transfer?.enforcement_snapshot?.main_strength?.usedFullPoolFallback
  ).length;
  const trailFallbacks = collected.filter(
    (c) => c.sport === "trail_running" && c.session.debug?.sport_pattern_transfer?.enforcement_snapshot?.main_strength?.usedFullPoolFallback
  ).length;

  console.log("\n--- Quality proxies ---");
  console.log(`Sessions with repair support block: road=${roadRepairs}/${roadRows.length} trail=${trailRepairs}/${trailRows.length}`);
  console.log(`Sessions with main-strength full-pool fallback: road=${roadFallbacks} trail=${trailFallbacks}`);

  const badCoverage = collected.filter((c) => c.session.debug?.sport_pattern_transfer?.coverage_ok === false);
  if (badCoverage.length) {
    console.log("Sessions with coverage_ok=false:", badCoverage.map((c) => `${c.sport}@${c.seed}`).join(", "));
  } else {
    console.log("All sampled sessions: coverage_ok=true");
  }

  console.log("\nDone.\n");
}

main();
