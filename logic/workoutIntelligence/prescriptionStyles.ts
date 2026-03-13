/**
 * Phase 3: Prescription style framework.
 * Template-level defaults for reps, sets, rest, tempo/intent — not exercise-level prescriptions yet.
 * Used by session/block architecture to guide how exercises in each block should be prescribed.
 */

import type { PrescriptionStyle, PrescriptionStyleSlug } from "./types";

export const PRESCRIPTION_STYLES: Record<PrescriptionStyleSlug, PrescriptionStyle> = {
  heavy_strength: {
    slug: "heavy_strength",
    name: "Heavy strength",
    // ACSM: 1–6 RM, 3–5 min rest for strength.
    rep_range_min: 3,
    rep_range_max: 6,
    set_range_min: 3,
    set_range_max: 5,
    rest_seconds_min: 150,
    rest_seconds_max: 300,
    intent_guidance: "High force intent; quality over speed",
    rpe_target: 8,
  },
  moderate_hypertrophy: {
    slug: "moderate_hypertrophy",
    name: "Moderate hypertrophy",
    // Evidence-based: 8–15 reps (Schoenfeld); rest 60–90 s (ACSM 1–2 min, meta-analysis ≥60 s).
    rep_range_min: 8,
    rep_range_max: 15,
    set_range_min: 2,
    set_range_max: 4,
    rest_seconds_min: 60,
    rest_seconds_max: 90,
    intent_guidance: "Controlled eccentric acceptable; moderate tempo",
    rpe_target: 7,
  },
  explosive_power: {
    slug: "explosive_power",
    name: "Explosive power",
    rep_range_min: 1,
    rep_range_max: 5,
    set_range_min: 3,
    set_range_max: 6,
    rest_seconds_min: 120,
    rest_seconds_max: 300,
    intent_guidance: "Maximal speed intent; stop before fatigue",
    rpe_target: 8,
  },
  density_accessory: {
    slug: "density_accessory",
    name: "Density accessory",
    rep_range_min: 8,
    rep_range_max: 20,
    set_range_min: 2,
    set_range_max: 4,
    rest_seconds_min: 30,
    rest_seconds_max: 60,
    intent_guidance: "Controlled; shorter rest for density",
  },
  aerobic_steady: {
    slug: "aerobic_steady",
    name: "Aerobic steady",
    rep_range_min: 0,
    rep_range_max: 0,
    set_range_min: 1,
    set_range_max: 1,
    intent_guidance: "Zone 2; steady effort; time-based",
  },
  anaerobic_intervals: {
    slug: "anaerobic_intervals",
    name: "Anaerobic intervals",
    rep_range_min: 0,
    rep_range_max: 0,
    set_range_min: 4,
    set_range_max: 10,
    rest_seconds_min: 60,
    rest_seconds_max: 180,
    intent_guidance: "Work interval + rest; repeat",
  },
  controlled_resilience: {
    slug: "controlled_resilience",
    name: "Controlled resilience",
    rep_range_min: 8,
    rep_range_max: 15,
    set_range_min: 2,
    set_range_max: 3,
    rest_seconds_min: 45,
    rest_seconds_max: 90,
    intent_guidance: "Controlled; stability focus; avoid max effort",
  },
  mobility_flow: {
    slug: "mobility_flow",
    name: "Mobility flow",
    rep_range_min: 5,
    rep_range_max: 15,
    set_range_min: 1,
    set_range_max: 2,
    intent_guidance: "Smooth; breath-led; no max effort",
  },
};

export const PRESCRIPTION_STYLE_SLUGS: PrescriptionStyleSlug[] = Object.keys(
  PRESCRIPTION_STYLES
) as PrescriptionStyleSlug[];

export function getPrescriptionStyle(slug: PrescriptionStyleSlug): PrescriptionStyle {
  const s = PRESCRIPTION_STYLES[slug];
  if (!s) throw new Error(`Unknown prescription style: ${slug}`);
  return s;
}
