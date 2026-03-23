/**
 * Run: npx tsx lib/ontology/muscleSlugs.test.ts
 */
import {
  normalizePrimaryMuscleSlug,
  normalizedMusclesIntersect,
  hasUpperPullMuscleSignal,
} from "./muscleSlugs";

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

function main() {
  assert(normalizePrimaryMuscleSlug("Hamstring") === "hamstrings", "hamstring → hamstrings");
  assert(normalizePrimaryMuscleSlug("quad") === "quads", "quad → quads");
  const wanted = new Set(["hamstrings", "glutes"]);
  assert(normalizedMusclesIntersect(["Hamstring"], wanted), "intersect with alias");
  assert(!normalizedMusclesIntersect(["chest"], wanted), "no intersect");
  assert(hasUpperPullMuscleSignal(["back"]), "back counts as upper pull signal");
  assert(hasUpperPullMuscleSignal(["lats"]), "lats counts");
  assert(!hasUpperPullMuscleSignal(["quads"]), "quads not upper pull");
  console.log("muscleSlugs tests OK");
}

main();
