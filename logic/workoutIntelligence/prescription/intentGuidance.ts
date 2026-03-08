/**
 * Phase 5: Tempo / intent guidance per prescription style.
 * Simple cues for the user.
 */

import type { PrescriptionStyleSlug } from "../types";

const INTENT_BY_STYLE: Record<PrescriptionStyleSlug, string> = {
  heavy_strength: "High force intent; quality over speed",
  moderate_hypertrophy: "Controlled eccentric; moderate tempo",
  explosive_power: "Explosive concentric; full reset between reps",
  density_accessory: "Controlled; shorter rest for density",
  aerobic_steady: "Zone 2; steady effort",
  anaerobic_intervals: "Work interval + rest; repeat",
  controlled_resilience: "Slow, controlled; stability focus",
  mobility_flow: "Smooth range of motion; breath-led",
};

export function getIntentForStyle(slug: PrescriptionStyleSlug): string {
  return INTENT_BY_STYLE[slug] ?? "Controlled tempo";
}
