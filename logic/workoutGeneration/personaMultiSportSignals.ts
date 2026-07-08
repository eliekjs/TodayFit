/**
 * Detect whether a generated workout reflects a given sport's influence.
 * Uses block titles, goal_intent, intentSplit, session_intent_links, and exercise metadata —
 * not naive name regex alone.
 */

import type { GeneratedWorkout } from "../../lib/types";
import type { Exercise } from "../workoutGeneration/types";

const SPORT_NAME_ALIASES: Record<string, RegExp> = {
  basketball: /\bbasketball\b|\bcourt\b|vertical.?jump|\bvbj\b/i,
  soccer: /\bsoccer\b|\bfootball\b(?!\s*american)|\bsprint\b|\bshuffle\b|\bdecel|\bhurdle|\btoss\b|\brsa\b/i,
  trail_running: /\btrail\b|\buphill\b|\beccentric\b|\brunning\b/i,
  rock_climbing: /\bclimb|\bpull.?up\b|\bfinger\b|\bscapular\b/i,
};

function blockTextSignalsSport(blockTitle: string, reasoning: string | undefined, sportSlug: string): boolean {
  const blob = `${blockTitle} ${reasoning ?? ""}`.toLowerCase();
  const slug = sportSlug.toLowerCase().replace(/_/g, " ");
  if (blob.includes(slug)) return true;
  const alias = SPORT_NAME_ALIASES[sportSlug];
  return alias ? alias.test(blob) : false;
}

export function sportInfluenceInWorkout(
  workout: GeneratedWorkout,
  sportSlug: string,
  poolById: Map<string, Exercise>
): boolean {
  const slugNorm = sportSlug.toLowerCase();

  for (const block of workout.blocks) {
    if (blockTextSignalsSport(block.title ?? "", block.reasoning, sportSlug)) return true;
    const gi = block.goal_intent;
    if (gi) {
      if (gi.intent_kind === "sport" || gi.intent_kind === "sport_sub_focus") {
        if (gi.goal_slug === slugNorm || gi.parent_slug === slugNorm) return true;
      }
    }
  }

  if (
    workout.intentSplit?.some(
      (e) =>
        (e.kind === "sport" || e.kind === "sport_sub_focus") &&
        (e.slug === slugNorm || e.parent_slug === slugNorm) &&
        e.pct >= 8
    )
  ) {
    return true;
  }

  for (const block of workout.blocks) {
    if (block.block_type === "warmup" || block.block_type === "cooldown") continue;
    for (const item of block.items ?? []) {
      const links = item.session_intent_links;
      if (links?.sport_slugs?.some((s) => s.toLowerCase() === slugNorm)) return true;
      if (links?.matched_intents?.some((m) => m.slug === slugNorm && m.kind.startsWith("sport")))
        return true;
      if (links?.declared_sport_sub_focuses?.some((d) => d.parent_slug === slugNorm)) return true;

      const ex = poolById.get(item.exercise_id);
      const sportTags = (ex?.tags?.sport_tags ?? []).join(" ").toLowerCase();
      if (sportTags.includes(slugNorm.replace(/_/g, "")) || sportTags.includes(`sport_${slugNorm}`))
        return true;

      const name = item.exercise_name.toLowerCase();
      if (name.includes(slugNorm.replace(/_/g, " "))) return true;
      const alias = SPORT_NAME_ALIASES[sportSlug];
      if (alias?.test(name)) return true;
    }
  }

  return false;
}

export function multiSportBlendCheck(
  workout: GeneratedWorkout,
  sportSlugs: string[],
  poolById: Map<string, Exercise>
): { pass: boolean; evidence: string; perSport: Record<string, boolean> } {
  const perSport: Record<string, boolean> = {};
  for (const slug of sportSlugs) {
    perSport[slug] = sportInfluenceInWorkout(workout, slug, poolById);
  }
  const pass = sportSlugs.every((s) => perSport[s]);
  const evidence = sportSlugs.map((s) => `${s}=${perSport[s]}`).join(", ");
  return { pass, evidence, perSport };
}
