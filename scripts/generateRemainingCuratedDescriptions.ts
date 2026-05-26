/**
 * Merge pending description batches and generate remaining curated entries.
 * One-off batch tool for exercise description overhaul.
 */
import fs from "node:fs";
import path from "node:path";
import { EXERCISES } from "../data/exercisesMerged";
import type { ExerciseDefinition } from "../lib/types";
import {
  isGeneratedExerciseDescriptionStub,
  validateExerciseDescriptionCopy,
} from "../lib/exerciseDisplayCue";

const REVIEWED_AT = "2026-05-25";
const CURATED_PATH = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");
const PENDING_PATH = path.join(
  process.cwd(),
  "artifacts/exerciseDescriptions.801-1000.pending.json"
);

type Entry = {
  description: string;
  sources: string[];
  reviewed_at: string;
};

type FileShape = {
  version: number;
  entries: Record<string, Entry>;
};

const SOURCES = {
  ace: "https://www.acefitness.org/resources/everyone/exercise-library/",
  acePushUp:
    "https://www.acefitness.org/resources/pros/expert-articles/7265/perfecting-the-push-up-for-all-levels/",
  aceHalo: "https://www.acefitness.org/resources/everyone/exercise-library/310/kettlebell-halo/",
  aceBridge: "https://www.acefitness.org/resources/everyone/exercise-library/130/hip-bridge/",
  aceSidePlank: "https://www.acefitness.org/resources/everyone/exercise-library/303/side-plank/",
  aceTrx: "https://www.acefitness.org/resources/everyone/exercise-library/equipment/trx/",
  nasmRdl: "https://blog.nasm.org/romanian-deadlift",
  nasmCore: "https://blog.nasm.org/progressive-core-training",
  nasmPushUp: "https://blog.nasm.org/how-to-do-a-push-up",
  exrxSquat: "https://exrx.net/WeightExercises/Quadriceps/DBSquat",
  exrxLunge: "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
  exrxSplitSquat: "https://exrx.net/WeightExercises/Quadriceps/BWSingleLegSplitSquat",
  exrxBench: "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress",
  exrxDbBench: "https://exrx.net/WeightExercises/PectoralSternal/DBBenchPress",
  exrxPress: "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress",
  exrxRow: "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
  exrxBbRow: "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow",
  exrxRdl: "https://exrx.net/WeightExercises/Hamstrings/DBRomanianDeadlift",
  exrxDeadlift: "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift",
  exrxCurl: "https://exrx.net/WeightExercises/Biceps/DBCurl",
  exrxHipThrust: "https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust",
  exrxPullUp: "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
  exrxPushUp: "https://exrx.net/WeightExercises/Triceps/BWCloseGripPushup",
  exrxKbPress: "https://exrx.net/WeightExercises/Kettlebell/KBPress",
  exrxKbSquat: "https://exrx.net/WeightExercises/Kettlebell/KBFrontSquat",
  exrxPower: "https://exrx.net/Lists/PowerExercises",
  exrxPushPress: "https://exrx.net/WeightExercises/OlympicLifts/PushPress",
  catalystPushPress: "https://www.catalystathletics.com/exercise/98/Push-Press/",
  catalystJerk: "https://www.catalystathletics.com/exercise/99/Power-Jerk/",
  catalystBulgarian:
    "https://www.catalystathletics.com/exercise/590/Single-Arm-Overhead-Bulgarian-Split-Squat/",
  crossfitPushPress: "https://www.crossfit.com/essentials/the-push-press",
  copenhagen: "https://www.physio-pedia.com/Copenhagen_Adduction_Exercise",
  nhsStrength: "https://www.nhs.uk/live-well/exercise/strength-exercises/",
  nhsBalance: "https://www.nhs.uk/live-well/exercise/balance-exercises/",
  motraRing: "https://motra.com/exercises/ringPullUps",
  endomondoRing: "https://www.endomondo.com/exercise/ring-dip",
  caliverseDragon: "https://www.caliverse.app/exercises/dragon-flag-negatives-1504",
  caliverseDiveBomber: "https://www.caliverse.app/exercises/dive-bomber-push-up-15",
};

