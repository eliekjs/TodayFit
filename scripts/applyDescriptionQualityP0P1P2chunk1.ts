/**
 * One-off batch: P0 ankle pack, P1 mobility slugs, P2 chunk 1 quality fixes.
 * Run: npx tsx scripts/applyDescriptionQualityP0P1P2chunk1.ts
 */

import fs from "node:fs";
import path from "node:path";
import {
  validateCuratedDescriptionsFile,
  type CuratedExerciseDescriptionEntry,
} from "../lib/exerciseDescriptionsCurated";
import { validateExerciseDescriptionCopy } from "../lib/exerciseDisplayCue";

type Entry = CuratedExerciseDescriptionEntry;

const UPDATES: Record<string, Entry> = {
  // --- P0 ---
  ankle_circles: {
    description:
      "Sit or stand tall and lift one foot slightly off the floor. Slowly circle the ankle through its full range in one direction, then reverse with smooth control. Keep the knee and hip still and stop before any pinching or pain.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/balance-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  ankle_dorsiflexion_stretch: {
    description:
      "Face a wall with one foot forward, heel down, and toes a few inches from the wall. Drive the knee forward over the toes until you feel a stretch in the calf and front of the ankle, then hold steady. Keep the heel planted and avoid letting the arch collapse inward.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://exrx.net/Stretching/Gastrocnemius",
    ],
    reviewed_at: "2026-05-28",
  },
  banded_ankle_mob: {
    description:
      "Loop a band around the ball of the foot and anchor it low behind you with moderate tension. Half-kneel or sit with the leg extended and draw the knee forward over the toes while the band assists dorsiflexion. Keep the heel down when possible and stop before any sharp pinching at the front of the ankle.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },

  // --- P1 ---
  seated_hip_internal_rotation: {
    description:
      "Sit on the floor with both knees bent and feet flat, then drop one knee inward toward the midline while keeping the opposite foot planted. Sit tall and gently guide the moving knee with the hands if needed. Move within a smooth range and stop before the low back rounds or the hip pinches.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  lying_hip_rotation: {
    description:
      "Lie on your back with knees bent and feet wider than hip width. Drop both knees to one side while keeping the shoulders on the floor, then return to center and rotate to the other side. Breathe steadily and avoid forcing the knees to the floor.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  quadruped_hip_circle: {
    description:
      "Start on hands and knees with a neutral spine. Lift one knee and trace a slow circle outward and around, then reverse the direction. Keep the trunk still and avoid dumping weight into the wrists or sagging the lower back.",
    sources: [
      "https://www.physio-pedia.com/Controlled_Articular_Rotations",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  prone_extension: {
    description:
      "Lie face down with forearms under the shoulders or hands by the ribs. Press through the forearms to gently lift the chest, lengthening the spine without cranking the neck. Keep the pelvis on the floor and stop before any sharp low-back discomfort.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  sphinx_stretch: {
    description:
      "Lie face down and prop up on the forearms with elbows under or slightly forward of the shoulders. Lift the chest and lengthen through the spine while keeping the shoulders away from the ears. Hold with steady breathing and avoid pushing into pain in the low back.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  band_ir_er: {
    description:
      "Anchor a band at elbow height and stand with the working elbow bent to 90 degrees at your side. For external rotation, pull the forearm outward; for internal rotation, pull inward across the body. Keep the elbow pinned to the ribs and move through a controlled range without shrugging.",
    sources: [
      "https://exrx.net/WeightExercises/ShoulderExternal/DBExternalRotation",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  wrist_circles: {
    description:
      "Extend one arm forward with the elbow straight and slowly circle the wrist in one direction, then reverse. Keep the forearm still and the circles smooth without forcing into pinching. Switch sides and repeat with equal control.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  finger_extensions: {
    description:
      "Loop a light band around the fingers with the palm facing down and anchor the other end under the foot or a post. Open the fingers and spread them against the band, then return with control. Keep the wrist neutral and avoid hyperextending the knuckles.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  foam_roll_quad: {
    description:
      "Lie face down with a foam roller under the front of one thigh, supporting yourself on the forearms or hands. Roll slowly from above the knee toward the hip, pausing on tender spots for a few breaths. Avoid rolling directly over the kneecap and keep the core lightly engaged.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  foam_roll_glute: {
    description:
      "Sit on the foam roller with one ankle crossed over the opposite knee to open the hip. Lean toward the crossed side and roll slowly through the glute, pausing on tight areas. Keep the roll controlled and avoid collapsing onto the low back.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  foam_roll_t_spine: {
    description:
      "Lie on your back with the roller across the upper back and hands supporting the head. Lift the hips slightly and roll between the shoulder blades, extending gently over the roller at tight spots. Keep the roll above the low back and avoid forcing the neck into extension.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  breathing_box: {
    description:
      "Sit or lie comfortably and inhale through the nose for a slow count of four. Hold the breath for four counts, exhale for four counts, then hold empty for four counts before repeating. Keep the shoulders relaxed and the breath smooth rather than straining.",
    sources: [
      "https://my.clevelandclinic.org/health/articles/9445-diaphragmatic-breathing",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },

  // --- P2 chunk 1: sport-mode staple stretches (positions ~20–46) ---
  t_spine_rotation: {
    description:
      "Start on hands and knees and place one hand lightly behind the head. Rotate the elbow down toward the opposite wrist, then open the chest and elbow toward the ceiling to mobilize the thoracic spine. Keep the hips mostly still so the motion comes from the upper back.",
    sources: [
      "https://www.physitrack.com/home-exercise-video/thread-the-needle",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  worlds_greatest_stretch: {
    description:
      "Step into a long lunge with both hands inside the front foot for this full-body mobility stretch. Drop the hips, then rotate the inside arm toward the ceiling while following the hand with your eyes. Keep the back leg long and move slowly instead of bouncing through the stretch.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  hip_90_90: {
    description:
      "Sit in a 90/90 hip position with one leg bent in front at about 90 degrees and the other bent to the side at about 90 degrees. Keep the chest tall as you rotate both knees to switch sides. Use the hands for balance as needed, and avoid forcing the hips through a pinchy range.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  frog_stretch: {
    description:
      "Start on hands and knees, then slide the knees wide into a frog stretch with the inner edges of the feet on the floor. Shift the hips back until you feel a stretch through the inner thighs. Keep the spine neutral and ease out if the knees feel twisted.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  pigeon_stretch: {
    description:
      "From a plank or tabletop, bring one shin forward into a pigeon stretch and let the back leg extend behind you. Square the hips as much as comfortable, then lower to the hands or forearms. Keep the front foot relaxed and avoid forcing the knee angle.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  childs_pose: {
    description:
      "Kneel with big toes together and knees comfortable, then sit the hips back toward the heels in child's pose. Reach the arms forward and let the chest soften toward the floor. Breathe slowly and avoid jamming the shoulders up by the ears.",
    sources: [
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  thread_needle: {
    description:
      "Start on hands and knees, then thread one arm under the chest with the palm facing up. Let the shoulder and side of the head move toward the floor while the hips stay over the knees. Rotate gently and avoid collapsing all your weight into the neck.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  open_book_ts: {
    description:
      "Lie on your side with knees bent and arms reaching straight in front of the chest for an open-book thoracic stretch. Open the top arm across the body toward the floor behind you, following it with your eyes. Keep the knees stacked so the twist comes from the upper back, not the low back.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  sleeper_stretch: {
    description:
      "Lie on your side for the sleeper stretch with the lower shoulder and elbow bent to about 90 degrees. Use the top hand to gently guide the forearm toward the floor. Keep the shoulder blade set and stop before the front of the shoulder feels pinched.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  cross_body_stretch: {
    description:
      "Bring one arm across the chest at shoulder height for a cross-body shoulder stretch. Use the other arm to draw it closer while keeping the shoulder down. Hold steady and avoid twisting the torso to make the stretch feel bigger.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  lat_stretch_door: {
    description:
      "Hold a door frame or sturdy post with one hand around shoulder height for a lat stretch. Sit the hips back and slightly away until you feel the side of the back lengthen. Keep the ribs from flaring and avoid pulling with a bent wrist.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  standing_hamstring_stretch: {
    description:
      "Stand tall and place one heel on the floor or a low step with toes up for a standing hamstring stretch. Hinge forward from the hips until the back of the thigh stretches. Keep the back long and avoid rounding down toward the knee.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  figure_four_stretch: {
    description:
      "Lie on your back and cross one ankle over the opposite thigh in a figure-four shape. Pull the uncrossed leg toward the chest until the outside hip stretches. Keep the head relaxed and avoid pressing directly on the knee joint.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  standing_quad_stretch: {
    description:
      "Stand tall and hold a wall or rail for balance, then bend one knee for a standing quad stretch. Catch the ankle and bring the heel toward the glute. Keep knees close together and ribs down instead of arching the back.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
  calf_stretch_wall: {
    description:
      "Face a wall with one foot forward and the other leg straight behind you for a calf stretch. Press the back heel down as you lean the hips toward the wall. Keep the rear toes pointing forward and avoid bouncing.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://exrx.net/Stretching/Gastrocnemius",
    ],
    reviewed_at: "2026-05-28",
  },
  chest_stretch_doorway: {
    description:
      "Place one forearm on a door frame with the elbow around shoulder height for a chest stretch. Step through slowly until the front of the chest opens. Keep the shoulder down and avoid turning the stretch into a low-back arch.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  breathing_diaphragmatic: {
    description:
      "Lie on your back or sit tall with one hand on the chest and one on the belly for diaphragmatic breathing. Inhale through the nose so the lower ribs and belly expand, then exhale slowly. Keep the shoulders quiet and avoid lifting the chest on every breath.",
    sources: [
      "https://my.clevelandclinic.org/health/articles/9445-diaphragmatic-breathing",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  inchworm: {
    description:
      "Stand tall, hinge at the hips, and walk the hands out to a high plank in an inchworm. Pause with shoulders over wrists, then walk the feet toward the hands or hands back toward the feet. Keep the hips from sagging in the plank and soften the knees if the hamstrings limit the hinge.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  standing_hip_circle: {
    description:
      "Stand tall and hold a wall or rack lightly for balance, then lift one knee for a standing hip circle. Circle the knee out and around, then reverse the path with slow control. Keep the pelvis level and avoid leaning the torso to create extra motion.",
    sources: [
      "https://www.nhs.uk/live-well/exercise/balance-exercises/",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  "90_90_hip_switch": {
    description:
      "Sit with both knees bent to about 90 degrees for a 90/90 hip switch and hands behind you if needed. Rotate the knees side to side, letting the hips turn while the chest stays tall. Move within a smooth range and avoid forcing the knees to the floor.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },

  // --- P2 chunk 1: generic / duplicate template fixes ---
  ff_bodyweight_kneeling_side_plank: {
    description:
      "Kneel and set up on the forearm with feet stacked or staggered for a side plank. Lift the hips until the body forms one line from head to knees or feet. Hold steady while breathing quietly and keep the top hip from dropping toward the floor.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/16/front-plank/",
      "https://blog.nasm.org/progressive-core-training",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_ring_circle_front_lever: {
    description:
      "Hang from the rings with arms straight and shoulders pulled down away from the ears. Trace a slow circle with the legs through a tuck or advanced front-lever shape while keeping the ribs tucked. Move with control and avoid letting the hips sag or the shoulders shrug up.",
    sources: [
      "https://gmb.io/front-lever/",
      "https://gmb.io/gymnastic-rings/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_cable_prone_bench_hamstring_curl: {
    description:
      "Lie face down on a bench with ankle straps attached to a low cable. Bend the knees to curl the heels toward the glutes against the cable, then lengthen the legs again. Keep the hips pressed to the pad and avoid swinging the torso for momentum.",
    sources: [
      "https://exrx.net/WeightExercises/Hamstrings/LVLyingLegCurl",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_cable_standing_single_leg_hamstring_curl: {
    description:
      "Stand facing the cable stack with an ankle strap on one leg and the other foot planted. Bend the working knee to curl the heel toward the glute, then lower with control. Stay tall through the chest and avoid leaning forward or rotating the hips.",
    sources: [
      "https://exrx.net/WeightExercises/Hamstrings/LVStandingLegCurl",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_stability_ball_hamstring_curl: {
    description:
      "Lie on your back with heels on a stability ball and hips lifted in a bridge. Roll the ball toward you by bending the knees, then extend the legs again without dropping the hips. Keep the glutes engaged and avoid letting the low back arch excessively.",
    sources: [
      "https://exrx.net/WeightExercises/Hamstrings/BWHamstringRaise",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_slider_hamstring_curl: {
    description:
      "Lie on your back with heels on sliders and hips lifted in a bridge. Slide the heels toward the glutes by bending the knees, then extend the legs again under control. Keep the hips high and avoid letting the lower back collapse at the bottom.",
    sources: [
      "https://exrx.net/WeightExercises/Hamstrings/BWHamstringRaise",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_stability_ball_single_leg_hamstring_curl: {
    description:
      "Lie on your back with one heel on a stability ball and the other leg reaching up or bent. Roll the ball toward you on the working leg, then extend again while keeping the hips lifted. Keep the pelvis level and avoid twisting as the knee bends.",
    sources: [
      "https://exrx.net/WeightExercises/Hamstrings/BWHamstringRaise",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_barbell_kneeling_rollout: {
    description:
      "Kneel with a barbell loaded lightly and roll it forward from the shoulders while keeping the ribs down. Reach only as far as you can without the lower back sagging, then pull back with the lats and core. Keep the bar path straight and move slowly on the way out and back.",
    sources: [
      "https://exrx.net/WeightExercises/RectusAbdominis/WtRollout",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_barbell_standing_rollout: {
    description:
      "Stand with a lightly loaded barbell and hinge to roll it forward along the floor with one arm guiding the bar. Keep the hips back and core braced until you reach a strong stretch without losing neutral spine. Pull the bar back using the lats and abs rather than yanking with the arm.",
    sources: [
      "https://exrx.net/WeightExercises/RectusAbdominis/WtRollout",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_slider_double_kettlebell_overhead_lateral_lunge: {
    description:
      "Stand with both kettlebells locked overhead and one foot on a slider. Slide or step to one side into a lateral lunge, bending the working knee while the other leg lengthens. Drive back to center and keep the overhead position stacked without leaning to either side.",
    sources: [
      "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_slider_double_kettlebell_suitcase_lateral_lunge: {
    description:
      "Hold a kettlebell in each hand at your sides and place one foot on a slider. Slide to one side into a lateral lunge, sitting into the bent hip while the other leg stays long. Push back to center and keep the torso upright without leaning toward the weights.",
    sources: [
      "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_slider_kettlebell_horn_grip_lateral_lunge: {
    description:
      "Hold one kettlebell in a horn grip at the chest and place one foot on a slider. Slide to one side into a lateral lunge, bending the working knee while keeping the bell close to the sternum. Return to center with control and avoid letting the knees cave inward.",
    sources: [
      "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_double_kettlebell_incline_bench_prone_row: {
    description:
      "Lie chest-down on an incline bench holding a kettlebell in each hand below the shoulders. Row both bells toward the ribs while squeezing the shoulder blades together, then lower with control. Keep the chest on the pad and avoid shrugging the shoulders at the top.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_dumbbell_incline_bench_prone_row: {
    description:
      "Lie chest-down on an incline bench with one dumbbell hanging below the shoulder. Row the weight toward the hip while keeping the elbow close and the chest on the pad. Lower slowly and avoid twisting the torso open at the top.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_kettlebell_incline_bench_prone_row: {
    description:
      "Lie chest-down on an incline bench with one kettlebell hanging below the shoulder. Pull the bell toward the ribs while keeping the chest supported and the elbow close to the body. Lower under control and avoid rotating the shoulders unevenly.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_kettlebell_front_rack_carry: {
    description:
      "Clean one kettlebell to the front rack with the elbow down and wrist straight. Walk with tall posture and controlled steps while keeping the ribs down. Avoid leaning away from the bell or letting the elbow flare out to the side.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://exrx.net/WeightExercises/Quadriceps/DBSquat",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_kettlebell_bottoms_up_front_rack_carry: {
    description:
      "Hold one kettlebell bottoms-up in the front rack with the bell above the fist and the elbow tucked. Walk with steady steps while keeping the wrist stacked and the bell quiet. Grip hard and avoid letting the elbow drift away from the ribs.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://exrx.net/WeightExercises/Quadriceps/DBSquat",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_double_kettlebell_bottoms_up_front_rack_carry: {
    description:
      "Hold a kettlebell bottoms-up in each hand at the front rack with bells above the fists. Walk with tall posture and even steps while keeping both wrists stacked. Stay braced through the core and avoid rushing steps that make the bells wobble.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://exrx.net/WeightExercises/Quadriceps/DBSquat",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_double_kettlebell_prone_row: {
    description:
      "Lie chest-down on a flat bench with a kettlebell in each hand hanging below the shoulders. Row both bells toward the ribs while keeping the chest on the pad and shoulder blades squeezed. Lower with control and avoid lifting the head to cheat the rep.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_kettlebell_prone_row: {
    description:
      "Lie chest-down on a flat bench with one kettlebell hanging below the shoulder. Row the bell toward the hip while keeping the chest supported and the elbow close. Lower slowly and keep the hips pressed to the bench throughout.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  ff_single_arm_dumbbell_prone_row: {
    description:
      "Lie chest-down on a flat bench with one dumbbell hanging below the shoulder. Pull the weight toward the ribs while keeping the chest on the pad and the back flat. Lower under control and avoid shrugging the working shoulder at the top.",
    sources: [
      "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },

  // --- P2 chunk 1: band mobility / prehab ---
  banded_hip_flexor_stretch: {
    description:
      "Anchor a band behind you and loop it around the hip of the back leg in a half-kneeling lunge. Tuck the pelvis and shift forward until the front of the hip stretches with light band assistance. Keep the ribs down and avoid arching the low back.",
    sources: [
      "https://exrx.net/Stretching/HipFlexors",
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
    ],
    reviewed_at: "2026-05-28",
  },
  half_kneeling_thoracic_opener: {
    description:
      "Half-kneel facing a bench or box and place both forearms on the surface with the hips square. Sit the hips back slightly and drop the chest toward the floor to open the thoracic spine. Breathe into the upper back and avoid forcing the low back to flex.",
    sources: [
      "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931",
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    ],
    reviewed_at: "2026-05-28",
  },
  wall_slide: {
    description:
      "Stand with your back, head, and arms against a wall in a W shape with elbows bent. Slide the arms upward toward a Y while keeping contact with the wall as much as possible. Lower with control and avoid arching the lower back off the wall.",
    sources: [
      "https://www.acefitness.org/resources/everyone/exercise-library/",
      "https://www.nhs.uk/live-well/exercise/strength-exercises/",
    ],
    reviewed_at: "2026-05-28",
  },
};

const curatedPath = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");
const file = JSON.parse(fs.readFileSync(curatedPath, "utf8")) as {
  version: number;
  entries: Record<string, Entry>;
};

let applied = 0;
const errors: string[] = [];
for (const [slug, entry] of Object.entries(UPDATES)) {
  for (const msg of validateExerciseDescriptionCopy(entry.description)) {
    errors.push(`${slug}: ${msg}`);
  }
  file.entries[slug] = entry;
  applied++;
}

if (errors.length) {
  console.error("Validation errors before write:", errors);
  process.exit(1);
}

fs.writeFileSync(curatedPath, `${JSON.stringify(file, null, 2)}\n`);
console.log(`Applied ${applied} curated description updates.`);

const validation = validateCuratedDescriptionsFile();
console.log(`File validation: ${validation.ok ? "OK" : "FAIL"} (${validation.errors.length} errors)`);
if (!validation.ok) {
  for (const e of validation.errors.slice(0, 20)) console.error(`  - ${e}`);
  process.exit(1);
}
