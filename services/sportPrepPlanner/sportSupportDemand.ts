import type { IntentKey } from "./weeklyEmphasis";

export type DemandVector = Record<IntentKey, number>;

export function zeroDemand(): DemandVector {
  return {
    strength: 0,
    power: 0,
    aerobic: 0,
    mobility: 0,
    prehab: 0,
    recovery: 0,
  };
}

/** Legacy default when no goals and no sport context (general gym plan). */
export function defaultNonSportEmptyGoalsDemand(): DemandVector {
  const combined = zeroDemand();
  combined.strength = 2;
  combined.aerobic = 1;
  combined.mobility = 1;
  return combined;
}

/**
 * When the user selected sport(s) but no ranked training goals, avoid a max-strength-heavy
 * demand vector so gym days rotate strength, power, conditioning, and mobility more evenly.
 */
export function sportSupportDefaultDemand(): DemandVector {
  return {
    strength: 1.8,
    power: 1.8,
    aerobic: 2,
    mobility: 1.5,
    prehab: 1,
    recovery: 1,
  };
}
