/**
 * Phase 1: Canonical training qualities taxonomy.
 * Single source of truth for workout intelligence (goals, sports, exercises).
 * Use slug for all references; DB table mirrors this for FK and admin.
 */

/** Category for grouping qualities in UI and logic. */
export type TrainingQualityCategory =
  | "strength"
  | "power"
  | "energy_system"
  | "movement"
  | "sport_support"
  | "resilience";

/** All valid quality slugs. Add here when extending the taxonomy. */
export type TrainingQualitySlug =
  // Strength
  | "max_strength"
  | "hypertrophy"
  | "muscular_endurance"
  | "unilateral_strength"
  | "eccentric_strength"
  | "pulling_strength"
  | "pushing_strength"
  | "lockoff_strength"
  // Power / athletic
  | "power"
  | "rate_of_force_development"
  | "plyometric_ability"
  // Energy system
  | "aerobic_base"
  | "aerobic_power"
  | "anaerobic_capacity"
  | "lactate_tolerance"
  | "work_capacity"
  // Movement / resilience
  | "mobility"
  | "thoracic_mobility"
  | "joint_stability"
  | "balance"
  | "coordination"
  | "tendon_resilience"
  | "recovery"
  // Sport-support (often composite)
  | "grip_strength"
  | "forearm_endurance"
  | "scapular_stability"
  | "core_tension"
  | "trunk_anti_flexion"
  | "trunk_anti_rotation"
  | "trunk_endurance"
  | "hip_stability"
  | "posterior_chain_endurance"
  | "rotational_power"
  | "rotational_control"
  // Optional body-region emphasis (for scoring)
  | "lat_hypertrophy"
  | "quad_hypertrophy"
  | "paddling_endurance"
  | "pop_up_power";

/** Data model for a training quality. Matches DB table training_qualities. */
export interface TrainingQuality {
  id?: string;
  slug: TrainingQualitySlug;
  name: string;
  category: TrainingQualityCategory;
  description: string | null;
  sort_order: number;
}

/** In-memory definition used by static config (no id until loaded from DB). */
export type TrainingQualityDef = Omit<TrainingQuality, "id"> & { id?: string };

