/**
 * Exercise metadata quality agent: audit static catalog, propose heuristic enrichments,
 * optional safe apply to data/exerciseMetadataOverrides.json (with backup / rollback).
 *
 * Usage:
 *   npx tsx scripts/exerciseMetadataQualityAgent.ts [--out report.json]
 *   npx tsx scripts/exerciseMetadataQualityAgent.ts --apply                  # uses default min confidence 0.8
 *   npx tsx scripts/exerciseMetadataQualityAgent.ts --apply --min-confidence 0.72
 *   npx tsx scripts/exerciseMetadataQualityAgent.ts --rollback path/to/backup.json
 *
 * Default: dry-run (writes report only; does not modify overrides).
 */

import fs from "node:fs";
import path from "node:path";

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import type { ExerciseMetadataPatch } from "../lib/exerciseMetadata/metadataOverrideTypes";
import { getLegacyMovementPattern } from "../lib/ontology/legacyMapping";
import {
  inferCreativeVariationFromSource,
  inferWorkoutLevelsWithExplanation,
} from "../lib/workoutLevel";
import type { ExerciseDefinition } from "../lib/types";
import type { Exercise } from "../logic/workoutGeneration/types";

const ROOT = path.join(__dirname, "..");
const OVERRIDE_PATH = path.join(ROOT, "data", "exerciseMetadataOverrides.json");
const SNAPSHOT_DIR = path.join(ROOT, "docs", "auditSnapshots");

type AuditFlag = {
  code: string;
  severity: "info" | "warn" | "high";
  message: string;
};

type FieldProposal = {
  field: keyof ExerciseMetadataPatch | "attribute_tags_append";
  before: unknown;
  after: unknown;
  confidence: number;
  rationale: string;
};

