/**
 * Weekly structure templates: given gym days per week and optional emphasis,
 * returns the body-region and goal bias for each gym day.
 *
 * Body emphasis distribution rule (when no weekly emphasis or auto_alternate):
 * - Even number of days: alternate Upper and Lower only (no Full body day).
 * - Odd number of days: exactly one Full body day; remaining days alternate Upper/Lower.
 * Examples: 2=U,L; 3=U,L,Full; 4=U,L,U,L; 5=U,L,Full,U,L; 6=U,L,U,L,U,L.
 */

import type { BodyEmphasisKey } from "../../lib/types";

export type IntentKey = "strength" | "power" | "aerobic" | "mobility" | "prehab" | "recovery";

/** Body bias for one gym day: maps to generator targetBody + targetModifier. */
export type DayBias = {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  intentKey: IntentKey;
};

/**
 * Returns body-emphasis distribution only (targetBody + targetModifier per day).
 * Does not set intentKey; caller combines with goal/intent order.
 * Rule: even days = Upper/Lower alternating; odd days = one Full (middle), rest U/L alternating.
 */
export function getBodyEmphasisDistribution(gymDaysPerWeek: number): { targetBody: "Upper" | "Lower" | "Full"; targetModifier: string[] }[] {
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  const out: { targetBody: "Upper" | "Lower" | "Full"; targetModifier: string[] }[] = [];
  if (n % 2 === 0) {
    for (let i = 0; i < n; i++) {
      out.push({ targetBody: i % 2 === 0 ? "Upper" : "Lower", targetModifier: [] });
    }
  } else {
    const fullIndex = Math.floor(n / 2);
    let ulIndex = 0;
    for (let i = 0; i < n; i++) {
      if (i === fullIndex) {
        out.push({ targetBody: "Full", targetModifier: [] });
      } else {
        out.push({ targetBody: ulIndex % 2 === 0 ? "Upper" : "Lower", targetModifier: [] });
        ulIndex += 1;
      }
    }
  }
  return out;
}

/**
 * Returns ordered day biases for gym-only days (no sport slots).
 * When no emphasis: uses getBodyEmphasisDistribution (even=U/L only, odd=one Full).
 * When emphasis set: legacy templates that give emphasized area more volume.
 */
export function getWeeklyStructureTemplate(
  gymDaysPerWeek: number,
  emphasis: BodyEmphasisKey | null | undefined
): DayBias[] {
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  if (!emphasis || emphasis === "none") {
    const bodyOnly = getBodyEmphasisDistribution(n);
    return bodyOnly.map((b) => ({ ...b, intentKey: "strength" as IntentKey }));
  }
  switch (emphasis) {
    case "upper_body":
      return getUpperEmphasis(n);
    case "lower_body":
      return getLowerEmphasis(n);
    case "pull":
      return getPullEmphasis(n);
    case "push":
      return getPushEmphasis(n);
    case "glutes":
      return getGlutesEmphasis(n);
    case "core":
      return getCoreEmphasis(n);
    default:
      const bodyOnly = getBodyEmphasisDistribution(n);
      return bodyOnly.map((b) => ({ ...b, intentKey: "strength" as IntentKey }));
  }
}

function getBalancedWeek(n: number): DayBias[] {
  const templates: DayBias[] = [
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
    { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
    { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
  ];
  return templates.slice(0, n);
}

function getUpperEmphasis(n: number): DayBias[] {
  if (n === 3)
    return [
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n === 4)
    return [
      { targetBody: "Upper", targetModifier: ["Push"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: ["Pull"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n >= 5)
    return [
      { targetBody: "Upper", targetModifier: ["Push"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: ["Pull"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
    ].slice(0, n);
  return getBalancedWeek(n);
}

function getLowerEmphasis(n: number): DayBias[] {
  if (n === 3)
    return [
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n === 4)
    return [
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n >= 5)
    return [
      { targetBody: "Lower", targetModifier: ["Quad"], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: ["Posterior"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
    ].slice(0, n);
  return getBalancedWeek(n);
}

function getPullEmphasis(n: number): DayBias[] {
  if (n === 3)
    return [
      { targetBody: "Upper", targetModifier: ["Pull"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n >= 4)
    return [
      { targetBody: "Upper", targetModifier: ["Pull"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: ["Pull"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ].slice(0, n);
  return getBalancedWeek(n);
}

function getPushEmphasis(n: number): DayBias[] {
  if (n === 3)
    return [
      { targetBody: "Upper", targetModifier: ["Push"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n >= 4)
    return [
      { targetBody: "Upper", targetModifier: ["Push"], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: [], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: ["Push"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ].slice(0, n);
  return getBalancedWeek(n);
}

function getGlutesEmphasis(n: number): DayBias[] {
  if (n === 3)
    return [
      { targetBody: "Lower", targetModifier: ["Posterior"], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ];
  if (n >= 4)
    return [
      { targetBody: "Lower", targetModifier: ["Posterior"], intentKey: "strength" },
      { targetBody: "Upper", targetModifier: [], intentKey: "strength" },
      { targetBody: "Lower", targetModifier: ["Posterior"], intentKey: "strength" },
      { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    ].slice(0, n);
  return getBalancedWeek(n);
}

function getCoreEmphasis(n: number): DayBias[] {
  const base: DayBias[] = [
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    { targetBody: "Full", targetModifier: [], intentKey: "mobility" },
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
  ];
  if (n <= 3) return base.slice(0, n);
  return [
    ...base,
    { targetBody: "Full", targetModifier: [], intentKey: "strength" },
    { targetBody: "Full", targetModifier: [], intentKey: "mobility" },
  ].slice(0, n);
}
