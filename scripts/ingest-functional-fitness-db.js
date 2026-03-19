/**
 * Ingest Functional Fitness Exercise Database xlsx into TodayFit ExerciseDefinition format.
 * Outputs data/exercisesFunctionalFitness.ts and optionally appends to data/exercises.ts.
 *
 * Run: node scripts/ingest-functional-fitness-db.js
 *
 * FF columns (header row 14): Exercise, Short YouTube..., In-Depth..., Difficulty Level,
 * Target Muscle Group, Prime Mover, Secondary, Tertiary, Primary Equipment, # Primary,
 * Secondary Equipment, # Secondary, Posture, Single or Double Arm, Continuous or Alternating Arms,
 * Grip, Load Position, Continuous or Alternating Legs, Foot Elevation, Combination Exercises,
 * Movement Pattern #1, #2, #3, Plane Of Motion #1, #2, #3, Body Region, Force Type, Mechanics,
 * Laterality, Primary Exercise Classification
 */

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const FILE_PATH = path.join(
  process.env.HOME || "/Users/ellie",
  "Downloads",
  "Functional+Fitness+Exercise+Database+(version+2.9).xlsx"
);

const HEADER_ROW_INDEX = 14;
const COL = {
  EXERCISE: 0,
  DIFFICULTY: 3,
  TARGET_MUSCLE: 4,
  PRIME_MOVER: 5,
  SECONDARY_MUSCLE: 6,
  TERTIARY_MUSCLE: 7,
  PRIMARY_EQUIPMENT: 8,
  SECONDARY_EQUIPMENT: 10,
  MOVEMENT_PATTERN_1: 20,
  MOVEMENT_PATTERN_2: 21,
  MOVEMENT_PATTERN_3: 22,
  BODY_REGION: 26,
  PRIMARY_CLASSIFICATION: 30,
};

// TodayFit MuscleGroup = "legs" | "push" | "pull" | "core"
const TARGET_TO_MUSCLE_GROUP = {
  abdominals: "core",
  core: "core",
  glutes: "legs",
  hamstrings: "legs",
  quadriceps: "legs",
  quads: "legs",
  calves: "legs",
  legs: "legs",
  hip: "legs",
  "hip flexors": "legs",
  adductors: "legs",
  chest: "push",
  triceps: "push",
  shoulders: "push",
  deltoids: "push",
  back: "pull",
  lats: "pull",
  biceps: "pull",
  trapezius: "pull",
  traps: "pull",
  forearms: "pull",
  "upper back": "pull",
  "lower back": "core",
  erectors: "core",
  obliques: "core",
  "rectus abdominis": "core",
  "rectus femoris": "legs",
};
function muscleGroupFromTarget(s) {
  if (!s || typeof s !== "string") return [];
  const key = s.toLowerCase().trim();
  const primary = TARGET_TO_MUSCLE_GROUP[key];
  if (primary) return [primary];
  for (const [k, v] of Object.entries(TARGET_TO_MUSCLE_GROUP)) {
    if (key.includes(k)) return [v];
  }
  return [];
}

function uniqueMuscleGroups(rows, ...colIndices) {
  const set = new Set();
  for (const c of colIndices) {
    const v = rows[c];
    if (v && typeof v === "string") {
      const g = muscleGroupFromTarget(v);
      g.forEach((m) => set.add(m));
    }
  }
  return set.size ? Array.from(set) : ["core"];
}

// Map FF equipment to lib/types EquipmentKey (snake_case)
const EQUIPMENT_MAP = {
  none: "bodyweight",
  bodyweight: "bodyweight",
  "stability ball": "bodyweight",
  "suspension trainer": "trx",
  trx: "trx",
  "resistance band": "bands",
  band: "bands",
  bands: "bands",
  dumbbell: "dumbbells",
  dumbbells: "dumbbells",
  kettlebell: "kettlebells",
  kettlebells: "kettlebells",
  barbell: "barbell",
  barbells: "barbell",
  cable: "cable_machine",
  "cable machine": "cable_machine",
  ring: "rings",
  rings: "rings",
  parallette: "bodyweight",
  parallettes: "bodyweight",
  "medicine ball": "bodyweight",
  sandbag: "bodyweight",
  "battling ropes": "bodyweight",
  "plyometric box": "plyo_box",
  "plyo box": "plyo_box",
  step: "bench",
  "adjustable bench": "bench",
  bench: "bench",
  "pull-up bar": "pullup_bar",
  "pull up bar": "pullup_bar",
  "lat pulldown": "lat_pulldown",
  "leg press": "leg_press",
  "leg extension": "leg_extension",
  treadmill: "treadmill",
  rower: "rower",
  "rowing machine": "rower",
  bike: "assault_bike",
  "assault bike": "assault_bike",
  "stair climber": "stair_climber",
  slider: "bodyweight",
  sliders: "bodyweight",
  "foam roller": "bodyweight",
  "mini band": "bands",
  miniband: "bands",
};
const VALID_EQUIPMENT = new Set([
  "bodyweight", "barbell", "dumbbells", "kettlebells", "bands", "cable_machine",
  "bench", "squat_rack", "pullup_bar", "rings", "leg_press", "leg_extension",
  "machine", "trap_bar", "treadmill", "rower", "assault_bike", "stair_climber",
  "elliptical", "trx", "plyo_box", "sled", "lat_pulldown", "chest_press",
  "hamstring_curl", "adjustable_bench", "ez_bar", "plates",
]);

