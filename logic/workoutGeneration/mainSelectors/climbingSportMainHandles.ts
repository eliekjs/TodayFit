/**
 * Rock climbing: sport-owned handlers for main strength, accessory coverage, hypertrophy volume.
 */

import { exerciseHasStrengthSubFocusSlug } from "../../../data/goalSubFocus";
import {
  applyRockUpstreamAccessoryPairsCoverage,
  applyRockUpstreamMainLiftsCoverage,
} from "../sportPatternTransfer/rockClimbingSession";
import type { Exercise } from "../types";
import type {
  AlpineHypertrophyVolumeContext,
  AlpineStrengthAccessoryCoverageContext,
  AlpineStrengthMainLiftContext,
  SportMainHandles,
  SportMainSelectorDeps,
} from "./types";
import { climbingOwnedPickMany } from "./climbingOwnedSelection";

export function createRockClimbingSportMainHandles(deps: SportMainSelectorDeps): SportMainHandles {
  return {
    sportSlug: "rock_climbing",

    selectStrengthMainLifts(ctx: AlpineStrengthMainLiftContext): Exercise[] {
      const contract = ctx.contract;
      const { mainPool, mainLiftCount, intentSlugs, primaryIntent, pickEnv, traceNotes } = ctx;

      traceNotes?.push("rock_climbing_sport_owned:strength contract=" + contract.sessionType);

      const getComplementaryStrengthIntents = (intent?: string): string[] => {
        if (!intent) return [];
        if (intent === "pull") return ["deadlift_hinge"];
        if (intent === "deadlift_hinge") return ["pull"];
        if (intent === "squat") return ["pull"];
        if (intent === "bench_press") return ["pull"];
        if (intent === "overhead_press") return ["pull"];
        return [];
      };

      let mainLifts: Exercise[] = [];

      if (primaryIntent && intentSlugs.length > 0) {
        const directIntentMainMatches = mainPool.filter((e) => intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)));
        const primaryMatches = directIntentMainMatches.filter((e) => exerciseHasStrengthSubFocusSlug(e, primaryIntent));

        if (primaryMatches.length > 0) {
          const anchorChosen = climbingOwnedPickMany(
            primaryMatches,
            1,
            ctx.input,
            ctx.recentIds,
            ctx.movementCounts,
            ctx.fatigueState,
            ctx.rng,
            deps.scoreExercise,
            {
              blockType: "main_strength",
              sessionFatigueRegions: ctx.sessionFatigueRegions,
              historyContext: ctx.historyContext,
              sessionTargetVector: deps.sessionTargetVector,
              emphasisBucket: ctx.alpineEmphasis,
              contract,
            },
            ctx.sportPatCounts,
            pickEnv,
            { trackRockCounts: true }
          );
          if (anchorChosen[0]) mainLifts.push(anchorChosen[0]);

          const remainingCount = mainLiftCount - mainLifts.length;
          if (remainingCount > 0 && mainLifts[0]) {
            const anchor = mainLifts[0];
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

            const rest = climbingOwnedPickMany(
              remainingPool,
              remainingCount,
              ctx.input,
              ctx.recentIds,
              ctx.movementCounts,
              ctx.fatigueState,
              ctx.rng,
              deps.scoreExercise,
              {
                blockType: "main_strength",
                sessionFatigueRegions: ctx.sessionFatigueRegions,
                historyContext: ctx.historyContext,
                sessionTargetVector: deps.sessionTargetVector,
                emphasisBucket: ctx.alpineEmphasis,
                contract,
              },
              ctx.sportPatCounts,
              pickEnv,
              { trackRockCounts: true }
            );
            mainLifts.push(...rest);
          }
        } else if (directIntentMainMatches.length > 0) {
          mainLifts = climbingOwnedPickMany(
            directIntentMainMatches,
            mainLiftCount,
            ctx.input,
            ctx.recentIds,
            ctx.movementCounts,
            ctx.fatigueState,
            ctx.rng,
            deps.scoreExercise,
            {
              blockType: "main_strength",
              sessionFatigueRegions: ctx.sessionFatigueRegions,
              historyContext: ctx.historyContext,
              sessionTargetVector: deps.sessionTargetVector,
              emphasisBucket: ctx.alpineEmphasis,
              contract,
            },
            ctx.sportPatCounts,
            pickEnv,
            { trackRockCounts: true }
          );
        }
      }

      if (mainLifts.length === 0) {
        mainLifts = climbingOwnedPickMany(
          mainPool,
          mainLiftCount,
          ctx.input,
          ctx.recentIds,
          ctx.movementCounts,
          ctx.fatigueState,
          ctx.rng,
          deps.scoreExercise,
          {
            blockType: "main_strength",
            sessionFatigueRegions: ctx.sessionFatigueRegions,
            historyContext: ctx.historyContext,
            sessionTargetVector: deps.sessionTargetVector,
            emphasisBucket: ctx.alpineEmphasis,
            contract,
          },
          ctx.sportPatCounts,
          pickEnv,
          { trackRockCounts: true }
        );
      }

      if (mainLifts.length > 0) {
        applyRockUpstreamMainLiftsCoverage(mainLifts, ctx.replacementCatalog, "main_strength");
        traceNotes?.push("rock_climbing_sport_owned:strength coverage_pass(main)");
      }

      return mainLifts;
    },

    applyStrengthAccessoryCoverage(ctx: AlpineStrengthAccessoryCoverageContext): void {
      applyRockUpstreamAccessoryPairsCoverage(ctx.mainLifts, ctx.pairs, ctx.replacementCatalog, "accessory");
    },

    selectHypertrophyVolume(ctx: AlpineHypertrophyVolumeContext): Exercise[] {
      const contract = ctx.contract;
      const {
        pool,
        wantCount,
        isHypertrophyPrimary,
        directSubFocusSlugs,
        dominantSlug,
        exerciseMatchesHypertrophySubFocusSlug: matchHypertrophySlug,
        pickEnv,
        traceNotes,
      } = ctx;

      traceNotes?.push("rock_climbing_sport_owned:hypertrophy contract=" + contract.sessionType);

      let chosen: Exercise[] = [];

      if (dominantSlug && isHypertrophyPrimary && directSubFocusSlugs.length > 0 && wantCount > 0) {
        const hasBalanced = ctx.hasBalanced;
        const desiredDirectRatio = hasBalanced ? 0.45 : 0.65;
        const desiredDirectCount = Math.max(1, Math.round(wantCount * desiredDirectRatio));
        const directDominantPool = pool.filter((e) => matchHypertrophySlug(e, dominantSlug));

        if (directDominantPool.length > 0) {
          const firstCount = Math.min(desiredDirectCount, directDominantPool.length, wantCount);
          const firstPick = climbingOwnedPickMany(
            directDominantPool,
            firstCount,
            ctx.input,
            ctx.recentIds,
            ctx.movementCounts,
            ctx.fatigueState,
            ctx.rng,
            deps.scoreExercise,
            {
              blockType: "main_hypertrophy",
              sessionFatigueRegions: ctx.sessionFatigueRegions,
              historyContext: ctx.historyContext,
              sessionTargetVector: deps.sessionTargetVector,
              emphasisBucket: ctx.alpineEmphasis,
              contract,
            },
            ctx.sportPatCounts,
            pickEnv,
            { trackRockCounts: true }
          );
          chosen = [...firstPick];
          for (const e of firstPick) {
            ctx.used.add(e.id);
          }

          const remaining = wantCount - chosen.length;
          if (remaining > 0) {
            const remainingPool = pool.filter((e) => !chosen.some((c) => c.id === e.id));
            if (remainingPool.length > 0) {
              const secondPick = climbingOwnedPickMany(
                remainingPool,
                remaining,
                ctx.input,
                ctx.recentIds,
                ctx.movementCounts,
                ctx.fatigueState,
                ctx.rng,
                deps.scoreExercise,
                {
                  blockType: "main_hypertrophy",
                  sessionFatigueRegions: ctx.sessionFatigueRegions,
                  historyContext: ctx.historyContext,
                  sessionTargetVector: deps.sessionTargetVector,
                  emphasisBucket: ctx.alpineEmphasis,
                  contract,
                },
                ctx.sportPatCounts,
                pickEnv,
                { trackRockCounts: true }
              );
              chosen = [...chosen, ...secondPick];
            }
          }
        }
      }

      if (chosen.length === 0) {
        chosen = climbingOwnedPickMany(
          pool,
          wantCount,
          ctx.input,
          ctx.recentIds,
          ctx.movementCounts,
          ctx.fatigueState,
          ctx.rng,
          deps.scoreExercise,
          {
            blockType: "main_hypertrophy",
            sessionFatigueRegions: ctx.sessionFatigueRegions,
            historyContext: ctx.historyContext,
            sessionTargetVector: deps.sessionTargetVector,
            emphasisBucket: ctx.alpineEmphasis,
            contract,
          },
          ctx.sportPatCounts,
          pickEnv,
          { trackRockCounts: true }
        );
      }

      if (chosen.length > 0) {
        applyRockUpstreamMainLiftsCoverage(chosen, ctx.replacementCatalog, "main_hypertrophy");
        traceNotes?.push("rock_climbing_sport_owned:hypertrophy coverage_pass(volume)");
      }

      return chosen;
    },

    refineHypertrophyPairsCoverage(chosen: Exercise[], pairs: Exercise[][], replacementCatalog: Exercise[]): void {
      applyRockUpstreamAccessoryPairsCoverage([], pairs, replacementCatalog, "main_hypertrophy");
    },
  };
}