type ExerciseReport = {
  id: string;
  name: string;
  flags: AuditFlag[];
  proposals: FieldProposal[];
  composite_confidence: number;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

function blob(def: ExerciseDefinition): string {
  return norm(`${def.id} ${def.name}`);
}

/** Lowercase id + display name with spaces preserved for `\\b` word boundaries. */
function exerciseText(def: ExerciseDefinition): string {
  return `${def.id} ${def.name}`.toLowerCase().replace(/-/g, " ");
}

/** Heuristic difficulty 1–5 from name/tags/progression graph. */
function heuristicDifficulty(def: ExerciseDefinition, ex: Exercise): number {
  const t = exerciseText(def);
  const tags = new Set((def.tags ?? []).map(norm));
  if (
    /\b(muscle up|planche|snatch|clean and jerk|iron cross|dragon flag|front lever)\b/.test(t) ||
    tags.has("elite_skill")
  )
    return 5;
  if (
    /\b(pistol|handstand push|one arm|skin the cat|bar muscle|ring muscle)\b/.test(t) ||
    tags.has("advanced_only")
  )
    return 4;
  if (
    /\b(bulgarian|split squat|rear foot|single leg|unilateral|balance|bosu)\b/.test(t) ||
    tags.has("single_leg") ||
    tags.has("single-leg")
  )
    return Math.max(3, ex.difficulty);
  if (/\b(goblet|glute bridge|lat pulldown|leg press)\b/.test(t)) return 2;
  return ex.difficulty;
}

/** Conservative: only flag stability when catalog omits demand and name clearly implies instability. */
function heuristicStability(def: ExerciseDefinition): "medium" | "high" | undefined {
  const t = exerciseText(def);
  const tags = new Set((def.tags ?? []).map(norm));
  if (
    /\b(bosu|pistol|skater)\b/.test(t) ||
    /\b(single leg|unilateral)\b/.test(t) ||
    tags.has("single_leg") ||
    tags.has("single-leg")
  ) {
    return "high";
  }
  if (/\b(split squat|bulgarian)\b/.test(t)) return "high";
  if (tags.has("balance")) return "high";
  return undefined;
}

/** Conservative grip hints (omit generic barbell/dumbbell — too broad for 4k+ catalog). */
function heuristicGrip(def: ExerciseDefinition): "medium" | "high" | undefined {
  const t = exerciseText(def);
  if (/\b(farmer|dead hang|rope climb)\b/.test(t)) return "high";
  if (/\b(hang clean|carry)\b/.test(t)) return "medium";
  return undefined;
}

function modalityFromDefinition(def: ExerciseDefinition): string {
  const m = def.modalities?.map(norm) ?? [];
  if (m.includes("conditioning") && !m.includes("strength") && !m.includes("hypertrophy")) return "conditioning";
  if (m.includes("power")) return "power";
  if (m.includes("mobility") || m.includes("recovery")) return "mobility";
  if (m.includes("hypertrophy") && !m.includes("strength")) return "hypertrophy";
  return "strength";
}

function analyzeExercise(def: ExerciseDefinition): ExerciseReport {
  const ex = exerciseDefinitionToGeneratorExercise(def);
  const flags: AuditFlag[] = [];
  const proposals: FieldProposal[] = [];

  const levelSrc = {
    id: def.id,
    name: def.name,
    tags: def.tags ?? [],
    workout_levels: def.workout_levels,
    stability_demand: ex.stability_demand,
    grip_demand: ex.grip_demand,
    impact_level: ex.impact_level,
    modality: ex.modality,
    movement_pattern: ex.movement_pattern,
    difficulty: ex.difficulty,
    unilateral: ex.unilateral,
    attribute_tags: ex.tags.attribute_tags,
    equipment_required: ex.equipment_required,
  };
  const explained = inferWorkoutLevelsWithExplanation(levelSrc);

  if (ex.workout_level_tags?.length === 3) {
    flags.push({
      code: "broad_workout_levels",
      severity: "warn",
      message: "Exercise allows all experience tiers — consider narrowing for clearer UX",
    });
  }

  const eliteName = /\b(muscle up|planche|snatch|pistol)\b/.test(exerciseText(def));
  if (eliteName && ex.workout_level_tags?.includes("beginner")) {
    flags.push({
      code: "tier_mismatch_elite_vs_beginner",
      severity: "high",
      message: "Elite-pattern name but beginner appears in workout_level_tags",
    });
  }

  if (explained.origin === "inferred" && explained.levels.length === 1 && ex.workout_level_tags?.length === 3) {
    proposals.push({
      field: "workout_levels",
      before: ex.workout_level_tags,
      after: explained.levels,
      confidence: 0.78,
      rationale: "Inferred band is narrower than current three-tier assignment; suggest explicit override",
    });
  }

  const fromOntologyLegacy = getLegacyMovementPattern({
    movement_patterns: ex.movement_patterns,
    movement_pattern: null,
  });
  if (
    ex.movement_patterns?.length &&
    fromOntologyLegacy !== ex.movement_pattern &&
    fromOntologyLegacy !== "push"
  ) {
    flags.push({
      code: "movement_pattern_vs_ontology",
      severity: "info",
      message: `Legacy pattern ${ex.movement_pattern} vs ontology-derived ${fromOntologyLegacy}`,
    });
    proposals.push({
      field: "movement_pattern",
      before: ex.movement_pattern,
      after: fromOntologyLegacy,
      confidence: 0.76,
      rationale: "Align legacy movement_pattern with primary fine movement_patterns mapping",
    });
  }

  const expectedMod = modalityFromDefinition(def);
  if (norm(expectedMod) !== norm(ex.modality) && def.modalities?.length) {
    flags.push({
      code: "modality_definition_mismatch",
      severity: "info",
      message: `Generator modality ${ex.modality} vs first-pass expectation from def.modalities ${expectedMod}`,
    });
    proposals.push({
      field: "modality",
      before: ex.modality,
      after: expectedMod,
      confidence: 0.5,
      rationale: "Normalize modality from ExerciseDefinition.modalities primary bucket (review; multimodal defs are ambiguous)",
    });
  }

  const hd = heuristicDifficulty(def, ex);
  if (hd !== ex.difficulty) {
    const conf = eliteName ? 0.88 : Math.abs(hd - ex.difficulty) >= 2 ? 0.82 : 0.73;
    flags.push({
      code: "difficulty_heuristic_delta",
      severity: ex.difficulty === 2 && hd >= 4 ? "warn" : "info",
      message: `difficulty=${ex.difficulty} vs heuristic ${hd} (catalog default is often 2)`,
    });
    proposals.push({
      field: "difficulty",
      before: ex.difficulty,
      after: hd,
      confidence: conf,
      rationale: "Name/tag/progression-based difficulty estimate",
    });
  }

  const stab = heuristicStability(def);
  if (stab && !ex.stability_demand) {
    proposals.push({
      field: "stability_demand",
      before: ex.stability_demand ?? null,
      after: stab,
      confidence: stab === "high" ? 0.77 : 0.74,
      rationale: "Name/tag keywords suggest stability demand; catalog omits stability_demand",
    });
  }

  const grip = heuristicGrip(def);
  if (grip && !ex.grip_demand) {
    proposals.push({
      field: "grip_demand",
      before: ex.grip_demand ?? null,
      after: grip,
      confidence: grip === "high" ? 0.78 : 0.74,
      rationale: "Name keywords suggest grip demand; catalog omits grip_demand",
    });
  }

  const creativeInfer = inferCreativeVariationFromSource({ id: def.id, name: def.name, tags: def.tags ?? [] });
  if (creativeInfer && !ex.creative_variation) {
    flags.push({ code: "creative_variation_under_tagged", severity: "info", message: "Name/tag creative signal but creative_variation false on exercise" });
    proposals.push({
      field: "creative_variation",
      before: ex.creative_variation ?? false,
      after: true,
      confidence: 0.79,
      rationale: "inferCreativeVariationFromSource matched",
    });
  }

  const confidences = proposals.map((p) => p.confidence);
  const composite = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  return {
    id: def.id,
    name: def.name,
    flags,
    proposals,
    composite_confidence: Math.round(composite * 100) / 100,
  };
}

function proposalsToPatch(proposals: FieldProposal[], minConfidence: number): ExerciseMetadataPatch {
  const byField = new Map<FieldProposal["field"], FieldProposal>();
  for (const p of proposals) {
    if (p.confidence < minConfidence) continue;
    const prev = byField.get(p.field);
    if (!prev || p.confidence > prev.confidence) byField.set(p.field, p);
  }
  const patch: ExerciseMetadataPatch = {};
  for (const p of byField.values()) {
    if (p.field === "difficulty") patch.difficulty = p.after as number;
    if (p.field === "stability_demand") patch.stability_demand = p.after as ExerciseMetadataPatch["stability_demand"];
    if (p.field === "grip_demand") patch.grip_demand = p.after as ExerciseMetadataPatch["grip_demand"];
    if (p.field === "modality") patch.modality = p.after as ExerciseMetadataPatch["modality"];
    if (p.field === "movement_pattern") patch.movement_pattern = p.after as ExerciseMetadataPatch["movement_pattern"];
    if (p.field === "workout_levels") patch.workout_levels = p.after as ExerciseMetadataPatch["workout_levels"];
    if (p.field === "creative_variation") patch.creative_variation = p.after as boolean;
  }
  return patch;
}

function parseArgs(argv: string[]) {
  let out: string | undefined;
  let apply = false;
  let minConfidence = 0.8;
  let rollback: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
    else if (argv[i] === "--apply") apply = true;
    else if (argv[i] === "--min-confidence" && argv[i + 1]) minConfidence = Number(argv[++i]);
    else if (argv[i] === "--rollback" && argv[i + 1]) rollback = argv[++i];
  }
  return { out, apply, minConfidence, rollback };
}

