/**
 * Weekly structure templates: given gym days per week and optional emphasis,
 * returns the body-region and goal bias for each gym day so the week stays
 * balanced while giving the emphasized area ~60–65% of volume.
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
 * Returns ordered day biases for gym-only days (no sport slots).
 * Emphasis area gets more days; week still includes lower, upper, and full-body work.
 */
export function getWeeklyStructureTemplate(
  gymDaysPerWeek: number,
  emphasis: BodyEmphasisKey | null | undefined
): DayBias[] {
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  if (!emphasis || emphasis === "none") {
    return getBalancedWeek(n);
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
      return getBalancedWeek(n);
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
