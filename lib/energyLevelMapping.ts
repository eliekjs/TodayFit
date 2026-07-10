import type { EnergyLevel } from "./types";

/** Sport-mode labels for session energy (maps to generator `energy_level`). */
export const SPORT_INTENSITY_OPTIONS = ["Fresh", "Moderate", "Fatigued"] as const;
export type SportIntensityLevel = (typeof SPORT_INTENSITY_OPTIONS)[number];

/** Map sport intensity chip → generator energy level. */
export function energyFromSportIntensity(level: string): EnergyLevel {
  if (level === "Fresh") return "high";
  if (level === "Fatigued") return "low";
  return "medium";
}

/** Map manual / generator energy → sport intensity chip (default Moderate). */
export function sportIntensityFromEnergy(
  energy: EnergyLevel | null | undefined
): SportIntensityLevel {
  if (energy === "high") return "Fresh";
  if (energy === "low") return "Fatigued";
  return "Moderate";
}

/** User-facing label aligned with manual mode (Low / Medium / High). */
export function sportIntensityDisplayLabel(level: string): string {
  if (level === "Fresh") return "Low";
  if (level === "Fatigued") return "High";
  return "Medium";
}
