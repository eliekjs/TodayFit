/**
 * Simulates Sport Mode: user picks sports + 3 sub-goals, generates a session, prints
 * workout + per-exercise selection methodology (tag match, gates, intent path).
 *
 * Run: npx tsx scripts/print-sport-subfocus-user-walkthrough.ts
 * Seed: WALKTHROUGH_SEED=42 npx tsx scripts/print-sport-subfocus-user-walkthrough.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { getExerciseTagsForSubFocuses } from "../data/sportSubFocus";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../lib/dailyGeneratorAdapter";
import { displayNameForSportSubFocusSlug } from "../lib/workoutIntentSplit";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import {
  classifyLeafArchetype,
  deriveLeafEntries,
  isMainWorkCandidateForIntentEntry,
  matchesIntentEntry,
} from "../logic/workoutGeneration/intentSlotAllocator";
import { exerciseMatchesSportSubFocusSlug } from "../logic/workoutGeneration/subFocusSlugMatch";
import {
  isSpeedAgilityPowerStyleSubFocusSlug,
} from "../data/sportSubFocus/speedAgilitySubFocusShared";
import {
  isExplosivePlyometricSportSubFocusSlug,
} from "../data/sportSubFocus/subFocusIntentArchetypes";
import { soccerPatternTransferApplies } from "../logic/workoutGeneration/sportPatternTransfer/fieldSportFamily/soccerSession";
import type { Exercise, GenerateWorkoutInput, WorkoutSession } from "../logic/workoutGeneration/types";

const GYM = {
  id: "walkthrough_gym",
  name: "Your Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable_machine",
    "squat_rack",
    "kettlebells",
    "pullup_bar",
    "treadmill",
    "rowing_machine",
    "assault_bike",
  ],
};

/** Mirrors typical Sport Mode one-day session from the user's screenshot. */
const USER_SELECTIONS = {
  mode: "Sport preparation (one-day session)",
  durationMinutes: 53,
  targetBody: "Full" as const,
  energy: "medium",
  tier: "intermediate" as const,
  /** Primary sport [0] drives soccer pattern transfer; use track first to mirror bad screenshot sessions. */
  rankedSports: ["track_sprinting", "soccer"] as const,
  sportFocusPct: [50, 50] as [number, number],
  /** Three sub-goals across sports (names as shown in UI). */
  sportSubFocusBySport: {
    soccer: ["change_of_direction", "speed"],
    track_sprinting: ["acceleration_power"],
  },
};

function sportSubFocusLabels(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of SPORTS_WITH_SUB_FOCUSES) {
    for (const f of s.sub_focuses) out[`${s.slug}:${f.slug}`] = f.name;
  }
  return out;
}

const SUB_LABELS = sportSubFocusLabels();

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(
    exerciseDefinitionToGeneratorExercise
  );
}

function buildInput(seed: number): GenerateWorkoutInput {
  const sportSubFocus = { ...USER_SELECTIONS.sportSubFocusBySport };

  const prefs = {
    primaryFocus: ["Sport preparation"],
    targetBody: USER_SELECTIONS.targetBody,
    targetModifier: [] as string[],
    durationMinutes: USER_SELECTIONS.durationMinutes,
    energyLevel: USER_SELECTIONS.energy,
    injuries: [] as string[],
    upcoming: [] as string[],
    subFocusByGoal: {},
    workoutStyle: [] as string[],
    workoutTier: USER_SELECTIONS.tier,
  };

  return manualPreferencesToGenerateWorkoutInput(
    prefs,
    GYM,
    seed,
    undefined,
    {
      sport_slugs: [...USER_SELECTIONS.rankedSports],
      sport_sub_focus: sportSubFocus,
      sport_weight: 1,
      sport_focus_pct: USER_SELECTIONS.sportFocusPct,
      include_intent_survival_report: true,
    }
  );
}

