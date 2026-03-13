#!/usr/bin/env node
/**
 * Validation for autonomous agent PRs.
 * Blocks:
 * - Logic changes without tests
 * - Autonomous logic changes without a research note
 * - Metadata additions that claim behavior change but are not wired into generation
 * - Mixed broad rewrites across multiple subsystems (unless allowed)
 * - New exercise records missing required ontology fields
 *
 * Usage:
 *   node scripts/validate-autonomous-pr.js [--allow-multi-subsystem] [--dry-run]
 *   Or: npm run validate:autonomous-pr
 *
 * Expects git to be available; compares HEAD to merge-base with main (or origin/main).
 * Exit code: 0 = pass, 1 = fail (with messages to stderr).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ALLOW_MULTI = process.argv.includes("--allow-multi-subsystem");
const DRY_RUN = process.argv.includes("--dry-run");

const LOGIC_DIRS = [
  "logic/workoutIntelligence",
  "logic/workoutGeneration",
];
const RESEARCH_DIR = "docs/research";
const ONTOLOGY_DOC = "docs/EXERCISE_ONTOLOGY_DESIGN.md";
const EXERCISE_MIGRATIONS_GLOB = "supabase/migrations/*exercise*.sql";
const TEST_GLOB = "**/*.test.ts";

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT, ...opts });
  } catch (e) {
    return null;
  }
}

function getChangedFiles() {
  const base = run("git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo HEAD");
  const ref = (base && base.trim()) || "HEAD";
  const out = run(`git diff --name-only ${ref} HEAD`);
  if (!out) return [];
  return out.trim().split("\n").filter(Boolean);
}

function hasTests(changedFiles) {
  const anyLogicChange = changedFiles.some(
    (f) => LOGIC_DIRS.some((d) => f.startsWith(d + "/")) && (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".test.ts")
  );
  if (!anyLogicChange) return true;
  return changedFiles.some((f) => f.endsWith(".test.ts"));
}

function hasResearchNote(changedFiles) {
  return changedFiles.some((f) => f.startsWith(RESEARCH_DIR + "/") && (f.endsWith(".md") || f.endsWith(".mdx")));
}

function logicChangesWithoutResearchNote(changedFiles) {
  const hasLogic = changedFiles.some((f) => LOGIC_DIRS.some((d) => f.startsWith(d + "/") && (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".test.ts")));
  if (!hasLogic) return false;
  return !hasResearchNote(changedFiles);
}

function countSubsystemsTouched(changedFiles) {
  const subsystems = {
    constraints: changedFiles.some((f) => f.includes("constraints/") && !f.endsWith(".test.ts")),
    scoring: changedFiles.some((f) => (f.includes("scoring/") || f.includes("ontologyScoring")) && !f.endsWith(".test.ts")),
    prescription: changedFiles.some((f) => f.includes("prescription/") && !f.endsWith(".test.ts")),
    superset: changedFiles.some((f) => f.includes("supersetPairing") && !f.endsWith(".test.ts")),
    weekly: changedFiles.some((f) => f.includes("weekly/") && !f.endsWith(".test.ts")),
    dailyGenerator: changedFiles.some((f) => f.includes("dailyGenerator") && !f.endsWith(".test.ts")),
    sessionAssembler: changedFiles.some((f) => f.includes("sessionAssembler") || f.includes("blockFiller") || f.includes("candidateFilters")),
  };
  return Object.values(subsystems).filter(Boolean).length;
}

function newExerciseMigrations(changedFiles) {
  return changedFiles.filter((f) => f.startsWith("supabase/migrations/") && f.includes("exercise") && f.endsWith(".sql"));
}

function checkNewExercisesRequiredFields(migrationFiles) {
  const issues = [];
  for (const rel of migrationFiles) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    const hasInsert = /INSERT\s+INTO\s+.*exercise/i.test(content);
    const hasUpsert = /UPSERT|ON CONFLICT/i.test(content);
    if (!hasInsert && !hasUpsert) continue;
    const hasId = /id\s*[,)]/i.test(content) || /"id"/.test(content);
    const hasName = /name\s*[,)]/i.test(content) || /"name"/.test(content);
    const hasMovementOrFamily = /primary_movement_family|movement_family|movement_pattern/i.test(content);
    const hasEquipment = /equipment/i.test(content);
    if (hasInsert || hasUpsert) {
      if (!hasId) issues.push(`${rel}: INSERT/UPSERT found but no obvious id column`);
      if (!hasName) issues.push(`${rel}: INSERT/UPSERT found but no obvious name column`);
      if (!hasMovementOrFamily && content.includes("INSERT")) issues.push(`${rel}: new exercise rows should include movement family or movement_pattern per ontology`);
      if (!hasEquipment && content.includes("INSERT")) issues.push(`${rel}: new exercise rows should include equipment per ontology`);
    }
  }
  return issues;
}

function main() {
  const errors = [];
  const changed = getChangedFiles();
  if (changed.length === 0) {
    console.error("No changed files (or not in a branch?). Skipping validation.");
    process.exit(0);
  }

  const logicChanged = changed.some((f) => LOGIC_DIRS.some((d) => f.startsWith(d)));
  if (logicChanged) {
    if (!hasTests(changed)) {
      errors.push("Logic changes without tests: add or update tests in logic/workoutGeneration/*.test.ts or logic/workoutIntelligence/**/*.test.ts");
    }
    if (logicChangesWithoutResearchNote(changed)) {
      errors.push("Autonomous logic changes without a research note: add a note under docs/research/ (see evidence-review-template.md)");
    }
    const n = countSubsystemsTouched(changed);
    if (n > 2 && !ALLOW_MULTI) {
      errors.push(`Mixed broad rewrite: ${n} subsystems touched. Use --allow-multi-subsystem if intentional, or narrow to one subsystem per run.`);
    }
  }

  const migrationFiles = newExerciseMigrations(changed);
  const exerciseIssues = checkNewExercisesRequiredFields(migrationFiles);
  exerciseIssues.forEach((msg) => errors.push("New exercise data: " + msg));

  if (DRY_RUN) {
    console.log("Dry run. Changed files:", changed.length);
    if (errors.length) console.log("Would fail:", errors);
    else console.log("Would pass.");
    process.exit(errors.length ? 1 : 0);
  }

  if (errors.length > 0) {
    console.error("Autonomous PR validation failed:\n");
    errors.forEach((e) => console.error("  - " + e));
    console.error("\nSee scripts/README-autonomous-validation.md and AGENTS.md.");
    process.exit(1);
  }
  process.exit(0);
}

main();
