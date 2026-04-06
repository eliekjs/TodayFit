#!/usr/bin/env npx tsx
/**
 * Verify sport profile engine is driven only by canonical `data/sportSubFocus/sportDefinitions.ts`.
 *
 * Usage:
 *   npx tsx scripts/verifySportProfileCanonicalization.ts
 *   npx tsx scripts/verifySportProfileCanonicalization.ts --sample
 */

import { getSportDefinition } from "../data/sportSubFocus";
import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import {
  buildSportProfileMappingDebug,
  getSportSlugsWithProfileEngine,
  mapSportDefinitionForSlug,
} from "../logic/workoutGeneration/sportProfileEngine";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";

const LINE = "─".repeat(72);

function printHeader(title: string) {
  console.log(`\n${LINE}\n${title}\n${LINE}`);
}

function main() {
  const withSample = process.argv.includes("--sample");

  printHeader("Enabled sports (canonical `engine` in sportDefinitions.ts)");
  const slugs = getSportSlugsWithProfileEngine();
  console.log(`Count: ${slugs.length}`);
  console.log(slugs.sort().join(", "));

  printHeader("Per-sport: map status, top patterns, bans, boosts (from mapper)");
  let legacyRisk = 0;
  for (const slug of slugs.sort()) {
    const def = getSportDefinition(slug);
    const mapResult = mapSportDefinitionForSlug(slug);
    if (!def?.engine) {
      console.log(`\n[${slug}] ERROR: listed in getSportSlugsWithProfileEngine but no engine on definition`);
      legacyRisk++;
      continue;
    }
    if (!mapResult.ok) {
      console.log(`\n[${slug}] MAP FAILED: ${mapResult.errors.join("; ")}`);
      legacyRisk++;
      continue;
    }
    const p = mapResult.profile;
    const dbg = buildSportProfileMappingDebug(slug, p, mapResult);
    const boostSample = p.requiredTagBoosts.slice(0, 5).map((t) => `${t.tag}:${t.weight}`);
    console.log(`\n[${slug}]`);
    console.log(`  canonical_profile_loaded: ${dbg.canonical_profile_loaded}`);
    console.log(`  fallback_used: ${dbg.fallback_used}${dbg.fallback_reason ? ` (${dbg.fallback_reason})` : ""}`);
    console.log(`  canonical_fields_used: ${dbg.canonical_fields_used.join(", ")}`);
    console.log(`  top_patterns: ${p.topPatterns.join(", ")}`);
    console.log(`  hard_ban_predicates: ${p.hardBanPredicates.length}, soft_ban_predicates: ${p.softBanPredicates.length}`);
    console.log(`  hard_banned_tags: ${p.bannedTagSlugs.join(", ") || "(none)"}`);
    console.log(`  soft_banned_tags: ${p.softBannedTagSlugs.join(", ") || "(none)"}`);
    console.log(`  conditioning_minutes_scale: ${p.energySystemBias.conditioningMinutesScale}`);
    console.log(`  required_tag_boosts (first 5): ${boostSample.join("; ")}`);
    console.log(`  scoring_penalty_keys: ${p.scoringPenaltyKeys.join(", ") || "(none)"}`);
  }

  printHeader("Legacy / duplicate profile constants in sportProfileEngine.ts");
  console.log(
    "Engine file should not define per-sport NormalizedSportProfile literals. " +
      "Scan: only predicates/penalty implementations and climbing domain helper should be sport-specific."
  );
  console.log(legacyRisk === 0 ? "OK: all enabled sports mapped successfully from canonical definitions." : `WARN: ${legacyRisk} issue(s) above.`);

  if (withSample) {
    printHeader("Sample generation (sport_profile_applied debug)");
    const pool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id))
      .slice(0, 350)
      .map(exerciseDefinitionToGeneratorExercise);
    const sampleSports = ["rock_climbing", "alpine_skiing", "hyrox"];
    for (const sport of sampleSports) {
      const input: GenerateWorkoutInput = {
        duration_minutes: 40,
        primary_goal: "strength",
        focus_body_parts: ["lower"],
        energy_level: "medium",
        available_equipment: [
          "barbell",
          "dumbbells",
          "bench",
          "squat_rack",
          "bodyweight",
          "treadmill",
          "pullup_bar",
        ],
        injuries_or_constraints: [],
        seed: 777,
        sport_slugs: [sport],
        sport_weight: 0.55,
      };
      const session = generateWorkoutSession(input, pool);
      const spa = session.debug?.sport_profile_applied;
      console.log(`\n-- ${sport} --`);
      console.log(
        JSON.stringify(
          {
            canonical_sport_definition_slug: spa?.canonical_sport_definition_slug,
            canonical_profile_loaded: spa?.canonical_profile_loaded,
            fallback_used: spa?.fallback_used,
            fallback_reason: spa?.fallback_reason ?? null,
            top_patterns: spa?.top_patterns,
            pool_before: spa?.pool_before,
            pool_after: spa?.pool_after,
            mapping_failed: session.debug?.sport_profile_canonical_mapping_failed ?? null,
          },
          null,
          2
        )
      );
    }
  } else {
    console.log("\n(Run with --sample for 3× generateWorkoutSession debug summaries.)");
  }

  printHeader("Done");
}

main();