function collectExerciseTags(ex: Exercise): string[] {
  const slugs = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) slugs.add(s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_"));
  };
  for (const t of ex.tags.goal_tags ?? []) add(t);
  for (const t of ex.tags.sport_tags ?? []) add(t);
  for (const t of ex.tags.attribute_tags ?? []) add(t);
  for (const t of ex.tags.stimulus ?? []) add(t);
  for (const m of ex.muscle_groups ?? []) add(m);
  add(ex.movement_pattern);
  add(ex.pairing_category);
  return [...slugs].sort();
}

function matchingTagsForSubFocus(
  ex: Exercise,
  sport: string,
  subSlug: string
): { tag: string; weight: number }[] {
  const mapEntries = getExerciseTagsForSubFocuses(sport, [subSlug]);
  const exTags = new Set(collectExerciseTags(ex));
  return mapEntries
    .filter((e) => exTags.has(e.tag_slug))
    .sort((a, b) => b.weight - a.weight);
}

function explainExercise(
  ex: Exercise,
  input: GenerateWorkoutInput,
  blockSubFocus?: { sport: string; subSlug: string }
): string[] {
  const lines: string[] = [];
  const leaves = deriveLeafEntries(input.session_intent?.ranked_intent_entries ?? []);

  if (blockSubFocus) {
    const { sport, subSlug } = blockSubFocus;
    const hits = matchingTagsForSubFocus(ex, sport, subSlug);
    lines.push(
      `Block sub-goal: ${displayNameForSportSubFocusSlug(sport, subSlug)} (${sport}:${subSlug})`
    );
    lines.push(
      `  Tag-map match: ${hits.length ? hits.map((h) => `${h.tag_slug} (w=${h.weight})`).join(", ") : "none (should not appear in pool)"}`
    );
    lines.push(
      `  exerciseMatchesSportSubFocusSlug: ${exerciseMatchesSportSubFocusSlug(ex, sport, subSlug)}`
    );
    const entry = leaves.find(
      (l) => l.kind === "sport_sub_focus" && l.parent_slug === sport && l.slug === subSlug
    );
    if (entry) {
      lines.push(`  Leaf archetype: ${classifyLeafArchetype(entry)}`);
      lines.push(
        `  isMainWorkCandidateForIntentEntry: ${isMainWorkCandidateForIntentEntry(ex, entry, input.primary_goal)}`
      );
      if (isSpeedAgilityPowerStyleSubFocusSlug(subSlug)) {
        lines.push(`  COD/speed-style sub-focus (power archetype routing)`);
      }
      if (isExplosivePlyometricSportSubFocusSlug(subSlug)) {
        lines.push(`  Explosive/plyometric gate applies (dynamic power signal required for mains)`);
      }
    }
  }

  const matchedLeaves = leaves.filter((l) => matchesIntentEntry(ex, l));
  if (matchedLeaves.length) {
    lines.push(
      `  Also matches ranked leaves: ${matchedLeaves
        .map((l) =>
          l.kind === "sport_sub_focus"
            ? `${l.parent_slug}:${l.slug}`
            : `${l.kind}:${l.slug}`
        )
        .join("; ")}`
    );
  }

  lines.push(
    `  Exercise signals: modality=${ex.modality ?? "?"} pattern=${ex.movement_pattern ?? "?"} role=${ex.exercise_role ?? "?"}`
  );
  lines.push(`  Top tags: ${collectExerciseTags(ex).slice(0, 14).join(", ")}`);
  return lines;
}

