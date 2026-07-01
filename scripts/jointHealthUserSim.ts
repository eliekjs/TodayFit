/**
 * User-perspective simulation for all joint-health sub-goals (app path).
 */
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { generateWorkoutAsync } from "../lib/generator";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { ManualPreferences } from "../lib/types";

loadDotEnvFromRepoRoot();

const SUB_FOCUSES = [
  "Knee Health",
  "Shoulder Health",
  "Hip Health",
  "Ankle & Foot Health",
  "Back & Spine Health",
  "Elbow/Wrist Health",
] as const;

const gym = {
  id: "sim-gym",
  name: "Sim Gym",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

function rubricForSession(
  subFocus: string,
  blocks: { block_type: string; title?: string; items: { exercise_id: string; exercise_name?: string; reasoning_tags?: string[] }[]; estimated_minutes?: number }[]
) {
  const titles = blocks.map((b) => `${b.block_type}:${b.title ?? "?"}(${b.items.length})`);
  const totalItems = blocks.reduce((s, b) => s + b.items.length, 0);
  const totalMin = blocks.reduce((s, b) => s + (b.estimated_minutes ?? 0), 0);
  const hasActivation = blocks.some(
    (b) => b.block_type === "warmup" && b.title?.toLowerCase().includes("activation")
  );
  const hasStrength = blocks.some(
    (b) =>
      b.block_type === "main_strength" &&
      (b.title?.toLowerCase().includes("controlled") || b.title?.toLowerCase().includes("strength"))
  );
  const hasStability = blocks.some(
    (b) =>
      b.block_type === "main_strength" &&
      (b.title?.toLowerCase().includes("stability") || b.title?.toLowerCase().includes("unilateral"))
  );
  const hasMobility = blocks.some(
    (b) => b.block_type === "cooldown" || b.title?.toLowerCase().includes("mobility")
  );
  const issues: string[] = [];
  if (!hasActivation) issues.push("missing activation");
  if (!hasStrength) issues.push("missing controlled strength");
  if (!hasStability) issues.push("missing stability");
  if (!hasMobility) issues.push("missing mobility finisher");
  if (totalItems < 7) issues.push(`thin session (${totalItems} items)`);
  if (totalMin < 35) issues.push(`short duration (~${totalMin} min)`);
  return {
    subFocus,
    ok: issues.length === 0,
    issues,
    totalItems,
    totalMin,
    blocks: titles,
    exercises: blocks.flatMap((b) =>
      b.items.map((it) => `${it.exercise_id}${it.reasoning_tags?.includes("joint_health") ? "*" : ""}`)
    ),
  };
}

async function main() {
  const results = [];
  for (const subFocus of SUB_FOCUSES) {
    const seed = `jh-${subFocus.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const prefs: ManualPreferences = {
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: { "Strength Training for Joint Health": [subFocus] },
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
      targetBody: null,
      targetModifier: [],
    };
    const session = await generateWorkoutAsync(prefs, gym, seed);
    results.push(rubricForSession(subFocus, session.blocks));
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length}/${results.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} joint-health scenarios passed user rubric`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