function mapEquipment(s) {
  if (!s || typeof s !== "string") return "bodyweight";
  const key = s.toLowerCase().trim().replace(/\s+/g, " ");
  const mapped = EQUIPMENT_MAP[key];
  if (mapped) return mapped;
  const slug = key.replace(/\s+/g, "_");
  return VALID_EQUIPMENT.has(slug) ? slug : "bodyweight";
}

function equipmentList(primary, secondary) {
  const set = new Set();
  const p = mapEquipment(primary);
  set.add(p);
  if (secondary && String(secondary).toLowerCase().trim() !== "none" && String(secondary).trim() !== "") {
    set.add(mapEquipment(secondary));
  }
  return Array.from(set);
}

// Modality from difficulty + classification
function modalities(difficulty, classification) {
  const d = (difficulty || "").toLowerCase();
  const c = (classification || "").toLowerCase();
  if (c.includes("cardio") || c.includes("conditioning")) return ["conditioning"];
  if (c.includes("mobility") || c.includes("stretch")) return ["mobility"];
  if (c.includes("power") || c.includes("plyometric")) return ["power"];
  if (d.includes("beginner") || d.includes("novice")) return ["strength", "hypertrophy"];
  return ["strength", "hypertrophy"];
}

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "exercise";
}

function escapeJsString(s) {
  if (s == null) return "undefined";
  return JSON.stringify(String(s));
}

function main() {
  if (!fs.existsSync(FILE_PATH)) {
    console.error("File not found:", FILE_PATH);
    process.exit(1);
  }
  const workbook = XLSX.readFile(FILE_PATH);
  const sheet = workbook.Sheets["Exercises"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const out = [];
  const seenSlugs = new Map();

  for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[COL.EXERCISE];
    if (!name || typeof name !== "string" || !name.trim()) continue;

    const baseSlug = slug(name);
    let id = `ff_${baseSlug}`;
    const count = (seenSlugs.get(baseSlug) || 0) + 1;
    seenSlugs.set(baseSlug, count);
    if (count > 1) id = `ff_${baseSlug}_${count}`;

    const muscles = uniqueMuscleGroups(
      row,
      COL.TARGET_MUSCLE,
      COL.PRIME_MOVER,
      COL.SECONDARY_MUSCLE,
      COL.TERTIARY_MUSCLE
    );
    const equipment = equipmentList(row[COL.PRIMARY_EQUIPMENT], row[COL.SECONDARY_EQUIPMENT]);
    const modalityList = modalities(row[COL.DIFFICULTY], row[COL.PRIMARY_CLASSIFICATION]);

    const tags = [];
    const bodyRegion = row[COL.BODY_REGION];
    if (bodyRegion && String(bodyRegion).trim()) tags.push(String(bodyRegion).trim());
    for (const j of [COL.MOVEMENT_PATTERN_1, COL.MOVEMENT_PATTERN_2, COL.MOVEMENT_PATTERN_3]) {
      const v = row[j];
      if (v && String(v).trim()) tags.push(String(v).trim().toLowerCase().replace(/\s+/g, "_"));
    }
    const difficulty = row[COL.DIFFICULTY];
    if (difficulty && String(difficulty).trim()) tags.push(String(difficulty).trim().toLowerCase());

    out.push({
      id,
      name: name.trim(),
      muscles,
      modalities: modalityList,
      equipment,
      tags: tags.length ? tags : ["functional"],
      regressions: [],
      progressions: [],
    });
  }

  console.log("Ingested", out.length, "exercises. Writing data/exercisesFunctionalFitness.ts");

  const lines = [
    "import type { ExerciseDefinition } from \"../lib/types\";",
    "",
    "/**",
    " * Ingested from Functional Fitness Exercise Database (version 2.9) xlsx.",
    " * Run scripts/ingest-functional-fitness-db.js to re-import.",
    " */",
    "",
    "export const EXERCISES_FUNCTIONAL_FITNESS: ExerciseDefinition[] = [",
  ];
  for (const e of out) {
    lines.push("  {");
    lines.push(`    id: ${escapeJsString(e.id)},`);
    lines.push(`    name: ${escapeJsString(e.name)},`);
    lines.push(`    muscles: [${e.muscles.map((m) => JSON.stringify(m)).join(", ")}],`);
    lines.push(`    modalities: [${e.modalities.map((m) => JSON.stringify(m)).join(", ")}],`);
    lines.push(`    equipment: [${e.equipment.map((eq) => JSON.stringify(eq)).join(", ")}],`);
    lines.push(`    tags: [${e.tags.map((t) => JSON.stringify(t)).join(", ")}],`);
    lines.push("    regressions: [],");
    lines.push("    progressions: [],");
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");

  const outPath = path.join(__dirname, "..", "data", "exercisesFunctionalFitness.ts");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log("Wrote", outPath);
  console.log("Next: add to data/exercises.ts: import EXERCISES_FUNCTIONAL_FITNESS and export EXERCISES = [...BUILTIN, ...EXERCISES_FUNCTIONAL_FITNESS]");
}

main();