function printUserSelections(): void {
  console.log("\n" + "=".repeat(78));
  console.log("SIMULATED USER SELECTIONS (Sport Mode)");
  console.log("=".repeat(78));
  console.log(`Mode:           ${USER_SELECTIONS.mode}`);
  console.log(`Duration:       ${USER_SELECTIONS.durationMinutes} min`);
  console.log(`Body focus:     ${USER_SELECTIONS.targetBody}`);
  console.log(`Energy:         ${USER_SELECTIONS.energy}`);
  console.log(`Tier:           ${USER_SELECTIONS.tier}`);
  console.log(`Gym equipment:  ${GYM.equipment.join(", ")}`);
  const [s1, s2] = USER_SELECTIONS.rankedSports;
  console.log(
    `Sports (rank):  1) ${s1}  2) ${s2} — ${USER_SELECTIONS.sportFocusPct[0]}/${USER_SELECTIONS.sportFocusPct[1]}%`
  );
  console.log("Sub-goals (3):");
  for (const [sport, slugs] of Object.entries(USER_SELECTIONS.sportSubFocusBySport)) {
    const unique = [...new Set(slugs)];
    for (const slug of unique) {
      const label = SUB_LABELS[`${sport}:${slug}`] ?? slug;
      console.log(`  • ${label} (${sport})`);
    }
  }
}

function printGeneratorPath(input: GenerateWorkoutInput): void {
  const leaves = deriveLeafEntries(input.session_intent?.ranked_intent_entries ?? []);
  console.log("\n" + "-".repeat(78));
  console.log("GENERATOR PATH (why this session shape)");
  console.log("-".repeat(78));
  console.log(`primary_goal (prescription template): ${input.primary_goal}`);
  console.log(`sport_weight: ${input.sport_weight}`);
  console.log(`sport_slugs[0] (primary for soccer transfer): ${input.sport_slugs?.[0]}`);
  console.log(`soccerPatternTransferApplies: ${soccerPatternTransferApplies(input)}`);
  console.log(
    `Intent-slot dedicated mains: ${leaves.length >= 2 && !soccerPatternTransferApplies(input) ? "YES (≥2 leaves, no sport-pattern takeover)" : "NO or overridden"}`
  );
  console.log("\nRanked intent leaves (weights → slot budget):");
  for (const l of leaves) {
    const pct = Math.round(l.weight * 100);
    const archetype =
      l.kind === "sport_sub_focus" ? classifyLeafArchetype(l) : "(goal leaf)";
    const name =
      l.kind === "sport_sub_focus"
        ? displayNameForSportSubFocusSlug(l.parent_slug ?? "", l.slug)
        : l.slug;
    console.log(
      `  ${pct}%  ${l.kind}  ${name}  [${l.parent_slug ?? ""}:${l.slug}]  archetype=${archetype}`
    );
  }
}