function loadOverrides(): Record<string, ExerciseMetadataPatch> {
  if (!fs.existsSync(OVERRIDE_PATH)) return {};
  const raw = fs.readFileSync(OVERRIDE_PATH, "utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, ExerciseMetadataPatch>;
  } catch {
    return {};
  }
}

function main() {
  const { out, apply, minConfidence, rollback } = parseArgs(process.argv);

  if (rollback) {
    const src = path.isAbsolute(rollback) ? rollback : path.join(process.cwd(), rollback);
    if (!fs.existsSync(src)) {
      console.error("Rollback source not found:", src);
      process.exit(1);
    }
    fs.copyFileSync(src, OVERRIDE_PATH);
    console.log("Restored", OVERRIDE_PATH, "from", src);
    process.exit(0);
  }

  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const exercises: ExerciseReport[] = [];
  const summary = {
    total: EXERCISES.length,
    with_flags: 0,
    with_proposals: 0,
    high_severity_flags: 0,
  };

  for (const def of EXERCISES) {
    const rep = analyzeExercise(def);
    exercises.push(rep);
    if (rep.flags.length) summary.with_flags++;
    if (rep.proposals.length) summary.with_proposals++;
    summary.high_severity_flags += rep.flags.filter((f) => f.severity === "high").length;
  }

  const patches: Record<string, ExerciseMetadataPatch> = {};
  for (const e of exercises) {
    const patch = proposalsToPatch(e.proposals, minConfidence);
    if (Object.keys(patch).length) patches[e.id] = patch;
  }

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: !apply,
    min_confidence: minConfidence,
    summary,
    exercises,
    /** Merged preview: existing overrides + high-confidence proposals (for inspect only when dry-run). */
    proposed_override_delta: patches,
  };

  const outPath = out ?? path.join(SNAPSHOT_DIR, `exercise-metadata-quality-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Wrote audit report:", outPath);
  console.log("Summary:", summary, "proposed patched exercises:", Object.keys(patches).length);

  if (apply) {
    const backup = path.join(SNAPSHOT_DIR, `exercise-metadata-overrides-backup-${Date.now()}.json`);
    if (fs.existsSync(OVERRIDE_PATH)) fs.copyFileSync(OVERRIDE_PATH, backup);
    else fs.writeFileSync(backup, "{}\n", "utf8");
    console.log("Backup:", backup);

    const current = loadOverrides();
    const merged = { ...current };
    for (const [id, p] of Object.entries(patches)) {
      merged[id] = { ...(merged[id] ?? {}), ...p };
    }
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log("Applied", Object.keys(patches).length, "exercise patches to", OVERRIDE_PATH);
  } else {
    console.log("Dry-run: no changes to data/exerciseMetadataOverrides.json (use --apply)");
  }
}

main();
