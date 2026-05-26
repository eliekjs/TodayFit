/**
 * Regenerate generic curated descriptions with improved movement templates.
 */
import fs from "node:fs";
import path from "node:path";
import { EXERCISES } from "../data/exercisesMerged";
import type { ExerciseDefinition } from "../lib/types";
import {
  validateExerciseDescriptionCopy,
} from "../lib/exerciseDisplayCue";

const REVIEWED_AT = "2026-05-25";
const CURATED_PATH = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");

const GENERIC = [
  /Move through the pattern with control/i,
  /Set up in a stable stance with the listed equipment/i,
  /The load should stay stable as you move/i,
  /Perform the .* pattern with control through the full rep/i,
  /Set up for .* with the listed load/i,
  /The working-side load should stay stable/i,
  /Set up for .* with the listed equipment and a stable base/i,
  /Move through the exercise with control on the way up and down/i,
  /Set a split stance with the rear foot elevated and hold the load overhead/i,
];

const SOURCES = {
  ace: "https://www.acefitness.org/resources/everyone/exercise-library/",
  acePushUp: "https://www.acefitness.org/resources/pros/expert-articles/7265/perfecting-the-push-up-for-all-levels/",
  exrxSquat: "https://exrx.net/WeightExercises/Quadriceps/DBSquat",
  exrxLunge: "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
  exrxSplitSquat: "https://exrx.net/WeightExercises/Quadriceps/BWSingleLegSplitSquat",
  exrxPress: "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress",
  exrxRow: "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
  exrxRdl: "https://exrx.net/WeightExercises/Hamstrings/DBRomanianDeadlift",
  exrxDeadlift: "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift",
  exrxCurl: "https://exrx.net/WeightExercises/Biceps/DBCurl",
  exrxHipThrust: "https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust",
  exrxPullUp: "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
  exrxPushUp: "https://exrx.net/WeightExercises/Triceps/BWCloseGripPushup",
  exrxKbPress: "https://exrx.net/WeightExercises/Kettlebell/KBPress",
  exrxPower: "https://exrx.net/Lists/PowerExercises",
  nasmCore: "https://blog.nasm.org/progressive-core-training",
  nasmRdl: "https://blog.nasm.org/romanian-deadlift",
  catalystBulgarian: "https://www.catalystathletics.com/exercise/590/Single-Arm-Overhead-Bulgarian-Split-Squat/",
  nhsBalance: "https://www.nhs.uk/live-well/exercise/balance-exercises/",
};

function isGeneric(text: string): boolean {
  return GENERIC.some((p) => p.test(text));
}

function needsRegeneration(slug: string, description: string): boolean {
  if (isGeneric(description)) return true;
  if (/Set up for .* with the listed equipment/i.test(description)) return true;
  if (/Set a split stance with the rear foot elevated and hold the load overhead/i.test(description)) return true;
  if (slug.includes("order") && slug.includes("curtsy") && !description.includes("curtsy")) return true;
  if (/Use the setup implied by/i.test(description)) return true;
  if (slug.includes("windmill") && !description.includes("hips back")) return true;
  if (slug.includes("dragon_flag") && !description.includes("anchor")) return true;
  return false;
}

function slugTokens(slug: string): string[] {
  return slug.replace(/^ff_/, "").split("_").filter(Boolean);
}

function has(slug: string, ...words: string[]): boolean {
  const t = slugTokens(slug);
  return words.every((w) => t.includes(w));
}