function printWorkout(session: WorkoutSession, input: GenerateWorkoutInput, exById: Map<string, Exercise>): void {
  console.log("\n" + "=".repeat(78));
  console.log("GENERATED WORKOUT");
  console.log("=".repeat(78));
  console.log(`Title: ${session.title}`);
  console.log(`Est. duration: ${session.estimated_duration_minutes ?? "?"} min\n`);

  for (const block of session.blocks) {
    const gi = block.goal_intent;
    const blockTag =
      gi?.intent_kind === "sport_sub_focus" && gi.sub_focus_slug
        ? displayNameForSportSubFocusSlug(gi.goal_slug ?? gi.parent_slug ?? "", gi.sub_focus_slug)
        : gi?.goal_slug ?? block.block_type;

    console.log(`── ${block.title ?? block.block_type}  [${blockTag}]`);
    if (block.prescription_label) console.log(`   ${block.prescription_label}`);

    for (const item of block.items) {
      const ex = exById.get(item.exercise_id);
      const presc = item.sets
        ? `${item.sets} x ${item.reps ?? "?"} reps`
        : item.duration_seconds
          ? `${Math.round((item.duration_seconds ?? 0) / 60)} min`
          : "";
      const rest = item.rest_seconds ? ` · Rest ${item.rest_seconds}s` : "";
      const matched =
        item.session_intent_links?.matched_intents
          ?.filter((m) => m.kind === "sport_sub_focus")
          .map((m) => displayNameForSportSubFocusSlug(m.parent_slug ?? "", m.slug))
          .join(", ") ?? "";

      console.log(`\n   • ${item.exercise_name ?? item.exercise_id}`);
      if (presc) console.log(`     ${presc}${rest}`);
      if (matched) console.log(`     FOR: ${matched}`);

      if (ex && gi?.intent_kind === "sport_sub_focus" && gi.sub_focus_slug) {
        console.log("     Selection methodology:");
        for (const line of explainExercise(ex, input, {
          sport: gi.goal_slug ?? gi.parent_slug ?? "soccer",
          subSlug: gi.sub_focus_slug,
        })) {
          console.log(`       ${line}`);
        }
      } else if (ex) {
        console.log("     (Support / non-dedicated block — not tied to one sub-goal slot)");
      }
    }
    console.log("");
  }

  const isr = session.debug?.intent_survival_report;
  if (isr?.selection_passes?.length) {
    console.log("-".repeat(78));
    console.log("INTENT SURVIVAL — selection passes (top candidates → chosen)");
    console.log("-".repeat(78));
    for (const pass of isr.selection_passes) {
      if (!pass.chosen_exercise_ids.length) continue;
      console.log(`\n[${pass.block_label}] slot=${pass.slot_type} mode=${pass.selection_mode}`);
      if (pass.chosen_why?.length) console.log(`  Why: ${pass.chosen_why.join(" | ")}`);
      const top = pass.top_candidate_breakdowns?.slice(0, 5) ?? [];
      if (top.length) {
        console.log("  Top scored in pool:");
        for (const c of top) {
          const mark = pass.chosen_exercise_ids.includes(c.exercise_id) ? " ← CHOSEN" : "";
          console.log(`    ${c.exercise_id}  score=${c.total_score.toFixed(2)}${mark}`);
        }
      }
    }
  }
}

function printSystematicSummary(): void {
  console.log("\n" + "=".repeat(78));
  console.log("SYSTEMATIC PATTERN (app-wide, not just this seed)");
  console.log("=".repeat(78));
  console.log(`
1. POOL = "any exercise with ≥1 tag from subFocusTagMap"
   • change_of_direction weights include explosive_power (0.9), speed (0.9), single_leg_strength (0.7)
   • acceleration_power weights include explosive_power, plyometric, squat_pattern
   → Generic squats, RDLs, woodchops, and Zone 2 cardio can enter the same pool as sprint drills.

2. MAIN-WORK GATE for COD is weak
   • change_of_direction is "power archetype" but isMainWorkCandidateForIntentEntry falls through to
     isIntentMainWorkCandidate → squat/hinge compounds qualify as main work.
   • acceleration_power uses explosive gate, but accessories with explosive_power still pass.

3. PATH SPLIT
   • soccer-only + lower/full → soccerPatternTransfer (category gates, excludes back squat from mains).
   • soccer + second sport OR non-lower focus → intent-slot allocation (tag match only, no soccer categories).

4. SCORING wins on total_score (qualities + balance + variety), not transfer specificity
   • Familiar compounds score high; COD-specific drills are fewer in DB → random shortlist picks generics.

5. CARDIO SHARE can replace a slot with Zone 2 when conditioning share > 0 and tags overlap "speed".

6. UI labels are honest: FOR chips show tag-map matches — the bug is selection rules, not display.
`);
}

function main(): void {
  const seed = parseInt(process.env.WALKTHROUGH_SEED ?? "682", 10);
  const exercisePool = pool();
  const exById = new Map(exercisePool.map((e) => [e.id, e]));
  const input = buildInput(seed);

  printUserSelections();
  printGeneratorPath(input);

  const session = generateWorkoutSession(input, exercisePool);
  printWorkout(session, input, exById);
  printSystematicSummary();

  console.log(`\nDone. seed=${seed} (set WALKTHROUGH_SEED to replay)\n`);
}

main();
