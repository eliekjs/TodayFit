/**
 * Maps canonical `SportDefinition.engine` → `NormalizedSportProfile` for workout generation.
 * Single path from data/sportSubFocus/sportDefinitions.ts — no duplicated operational constants.
 */

import type { SportDefinition, SportDefinitionEngine } from "../../data/sportSubFocus/types";
import type { MovementPattern } from "./types";
import { resolveBanPredicateKeys } from "./sportProfileBanPredicates";
import type { NormalizedSportProfile, StructureBiasKind } from "./sportProfileTypes";

const MOVEMENT_SET = new Set<string>(["squat", "hinge", "push", "pull", "carry", "rotate", "locomotion"]);

function isMovementPattern(s: string): s is MovementPattern {
  return MOVEMENT_SET.has(s);
}

/** Default weight curve from rank when weight omitted (matches legacy rock_climbing curve). */
function defaultWeightForRank(rank: number): number {
  const curve: Record<number, number> = {
    1: 1,
    2: 0.88,
    3: 0.72,
    4: 0.62,
    5: 0.45,
  };
  return curve[rank] ?? Math.max(0.35, 1 - (rank - 1) * 0.12);
}

function structureBiasRecordFromEngine(s: SportDefinitionEngine["structureBias"]): {
  record: Record<StructureBiasKind, number>;
  derivedFrom:
    | "explicit_shares"
    | "emphasis_conditioning"
    | "emphasis_strength"
    | "emphasis_hybrid"
    | "implicit_default";
} {
  if (
    s.strengthShare != null &&
    s.conditioningShare != null &&
    s.hybridShare != null
  ) {
    return {
      record: {
        strength: s.strengthShare,
        conditioning: s.conditioningShare,
        hybrid: s.hybridShare,
      },
      derivedFrom: "explicit_shares",
    };
  }
  if (s.emphasis === "conditioning") {
    return {
      record: { strength: 0.35, conditioning: 0.5, hybrid: 0.15 },
      derivedFrom: "emphasis_conditioning",
    };
  }
  if (s.emphasis === "strength") {
    return {
      record: { strength: 0.65, conditioning: 0.2, hybrid: 0.15 },
      derivedFrom: "emphasis_strength",
    };
  }
  if (s.emphasis === "hybrid") {
    return {
      record: { strength: 0.45, conditioning: 0.35, hybrid: 0.2 },
      derivedFrom: "emphasis_hybrid",
    };
  }
  return {
    record: { strength: 0.5, conditioning: 0.3, hybrid: 0.2 },
    derivedFrom: "implicit_default",
  };
}

export type MapSportDefinitionResult =
  | {
      ok: true;
      profile: NormalizedSportProfile;
      warnings: string[];
      fieldsUsed: string[];
      /** Mapper fallbacks (defaults) — non-empty means canonical was partially implicit. */
      defaultsApplied: string[];
    }
  | { ok: false; errors: string[] };

/**
 * Convert canonical engine config to runtime profile. Validates movement slugs; fails closed on invalid data.
 */
