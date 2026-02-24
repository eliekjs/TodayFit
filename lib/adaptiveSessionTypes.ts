/**
 * Adaptive mode: one recommended session type + 3 alternative session type options.
 * Duration and energy are derived from horizon and recent load.
 */

export type SessionTypeOption = {
  id: string;
  sessionType: string;
  focus: string[];
  durationMinutes: number;
  energy: "low" | "medium" | "high";
};

const SESSION_TYPE_DEFS: { id: string; sessionType: string; focus: string[] }[] = [
  { id: "upper-strength-zone2", sessionType: "Upper Strength + Short Zone 2", focus: ["Build Strength"] },
  { id: "lower-strength-zone2", sessionType: "Lower Strength + Zone 2 Engine", focus: ["Improve Endurance", "Build Strength"] },
  { id: "full-body-strength", sessionType: "Balanced Full-Body Strength", focus: ["Build Strength", "Body Recomposition"] },
  { id: "hypertrophy-push-pull", sessionType: "Hypertrophy Push/Pull Mix", focus: ["Build Muscle (Hypertrophy)"] },
  { id: "strength-mobility", sessionType: "Strength Support + Mobility Focus", focus: ["Mobility & Joint Health", "Build Strength"] },
  { id: "easy-strength-mobility", sessionType: "Easy Strength + Mobility Reset", focus: ["Mobility & Joint Health", "Recovery"] },
  { id: "power-conditioning", sessionType: "Power Intervals + Mixed Conditioning", focus: ["Sport Conditioning", "Power & Explosiveness"] },
  { id: "pull-grip", sessionType: "Pull Strength + Grip Density", focus: ["Athletic Performance", "Calisthenics"] },
  { id: "endurance-focus", sessionType: "Endurance + Light Strength", focus: ["Improve Endurance"] },
  { id: "body-recomp", sessionType: "Body Recomposition Mix", focus: ["Body Recomposition"] },
];

function durationFromHorizon(horizon: number | null): number {
  if (horizon === 4) return 45;
  if (horizon === 12) return 75;
  return 60;
}

function energyFromLoad(load: string): "low" | "medium" | "high" {
  if (load === "Light") return "high";
  if (load === "Heavy") return "low";
  return "medium";
}

function getRecommendedId(
  primary: string,
  secondary: string | null,
  load: string
): string {
  if (load === "Heavy" && secondary === "mobility") {
    return "easy-strength-mobility";
  }
  switch (primary) {
    case "strength":
      return load !== "Heavy" ? "upper-strength-zone2" : "full-body-strength";
    case "muscle":
      return "hypertrophy-push-pull";
    case "endurance":
      return "lower-strength-zone2";
    case "mobility":
      return "strength-mobility";
    case "conditioning":
      return "power-conditioning";
    case "climbing":
      return "pull-grip";
    default:
      return "body-recomp";
  }
}

/** Returns 4 options: [recommended, alternative1, alternative2, alternative3]. */
export function getSessionTypeOptions(
  primary: string,
  secondary: string | null,
  horizon: number | null,
  recentLoad: string
): SessionTypeOption[] {
  const duration = durationFromHorizon(horizon);
  const energy = energyFromLoad(recentLoad);

  const recommendedId = getRecommendedId(primary, secondary, recentLoad);
  const recommendedDef = SESSION_TYPE_DEFS.find((d) => d.id === recommendedId) ?? SESSION_TYPE_DEFS[0];

  const altPoolByPrimary: Record<string, string[]> = {
    strength: ["lower-strength-zone2", "full-body-strength", "strength-mobility", "upper-strength-zone2"],
    muscle: ["full-body-strength", "hypertrophy-push-pull", "upper-strength-zone2", "body-recomp"],
    endurance: ["lower-strength-zone2", "endurance-focus", "upper-strength-zone2", "full-body-strength"],
    mobility: ["easy-strength-mobility", "strength-mobility", "full-body-strength", "upper-strength-zone2"],
    conditioning: ["power-conditioning", "full-body-strength", "lower-strength-zone2", "pull-grip"],
    climbing: ["pull-grip", "upper-strength-zone2", "hypertrophy-push-pull", "full-body-strength"],
  };
  const pool = altPoolByPrimary[primary] ?? ["full-body-strength", "body-recomp", "upper-strength-zone2", "strength-mobility"];
  const altIds = pool.filter((id) => id !== recommendedId);
  const defs = [recommendedDef, ...altIds.slice(0, 3).map((id) => SESSION_TYPE_DEFS.find((d) => d.id === id) ?? SESSION_TYPE_DEFS[0])];

  return defs.map((d) => ({
    id: d.id,
    sessionType: d.sessionType,
    focus: d.focus,
    durationMinutes: duration,
    energy,
  }));
}