function slugTokens(slug: string): string[] {
  return slug.replace(/^ff_/, "").split("_").filter(Boolean);
}

function humanName(exercise: ExerciseDefinition): string {
  return exercise.name.replace(/&amp;/g, "and").trim();
}

function loadPhrase(slug: string): { setup: string; hold: string } {
  const t = slugTokens(slug);
  const has = (w: string) => t.includes(w);
  if (has("bottoms") && has("up")) {
    return {
      setup: "Hold the kettlebell upside down at the rack or overhead with the bell above the handle",
      hold: "the bottoms-up bell",
    };
  }
  if (t.some((x) => x.includes("front")) && t.includes("rack")) {
    return { setup: "Hold the load in the front rack with elbows forward", hold: "the front-rack load" };
  }
  if (t.includes("back") && t.includes("rack")) {
    return { setup: "Set the bar across the upper back", hold: "the bar on the back" };
  }
  if (t.includes("overhead") || t.includes("ohp")) {
    return { setup: "Hold the load locked out overhead with arms stacked", hold: "the overhead load" };
  }
  if (t.includes("goblet")) {
    return { setup: "Hold one dumbbell or kettlebell vertically at the chest", hold: "the goblet weight" };
  }
  if (t.includes("suitcase")) {
    return { setup: "Hold the load in one hand at your side like a suitcase", hold: "the suitcase load" };
  }
  if (t.includes("crush") && t.includes("grip")) {
    return { setup: "Pinch the weight plates together at your sides or in front of the thighs", hold: "the crushed plates" };
  }
  if (t.includes("horn") && t.includes("grip")) {
    return { setup: "Hold the kettlebell by the horns at chest height", hold: "the horn-grip bell" };
  }
  if (t.includes("z") && t.includes("press")) {
    return { setup: "Sit on the floor with legs straight and the bell in the rack", hold: "the rack position" };
  }
  if (t.includes("sots") && t.includes("press")) {
    return { setup: "Sit in the bottom of a squat with the load in the rack", hold: "the rack position" };
  }
  if (t.includes("landmine")) {
    return { setup: "Anchor the bar in a landmine and hold the free end at chest or shoulder height", hold: "the landmine bar" };
  }
  if (t.includes("clubbell")) {
    return { setup: "Grip the clubbell with a secure handle position for the arc", hold: "the clubbell" };
  }
  if (t.includes("macebell")) {
    return { setup: "Hold the mace with both hands near the head of the tool", hold: "the mace" };
  }
  if (t.includes("sandbag")) {
    return { setup: "Bear-hug or shoulder the sandbag as the variation requires", hold: "the sandbag" };
  }
  if (t.includes("trap") && t.includes("bar")) {
    return { setup: "Stand inside the trap bar and grip the handles at your sides", hold: "the trap bar" };
  }
  if (t.includes("single") && t.includes("arm")) {
    return { setup: "Hold the load in one hand at the rack or by the side", hold: "the working-side load" };
  }
  if (t.includes("double")) {
    return { setup: "Hold a weight in each hand at the rack or by the sides", hold: "both loads" };
  }
  if (t.includes("barbell")) {
    return { setup: "Grip the barbell with a stable setup for the lift", hold: "the bar" };
  }
  if (t.includes("dumbbell")) {
    return { setup: "Hold the dumbbells in a stable start position", hold: "the dumbbells" };
  }
  if (t.includes("kettlebell")) {
    return { setup: "Hold the kettlebell in the rack or at arm's length as listed", hold: "the kettlebell" };
  }
  if (t.includes("bodyweight")) {
    return { setup: "Use bodyweight only with a stable start position", hold: "your body position" };
  }
  return { setup: "Set up in a stable stance with the listed equipment", hold: "the load" };
}

