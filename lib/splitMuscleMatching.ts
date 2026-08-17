/**
 * Shared matching for Pattern/Muscle week splits → exercise tags.
 * Used by hard eligibility (working blocks) and scoring so chest/back/shoulders/arms/glutes
 * days do not treat a secondary muscle (e.g. triceps on bench) as a full match.
 */

import { normalizePrimaryMuscleSlug } from "./ontology/muscleSlugs";

export const MUSCLE_SPLIT_EMPHASIS_KEYS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "glutes",
  "legs",
  "core",
] as const;

export type MuscleSplitEmphasis = (typeof MUSCLE_SPLIT_EMPHASIS_KEYS)[number];

export type MuscleSplitExerciseShape = {
  id?: string;
  name?: string;
  muscle_groups?: string[];
  primary_muscle_groups?: string[];
  secondary_muscle_groups?: string[];
  pairing_category?: string | null;
  movement_pattern?: string | null;
  movement_patterns?: string[];
  fatigue_regions?: string[];
  attribute_tags?: string[];
  tags?: { attribute_tags?: string[] };
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
}

/** Muscle-group aliases used in split matching (fatigue vocab keeps `pecs` separately). */
export function canonSplitMuscleSlug(raw: string): string {
  const n = normalizePrimaryMuscleSlug(raw);
  if (n === "pecs" || n === "pec") return "chest";
  if (n === "delts" || n === "deltoid" || n === "deltoids") return "shoulders";
  if (n === "abs" || n === "obliques") return "core";
  return n;
}

function slugSet(values: string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const v of values ?? []) out.add(canonSplitMuscleSlug(v));
  return out;
}

function primaryMuscleSet(ex: MuscleSplitExerciseShape): Set<string> {
  if (ex.primary_muscle_groups?.length) return slugSet(ex.primary_muscle_groups);
  const secondary = new Set((ex.secondary_muscle_groups ?? []).map(canonSplitMuscleSlug));
  const fromAll = (ex.muscle_groups ?? [])
    .map(canonSplitMuscleSlug)
    .filter((m) => !secondary.has(m));
  if (fromAll.length > 0) return new Set(fromAll);
  return slugSet(ex.muscle_groups);
}

function pairingSlug(ex: MuscleSplitExerciseShape): string {
  return canonSplitMuscleSlug(ex.pairing_category ?? "");
}

function finePatterns(ex: MuscleSplitExerciseShape): Set<string> {
  return new Set((ex.movement_patterns ?? []).map(norm));
}

function attrSet(ex: MuscleSplitExerciseShape): Set<string> {
  const out = new Set<string>();
  for (const a of ex.attribute_tags ?? []) out.add(norm(a));
  for (const a of ex.tags?.attribute_tags ?? []) out.add(norm(a));
  return out;
}

function idName(ex: MuscleSplitExerciseShape): string {
  return `${ex.id ?? ""} ${ex.name ?? ""}`.toLowerCase();
}

function hasAny(set: Set<string>, keys: string[]): boolean {
  return keys.some((k) => set.has(k));
}

export function muscleSplitEmphasesFromFocusParts(
  focusParts: readonly string[] | null | undefined
): MuscleSplitEmphasis[] {
  if (!focusParts?.length) return [];
  const keys = new Set(focusParts.map(norm));
  const found: MuscleSplitEmphasis[] = [];
  for (const k of MUSCLE_SPLIT_EMPHASIS_KEYS) {
    if (keys.has(k)) found.push(k);
  }
  return found;
}

export function muscleSplitEmphasisFromFocusParts(
  focusParts: readonly string[] | null | undefined
): MuscleSplitEmphasis | null {
  const found = muscleSplitEmphasesFromFocusParts(focusParts);
  return found.length === 1 ? found[0]! : null;
}

/**
 * True when the exercise is a legitimate pick for a Muscle-mode day (or Pattern legs/glutes).
 * Prefers primary movers + pairing + fine patterns over coarse `push`/`pull` muscle tags.
 */
