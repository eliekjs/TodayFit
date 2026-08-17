/**
 * Fill curated setup copy for DB exercises that still have generated stub descriptions
 * (and therefore fall through to the vague UI Setup fallback).
 *
 * Reads stub inventory from artifacts/stubExercisesMissingCurated.json when present,
 * otherwise builds from an embedded core list + optional Supabase query.
 *
 * Run: npx tsx scripts/fillMissingStubCuratedDescriptions.ts
 * Dry: DRY_RUN=1 npx tsx scripts/fillMissingStubCuratedDescriptions.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  validateExerciseDescriptionCopy,
  isGeneratedExerciseDescriptionStub,
} from "../lib/exerciseDisplayCue";
import type { CuratedExerciseDescriptionEntry } from "../lib/exerciseDescriptionsCurated";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

const REVIEWED_AT = "2026-08-16";
const CURATED_PATH = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");
const ARTIFACT_PATH = path.join(process.cwd(), "artifacts/stubExercisesMissingCurated.json");

const SOURCES = {
  ace: "https://www.acefitness.org/resources/everyone/exercise-library/",
  acePushUp:
    "https://www.acefitness.org/resources/pros/expert-articles/7265/perfecting-the-push-up-for-all-levels/",
  exrxBench: "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress",
  exrxDbBench: "https://exrx.net/WeightExercises/PectoralSternal/DBBenchPress",
  exrxTri: "https://exrx.net/WeightExercises/Triceps/BBLyingTriExt",
  exrxCloseGrip: "https://exrx.net/WeightExercises/Triceps/BBCloseGripBenchPress",
  exrxPress: "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress",
  exrxDbPress: "https://exrx.net/WeightExercises/DeltoidAnterior/DBShoulderPress",
  exrxSquat: "https://exrx.net/WeightExercises/Quadriceps/BBSquat",
  exrxDeadlift: "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift",
  exrxRdl: "https://exrx.net/WeightExercises/Hamstrings/BBRomanianDeadlift",
  exrxRow: "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow",
  exrxCurl: "https://exrx.net/WeightExercises/Biceps/DBCurl",
  exrxPullUp: "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
  exrxLunge: "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
  exrxSplitSquat: "https://exrx.net/WeightExercises/Quadriceps/BWSingleLegSplitSquat",
  exrxHipThrust: "https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust",
  exrxPower: "https://exrx.net/Lists/PowerExercises",
  nasmCore: "https://blog.nasm.org/progressive-core-training",
  nasmRdl: "https://blog.nasm.org/romanian-deadlift",
  nhs: "https://www.nhs.uk/live-well/exercise/strength-exercises/",
  mayo: "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
  cdc: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
};

type StubRow = {
  slug: string;
  name: string;
  equipment?: string[] | null;
  primary_muscles?: string[] | null;
};

type FileShape = {
  version: number;
  entries: Record<string, CuratedExerciseDescriptionEntry>;
};

/** Distinctive exercises that generic movement templates would misdescribe. */
const OVERRIDES: Record<string, CuratedExerciseDescriptionEntry> = {
  barbell_back_squat: {
    description:
      "Set a barbell on a squat rack across the upper back with feet about shoulder width. Sit the hips down with the chest tall, then stand by pushing the floor away. Keep the knees tracking with the toes instead of collapsing inward.",
    sources: [SOURCES.exrxSquat, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  jm_press: {
    description:
      "Lie on a flat bench with a close grip on the barbell, arms extended over the upper chest. Lower the bar toward the chin by bending the elbows, then press back up in a hybrid skull-crusher and close-grip path. Keep the upper arms fairly still and avoid flaring the elbows or bouncing near the face.",
    sources: [SOURCES.exrxTri, SOURCES.exrxCloseGrip],
    reviewed_at: REVIEWED_AT,
  },
  arnold_press: {
    description:
      "Sit or stand holding dumbbells at shoulder height with palms facing you. Press overhead while rotating the palms forward, then reverse the rotation as you lower. Keep the ribs down and avoid leaning back to finish the lockout.",
    sources: [SOURCES.exrxDbPress, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  skull_crusher: {
    description:
      "Lie on a bench holding a barbell or EZ bar with arms extended over the chest. Bend only at the elbows to lower the load toward the forehead or just behind it, then extend the arms again. Keep the upper arms fixed and avoid flaring the elbows wide.",
    sources: [SOURCES.exrxTri, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  close_grip_bench: {
    description:
      "Lie on a bench and grip the bar just inside shoulder width. Lower the bar to the lower chest with elbows close to the torso, then press to straight arms. Keep the wrists stacked and avoid a grip so narrow that the wrists bend.",
    sources: [SOURCES.exrxCloseGrip, SOURCES.exrxBench],
    reviewed_at: REVIEWED_AT,
  },
  pin_press: {
    description:
      "Set the safety pins in a rack at the height you want to press from and lie on the bench under the bar. Press the bar from a dead stop off the pins to lockout, then lower under control back to the pins. Keep the shoulder blades set and avoid bouncing the bar off the pins.",
    sources: [SOURCES.exrxBench, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  floor_press: {
    description:
      "Lie on the floor holding a barbell or dumbbells over the chest with knees bent or legs straight. Lower until the upper arms touch the floor, pause briefly, then press back to straight arms. Keep the elbows about 45 degrees from the torso and avoid bouncing off the floor.",
    sources: [SOURCES.exrxBench, SOURCES.exrxDbBench],
    reviewed_at: REVIEWED_AT,
  },
  lying_tricep_extension: {
    description:
      "Lie on a bench holding a barbell or EZ bar with arms extended over the chest. Bend the elbows to lower the load toward the forehead or behind the head, then extend the arms. Keep the upper arms steady and avoid letting the elbows drift wide.",
    sources: [SOURCES.exrxTri, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  zottman_curl: {
    description:
      "Stand holding dumbbells at your sides with palms forward. Curl the weights up, rotate the palms down at the top, then lower with an overhand grip. Keep the elbows pinned and avoid swinging the torso.",
    sources: [SOURCES.exrxCurl, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  drag_curl: {
    description:
      "Stand holding a barbell with an underhand grip and elbows slightly behind the body. Curl by dragging the bar up the torso while the elbows travel back, then lower under control. Keep the bar close to the body and avoid swinging.",
    sources: [SOURCES.exrxCurl, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  meadows_row: {
    description:
      "Stand perpendicular to a landmine or T-bar with a staggered stance and hinge at the hips. Row the free end of the bar toward the hip with the working arm, then lower until the arm is long. Keep the torso quiet and avoid yanking with the shoulder.",
    sources: [SOURCES.exrxRow, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  yates_row: {
    description:
      "Stand with a slight hip hinge holding a barbell with an underhand grip. Row the bar toward the lower ribs, then lower until the arms are long. Keep the torso angle steady and avoid bouncing at the bottom.",
    sources: [SOURCES.exrxRow, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  sissy_squat: {
    description:
      "Stand tall with feet close and hold a support if needed. Lean the torso back as the knees travel forward and the heels stay down or lightly rise, then stand by squeezing the quads. Keep the hips from shooting back into a regular squat pattern.",
    sources: [SOURCES.exrxSquat, SOURCES.ace],
    reviewed_at: REVIEWED_AT,
  },
  windmill: {
    description:
      "Stand with feet wider than hips, one kettlebell locked overhead and the other hand tracing down the inside of the near leg. Push the hips back toward the loaded side as you hinge, then stand tall again. Keep eyes on the overhead bell and avoid collapsing the ribcage.",
    sources: [SOURCES.ace, SOURCES.nasmCore],
    reviewed_at: REVIEWED_AT,
  },
  turkish_get_up: {
    description:
      "Lie on your back with one kettlebell pressed up. Roll to the elbow, post the hand, sweep the leg through, and stand with the weight stacked, then reverse. Move in clear segments and avoid rushing a shaky overhead position.",
    sources: [SOURCES.ace, SOURCES.nasmCore],
    reviewed_at: REVIEWED_AT,
  },
  thruster: {
    description:
      "Hold the load in a front rack, squat down with elbows up, then stand hard and press overhead in one continuous motion. Lower the weight back to the shoulders and repeat. Keep the ribs down and avoid pausing with soft elbows at the top.",
    sources: [SOURCES.exrxSquat, SOURCES.exrxPress],
    reviewed_at: REVIEWED_AT,
  },
  wall_ball: {
    description:
      "Hold a medicine ball at the chest facing a target on the wall. Squat deep, then drive up and throw the ball to the target, catch it, and go straight into the next squat. Keep the elbows under the ball and avoid throwing with the arms alone.",
    sources: [SOURCES.ace, SOURCES.exrxPower],
    reviewed_at: REVIEWED_AT,
  },
  devils_press: {
    description:
      "Start standing with a dumbbell in each hand, then drop into a burpee and lower the chest toward the floor. Explosively stand and swing or snatch both dumbbells overhead in one motion. Keep the back long on the floor phase and avoid yanking the weights with a rounded spine.",
    sources: [SOURCES.ace, SOURCES.exrxPower],
    reviewed_at: REVIEWED_AT,
  },
};

type Template = {
  match: RegExp;
  description: (row: StubRow) => string;
  sources: string[];
};

function equipPhrase(row: StubRow): string {
  const eq = (row.equipment ?? []).map((e) => e.toLowerCase());
  if (eq.includes("barbell") && eq.includes("bench")) return "a barbell";
  if (eq.includes("dumbbells") && eq.includes("bench")) return "dumbbells";
  if (eq.includes("barbell") && eq.includes("squat_rack")) return "a barbell in a squat rack";
  if (eq.includes("barbell")) return "a barbell";
  if (eq.includes("dumbbells")) return "dumbbells";
  if (eq.includes("kettlebells")) return "a kettlebell";
  if (eq.includes("cable_machine")) return "a cable stack";
  if (eq.includes("bands") || eq.includes("resistance_band")) return "a resistance band";
  if (eq.includes("machine")) return "the machine";
  if (eq.includes("trx")) return "TRX straps";
  if (eq.includes("pullup_bar")) return "a pull-up bar";
  if (eq.includes("assault_bike")) return "an air bike";
  if (eq.includes("rower")) return "a rower";
  if (eq.includes("treadmill")) return "a treadmill";
  if (eq.includes("ski_erg")) return "a ski erg";
  if (eq.includes("stair_climber")) return "a stair climber";
  if (eq.includes("elliptical")) return "an elliptical";
  if (eq.includes("sled")) return "a sled";
  if (eq.includes("trap_bar")) return "a trap bar";
  if (eq.includes("plyo_box")) return "a box";
  if (eq.includes("ez_bar")) return "an EZ bar";
  return "a stable setup";
}

const TEMPLATES: Template[] = [
  {
    match: /jm_press/,
    description: () => OVERRIDES.jm_press.description,
    sources: OVERRIDES.jm_press.sources,
  },
  {
    match: /ab_wheel|rollout/,
    description: () =>
      "Kneel holding an ab wheel or place hands on a ball with arms straight. Brace the ribs and roll forward only as far as you can keep the hips from sagging, then pull back under the shoulders. Stop the set if the low back takes over.",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /assault_bike|air_bike/,
    description: () =>
      "Sit tall on the air bike with feet strapped and hands on the handles. Drive the arms and legs together at a steady cadence that matches the prescribed effort. Keep the torso quiet and avoid bouncing in the seat.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /rower|row_calorie/,
    description: () =>
      "Strap the feet on the rower and sit tall holding the handle. Drive with the legs, then hinge and pull the handle to the lower ribs before recovering legs-last. Keep the strokes smooth and avoid yanking with the arms first.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /ski_erg/,
    description: () =>
      "Stand facing the ski erg with hands on the handles and a soft bend in the knees. Hinge and pull the handles down past the hips, then recover tall and repeat. Keep the arms long on the drive and avoid rounding the upper back.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /elliptical/,
    description: () =>
      "Stand tall on the elliptical with hands on the moving handles or fixed rails. Pedal smoothly at a cadence that matches the prescribed effort. Keep the heels from slamming and avoid leaning hard on the rails.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /stair_climb/,
    description: () =>
      "Step onto the stair climber or stairs with an upright posture. Climb at a steady pace that matches the prescribed effort without holding the rails for support. Keep short steps and avoid locking the knees at the top of each stride.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /treadmill/,
    description: () =>
      "Set the treadmill to the prescribed speed or incline and stand tall with eyes forward. Land with the feet under the hips and keep the arms relaxed. Adjust speed so the effort matches the prescription instead of sprinting from the first step.",
    sources: [SOURCES.cdc, SOURCES.ace],
  },
  {
    match: /jump_rope|double_under/,
    description: () =>
      "Hold the rope handles at the hips with elbows close and jump just high enough to clear the rope. Keep soft knees and a quiet landing on the balls of the feet. Slow the pace before form breaks into high, noisy jumps.",
    sources: [SOURCES.ace, SOURCES.nhs],
  },
  {
    match: /back_extension|ghr|reverse_hyper/,
    description: (row) =>
      `Set up on ${equipPhrase(row)} with the hips supported and legs secure. Hinge or extend through the hips to raise the torso or legs, then lower under control. Squeeze the glutes at the top and avoid hyperextending the low back.`,
    sources: [SOURCES.nasmRdl, SOURCES.ace],
  },
  {
    match: /deadlift|rdl|good_morning|rack_pull|stiff_leg|suitcase_deadlift/,
    description: (row) => {
      if (/rdl|romanian|stiff_leg|good_morning/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} with a soft knee bend and hinge at the hips, sliding the load down the legs until the hamstrings load. Drive the hips forward to stand tall. Keep the back long and avoid rounding to chase extra range.`;
      }
      return `Set ${equipPhrase(row)} over midfoot, brace, and push the floor away while keeping the load close to the legs. Stand tall at the top, then lower with control. Keep the lats tight and avoid letting the hips shoot up before the load moves.`;
    },
    sources: [SOURCES.exrxDeadlift, SOURCES.nasmRdl],
  },
  {
    match: /lunge|split_squat|step_up|step_back|box_step|bulgarian/,
    description: (row) => {
      if (/bulgarian|split_squat/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} and place the rear foot on a bench in a split stance. Lower mostly straight down, then drive through the front foot to stand. Keep the front knee tracking over the toes and avoid tipping the torso forward.`;
      }
      if (/lateral/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} and step or shift to one side, bending that knee while the other leg stays long. Push back to center under control. Keep the planted foot flat and avoid twisting the torso toward the working side.`;
      }
      if (/step_up|box_step/i.test(row.slug)) {
        return `Stand facing a box holding ${equipPhrase(row)} if loaded. Place the whole working foot on the box, drive through that foot, and stand tall before stepping down. Avoid pushing off the trailing leg.`;
      }
      return `Hold ${equipPhrase(row)} and step into a lunge until both knees bend, then push through the front foot to return. Keep the torso tall and the front knee aligned over the middle toes.`;
    },
    sources: [SOURCES.exrxLunge, SOURCES.exrxSplitSquat],
  },
  {
    match: /(?:^|_)(?:kb_)?swing|snatch|clean|jerk|high_pull|thruster/,
    description: (row) => {
      if (/thruster/i.test(row.slug)) return OVERRIDES.thruster.description;
      if (/leg_swing/i.test(row.slug)) {
        return "Stand tall holding a support if needed and swing one leg forward and back or side to side in a controlled arc. Keep the torso quiet and the swinging leg long but soft. Stay in a range that does not yank the low back.";
      }
      if (/(?:^|_)(?:kb_)?swing|single_arm_swing/i.test(row.slug)) {
        return `Stand over ${equipPhrase(row)} with a hike pass between the legs. Snap the hips to swing the bell to chest or eye height, then guide it back through the legs. Keep the arms relaxed and avoid lifting with the shoulders.`;
      }
      return `Set up with ${equipPhrase(row)} close to the body. Drive with the legs and hips to pull or catch the load in the clean, snatch, or jerk position, then stand tall. Keep the weight close and avoid pulling with the arms alone.`;
    },
    sources: [SOURCES.exrxPower, SOURCES.ace],
  },
  {
    match: /squat|hack_squat|v_squat|belt_squat|wall_sit/,
    description: (row) => {
      if (/wall_sit/i.test(row.slug)) {
        return "Stand with the back against a wall and slide down until the thighs are about parallel. Hold still with knees tracking over the toes and heels down. Breathe steadily and avoid letting the knees cave inward.";
      }
      if (/front|pause_front/i.test(row.slug)) {
        return `Set ${equipPhrase(row)} in a front rack with elbows high. Sit the hips down with the torso upright, then stand by pushing the floor away. Keep the elbows up and avoid collapsing the chest.`;
      }
      if (/heel|sissy/i.test(row.slug)) {
        return `Stand with heels elevated or in the sissy position using ${equipPhrase(row)}. Sit the knees forward as the hips drop, then stand by driving through the midfoot. Keep the torso controlled and avoid collapsing the knees inward.`;
      }
      return `Set ${equipPhrase(row)} across the upper back or as the machine requires. Sit the hips down with feet rooted and chest tall, then stand by pushing the floor away. Keep the knees tracking with the toes instead of collapsing inward.`;
    },
    sources: [SOURCES.exrxSquat, SOURCES.ace],
  },
  {
    match: /bench|press|ohp|shoulder_press|landmine_press|pin_press|floor_press/,
    description: (row) => {
      if (/arnold/i.test(row.slug)) return OVERRIDES.arnold_press.description;
      if (/jm_press/i.test(row.slug)) return OVERRIDES.jm_press.description;
      if (/close_grip/i.test(row.slug)) return OVERRIDES.close_grip_bench.description;
      if (/floor_press/i.test(row.slug)) return OVERRIDES.floor_press.description;
      if (/pin_press/i.test(row.slug)) return OVERRIDES.pin_press.description;
      if (/landmine/i.test(row.slug)) {
        return `Anchor a barbell in a landmine and set up half-kneeling or standing with the free end at the shoulder. Press the bar up and slightly forward until the arm is long, then lower to the shoulder. Keep the ribs down and avoid leaning into the press.`;
      }
      if (/incline/i.test(row.slug)) {
        return `Set an incline bench and hold ${equipPhrase(row)} over the upper chest. Lower with control, then press to straight arms. Keep the shoulder blades set and avoid flaring the elbows wide.`;
      }
      if (/decline/i.test(row.slug)) {
        return `Lie on a decline bench holding ${equipPhrase(row)} over the chest. Lower to the lower chest, then press to straight arms. Keep the wrists stacked and avoid bouncing at the bottom.`;
      }
      if (/ohp|shoulder_press|overhead/i.test(row.slug) || /seated_.*ohp|seated_dumbbell_ohp/.test(row.slug)) {
        return `Hold ${equipPhrase(row)} at shoulder height with a braced torso. Press overhead until the arms are vertical, then lower under control. Keep the ribs down and avoid leaning back to finish.`;
      }
      if (/band_.*press|band_ohp|band_chest/i.test(row.slug)) {
        return "Anchor or hold the band so there is tension at the start. Press the hands forward or overhead through a full lockout, then return under control. Keep the shoulders down and avoid letting the band snap you back.";
      }
      if (/trx_chest|chest_press/i.test(row.slug)) {
        return "Hold the straps with arms extended and body in a straight plank line. Bend the elbows to lower the chest between the hands, then press back to straight arms. Keep the hips level and avoid sagging.";
      }
      if (/bottoms_up/i.test(row.slug)) {
        return "Hold a kettlebell upside down at the shoulder with the bell above the handle. Press overhead while keeping the bell balanced, then lower to the shoulder. Use a light bell and stop if the wrist collapses.";
      }
      return `Set up with ${equipPhrase(row)} and brace. Press the load away until the arms are long, then lower under control. Keep the ribs stacked and avoid using momentum from the lower back.`;
    },
    sources: [SOURCES.exrxBench, SOURCES.exrxPress],
  },
  {
    match: /row|pulldown|pull_up|chinup|pull_down|inverted_row|seal_row|face_pull/,
    description: (row) => {
      if (/face_pull/i.test(row.slug)) {
        return "Set a band or cable at face height and grip with palms down or neutral. Pull toward the face with elbows high, squeezing the upper back, then return with control. Keep the shoulders down and avoid shrugging.";
      }
      if (/pull_up|chinup|weighted_pull|ring_pull|commando/i.test(row.slug)) {
        return "Hang from the bar or rings with arms long. Pull the chest toward the hands by driving the elbows down, then lower under control. Keep the legs quiet and avoid craning the neck to finish.";
      }
      if (/pulldown|pull_down/i.test(row.slug)) {
        return "Sit at the pulldown or hold the cable handle with arms long. Pull the elbows down toward the ribs, then return until the arms are straight. Keep the torso tall and avoid leaning back to move the stack.";
      }
      if (/chest_supported|seal_row/i.test(row.slug)) {
        return `Lie chest-down on an incline bench holding ${equipPhrase(row)}. Row the load toward the ribs, then lower until the arms hang long. Keep the chest on the pad and avoid yanking with momentum.`;
      }
      if (/inverted_row|trx_row/i.test(row.slug)) {
        return "Set a bar or straps and hang underneath with a straight body line. Pull the chest to the hands, then lower until the arms are long. Keep the hips from sagging and avoid shrugging.";
      }
      return `Hinge or sit tall holding ${equipPhrase(row)}. Pull the load toward the torso by driving the elbows back, then return until the arms are long. Keep the chest up and avoid rocking the torso.`;
    },
    sources: [SOURCES.exrxRow, SOURCES.exrxPullUp],
  },
  {
    match: /curl|kickback|tricep|skull|pushdown|extension/,
    description: (row) => {
      if (/skull|lying_tricep/i.test(row.slug)) return OVERRIDES.skull_crusher.description;
      if (/zottman/i.test(row.slug)) return OVERRIDES.zottman_curl.description;
      if (/drag_curl/i.test(row.slug)) return OVERRIDES.drag_curl.description;
      if (/kickback|db_tricep_kickback/i.test(row.slug)) {
        return "Hinge forward with a soft knee bend holding a dumbbell, upper arm pinned to the side. Extend the elbow until the arm is straight, then bend to return. Keep the upper arm still and avoid swinging.";
      }
      if (/pushdown|cable_tricep/i.test(row.slug)) {
        return "Stand at a cable with the elbows pinned to the sides. Extend the elbows to push the handle down, then return until the forearms are about parallel to the floor. Keep the shoulders quiet and avoid leaning into the stack.";
      }
      if (/overhead_tricep|overhead_extension/i.test(row.slug)) {
        return "Hold a dumbbell or cable overhead with elbows bent near the ears. Extend the elbows until the arms are long, then lower behind the head. Keep the ribs down and elbows from flaring wide.";
      }
      if (/hammer/i.test(row.slug)) {
        return "Stand holding dumbbells with a neutral grip. Curl the weights without rotating the wrists, then lower under control. Keep the elbows close and avoid swinging the torso.";
      }
      if (/concentration|spider/i.test(row.slug)) {
        return "Brace the working arm against the thigh or an incline bench and hold a dumbbell with the arm hanging long. Curl through a full range, then lower slowly. Keep the shoulder still and avoid swinging.";
      }
      if (/reverse_curl/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} with an overhand grip. Curl the load by bending the elbows, then lower under control. Keep the wrists flat and avoid swinging.`;
      }
      return `Hold ${equipPhrase(row)} with the upper arms still. Curl or extend through the elbows under control, then return to the start. Avoid using torso swing to move the load.`;
    },
    sources: [SOURCES.exrxCurl, SOURCES.exrxTri],
  },
  {
    match: /raise|shrug|fly|crossover|pec_deck|ytw|y_raise|open_book/,
    description: (row) => {
      if (/lateral_raise|front_raise|leaning_lateral/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} at the sides or thighs. Raise the arms to about shoulder height in the intended plane, then lower slowly. Use a load you can control without shrugging.`;
      }
      if (/shrug/i.test(row.slug)) {
        return `Hold ${equipPhrase(row)} at the sides. Elevate the shoulders straight up, pause, then lower under control. Avoid rolling the shoulders and keep the arms long.`;
      }
      if (/fly|crossover|pec_deck/i.test(row.slug)) {
        return `Set up with ${equipPhrase(row)} and a soft elbow bend. Bring the arms together through a wide arc, then return until the chest is stretched. Keep a slight elbow bend and avoid locking the joints hard.`;
      }
      if (/reverse_fly|ytw|y_raise|prone_y/i.test(row.slug)) {
        return `Hold light ${equipPhrase(row)} and hinge or lie prone as needed. Raise the arms into a Y, T, or reverse-fly path, then lower slowly. Squeeze the upper back and keep the neck long.`;
      }
      return `Move the arms through the raise or fly path with ${equipPhrase(row)}, then return under control. Keep the shoulders packed and avoid using momentum.`;
    },
    sources: [SOURCES.exrxPress, SOURCES.ace],
  },
  {
    match: /hip_thrust|glute_bridge|hip_abduction|hip_adduction|clamshell|fire_hydrant|kickback/,
    description: (row) => {
      if (/hip_thrust|glute_bridge/i.test(row.slug)) {
        return `Set the upper back on a bench or floor with ${equipPhrase(row)} if loaded. Tuck the ribs, drive through the heels, and lift the hips until the torso is level. Lower under control and avoid arching the low back at the top.`;
      }
      if (/clamshell|fire_hydrant/i.test(row.slug)) {
        return "Lie on your side or start on hands and knees. Lift the top knee or thigh out to the side without rolling the pelvis, then return with control. Keep the hips stacked and avoid leaning to create range.";
      }
      return `Set up on ${equipPhrase(row)} for the hip movement. Move the working leg through the abduction, adduction, or kickback path under control, then return. Keep the pelvis steady and avoid using the low back.`;
    },
    sources: [SOURCES.exrxHipThrust, SOURCES.ace],
  },
  {
    match: /carry|farmer|waiter|front_rack_carry|trap_bar_carry/,
    description: (row) =>
      `Hold ${equipPhrase(row)} in the carry position and walk with tall posture and controlled steps. Keep the ribs down and shoulders level. Shorten the stride before the load pulls you sideways.`,
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /bird_dog/,
    description: () =>
      "Start on hands and knees with a neutral spine. Reach one arm forward and the opposite leg back, then return and switch sides. Keep the hips level and avoid sagging or rotating the pelvis.",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /quadruped_rock/,
    description: () =>
      "Start on hands and knees with a neutral spine. Rock the hips back toward the heels, then return forward over the hands. Keep the pressure light on the wrists and avoid collapsing the low back.",
    sources: [SOURCES.mayo, SOURCES.nasmCore],
  },
  {
    match: /plank|dead_bug|hollow|bear_hold|body_saw|pallof|crunch|v_up|flutter|scissor|bicycle|superman|arch_hold/,
    description: (row) => {
      if (/pallof/i.test(row.slug)) {
        return "Stand or kneel side-on to a cable or band held at the chest. Press the hands away and resist rotation, holding or rotating only as far as you stay square. Keep the ribs down and avoid twisting from the low back.";
      }
      if (/dead_bug/i.test(row.slug)) {
        return "Lie on your back with arms and legs raised, low back pressed gently into the floor. Extend opposite arm and leg toward the floor, then return and switch sides. Keep the ribs down and avoid arching.";
      }
      if (/hollow|arch_hold|superman/i.test(row.slug)) {
        return "Lie on your back or stomach and lift the arms and legs into a hollow or Superman shape. Hold with long limbs and steady breathing. Keep the neck neutral and avoid collapsing the mid-back.";
      }
      if (/bear_hold/i.test(row.slug)) {
        return "Start on hands and toes with knees hovering an inch off the floor. Brace the trunk and hold still while breathing. Keep the hips level and avoid sagging or piking.";
      }
      if (/body_saw/i.test(row.slug)) {
        return "Set up in a plank with feet on a slider or in straps. Shift the body forward and back by moving from the shoulders while the plank stays rigid. Stop if the hips sag.";
      }
      if (/plank/i.test(row.slug)) {
        return "Set up in a forearm or high plank with the body in one line. Hold or add the tap or raise without letting the hips twist. Keep the ribs tucked and avoid sagging.";
      }
      if (/flutter|scissor|bicycle/i.test(row.slug)) {
        return "Lie on your back with the low back gently pressed down and legs raised. Flutter, scissor, or bicycle the legs with small controlled motions. Keep the ribs down and avoid yanking on the neck.";
      }
      return "Brace the trunk and move through the core pattern with control. Keep the low back from taking over and breathe steadily through each rep.";
    },
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /stretch|foam_roll|mobility|circles|cars|breathing|open_book|thread_the_needle|wall_angel|dislocation|pull_apart|banded_walk|monster/,
    description: (row) => {
      if (/foam_roll/i.test(row.slug)) {
        return "Place the roller under the target tissue and support your body with the hands or free leg. Roll slowly along the muscle, pausing on tender spots with steady breathing. Stay on soft tissue and avoid rolling directly on joints.";
      }
      if (/breathing_box/i.test(row.slug)) {
        return "Sit or stand tall and inhale for a count of four, hold for four, exhale for four, and hold empty for four. Keep the shoulders relaxed and the breath smooth. Repeat without forcing the holds.";
      }
      if (/pull_apart|dislocation|wall_angel/i.test(row.slug)) {
        return "Hold a light band or stand against a wall with arms in the start position. Move the arms through the scapular path slowly, keeping ribs down. Use a range you can control without shrugging or pain.";
      }
      if (/banded_walk|monster/i.test(row.slug)) {
        return "Place a miniband around the legs and stand in a slight athletic bend. Step laterally or forward while keeping tension on the band. Keep the knees out and avoid letting the band snap the feet together.";
      }
      return "Move slowly into the stretch or mobility drill and breathe through the range. Stay in a mild to moderate stretch and avoid forcing end range with momentum.";
    },
    sources: [SOURCES.mayo, SOURCES.nhs],
  },
  {
    match: /calf|leg_curl|leg_press|donkey/,
    description: (row) => {
      if (/calf/i.test(row.slug)) {
        return `Stand or set up on ${equipPhrase(row)} with the balls of the feet on a step or platform. Rise onto the toes, pause, then lower the heels under control. Keep the ankles tracking straight and avoid bouncing.`;
      }
      if (/leg_curl/i.test(row.slug)) {
        return "Set up on the leg curl machine with the pad on the lower calves. Curl the heels toward the glutes, then lower under control. Keep the hips glued to the pad and avoid yanking the weight.";
      }
      return `Set up on ${equipPhrase(row)} with a stable contact position. Move through the machine path under control and return without slamming the stack. Keep the knees tracking and avoid locking hard at end range.`;
    },
    sources: [SOURCES.ace, SOURCES.nhs],
  },
  {
    match: /sled/,
    description: () =>
      "Load the sled and set a forward lean with arms long on the poles or strap. Drive through the legs to march or drag the sled the prescribed distance. Keep steps short and powerful and avoid rounding the upper back.",
    sources: [SOURCES.ace, SOURCES.nhs],
  },
  {
    match: /dip/,
    description: () =>
      "Support yourself on dip bars or a machine with arms straight and shoulders down. Bend the elbows to lower until the upper arms are about parallel, then press back up. Keep the torso controlled and avoid dumping into the shoulders at the bottom.",
    sources: [SOURCES.ace, SOURCES.exrxPress],
  },
  {
    match: /medball|medicine_ball|wall_ball|slam|throw|toss/,
    description: () =>
      "Hold a medicine ball with an athletic stance. Load through the hips and core, then throw, pass, or slam along the intended path and reset. Use the legs first and avoid throwing with the arms alone.",
    sources: [SOURCES.exrxPower, SOURCES.ace],
  },
  {
    match: /battle_rope/,
    description: () =>
      "Anchor the battle ropes and stand with knees softly bent. Create alternating or double waves by driving from the shoulders and core. Keep the torso braced and avoid swaying the whole body.",
    sources: [SOURCES.ace, SOURCES.nasmCore],
  },
  {
    match: /burpee|jump_squat|high_knee|hop/,
    description: () =>
      "Start in an athletic stance and move through the burpee, jump, or hop pattern with soft landings. Reset your feet between reps so each effort stays crisp. Reduce height or speed before form breaks down.",
    sources: [SOURCES.ace, SOURCES.nhs],
  },
];

function buildEntry(row: StubRow): CuratedExerciseDescriptionEntry {
  const override = OVERRIDES[row.slug];
  if (override) return override;

  for (const t of TEMPLATES) {
    if (t.match.test(row.slug)) {
      return {
        description: t.description(row),
        sources: t.sources,
        reviewed_at: REVIEWED_AT,
      };
    }
  }

  return {
    description: `Set up with ${equipPhrase(row)} for ${row.name}. Move through the full range with control and a braced trunk, then return to the start. Keep form strict and reduce load if balance or joint position breaks down.`,
    sources: [SOURCES.ace, SOURCES.nhs],
    reviewed_at: REVIEWED_AT,
  };
}

function isUnclear(text: string): boolean {
  if (isGeneratedExerciseDescriptionStub(text)) return true;
  if (/equipment this movement uses/i.test(text)) return true;
  if (/Move through each phase with control/i.test(text)) return true;
  if (/named by the/i.test(text)) return true;
  if (/\bas listed\b/i.test(text)) return true;
  if (/Set up in a stable stance with the listed equipment/i.test(text)) return true;
  return validateExerciseDescriptionCopy(text).length > 0;
}

async function loadStubRows(): Promise<StubRow[]> {
  if (fs.existsSync(ARTIFACT_PATH)) {
    return JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8")) as StubRow[];
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      `Missing ${ARTIFACT_PATH} and Supabase env. Export stubs first or set EXPO_PUBLIC_SUPABASE_URL.`
    );
  }

  const supabase = createClient(url, key);
  const pageSize = 1000;
  const rows: Array<{
    slug: string;
    name: string;
    equipment?: string[] | null;
    primary_muscles?: string[] | null;
    description?: string | null;
    is_active?: boolean | null;
  }> = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("exercises")
      .select("slug, name, equipment, primary_muscles, description, is_active")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  const stubs = rows
    .filter((r) => r.is_active !== false)
    .filter((r) => isGeneratedExerciseDescriptionStub(r.description)) as StubRow[];

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(stubs, null, 2));
  return stubs;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const file = JSON.parse(fs.readFileSync(CURATED_PATH, "utf8")) as FileShape;
  const stubs = await loadStubRows();

  let added = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const row of stubs) {
    const existing = file.entries[row.slug]?.description?.trim();
    if (existing && !isUnclear(existing)) {
      skipped++;
      continue;
    }

    const entry = buildEntry(row);
    const errors = validateExerciseDescriptionCopy(entry.description);
    if (errors.length || isUnclear(entry.description)) {
      failed++;
      failures.push(`${row.slug}: ${errors.join("; ") || "unclear"}`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${row.slug}: ${entry.description.slice(0, 90)}…`);
    } else {
      file.entries[row.slug] = entry;
    }
    added++;
  }

  // Fix a few known vague curated lines that still use "the listed".
  const vagueFixes: Record<string, CuratedExerciseDescriptionEntry> = {
    farmer_carry: {
      description:
        "Hold a heavy load in each hand at your sides and walk with tall posture and controlled steps. Keep the ribs down and shoulders level. Shorten the stride before the load pulls you sideways.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
      reviewed_at: REVIEWED_AT,
    },
  };
  for (const [slug, entry] of Object.entries(vagueFixes)) {
    const current = file.entries[slug]?.description ?? "";
    if (/listed/i.test(current) || !file.entries[slug]) {
      if (!dryRun) file.entries[slug] = entry;
      added++;
      console.log(`${dryRun ? "[dry-run] " : ""}fixed vague: ${slug}`);
    }
  }

  if (!dryRun) {
    fs.writeFileSync(CURATED_PATH, `${JSON.stringify(file, null, 2)}\n`);
  }

  console.log(
    JSON.stringify(
      { dryRun, stubRows: stubs.length, added, skipped, failed, failures: failures.slice(0, 20) },
      null,
      2
    )
  );
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
