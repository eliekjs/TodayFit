/**
 * Generic (non–sport-owned) main-lift and hypertrophy volume selection.
 * Preserves pre-split behavior: intent anchoring, complementary fills, hypertrophy sub-focus ratios.
 */

import { exerciseHasStrengthSubFocusSlug } from "../../../data/goalSubFocus";
import type { Exercise } from "../types";
import type { GenericHypertrophySelectionArgs, GenericStrengthMainSelectionArgs } from "./types";

export function genericSelectStrengthMainLifts(args: GenericStrengthMainSelectionArgs): Exercise[] {
  const { mainPool, mainLiftCount, intentSlugs, primaryIntent, getComplementaryStrengthIntents, pick } = args;
  let mainLifts: Exercise[] = [];

  if (primaryIntent && intentSlugs.length > 0) {
    const directIntentMainMatches = mainPool.filter((e) => intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)));
    const primaryMatches = directIntentMainMatches.filter((e) => exerciseHasStrengthSubFocusSlug(e, primaryIntent));

    if (primaryMatches.length > 0) {
      const anchorChosen = pick(primaryMatches, 1, "main_strength_intent_anchor");
      const anchor = anchorChosen[0];
      if (anchor) mainLifts.push(anchor);

      const remainingCount = mainLiftCount - mainLifts.length;
      if (remainingCount > 0 && anchor) {
        const remainingPoolBase = mainPool.filter((e) => e.id !== anchor.id);
        const complementaryIntents = getComplementaryStrengthIntents(primaryIntent);
        const remainingPrimaryOrComplementMatches = remainingPoolBase.filter(
          (e) =>
            exerciseHasStrengthSubFocusSlug(e, primaryIntent) ||
            complementaryIntents.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug))
        );
        const remainingAnyIntentMatches = remainingPoolBase.filter((e) =>
          intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug))
        );

        const remainingPool =
          remainingAnyIntentMatches.length >= remainingCount
            ? remainingAnyIntentMatches
            : remainingPrimaryOrComplementMatches.length >= remainingCount
              ? remainingPrimaryOrComplementMatches
              : remainingPoolBase;

        const restChosen = pick(remainingPool, remainingCount, "main_strength_intent_fill");
        mainLifts.push(...restChosen);
      }
    } else if (directIntentMainMatches.length > 0) {
      mainLifts = pick(directIntentMainMatches, mainLiftCount, "main_strength_intent_direct_pool");
    }
  }

  if (mainLifts.length === 0) {
    mainLifts = pick(mainPool, mainLiftCount, "main_strength_default_pool");
  }

  return mainLifts;
}

export function genericSelectHypertrophyChosen(args: GenericHypertrophySelectionArgs): Exercise[] {
  const {
    pool,
    wantCount,
    isHypertrophyPrimary,
    muscleSubFocusRanked,
    hasBalanced,
    directSubFocusSlugs,
    dominantSlug,
    pick,
    exerciseMatchesHypertrophySubFocusSlug,
    used,
  } = args;

  let chosen: Exercise[] = [];
  if (dominantSlug && isHypertrophyPrimary && directSubFocusSlugs.length > 0 && wantCount > 0) {
    const desiredDirectRatio = hasBalanced ? 0.45 : 0.65;
    const desiredDirectCount = Math.max(1, Math.round(wantCount * desiredDirectRatio));
    const directDominantPool = pool.filter((e) => exerciseMatchesHypertrophySubFocusSlug(e, dominantSlug));

    if (directDominantPool.length > 0) {
      const firstCount = Math.min(desiredDirectCount, directDominantPool.length, wantCount);
      const firstPick = pick(directDominantPool, firstCount, "main_hypertrophy_subfocus_dominant");
      chosen = [...firstPick];
      if (used) {
        for (const e of firstPick) used.add(e.id);
      }

      const remaining = wantCount - chosen.length;
      if (remaining > 0) {
        const remainingPool = pool.filter((e) => !chosen.some((c) => c.id === e.id));
        if (remainingPool.length > 0) {
          const secondPick = pick(remainingPool, remaining, "main_hypertrophy_subfocus_remainder");
          chosen = [...chosen, ...secondPick];
        }
      }
    }
  }

  if (chosen.length === 0) {
    chosen = pick(pool, wantCount, "main_hypertrophy_default_pool");
  }

  return chosen;
}