export function mapSportDefinitionToNormalizedProfile(def: SportDefinition): MapSportDefinitionResult {
  const eng = def.engine;
  if (!eng) {
    return { ok: false, errors: [`Sport "${def.slug}" has no engine block — add SportDefinition.engine`] };
  }
  if (eng.enabled === false) {
    return { ok: false, errors: [`Sport "${def.slug}" engine.enabled is false`] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldsUsed: string[] = [
    "movementPatterns",
    "topPatterns",
    "secondaryPatterns",
    "requiredTagBoosts",
    "energySystemBias",
    "structureBias",
  ];

  if (!eng.movementPatterns?.length) {
    errors.push(`engine.movementPatterns must be non-empty (slug: ${def.slug})`);
  }

  const weightedMovementPatterns: NormalizedSportProfile["weightedMovementPatterns"] = [];
  for (const row of eng.movementPatterns ?? []) {
    if (!isMovementPattern(row.slug)) {
      errors.push(`Invalid movement pattern slug "${row.slug}" for ${def.slug}`);
      continue;
    }
    weightedMovementPatterns.push({
      pattern: row.slug,
      rank: row.rank,
      weight: row.weight ?? defaultWeightForRank(row.rank),
    });
  }

  const topPatterns: MovementPattern[] = [];
  for (const s of eng.topPatterns ?? []) {
    if (!isMovementPattern(s)) errors.push(`Invalid topPattern "${s}" for ${def.slug}`);
    else topPatterns.push(s);
  }
  const secondaryPatterns: MovementPattern[] = [];
  for (const s of eng.secondaryPatterns ?? []) {
    if (!isMovementPattern(s)) errors.push(`Invalid secondaryPattern "${s}" for ${def.slug}`);
    else secondaryPatterns.push(s);
  }

  if (topPatterns.length === 0) {
    errors.push(`engine.topPatterns must be non-empty (slug: ${def.slug})`);
  }

  if (!eng.requiredTagBoosts?.length) {
    warnings.push(`${def.slug}: engine.requiredTagBoosts is empty — sport specificity scoring will be weak`);
  }

  if (eng.hardBanPredicateKeys?.length) fieldsUsed.push("hardBanPredicateKeys");
  if (eng.softBanPredicateKeys?.length) fieldsUsed.push("softBanPredicateKeys");
  if (eng.hardBannedTagSlugs?.length) fieldsUsed.push("hardBannedTagSlugs");
  if (eng.softBannedTagSlugs?.length) fieldsUsed.push("softBannedTagSlugs");
  if (eng.scoringPenaltyKeys?.length) fieldsUsed.push("scoringPenaltyKeys");
  if (eng.compositionNudge && Object.keys(eng.compositionNudge).length > 0) fieldsUsed.push("compositionNudge");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const defaultsApplied: string[] = [];
  if (eng.energySystemBias.conditioningMinutesScale == null) {
    defaultsApplied.push("energySystemBias.conditioningMinutesScale→1");
  }
  const structureMeta = structureBiasRecordFromEngine(eng.structureBias ?? {});
  if (structureMeta.derivedFrom === "implicit_default") {
    defaultsApplied.push("structureBias.record→0.5/0.3/0.2 (no explicit shares or conditioning/strength emphasis)");
  }
  const cn = eng.compositionNudge;
  if (cn == null) {
    defaultsApplied.push("compositionNudge→all 1 (block extra scale, picker mult, main strength mult)");
  } else {
    if (cn.conditioningBlockExtraScale == null) defaultsApplied.push("compositionNudge.conditioningBlockExtraScale→1");
    if (cn.conditioningPickerMinutesMultiplier == null) defaultsApplied.push("compositionNudge.conditioningPickerMinutesMultiplier→1");
    if (cn.mainStrengthPatternScoreMultiplier == null) defaultsApplied.push("compositionNudge.mainStrengthPatternScoreMultiplier→1");
  }

  const energySystemBias = {
    conditioningMinutesScale: eng.energySystemBias.conditioningMinutesScale ?? 1,
    favorStimulusTags: eng.energySystemBias.favorStimulusTags ?? [],
  };

  const profile: NormalizedSportProfile = {
    sportSlug: def.slug,
    displayName: def.displayName,
    weightedMovementPatterns,
    requiredTagBoosts: eng.requiredTagBoosts ?? [],
    bannedTagSlugs: [...(eng.hardBannedTagSlugs ?? [])],
    softBannedTagSlugs: [...(eng.softBannedTagSlugs ?? [])],
    hardBanPredicates: resolveBanPredicateKeys(eng.hardBanPredicateKeys),
    softBanPredicates: resolveBanPredicateKeys(eng.softBanPredicateKeys),
    energySystemBias,
    structureBias: structureMeta.record,
    topPatterns,
    secondaryPatterns,
    climbingStyleDomainGate: eng.compositionNudge?.climbingStyleDomainGate === true,
    scoringPenaltyKeys: [...(eng.scoringPenaltyKeys ?? [])],
    compositionNudge: {
      conditioningBlockExtraScale: eng.compositionNudge?.conditioningBlockExtraScale ?? 1,
      conditioningPickerMinutesMultiplier: eng.compositionNudge?.conditioningPickerMinutesMultiplier ?? 1,
      mainStrengthPatternScoreMultiplier:
        eng.compositionNudge?.mainStrengthPatternScoreMultiplier ?? 1,
    },
    lowerBodyBias: eng.structureBias.lowerBodyBias,
    upperBodyBias: eng.structureBias.upperBodyBias,
    fullBodyBias: eng.structureBias.fullBodyBias,
    structureEmphasis: eng.structureBias.emphasis,
  };

  return { ok: true, profile, warnings, fieldsUsed, defaultsApplied };
}