export function matchesMuscleSplitEmphasis(
  ex: MuscleSplitExerciseShape,
  emphasis: MuscleSplitEmphasis
): boolean {
  const primary = primaryMuscleSet(ex);
  const all = slugSet(ex.muscle_groups);
  const pair = pairingSlug(ex);
  const fine = finePatterns(ex);
  const fatigue = slugSet(ex.fatigue_regions);
  const attrs = attrSet(ex);
  const label = idName(ex);
  const pattern = norm(ex.movement_pattern ?? "");

  switch (emphasis) {
    case "chest": {
      if (hasAny(primary, ["chest"])) return true;
      if (pair === "chest") return true;
      if (fine.has("horizontal_push")) return true;
      if (attrs.has("bench_press")) return true;
      if (fatigue.has("chest") && !hasAny(primary, ["shoulders", "triceps"])) return true;
      if (/\b(chest|pec|bench|flye?|fly)\b/.test(label) && pattern === "push") return true;
      return false;
    }
    case "back": {
      if (hasAny(primary, ["back", "lats", "upper_back", "traps"])) return true;
      if (pair === "back" || pair === "lats") return true;
      if (fine.has("horizontal_pull") || fine.has("vertical_pull")) return true;
      if (fatigue.has("lats") && !hasAny(primary, ["biceps"])) return true;
      if (/\b(row|pulldown|pull[\s_-]?up|lat)\b/.test(label) && pattern === "pull") return true;
      return false;
    }
    case "shoulders": {
      if (hasAny(primary, ["shoulders"])) return true;
      if (pair === "shoulders") return true;
      if (fine.has("vertical_push")) return true;
      if (attrs.has("overhead_press")) return true;
      if (
        /face[\s_-]*pull|rear[\s_-]*delt|lateral[\s_-]*raise|front[\s_-]*raise|upright[\s_-]*row/.test(
          label
        )
      ) {
        return true;
      }
      return false;
    }
    case "arms": {
      if (hasAny(primary, ["chest", "back", "lats", "upper_back", "shoulders"])) return false;
      if (hasAny(primary, ["biceps", "triceps", "forearms", "arms"])) return true;
      if (pair === "biceps" || pair === "triceps" || pair === "arms") return true;
      if (/\b(curl|extension|kickback|skull\s*crusher|pushdown)\b/.test(label)) return true;
      return false;
    }
    case "glutes": {
      if (pair === "quads") return false;
      if (pair === "glutes") return true;
      if (hasAny(primary, ["glutes"]) && !hasAny(primary, ["quads"])) return true;
      if (fatigue.has("glutes") && (fine.has("hinge") || pattern === "hinge")) return true;
      if (pair === "posterior_chain" && (all.has("glutes") || fine.has("hinge") || pattern === "hinge"))
        return true;
      if (/hip[\s_-]*thrust|glute[\s_-]*bridge|glute[\s_-]*kickback/.test(label)) return true;
      return false;
    }
    case "legs": {
      if (
        hasAny(primary, ["legs", "quads", "glutes", "hamstrings", "calves"]) ||
        hasAny(all, ["legs", "quads", "glutes", "hamstrings", "calves"])
      ) {
        return true;
      }
      if (pair === "quads" || pair === "posterior_chain" || pair === "glutes") return true;
      if (fine.has("squat") || fine.has("hinge") || fine.has("lunge")) return true;
      if (pattern === "squat" || pattern === "hinge" || pattern === "lunge") return true;
      return false;
    }
    case "core": {
      if (hasAny(primary, ["core", "abs", "obliques"])) return true;
      if (pair === "core") return true;
      if (fine.has("anti_rotation") || fine.has("rotation") || fine.has("anti_extension")) return true;
      if (pattern === "rotate") return true;
      if (pattern === "carry" && hasAny(all, ["core", "abs", "obliques"])) return true;
      if (/\b(plank|dead\s*bug|pallof|crunch|sit[\s_-]*up|hollow\s*hold)\b/.test(label)) return true;
      return false;
    }
    default:
      return false;
  }
}

/** True when the exercise matches at least one Muscle-day emphasis (combo days). */
export function matchesAnyMuscleSplitEmphasis(
  ex: MuscleSplitExerciseShape,
  emphases: readonly MuscleSplitEmphasis[] | null | undefined
): boolean {
  if (!emphases?.length) return true;
  return emphases.some((e) => matchesMuscleSplitEmphasis(ex, e));
}

/** Scoring muscle slugs for a focus_body_parts entry (includes aliases). */
export function splitFocusPartToMuscles(focus: string): string[] {
  const f = norm(focus);
  if (f === "chest") return ["chest", "pecs"];
  if (f === "back") return ["lats", "upper_back", "back", "traps"];
  if (f === "shoulders") return ["shoulders", "delts"];
  if (f === "arms") return ["biceps", "triceps"];
  if (f === "glutes") return ["glutes"];
  if (f === "legs") return ["legs", "quads", "glutes", "hamstrings", "calves"];
  if (f === "quad") return ["quads", "legs"];
  if (f === "posterior") return ["glutes", "hamstrings"];
  if (f === "upper_push") return ["chest", "triceps", "shoulders", "pecs"];
  if (f === "upper_pull") return ["lats", "biceps", "upper_back", "back"];
  if (f === "upper_body") return ["chest", "triceps", "shoulders", "lats", "biceps", "upper_back", "pecs"];
  if (f === "lower" || f === "lower_body") return ["legs", "quads", "glutes", "hamstrings", "calves"];
  if (f === "core") return ["core", "abs", "obliques"];
  if (f === "full_body") {
    return [
      "legs",
      "quads",
      "glutes",
      "hamstrings",
      "calves",
      "core",
      "chest",
      "triceps",
      "shoulders",
      "lats",
      "biceps",
      "upper_back",
      "pecs",
    ];
  }
  return [];
}