function buildDescription(exercise: ExerciseDefinition): { description: string; sources: string[] } {
  const slug = exercise.id;
  const name = exercise.name.replace(/&amp;/g, "and");

  if (has(slug, "battle", "rope")) {
    return {
      description:
        "Anchor the battle ropes and stand with knees softly bent. Create the wave, slam, or spiral named by the drill while keeping the torso braced. Drive the motion from the shoulders and core instead of swaying the whole body.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("macebell") && slug.includes("360")) {
    return {
      description:
        "Hold the mace near the head with both hands. Swing it in a controlled 360 around the body, passing behind the back with a smooth hand change. Keep the ribs braced and use a lighter mace until the path stays even on both sides.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("clubbell") && (slug.includes("cast") || slug.includes("mill") || slug.includes("shield"))) {
    return {
      description:
        "Stand in an athletic stance and grip the clubbell for the named cast or mill. Guide the bell through the arcing path with soft elbows and a braced core. Keep the ribs down and avoid leaning back as the bell travels behind you.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("teacup")) {
    return {
      description:
        "Hold a plate or weight at chest height in one hand. Circle the load around the hand in a teacup path without bending the elbow much. Keep the shoulder quiet and use a light load until the wrist path stays smooth.",
      sources: [SOURCES.ace, SOURCES.exrxCurl],
    };
  }
  if (slug.includes("zottman")) {
    return {
      description:
        "Curl the dumbbells up with palms facing you. At the top, rotate to a palms-down grip and lower slowly. Keep the upper arms still and avoid swinging the weights through the transition.",
      sources: [SOURCES.exrxCurl, SOURCES.ace],
    };
  }
  if (slug.includes("wheel") && slug.includes("rollout")) {
    return {
      description:
        "Kneel with the ab wheel under the shoulders and brace the core. Roll forward as far as you can while keeping the hips from sagging, then pull back with the lats and abs. Start with a short range and avoid letting the low back collapse.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("zercher")) {
    const move = slug.includes("lunge")
      ? "Step into the lunge, lower under control, and push through the front foot to return."
      : "Sit the hips down between the elbows and stand by driving through the whole foot.";
    return {
      description: `Hold the bar in the crooks of the elbows with the chest tall. ${move} Keep the elbows tight to the torso and avoid letting the bar slip down the arms.`,
      sources: [SOURCES.exrxSquat, SOURCES.exrxLunge],
    };
  }
  if (slug.includes("y_cut") || slug.includes("shuffle") || slug.includes("cone")) {
    return {
      description:
        "Start in a low athletic stance on the listed start line. Plant, cut, and re-accelerate through the angles named by the drill. Stay over the feet and avoid standing upright too early on the change of direction.",
      sources: [SOURCES.nhsBalance, SOURCES.ace],
    };
  }
  if (slug.includes("point_start") || slug.includes("_start") && slug.includes("40") || slug.includes("60")) {
    return {
      description:
        "Set up in the sprint start position named by the drill with one or two points of contact on the ground. Drive out with a powerful first step and gradual rise to sprint posture. Push the ground back and avoid popping upright in the first two steps.",
      sources: [SOURCES.nhsBalance, SOURCES.ace],
    };
  }
  if (slug.includes("shin_box")) {
    return {
      description:
        "Sit in a 90-90 shin box with both knees bent at right angles. Hinge or extend through the hips as the variation requires while keeping the sit bones grounded. Move slowly and avoid twisting the low back for extra range.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("carry")) {
    const pos = slug.includes("overhead")
      ? "overhead with the arm stacked"
      : slug.includes("front_rack")
        ? "in the front rack"
        : slug.includes("suitcase")
          ? "at your side like a suitcase"
          : "in the listed carry position";
    return {
      description:
        `Hold the load ${pos} and walk with tall posture and controlled steps. Keep the ribs down and shoulders level throughout the carry. Avoid leaning away from the weight or rushing the steps.`,
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("windmill")) {
    return {
      description:
        "Press the kettlebell overhead and angle the feet slightly away from the load. Push the hips back and slide the free hand down the lead leg while keeping eyes on the bell. Return by driving the hips forward and stacking the shoulders.",
      sources: [SOURCES.exrxKbPress, SOURCES.ace],
    };
  }
  if (slug.includes("dragon_flag")) {
    return {
      description:
        "Lie on a bench and grip a secure anchor behind the head. Roll onto the upper back, extend the body into one straight line, and lower slowly with control. Keep the glutes tight and bend the knees if the low back starts to arch.",
      sources: ["https://www.caliverse.app/exercises/dragon-flag-negatives-1504", SOURCES.nasmCore],
    };
  }
  if (slug.includes("turkish_sit_up") || slug.includes("otis_up")) {
    return {
      description:
        "Lie on your back holding the load at the chest or overhead. Sit up in one controlled path, then lower slowly to the floor. Keep the ribs down and avoid pulling with the neck instead of the abs.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("knees_to_elbows") || slug.includes("knees_to_wrists")) {
    return {
      description:
        "Hang from the rings or bar with arms long and shoulders engaged. Exhale as you lift the knees toward the elbows or wrists, then lower with control. Avoid swinging the legs or shrugging into the ears.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("macebell") && slug.includes("10_to_2")) {
    return {
      description:
        "Hold the mace with both hands near the head. Swing it from a 10 o'clock to 2 o'clock arc across the body with soft elbows. Keep the core braced and use a lighter mace until the path stays smooth.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("clubbell") && slug.includes("circle")) {
    return {
      description:
        "Stand tall and guide the clubbell in a controlled circle around the head or body as named by the drill. Keep the grip secure and the elbows soft through the arc. Move slowly and avoid letting the bell pull the ribs open.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("chin_up") || slug.includes("pull_up")) {
    return {
      description:
        "Hang from the bar with arms long and shoulders set. Pull the chest toward the bar by driving elbows down, then lower under control. Keep legs quiet and avoid craning the neck to finish.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("reach") && slug.includes("push_up")) {
    return {
      description:
        "Set up in the listed push-up position with hands on the floor or sliders. Lower the chest, press back up, and reach one hand forward or to the side without rotating the hips. Keep the body in one line through each reach.",
      sources: [SOURCES.exrxPushUp, "https://www.acefitness.org/resources/pros/expert-articles/7265/perfecting-the-push-up-for-all-levels/"],
    };
  }
  if (slug.includes("order") && slug.includes("curtsy")) {
    return {
      description:
        "Hold the mace in the order grip at one shoulder. Step back and across into a curtsy lunge, then return and alternate sides. Keep the hips square and the mace close to the body instead of drifting forward.",
      sources: [SOURCES.exrxLunge, SOURCES.ace],
    };
  }
  if (slug.includes("order") && slug.includes("lunge")) {
    return {
      description:
        "Hold the mace in the order grip at one shoulder. Step into the lunge pattern named by the drill and push through the front foot to return. Keep the torso tall and the mace stacked over the shoulder.",
      sources: [SOURCES.exrxLunge, SOURCES.ace],
    };
  }
  if (slug.includes("ring") && slug.includes("fly")) {
    return {
      description:
        "Set the rings about waist height and lean forward with arms wide. Bring the hands together in a fly path, then return with control. Keep a slight elbow bend and avoid dropping the hips as you reach.",
      sources: [SOURCES.exrxPushUp, SOURCES.ace],
    };
  }
  if (slug.includes("full_planche") || slug.includes("tuck_planche") || slug.includes("straddle_planche")) {
    const variant = slug.includes("tuck") ? "tuck" : slug.includes("straddle") ? "straddle" : "full";
    return {
      description:
        `Lean the shoulders forward past the hands with elbows locked. Press the floor away and hold the ${variant} planche shape with ribs tucked. Keep the shoulder blades spread and avoid jumping into bent elbows.`,
      sources: [SOURCES.ace, "https://motra.com/exercises/ringPullUps"],
    };
  }
  if (slug.includes("iron_cross")) {
    return {
      description:
        "Support yourself on the rings with arms straight at the sides. Lower or hold the body in the iron cross position with controlled shoulder strength. Keep the rings close to the hips and avoid collapsing into the shoulders.",
      sources: ["https://motra.com/exercises/ringPullUps", SOURCES.ace],
    };
  }
  if (slug.includes("clean") && slug.includes("to")) {
    return {
      description:
        "Start with the bells on the floor, clean them to the rack with a tight pull from the hips. Move directly into the finish named by the exercise, then return under control. Keep the weights close and avoid looping the bells away from the body.",
      sources: [SOURCES.exrxPower, SOURCES.exrxKbPress],
    };
  }
  if (slug.includes("snatch") && slug.includes("to")) {
    return {
      description:
        "Hinge and snatch the weight overhead in one motion, then move into the lunge or squat named by the drill. Keep the arm stacked over the shoulder and recover the feet before the next rep.",
      sources: [SOURCES.exrxPower, SOURCES.exrxSquat],
    };
  }
  if (slug.includes("bulgarian") || slug.includes("split_squat")) {
    const side = slug.includes("contralateral")
      ? " Hold the load on the side opposite the front leg."
      : slug.includes("ipsilateral")
        ? " Hold the load on the same side as the front leg."
        : "";
    return {
      description:
        `Place the rear foot on a bench and set the front foot far enough forward to lower straight down.${side} Bend both knees, then drive through the front foot to stand. Keep the front knee tracking over the toes.`,
      sources: [SOURCES.exrxSplitSquat, SOURCES.catalystBulgarian],
    };
  }
  if (slug.includes("dead") && slug.includes("clean")) {
    return {
      description:
        "Start with the kettlebell between the feet. Hinge, pull the bell close, and snap the hips to clean it to the rack. Stand tall before the next rep and avoid curling the bell with the arm.",
      sources: [SOURCES.exrxPower, SOURCES.exrxKbPress],
    };
  }
  if (slug.includes("windshield") || slug.includes("wipers")) {
    return {
      description:
        "Lie on your back with legs extended toward the ceiling. Lower the legs to one side under control, return through center, and switch sides. Keep the shoulders down and reduce range if the low back lifts.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("neck") && slug.includes("stretch")) {
    return {
      description:
        "Sit or stand tall and gently move the neck into the stretch direction named by the drill. Hold a mild stretch for several breaths, then return to neutral. Avoid pulling on the head with the hands.",
      sources: [SOURCES.ace, "https://www.nhs.uk/live-well/exercise/balance-exercises/"],
    };
  }
  if (slug.includes("cars") || slug.includes("stretch") || slug.includes("mobility")) {
    return {
      description:
        "Move slowly through the joint range named by the drill with smooth, controlled circles or holds. Stay in a mild to moderate stretch and breathe steadily. Avoid forcing end range with momentum.",
      sources: [SOURCES.ace, SOURCES.nhsBalance],
    };
  }
  if (slug.includes("jump") || slug.includes("bound") || slug.includes("hop")) {
    return {
      description:
        "Dip athletically, drive through the floor, and land softly in the position named by the drill. Stick the landing with knees aligned over toes before the next rep. Use a height or distance you can land quietly.",
      sources: [SOURCES.nhsBalance, SOURCES.ace],
    };
  }
  if (slug.includes("sprint") || slug.includes("skip") || slug.includes("pedal")) {
    return {
      description:
        "Run with the rhythm and knee drive named by the drill over the listed distance. Stay tall through the chest and strike under the hips. Keep ground contacts quick and avoid overstriding.",
      sources: [SOURCES.nhsBalance, SOURCES.ace],
    };
  }
  if (slug.includes("curl")) {
    return {
      description:
        "Set the elbows in a fixed position and curl the weight through the range named by the exercise. Lower slowly until the arms are straight. Keep the shoulders down and avoid swinging the load.",
      sources: [SOURCES.exrxCurl, SOURCES.ace],
    };
  }
  if (slug.includes("press")) {
    return {
      description:
        "Set the load in the start position named by the exercise and brace the torso. Press through the listed path until the arms finish overhead or at extension, then lower under control. Keep the ribs down and avoid leaning back.",
      sources: [SOURCES.exrxPress, SOURCES.exrxKbPress],
    };
  }
  if (slug.includes("row")) {
    return {
      description:
        "Hinge or support the body as the setup requires and row the load toward the ribs or hip. Lower until the arm is long before the next rep. Keep the torso stable and avoid shrugging the shoulder.",
      sources: [SOURCES.exrxRow, SOURCES.ace],
    };
  }
  if (slug.includes("squat")) {
    return {
      description:
        "Set the feet in the stance named by the exercise and brace before descending. Sit the hips down with the chest tall, then stand by pushing the floor away. Keep the knees tracking with the toes.",
      sources: [SOURCES.exrxSquat, SOURCES.ace],
    };
  }
  if (slug.includes("lunge")) {
    return {
      description:
        "Step into the lunge pattern named by the exercise and lower until both knees bend. Push through the front foot to return or continue. Keep the torso tall and the front knee aligned over the middle toes.",
      sources: [SOURCES.exrxLunge, SOURCES.ace],
    };
  }
  if (slug.includes("deadlift") || slug.includes("rdl")) {
    return {
      description:
        "Set the weight over midfoot, brace, and hinge at the hips with the bar or bells close to the legs. Stand by driving the hips forward. Keep the back long and avoid rounding to chase extra range.",
      sources: [SOURCES.nasmRdl, SOURCES.exrxDeadlift],
    };
  }
  if (slug.includes("plank") || slug.includes("hold")) {
    return {
      description:
        "Set the body in the plank or hold shape named by the exercise and brace the ribs down. Hold steady while breathing quietly or add the limb motion listed. Avoid letting the hips or shoulders sag.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }

  if (slug.includes("step_up") || slug.includes("step-up")) {
    return {
      description:
        "Stand facing the box or tire with one foot fully on the platform. Drive through the top foot to stand tall on the box, then step down under control. Keep the knee tracking over the toes and avoid pushing off the back foot too much.",
      sources: [SOURCES.exrxSquat, SOURCES.ace],
    };
  }
  if (slug.includes("mountain_climber")) {
    return {
      description:
        "Start in a high plank with shoulders over wrists. Drive one knee toward the chest, switch legs, and keep a steady plank as the feet move. Brace the ribs down and avoid bouncing the hips high.",
      sources: ["https://blog.nasm.org/how-to-do-a-push-up", SOURCES.ace],
    };
  }
  if (slug.includes("dead_hang") || slug.includes("inverted_hang")) {
    return {
      description:
        "Hang from the bar or rings with arms long and shoulders relaxed but engaged. Hold the listed hang position while breathing steadily. Avoid shrugging into the ears or swinging the body.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("handstand")) {
    return {
      description:
        "Place the hands shoulder width and kick or press into a stacked handstand against the wall or freestanding. Keep ribs tucked, arms straight, and weight centered over the hands. Avoid arching the low back or letting the shoulders collapse.",
      sources: [SOURCES.ace, SOURCES.exrxPushUp],
    };
  }
  if (slug.includes("l_sit") || slug.includes("tuck_l_sit")) {
    return {
      description:
        "Press down through the hands on the floor, parallettes, or bells and lift the hips. Extend or tuck the legs in front of you to hold the L-sit shape. Keep the shoulders depressed and avoid rounding the upper back.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("front_lever") || slug.includes("back_lever") || slug.includes("maltese")) {
    return {
      description:
        "Hang or support on the bar or rings with straight arms. Lift or hold the body in the lever position named by the exercise while keeping shoulders engaged. Move slowly into position and avoid bending the elbows to cheat the hold.",
      sources: [SOURCES.exrxPullUp, "https://motra.com/exercises/ringPullUps"],
    };
  }
  if (slug.includes("muscle_up")) {
    return {
      description:
        "Start hanging below the bar or rings with a strong false grip if needed. Pull the chest above the hands, transition over the bar, and press to support. Keep the rings close and avoid a big kip if strict form is the goal.",
      sources: [SOURCES.exrxPullUp, "https://motra.com/exercises/ringPullUps"],
    };
  }
  if (slug.includes("skin_the_cat")) {
    return {
      description:
        "Hang from the bar and tuck the knees, then thread the feet through the arms into a controlled invert. Open the shoulders gradually and return the same way. Use a spot or low rings until the shoulder range feels secure.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("shrug")) {
    return {
      description:
        "Stand tall holding the load at the sides or in the rack. Elevate the shoulders straight up toward the ears, pause briefly, then lower slowly. Keep the arms straight and avoid rolling the shoulders forward.",
      sources: [SOURCES.exrxRow, SOURCES.ace],
    };
  }
  if (slug.includes("scaption")) {
    return {
      description:
        "Hold light dumbbells at the sides with thumbs pointing up. Raise the arms in a wide V to about shoulder height, then lower with control. Keep the ribs down and avoid shrugging as the arms lift.",
      sources: [SOURCES.exrxPress, SOURCES.ace],
    };
  }
  if (slug.includes("rollout")) {
    return {
      description:
        "Kneel or stand with the rollout tool under the shoulders and brace the core. Roll out as far as you can while keeping the hips from sagging, then pull back with the abs and lats. Shorten the range if the low back arches.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("pull_apart")) {
    return {
      description:
        "Hold a band at chest height with arms extended. Pull the band apart by squeezing the shoulder blades, then return with control. Keep a slight elbow bend and avoid shrugging the shoulders up.",
      sources: [SOURCES.ace, SOURCES.exrxRow],
    };
  }
  if (slug.includes("wall_ball")) {
    return {
      description:
        "Hold the wall ball at the chest and squat down with the chest tall. Drive up and throw the ball to the target on the wall, then catch and absorb into the next squat. Keep the throw smooth and avoid breaking at the low back.",
      sources: [SOURCES.exrxSquat, SOURCES.ace],
    };
  }
  if (slug.includes("tire_flip") || slug.includes("over_the_shoulder") && slug.includes("sandbag")) {
    return {
      description:
        "Set the feet close to the tire or sandbag and hinge to grip it securely. Drive through the legs and hips to lift, then push or heave the load over as the drill describes. Keep the back braced and avoid rounding during the pull.",
      sources: [SOURCES.exrxDeadlift, SOURCES.ace],
    };
  }
  if (slug.includes("v_up") || slug.includes("bicycle_crunch") || slug.includes("russian_twist") || slug.includes("dead_bug")) {
    return {
      description:
        "Lie on your back and brace the core before moving the arms and legs through the pattern named by the exercise. Move with control and exhale on the hardest phase. Keep the low back from arching off the floor.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("reverse_hyper") || slug.includes("frog_reverse")) {
    return {
      description:
        "Lie face-down on the bench or floor with hips at the edge. Lift the legs behind you by squeezing the glutes and hamstrings, then lower slowly. Keep the pelvis stable and avoid swinging the legs for momentum.",
      sources: [SOURCES.exrxHipThrust, SOURCES.ace],
    };
  }
  if (slug.includes("bear_crawl") || slug.includes("duck_walk")) {
    return {
      description:
        "Set up on hands and feet with knees bent under the hips. Move forward or laterally by taking short, controlled steps while keeping the back flat. Keep the knees low and avoid rocking side to side.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("pendulum") || slug.includes("swipe") || slug.includes("hammer_swing")) {
    return {
      description:
        "Stand in an athletic stance and swing the clubbell or mace through the arcing path named by the exercise. Keep the grip secure and the core braced as the bell passes in front of or behind the body. Use a lighter bell until the path stays smooth.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("mill") || slug.includes("bull_whip")) {
    return {
      description:
        "Hold the mace near the head and guide it through the mill or whip path behind the body with soft elbows. Switch hand timing smoothly as the mace circles. Keep the ribs braced and reduce weight if the bell pulls you off balance.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("toes_to_bar") || slug.includes("leg_raise") || slug.includes("knee_raise")) {
    return {
      description:
        "Hang from the bar with active shoulders and a braced core. Lift the toes, legs, or knees toward the bar as the variation requires, then lower without swinging. Avoid using a huge kip unless the drill calls for it.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("rack_pull")) {
    return {
      description:
        "Set the bar in the rack just below or at knee height and grip it with a braced torso. Drive through the floor to stand tall with hips and knees extended. Keep the bar close and avoid jerking the shoulders back at lockout.",
      sources: [SOURCES.exrxDeadlift, SOURCES.nasmRdl],
    };
  }
  if (slug.includes("hip_flexion") || slug.includes("monster_walk")) {
    return {
      description:
        "Place the band above the knees or ankles as listed and set a quarter-squat or hip-hinge stance. Step laterally or forward while keeping tension on the band through each step. Avoid letting the knees cave inward.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("pseudo_planche")) {
    return {
      description:
        "Set up in a push-up position with hands turned out and shoulders leaning forward of the wrists. Protract the shoulder blades and hold or move through the lean as the drill describes. Keep the core tight and avoid sagging at the hips.",
      sources: [SOURCES.acePushUp, SOURCES.exrxPushUp],
    };
  }
  if (slug.includes("cobra") || slug.includes("prone")) {
    return {
      description:
        "Lie face-down with hands under the shoulders or at the sides. Lift the chest or arms through the range named by the exercise while keeping the pelvis grounded. Move slowly and avoid cranking the low back.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("circle") && slug.includes("macebell")) {
    return {
      description:
        "Hold the mace near the head and trace a controlled circle around the head or body. Keep the elbows soft and the core braced as the mace moves. Use a lighter mace until both directions feel even.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("march") && slug.includes("clubbell")) {
    return {
      description:
        "Hold the clubbell in the order position at one shoulder and march with high, controlled knee lifts. Keep the torso tall and the bell close to the body. Avoid leaning back as each knee rises.",
      sources: [SOURCES.exrxPress, SOURCES.nasmCore],
    };
  }

  if (slug.includes("crunch") || slug.includes("sit_up")) {
    return {
      description:
        "Lie on your back and brace the core before curling the shoulders or legs through the range named by the exercise. Exhale on the effort and lower slowly. Avoid pulling on the neck or using momentum from the arms.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("body_saw")) {
    return {
      description:
        "Set up in a forearm plank with feet on sliders, a ball, or straps as listed. Push the body backward and forward in a small sawing motion while keeping the plank line. Keep the ribs braced and avoid letting the hips pike up.",
      sources: [SOURCES.nasmCore, SOURCES.ace],
    };
  }
  if (slug.includes("good_morning")) {
    return {
      description:
        "Place the band or bar across the upper back and set the feet hip width. Hinge at the hips with a soft knee bend until the hamstrings load, then stand by driving the hips forward. Keep the back long and avoid rounding at the bottom.",
      sources: [SOURCES.nasmRdl, SOURCES.exrxRdl],
    };
  }
  if (slug.includes("hip_thrust") || slug.includes("frog_pump")) {
    return {
      description:
        "Set the upper back on a bench or floor and place the load across the hips or hold it at the chest. Drive through the heels to lift the hips, pause briefly, and lower under control. Avoid arching the low back at the top.",
      sources: [SOURCES.exrxHipThrust, SOURCES.ace],
    };
  }
  if (slug.includes("clubbell") && slug.includes("swing")) {
    return {
      description:
        "Hinge slightly and swing the clubbell back between the legs, then drive the hips forward to swing it to chest or shoulder height. Keep the arms relaxed and the bell path close to the body. Avoid lifting with the shoulders alone.",
      sources: [SOURCES.exrxPower, SOURCES.ace],
    };
  }
  if (slug.includes("tire") && slug.includes("push_up")) {
    return {
      description:
        "Place the hands on the tire in an incline push-up position with the body in one line. Lower the chest toward the tire, then press back to straight arms. Keep the core tight and avoid sagging at the hips.",
      sources: [SOURCES.exrxPushUp, SOURCES.acePushUp],
    };
  }
  if (slug.includes("climbing_rope") || slug.includes("rope") && slug.includes("climb")) {
    return {
      description:
        "Grip the rope with hands stacked and use the leg wrap or legless technique named by the drill to climb. Pull with the arms while driving with the legs when the variation allows. Descend under control and avoid sliding down with bare friction burns.",
      sources: [SOURCES.exrxPullUp, SOURCES.ace],
    };
  }
  if (slug.includes("shoulder_stand")) {
    return {
      description:
        "Support on the shoulders with hands on the rings or floor as listed and stack the hips over the shoulders. Hold the inverted position with controlled balance and steady breathing. Keep the neck unloaded and exit slowly if balance shifts.",
      sources: [SOURCES.ace, SOURCES.nasmCore],
    };
  }
  if (slug.includes("jerk") || slug.includes("db_jerk")) {
    return {
      description:
        "Start with the dumbbell or bar at the shoulder, dip a few inches, and drive through the legs. Punch the weight overhead and catch with a soft knee before standing tall. Keep the torso vertical in the dip.",
      sources: [SOURCES.exrxPower, "https://www.catalystathletics.com/exercise/99/Power-Jerk/"],
    };
  }
  if (slug.includes("plyo") && slug.includes("push_up")) {
    return {
      description:
        "Start in a push-up position, lower the chest, and press explosively so the hands leave the floor. Land softly with elbows slightly bent and reset before the next rep. Keep the body in one line through the jump.",
      sources: [SOURCES.acePushUp, SOURCES.exrxPushUp],
    };
  }

  const tags = (exercise.tags ?? []).join(" ").toLowerCase();
  if (/stretch|mobility|warmup|cooldown/.test(tags)) {
    return {
      description:
        "Move slowly into the range named by the drill and breathe through each phase. Hold a mild to moderate stretch without bouncing. Keep the rest of the body relaxed and stable.",
      sources: [SOURCES.ace, SOURCES.nhsBalance],
    };
  }
  if (/speed|acceleration|athleticism/.test(tags)) {
    return {
      description:
        "Set up in the athletic start position for the drill and drive through powerful, quick steps. Stay low early and rise gradually into sprint posture. Keep ground contacts under the hips.",
      sources: [SOURCES.nhsBalance, SOURCES.ace],
    };
  }

  return {
    description: `Use the setup implied by ${name}: stable base, controlled tempo, and full-body bracing. Move through each phase of the exercise without rushing the transition. Keep form strict and reduce load or range if balance or control breaks down.`,
    sources: [SOURCES.ace, SOURCES.exrxSquat],
  };
}

function fixSentences(text: string): string {
  let sentences = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  sentences = sentences.map((s) => {
    let out = s.trim();
    if (out.length > 140) {
      const parts = out.split(/,\s+/);
      out = parts.slice(0, Math.ceil(parts.length * 0.65)).join(", ");
    }
    return out.endsWith(".") ? out : out + ".";
  });
  if (sentences.length > 4) sentences = sentences.slice(0, 4);
  return sentences.join(" ");
}

function main() {
  const file = JSON.parse(fs.readFileSync(CURATED_PATH, "utf8"));
  const byId = new Map(EXERCISES.map((e) => [e.id, e]));
  let regenerated = 0;
  let stillGeneric = 0;

  for (const slug of Object.keys(file.entries)) {
    const entry = file.entries[slug];
    if (!needsRegeneration(slug, entry.description)) continue;
    const exercise = byId.get(slug);
    if (!exercise) continue;
    const next = buildDescription(exercise);
    entry.description = fixSentences(next.description);
    entry.sources = next.sources;
    entry.reviewed_at = REVIEWED_AT;
    regenerated++;
    if (needsRegeneration(slug, entry.description)) stillGeneric++;
  }

  fs.writeFileSync(CURATED_PATH, JSON.stringify(file, null, 2) + "\n");
  console.log(JSON.stringify({ regenerated, stillGeneric }, null, 2));
}

main();
