/**
 * Print representative generateWorkoutAsync outputs for manual QA (strength, hypertrophy,
 * climbing, skiing, low-equipment). Requires repo-root .env with Supabase keys.
 *
 *   npx tsx scripts/reviewGeneratorWorkouts.ts
 */

import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { GymProfile } from "../data/gymProfiles";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { isDbConfigured } from "../lib/db";
import { generateWorkoutAsync } from "../lib/generator";
import type { ManualPreferences } from "../lib/types";

function summarizeWorkout(label: string, w: Awaited<ReturnType<typeof generateWorkoutAsync>>) {
  console.log("\n" + "=".repeat(72));
  console.log(label);
  console.log("=".repeat(72));
  console.log("focus:", w.focus?.join(", ") ?? "(none)");
  console.log("durationMinutes:", w.durationMinutes);
  for (const b of w.blocks) {
    const n = b.items?.length ?? 0;
    const names = (b.items ?? []).map((i) => i.exercise_name).slice(0, 6);
    const more = n > 6 ? ` (+${n - 6} more)` : "";
    console.log(
      `  [${b.block_type}] ${b.title ?? ""} · ${n} item(s)` + (names.length ? `: ${names.join(" | ")}${more}` : "")
    );
  }
}

async function main() {
  loadDotEnvFromRepoRoot();
  if (!isDbConfigured()) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (e.g. in .env).");
    process.exit(1);
  }

  const fullGym: GymProfile = {
    id: "review_full",
    name: "Full gym",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  };

  const lowEq: GymProfile = {
    id: "review_hotel",
    name: "Low equipment",
    equipment: getDefaultEquipmentForTemplate("hotel_gym"),
  };

  const strength: ManualPreferences = {
    primaryFocus: ["Build Strength"],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  const hypertrophy: ManualPreferences = {
    ...strength,
    primaryFocus: ["Build Muscle (Hypertrophy)"],
    targetBody: "Upper",
    targetModifier: ["Push"],
    durationMinutes: 40,
  };

  const recoveryBase: ManualPreferences = {
    primaryFocus: ["Build Strength"],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  summarizeWorkout(
    "1) Strength · full body · 45m · full gym",
    await generateWorkoutAsync(strength, fullGym)
  );

  summarizeWorkout(
    "2) Hypertrophy · upper push · 40m · full gym",
    await generateWorkoutAsync(hypertrophy, fullGym)
  );

  summarizeWorkout(
    "3) Climbing-oriented · strength · full gym · sport context",
    await generateWorkoutAsync(
      recoveryBase,
      fullGym,
      undefined,
      undefined,
      {
        sport_slugs: ["rock_climbing"],
        sport_weight: 0.6,
      }
    )
  );

  summarizeWorkout(
    "4) Ski-oriented · strength · full gym · sport context",
    await generateWorkoutAsync(
      recoveryBase,
      fullGym,
      undefined,
      undefined,
      {
        sport_slugs: ["alpine_skiing"],
        sport_weight: 0.55,
      }
    )
  );

  summarizeWorkout(
    "5) Strength · full body · 45m · low equipment (hotel-style)",
    await generateWorkoutAsync(strength, lowEq)
  );

  console.log("\nDone. Review block types, exercise names, and equipment fit for each scenario.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