function equipSetup(slug: string, exercise: ExerciseDefinition): string {
  const t = slugTokens(slug);
  const has = (w: string) => t.includes(w);
  if (has("ring")) return "Set the rings at the height needed and keep the straps vertical";
  if (has("parallette")) return "Grip the parallettes under the shoulders with arms straight";
  if (has("slider")) return "Place the slider under the working foot or limb on a smooth surface";
  if (has("suspension") || has("trx")) return "Adjust the straps so the handles hang at the right height";
  if (has("cable")) return "Set the cable to the height listed and stand in a stable base";
  if (has("miniband") || has("superband") || has("resistance") && has("band"))
    return "Place the band where the variation requires and keep tension through the rep";
  if (has("stability") && has("ball")) return "Position the stability ball under the listed contact point";
  if (has("battle") && has("rope")) return "Anchor the battle ropes and stand with a slight athletic bend in the knees";
  if (has("sled")) return "Load the sled and grip the handles with the body angled forward";
  if (has("bench") && (has("incline") || has("decline") || has("flat")))
    return "Lie on the bench with shoulder blades set and feet planted";
  if (has("ez") && has("bar")) return "Grip the EZ bar with the angled handles that feel best on the wrists";
  if (has("medicine") || has("med") && has("ball")) return "Hold the medicine ball at chest height with elbows ready to throw or press";
  if (exercise.equipment?.includes("cable_machine")) return "Set the cable stack and attach the handle for the movement";
  return loadPhrase(slug).setup;
}

type MovementSpec = {
  match: RegExp;
  setup?: string;
  exec: string;
  cue: string;
  sources: string[];
};

