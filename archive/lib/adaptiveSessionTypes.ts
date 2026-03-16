/**
 * Adaptive mode: one recommended session type + 3 alternative session type options.
 * Duration comes from user preference (e.g. default session duration). Energy (intensity)
 * is derived from recent load and fatigue, then capped by horizon: farther from event =
 * more intensity allowed; closer = lighter so user is fresh.
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

export type TimeHorizonId =
  | "no_deadline"
  | "1_3_weeks"
  | "4_8_weeks"
  | "2_4_months"
  | "in_season";

/** Horizon only affects intensity: closer to event = cap energy (lighter); farther = allow higher. */
function capEnergyByHorizon(
  energy: "low" | "medium" | "high",
  horizon: string | null
): "low" | "medium" | "high" {
  if (!horizon) return energy;
  if (horizon === "in_season") return "low";
  if (horizon === "1_3_weeks" && energy === "high") return "medium";
  return energy;
}

/** Map spec recent-load options to simple load level. */
function loadLevelFromRecentLoad(recentLoad: string): "Light" | "Normal" | "Heavy" {
  if (
    recentLoad === "Light / Off" ||
    recentLoad === "Normal / Mixed"
  ) {
    return recentLoad === "Light / Off" ? "Light" : "Normal";
  }
  if (
    recentLoad === "Heavy Lower" ||
    recentLoad === "Heavy Upper" ||
    recentLoad === "Long Run" ||
    recentLoad === "Big Hike" ||
    recentLoad === "Ski Day" ||
    recentLoad === "Climbing Day"
  ) {
    return recentLoad === "Heavy Lower" || recentLoad === "Heavy Upper" ? "Heavy" : "Normal";
  }
  return "Normal";
}

function energyFromLoadAndFatigue(
  load: string,
  fatigue: string | null
): "low" | "medium" | "high" {
  if (fatigue === "Fresh") return "high";
  if (fatigue === "Fatigued") return "low";
  if (fatigue === "Moderate") return "medium";
  const level = loadLevelFromRecentLoad(load);
  if (level === "Light") return "high";
  if (level === "Heavy") return "low";
  return "medium";
}

function getRecommendedId(
  primary: string,
  secondary: string | null,
  load: string
): string {
  const level = loadLevelFromRecentLoad(load);
  if (level === "Heavy" && secondary === "mobility") {
    return "easy-strength-mobility";
  }
  switch (primary) {
    case "strength":
      return level !== "Heavy" ? "upper-strength-zone2" : "full-body-strength";
    case "muscle":
    case "physique":
      return "hypertrophy-push-pull";
    case "endurance":
    case "trail_running":
      return "lower-strength-zone2";
    case "mobility":
    case "resilience":
      return "strength-mobility";
    case "conditioning":
    case "ski":
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
  horizon: string | null,
  recentLoad: string,
  fatigue?: string | null,
  durationMinutes?: number
): SessionTypeOption[] {
  const duration = durationMinutes ?? 45;
  const energy = capEnergyByHorizon(
    energyFromLoadAndFatigue(recentLoad, fatigue ?? null),
    horizon
  );

  const recommendedId = getRecommendedId(primary, secondary, recentLoad);
  const recommendedDef = SESSION_TYPE_DEFS.find((d) => d.id === recommendedId) ?? SESSION_TYPE_DEFS[0];

  const altPoolByPrimary: Record<string, string[]> = {
    strength: ["lower-strength-zone2", "full-body-strength", "strength-mobility", "upper-strength-zone2"],
    muscle: ["full-body-strength", "hypertrophy-push-pull", "upper-strength-zone2", "body-recomp"],
    physique: ["hypertrophy-push-pull", "body-recomp", "full-body-strength", "upper-strength-zone2"],
    endurance: ["lower-strength-zone2", "endurance-focus", "upper-strength-zone2", "full-body-strength"],
    trail_running: ["lower-strength-zone2", "endurance-focus", "full-body-strength", "upper-strength-zone2"],
    mobility: ["easy-strength-mobility", "strength-mobility", "full-body-strength", "upper-strength-zone2"],
    resilience: ["easy-strength-mobility", "strength-mobility", "full-body-strength", "upper-strength-zone2"],
    conditioning: ["power-conditioning", "full-body-strength", "lower-strength-zone2", "pull-grip"],
    ski: ["power-conditioning", "full-body-strength", "lower-strength-zone2", "pull-grip"],
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