const DEFS: TrainingQualityDef[] = [
  // --- Strength ---
  { slug: "max_strength", name: "Max strength", category: "strength", description: "Peak force production; low reps, heavy load.", sort_order: 1 },
  { slug: "hypertrophy", name: "Hypertrophy", category: "strength", description: "Muscle size; moderate load and volume.", sort_order: 2 },
  { slug: "muscular_endurance", name: "Muscular endurance", category: "strength", description: "Sustained force; higher reps, shorter rest.", sort_order: 3 },
  { slug: "unilateral_strength", name: "Unilateral strength", category: "strength", description: "Single-limb strength and balance.", sort_order: 4 },
  { slug: "eccentric_strength", name: "Eccentric strength", category: "strength", description: "Controlled lengthening under load.", sort_order: 5 },
  { slug: "pulling_strength", name: "Pulling strength", category: "strength", description: "Vertical/horizontal pull; lats, back, biceps.", sort_order: 6 },
  { slug: "pushing_strength", name: "Pushing strength", category: "strength", description: "Vertical/horizontal push; chest, shoulders, triceps.", sort_order: 7 },
  { slug: "lockoff_strength", name: "Lock-off strength", category: "strength", description: "Static hold at bent arm (climbing).", sort_order: 8 },
  // --- Power ---
  { slug: "power", name: "Power", category: "power", description: "Explosive force; speed × strength.", sort_order: 10 },
  { slug: "rate_of_force_development", name: "Rate of force development", category: "power", description: "How quickly force is produced.", sort_order: 11 },
  { slug: "plyometric_ability", name: "Plyometric ability", category: "power", description: "Stretch-shorten cycle; jumps, bounds.", sort_order: 12 },
  // --- Energy system ---
  { slug: "aerobic_base", name: "Aerobic base", category: "energy_system", description: "Zone 2; sustained low-intensity endurance.", sort_order: 20 },
  { slug: "aerobic_power", name: "Aerobic power", category: "energy_system", description: "Higher intensity sustained efforts.", sort_order: 21 },
  { slug: "anaerobic_capacity", name: "Anaerobic capacity", category: "energy_system", description: "Repeated high-intensity efforts.", sort_order: 22 },
  { slug: "lactate_tolerance", name: "Lactate tolerance", category: "energy_system", description: "Ability to sustain effort at lactate threshold.", sort_order: 23 },
  { slug: "work_capacity", name: "Work capacity", category: "energy_system", description: "Mixed modal; total work in time.", sort_order: 24 },
  // --- Movement ---
  { slug: "mobility", name: "Mobility", category: "movement", description: "Range of motion and tissue capacity.", sort_order: 30 },
  { slug: "thoracic_mobility", name: "Thoracic mobility", category: "movement", description: "T-spine rotation and extension.", sort_order: 31 },
  { slug: "balance", name: "Balance", category: "movement", description: "Static and dynamic balance.", sort_order: 32 },
  { slug: "coordination", name: "Coordination", category: "movement", description: "Movement skill and sequencing.", sort_order: 33 },
  { slug: "rotational_power", name: "Rotational power", category: "movement", description: "Explosive rotation (throwing, striking).", sort_order: 34 },
  { slug: "rotational_control", name: "Rotational control", category: "movement", description: "Controlled rotation and anti-rotation.", sort_order: 35 },
  // --- Resilience ---
  { slug: "joint_stability", name: "Joint stability", category: "resilience", description: "Stability around joints; injury resilience.", sort_order: 40 },
  { slug: "tendon_resilience", name: "Tendon resilience", category: "resilience", description: "Tendon load tolerance and recovery.", sort_order: 41 },
  { slug: "recovery", name: "Recovery", category: "resilience", description: "Low-intensity restoration.", sort_order: 42 },
  // --- Sport support ---
  { slug: "grip_strength", name: "Grip strength", category: "sport_support", description: "Hand and finger strength.", sort_order: 50 },
  { slug: "forearm_endurance", name: "Forearm endurance", category: "sport_support", description: "Sustained grip and forearm work.", sort_order: 51 },
  { slug: "scapular_stability", name: "Scapular stability", category: "sport_support", description: "Scapula control and positioning.", sort_order: 52 },
  { slug: "core_tension", name: "Core tension", category: "sport_support", description: "Bracing and core stiffness.", sort_order: 53 },
  { slug: "trunk_anti_flexion", name: "Trunk anti-flexion", category: "sport_support", description: "Anti-extension; front core.", sort_order: 54 },
  { slug: "trunk_anti_rotation", name: "Trunk anti-rotation", category: "sport_support", description: "Anti-rotation; oblique stability.", sort_order: 55 },
  { slug: "trunk_endurance", name: "Trunk endurance", category: "sport_support", description: "Sustained trunk stability.", sort_order: 56 },
  { slug: "hip_stability", name: "Hip stability", category: "sport_support", description: "Hip control and single-leg stability.", sort_order: 57 },
  { slug: "posterior_chain_endurance", name: "Posterior chain endurance", category: "sport_support", description: "Sustained posterior chain work.", sort_order: 58 },
  // --- Body-region / sport-specific ---
  { slug: "lat_hypertrophy", name: "Lat hypertrophy", category: "sport_support", description: "Lat size and pull emphasis.", sort_order: 59 },
  { slug: "quad_hypertrophy", name: "Quad hypertrophy", category: "sport_support", description: "Quad size and knee-dominant work.", sort_order: 60 },
  { slug: "paddling_endurance", name: "Paddling endurance", category: "sport_support", description: "Sustained paddling (surf, SUP).", sort_order: 61 },
  { slug: "pop_up_power", name: "Pop-up power", category: "sport_support", description: "Explosive pop-up (surfing).", sort_order: 62 },
];

/** Canonical list: single source of truth. DB seeds from this. */
export const TRAINING_QUALITIES: TrainingQualityDef[] = DEFS;

export const TRAINING_QUALITY_SLUGS: TrainingQualitySlug[] = DEFS.map((q) => q.slug);

export const TRAINING_QUALITY_CATEGORIES: TrainingQualityCategory[] = [
  "strength",
  "power",
  "energy_system",
  "movement",
  "sport_support",
  "resilience",
];

export function getQualityBySlug(slug: string): TrainingQualityDef | undefined {
  return TRAINING_QUALITIES.find((q) => q.slug === slug);
}

export function isTrainingQualitySlug(s: string): s is TrainingQualitySlug {
  return TRAINING_QUALITY_SLUGS.includes(s as TrainingQualitySlug);
}

export function getQualitiesByCategory(category: TrainingQualityCategory): TrainingQualityDef[] {
  return TRAINING_QUALITIES.filter((q) => q.category === category).sort(
    (a, b) => a.sort_order - b.sort_order
  );
}