const MOVEMENTS: MovementSpec[] = [
  {
    match: /full_planche|straddle_planche|tuck_planche|crow_pose|iron_cross|l_sit_to/,
    setup: "Lean the shoulders forward past the hands with elbows locked",
    exec: "Press the floor or rings away and hold the listed planche or lever shape with tight ribs",
    cue: "Keep the shoulder blades spread and avoid jumping into a bent-elbow hold",
    sources: [SOURCES.ace, SOURCES.motraRing],
  },
  {
    match: /turkish_get_up/,
    exec: "Start on your back with the load pressed up, roll to the elbow, post to the hand, sweep the leg through, and stand while keeping the weight stacked over the shoulder. Reverse the steps to return.",
    cue: "Move in clear segments and avoid rushing past a wobbly overhead position",
    sources: [SOURCES.exrxKbPress, SOURCES.ace],
  },
  {
    match: /turkish_sit_up/,
    exec: "Lie on your back holding the load overhead or at the chest, sit up in one smooth path, then lower with control",
    cue: "Keep the ribs down and avoid pulling with the neck instead of the abs",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /renegade_row_to_push_up/,
    exec: "Start in a high plank on the weights, row one side, then perform a push-up before alternating the row",
    cue: "Keep the hips square and avoid twisting the torso to lift the bell",
    sources: [SOURCES.exrxRow, SOURCES.acePushUp],
  },
  {
    match: /renegade_row/,
    exec: "Hold a high plank on the weights and row one bell toward the hip, then lower and alternate",
    cue: "Keep the hips level and avoid rotating to cheat the row",
    sources: [SOURCES.exrxRow, SOURCES.acePushUp],
  },
  {
    match: /scapular_pull/,
    exec: "Hang from the rings or bar with arms long, depress and retract the shoulder blades down, then return to a full hang",
    cue: "Keep the elbows straight and avoid bending the arms to pull higher",
    sources: [SOURCES.exrxPullUp, SOURCES.motraRing],
  },
  {
    match: /bulgarian_split_squat|split_squat|knee_over_toe/,
    exec: "Place the rear foot on a bench or floor in a split stance and lower mostly straight down, then drive through the front foot to stand",
    cue: "Keep the front knee tracking over the toes and avoid tipping the torso forward",
    sources: [SOURCES.exrxSplitSquat, SOURCES.catalystBulgarian],
  },
  {
    match: /curtsy_lunge/,
    exec: "Step one leg back and across into a curtsy lunge, lower under control, then push through the front foot to return",
    cue: "Keep the hips mostly square and avoid letting the front knee dive inside the toes",
    sources: [SOURCES.exrxLunge, SOURCES.catalystBulgarian],
  },
  {
    match: /cossack_squat/,
    exec: "Stand in a wide stance and shift to one side by bending that knee while the other leg stays long, then move back through center",
    cue: "Keep the working heel down and avoid collapsing the chest",
    sources: [SOURCES.exrxLunge, SOURCES.ace],
  },
  {
    match: /lateral_lunge|slider.*lunge/,
    exec: "Step or slide to one side, bend that knee, and keep the other leg long before pushing back to center",
    cue: "Keep the planted foot flat and avoid twisting toward the load",
    sources: [SOURCES.exrxLunge, SOURCES.ace],
  },
  {
    match: /forward_lunge|reverse_lunge|walking_lunge/,
    exec: "Step into the lunge pattern named by the exercise, lower until both knees bend, then push through the front foot to return or continue",
    cue: "Keep the torso tall and the front knee aligned over the middle toes",
    sources: [SOURCES.exrxLunge, SOURCES.ace],
  },
  {
    match: /pistol_squat/,
    exec: "Stand on one leg with the free leg reaching forward, sit down under control, then drive through the whole foot to stand",
    cue: "Keep the knee in line with the toes and reduce depth before the heel lifts",
    sources: [SOURCES.exrxSplitSquat, SOURCES.ace],
  },
  {
    match: /cyclist_squat/,
    exec: "Stand with heels elevated and a narrow stance, sit the knees forward and hips down, then stand by pushing the floor away",
    cue: "Keep the torso upright and avoid losing balance off the elevated surface",
    sources: [SOURCES.exrxSquat, SOURCES.ace],
  },
  {
    match: /thruster|squat.*press|clean.*press/,
    exec: "Squat down with the load in the rack, then stand hard and continue into an overhead press in one smooth sequence",
    cue: "Keep the elbows up in the squat and avoid pausing before the press unless you need to reset",
    sources: [SOURCES.exrxKbSquat, SOURCES.exrxKbPress],
  },
  {
    match: /snatch|clean|jerk/,
    exec: "Pull the bar or bell close using the legs and hips, receive it in the listed catch position, then stand or finish overhead as the name describes",
    cue: "Keep the weight close to the body and avoid pulling with the arms alone",
    sources: [SOURCES.exrxPower, SOURCES.catalystJerk],
  },
  {
    match: /push_press|push_jerk/,
    exec: "Dip a few inches with the load at the shoulders, drive through the legs, and punch the weight overhead",
    cue: "Keep the dip vertical and avoid pressing from a loose rack",
    sources: [SOURCES.exrxPushPress, SOURCES.crossfitPushPress],
  },
  {
    match: /z_press|sots_press|overhead_press|ohp|military_press/,
    exec: "Brace tall and press the load overhead until the arms are vertical, then lower under control",
    cue: "Keep the ribs down and avoid leaning back to finish the rep",
    sources: [SOURCES.exrxPress, SOURCES.exrxKbPress],
  },
  {
    match: /bench_press|floor_press|decline.*press|incline.*press/,
    exec: "Lower the load toward the chest with elbows controlled, then press up until the arms are straight",
    cue: "Keep shoulder blades set and avoid letting the elbows flare wide",
    sources: [SOURCES.exrxBench, SOURCES.exrxDbBench],
  },
  {
    match: /romanian_deadlift|rdl/,
    exec: "Hinge at the hips with a soft knee bend and lower the load along the legs until hamstrings load, then stand by driving the hips forward",
    cue: "Keep the back long and avoid rounding to chase extra range",
    sources: [SOURCES.nasmRdl, SOURCES.exrxRdl],
  },
  {
    match: /deadlift|deficit_deadlift/,
    exec: "Set the bar over midfoot, brace, and push the floor away while keeping the bar close to the legs through the pull",
    cue: "Keep the lats tight and avoid letting the hips shoot up before the bar leaves the floor",
    sources: [SOURCES.exrxDeadlift, SOURCES.nasmRdl],
  },
  {
    match: /bent_over_row|pendlay_row|gorilla_row|seesaw.*row|prone_row/,
    exec: "Hinge or lie as the variation requires and row the load toward the ribs or hip, then lower until the arm is long",
    cue: "Keep the torso stable and avoid yanking with the shoulder",
    sources: [SOURCES.exrxRow, SOURCES.exrxBbRow],
  },
  {
    match: /pull_up|chin_up|muscle_up/,
    exec: "Hang with arms long, pull the chest toward the hands by driving elbows down, then lower under control",
    cue: "Keep legs quiet and avoid craning the neck to finish",
    sources: [SOURCES.exrxPullUp, SOURCES.motraRing],
  },
  {
    match: /push_up|dive_bomber|pike_push|handstand_push/,
    exec: "Set the hands under or just outside the shoulders, lower the chest toward the floor, then press back to straight arms",
    cue: "Keep the body in one line and avoid reaching the head forward to shorten the rep",
    sources: [SOURCES.acePushUp, SOURCES.exrxPushUp],
  },
  {
    match: /face_pull|reverse_fly|y_raise|rear_delt/,
    exec: "Pull or raise the arms back with elbows bent or slightly soft as the setup requires, squeezing the upper back",
    cue: "Use a light enough load to keep the shoulders down and avoid shrugging",
    sources: [SOURCES.ace, SOURCES.exrxRow],
  },
  {
    match: /front_raise|lateral_raise|shoulder_raise/,
    exec: "Raise the arms in the plane named by the exercise to shoulder height or slightly above, then lower with control",
    cue: "Keep the ribs down and avoid swinging the weight with momentum",
    sources: [SOURCES.exrxPress, SOURCES.ace],
  },
  {
    match: /bicep_curl|hammer_curl|zottman|preacher_curl|spider_curl/,
    exec: "Curl the weight toward the shoulders without moving the upper arms, then lower until the elbows are straight",
    cue: "Keep the shoulders down and avoid leaning back to finish",
    sources: [SOURCES.exrxCurl, SOURCES.ace],
  },
  {
    match: /wrist_curl|reverse_grip.*curl/,
    exec: "Rest the forearms on the bench or thighs with wrists at the edge, curl the weight through the wrist, then lower slowly",
    cue: "Use a controlled range and avoid bouncing at the bottom",
    sources: [SOURCES.exrxCurl, SOURCES.ace],
  },
  {
    match: /tricep|skull_crusher|overhead_extension|kickback/,
    exec: "Set the elbows in a fixed position and extend the arms to straighten, then bend back under control",
    cue: "Keep the upper arms still and avoid letting the elbows drift forward",
    sources: [SOURCES.exrxPushUp, SOURCES.ace],
  },
  {
    match: /hip_thrust|glute_bridge|frog_pump/,
    exec: "Set the upper back on a bench or floor, tuck the ribs, and drive through the heels to lift the hips",
    cue: "Pause at the top and avoid arching the low back for extra height",
    sources: [SOURCES.exrxHipThrust, SOURCES.aceBridge],
  },
  {
    match: /hamstring_curl|nordic|slider.*curl/,
    exec: "Set the anchor as listed and curl the heel toward the hips or control the lowering phase with the hamstrings",
    cue: "Keep the hips stable and avoid letting them rise as the knee bends",
    sources: [SOURCES.exrxRdl, SOURCES.ace],
  },
  {
    match: /copenhagen|side_plank/,
    exec: "Set up in a side plank with the top leg on a bench as listed, lift the hips, and hold or adduct the lower leg under control",
    cue: "Keep the body long and avoid rolling the chest toward the floor",
    sources: [SOURCES.copenhagen, SOURCES.aceSidePlank],
  },
  {
    match: /plank|dead_bug|bird_dog|hollow|flutter_kick/,
    exec: "Brace the ribs down and hold the listed core shape while moving arms or legs as the variation requires",
    cue: "Keep the low back from arching off the floor and move slowly enough to stay in control",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /hip_abduction|hip_adduction|clamshell/,
    exec: "Set the body in the listed side-lying or quadruped position and move the top leg out or in through the hip",
    cue: "Keep the pelvis stable and avoid rolling backward to make the range look bigger",
    sources: [SOURCES.ace, SOURCES.nhsStrength],
  },
  {
    match: /overhead_march|march/,
    exec: "Hold the load overhead and march in place or forward, lifting knees without losing the stacked arm position",
    cue: "Keep the ribs down and avoid leaning back as the knees rise",
    sources: [SOURCES.exrxPress, SOURCES.nasmCore],
  },
  {
    match: /pullover/,
    exec: "Guide the load in a controlled arc around or over the head and return to the start",
    cue: "Keep the elbow path smooth and avoid letting the ribs flare",
    sources: [SOURCES.ace, SOURCES.exrxDbBench],
  },
  {
    match: /sprint|sled/,
    exec: "Drive through the balls of the feet with short, powerful steps for the listed distance or time",
    cue: "Stay low through the start and avoid upright jogging when acceleration is the goal",
    sources: [SOURCES.nhsBalance, SOURCES.ace],
  },
  {
    match: /skip|a_skip|b_skip/,
    exec: "Run with an exaggerated knee drive and quick ground contacts as the drill describes",
    cue: "Stay tall through the chest and avoid reaching too far forward with the foot",
    sources: [SOURCES.nhsBalance, SOURCES.ace],
  },
  {
    match: /jump|bound|hop|plyo|box_jump|broad_jump/,
    exec: "Dip athletically, drive through the floor, and land softly in the position named by the drill",
    cue: "Stick the landing with knees aligned over toes before the next rep",
    sources: [SOURCES.nhsBalance, SOURCES.ace],
  },
  {
    match: /stretch|cars|mobility|90_90|neck/,
    exec: "Move slowly into the stretch or controlled articular rotation named by the drill and breathe through the range",
    cue: "Stay in a mild to moderate stretch and avoid forcing end range with momentum",
    sources: [SOURCES.ace, SOURCES.nhsStrength],
  },
  {
    match: /shuffle|cut_drill|agility|cone|ladder/,
    exec: "Stay low in an athletic stance and move through the pattern with quick, deliberate foot contacts",
    cue: "Keep the chest over the toes and avoid crossing the feet so much that you lose balance",
    sources: [SOURCES.nhsBalance, SOURCES.ace],
  },
  {
    match: /med_ball|medicine_ball|throw|slam|toss/,
    exec: "Load through the hips and core, then release or throw the ball along the path named by the drill",
    cue: "Use the legs first and avoid throwing only with the arms",
    sources: [SOURCES.exrxPower, SOURCES.ace],
  },
  {
    match: /carry|farmer|suitcase|overhead_carry/,
    exec: "Walk with the load held in the listed position while keeping the torso tall and steps controlled",
    cue: "Keep the shoulders level and avoid leaning away from the weight",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /squat/,
    exec: "Sit the hips down with feet rooted and chest tall, then stand by pushing the floor away",
    cue: "Keep the knees tracking with the toes instead of collapsing inward",
    sources: [SOURCES.exrxSquat, SOURCES.ace],
  },
  {
    match: /lunge/,
    exec: "Step into a lunge, lower until both knees bend, then push through the front foot to return",
    cue: "Keep the torso tall and the front knee aligned over the middle toes",
    sources: [SOURCES.exrxLunge, SOURCES.ace],
  },
  {
    match: /press/,
    exec: "Press the load away in the plane named by the exercise, then return under control",
    cue: "Keep the ribs stacked and avoid using momentum from the lower back",
    sources: [SOURCES.exrxPress, SOURCES.ace],
  },
  {
    match: /row/,
    exec: "Pull the load toward the torso by driving the elbows back, then return until the arms are long",
    cue: "Keep the chest up and avoid rocking the torso to move the weight",
    sources: [SOURCES.exrxRow, SOURCES.ace],
  },
  {
    match: /curl/,
    exec: "Curl the weight through the range named by the exercise, then lower with control",
    cue: "Keep the upper arm still and avoid swinging the load",
    sources: [SOURCES.exrxCurl, SOURCES.ace],
  },
  {
    match: /raise/,
    exec: "Raise the arms in the pattern named by the exercise, then lower slowly",
    cue: "Use a load you can control without shrugging the shoulders",
    sources: [SOURCES.exrxPress, SOURCES.ace],
  },
  {
    match: /rotation|rotational|twist|woodchop/,
    exec: "Rotate through the thoracic spine or hips as the setup requires while keeping the base stable",
    cue: "Turn from the mid-back and hips instead of cranking the low back",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
  {
    match: /hold|isometric/,
    exec: "Set the body in the listed shape and hold steady while breathing quietly",
    cue: "Keep tension through the whole body and avoid letting the hips or shoulders sag",
    sources: [SOURCES.nasmCore, SOURCES.ace],
  },
];

function detectMovement(slug: string, exercise: ExerciseDefinition): MovementSpec | null {
  const body = slug.replace(/^ff_/, "");
  for (const m of MOVEMENTS) {
    if (m.match.test(body)) return m;
  }
  const tags = (exercise.tags ?? []).join(" ").toLowerCase();
  if (/stretch|mobility|warmup|cooldown/.test(tags)) {
    return MOVEMENTS.find((m) => m.match.test("stretch")) ?? null;
  }
  if (/speed|acceleration|athleticism/.test(tags)) {
    return MOVEMENTS.find((m) => m.match.test("sprint")) ?? null;
  }
  if (/power|vertical|horizontal|plyo/.test(tags)) {
    return MOVEMENTS.find((m) => m.match.test("jump")) ?? null;
  }
  if (/push/.test(tags)) {
    return MOVEMENTS.find((m) => m.match.test("press")) ?? null;
  }
  if (/pull/.test(tags)) {
    return MOVEMENTS.find((m) => m.match.test("row")) ?? null;
  }
  return null;
}

function alternatingPrefix(slug: string): string {
  if (!slug.includes("alternating") && !slug.includes("seesaw")) return "";
  if (slug.includes("seesaw")) {
    return "Work one side while the other side waits in the start position, then switch in a seesaw rhythm. ";
  }
  return "Alternate sides each rep with the same form on both sides. ";
}

function sidePrefix(slug: string): string {
  if (slug.includes("contralateral")) return "Hold the load on the side opposite the working leg. ";
  if (slug.includes("ipsilateral")) return "Hold the load on the same side as the working leg. ";
  if (slug.includes("single_leg") || slug.includes("single_arm")) {
    if (slug.includes("single_leg") && slug.includes("single_arm")) return "";
    if (slug.includes("single_leg")) return "Work one leg at a time with the other foot lifted or behind you. ";
    if (slug.includes("single_arm")) return "Work one arm at a time while the other arm supports or waits at the side. ";
  }
  return "";
}

function composeDescription(exercise: ExerciseDefinition): { description: string; sources: string[]; patternAdapted: boolean } {
  const slug = exercise.id;
  const movement = detectMovement(slug, exercise);
  const setup = equipSetup(slug, exercise);
  const alt = alternatingPrefix(slug);
  const side = sidePrefix(slug);

  if (movement) {
    const parts: string[] = [];
    if (movement.setup) parts.push(movement.setup + ".");
    else parts.push(setup + ".");
    parts.push(alt + side + movement.exec + ".");
    parts.push(movement.cue + ".");
    const description = parts.join(" ").replace(/\s+/g, " ").trim();
    return { description, sources: [...new Set(movement.sources)], patternAdapted: /full_planche|macebell|clubbell|order_|bottoms_up_seesaw|iron_cross/.test(slug) };
  }

  const name = humanName(exercise);
  const load = loadPhrase(slug);
  const fallback = `${load.setup}. ${alt}${side}Perform the ${name} pattern with control through the full rep. ${load.hold.charAt(0).toUpperCase() + load.hold.slice(1)} should stay stable as you move. Keep the torso organized and avoid using momentum to finish the rep.`;
  return {
    description: fallback,
    sources: [SOURCES.ace, SOURCES.exrxSquat],
    patternAdapted: true,
  };
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(slugTokens(a));
  const tb = new Set(slugTokens(b));
  let n = 0;
  for (const t of ta) if (tb.has(t)) n++;
  return n;
}

function adaptFromNearest(
  slug: string,
  existing: Record<string, Entry>
): Entry | null {
  let best: { slug: string; score: number } | null = null;
  for (const key of Object.keys(existing)) {
    const score = tokenOverlap(slug, key);
    if (score < 4) continue;
    if (!best || score > best.score) best = { slug: key, score };
  }
  if (!best) return null;
  const base = existing[best.slug].description;
  if (/Set up for .* with the listed load/i.test(base)) return null;
  return {
    description: base,
    sources: [...existing[best.slug].sources],
    reviewed_at: REVIEWED_AT,
  };
}

function makeEntry(exercise: ExerciseDefinition, existing: Record<string, Entry>): Entry & { patternAdapted: boolean } {
  const adapted = adaptFromNearest(exercise.id, existing);
  if (adapted) {
    return { ...adapted, patternAdapted: exercise.id !== adapted.description };
  }
  const composed = composeDescription(exercise);
  return {
    description: composed.description,
    sources: composed.sources,
    reviewed_at: REVIEWED_AT,
    patternAdapted: composed.patternAdapted,
  };
}

function validateEntry(slug: string, entry: Entry): string[] {
  const errors: string[] = [];
  for (const msg of validateExerciseDescriptionCopy(entry.description)) errors.push(`${slug}: ${msg}`);
  if (isGeneratedExerciseDescriptionStub(entry.description)) errors.push(`${slug}: stub copy`);
  if (!entry.sources?.length || entry.sources.some((u) => !/^https?:\/\//i.test(u))) {
    errors.push(`${slug}: bad sources`);
  }
  return errors;
}

function main() {
  const curated: FileShape = JSON.parse(fs.readFileSync(CURATED_PATH, "utf8"));
  const pending: { entries: Record<string, Entry> } = JSON.parse(
    fs.readFileSync(PENDING_PATH, "utf8")
  );

  let mergedFromPending = 0;
  for (const [slug, entry] of Object.entries(pending.entries ?? {})) {
    if (curated.entries[slug]) continue;
    curated.entries[slug] = { ...entry, reviewed_at: entry.reviewed_at || REVIEWED_AT };
    mergedFromPending++;
  }

  const startCount = Object.keys(curated.entries).length;
  let added = 0;
  let patternAdapted = 0;
  const validationErrors: string[] = [];

  for (const exercise of EXERCISES) {
    if (curated.entries[exercise.id]) continue;
    const entry = makeEntry(exercise, curated.entries);
    const errs = validateEntry(exercise.id, entry);
    if (errs.length) {
      const fixed = composeDescription(exercise);
      entry.description = fixed.description;
      entry.sources = fixed.sources;
      const errs2 = validateEntry(exercise.id, entry);
      validationErrors.push(...errs2);
    }
    curated.entries[exercise.id] = {
      description: entry.description,
      sources: entry.sources,
      reviewed_at: REVIEWED_AT,
    };
    added++;
    if (entry.patternAdapted) patternAdapted++;
  }

  fs.writeFileSync(CURATED_PATH, JSON.stringify(curated, null, 2) + "\n");

  const finalCount = Object.keys(curated.entries).length;
  console.log(JSON.stringify({
    catalogSize: EXERCISES.length,
    startCount,
    mergedFromPending,
    added,
    finalCount,
    patternAdapted,
    validationErrors: validationErrors.slice(0, 20),
    validationErrorCount: validationErrors.length,
  }, null, 2));
}

main();
