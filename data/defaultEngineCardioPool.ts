/**
 * Default (non-Creative) engine-cardio staples for Zone 2 and conditioning intervals.
 *
 * Keep this list small and boring: machines, run/sprint intervals, and a handful of
 * universal HIIT moves. Catalog aliases map onto these canonical ids so Zone 2 Rower
 * and Rower Steady still match `rower`. Elliptical is Zone 2 fallback only.
 *
 * Creative sessions skip this restrict and keep the wider catalog.
 */

export const DEFAULT_ZONE2_CARDIO_IDS = [
  "zone2_bike",
  "zone2_treadmill",
  "rower",
  "ski_erg",
  "treadmill_incline_walk",
  "stair_climber_repeats",
] as const;

/** Used only when no default Zone 2 staple remains after equipment / injury filters. */
export const DEFAULT_ZONE2_CARDIO_ALTERNATE_IDS = ["elliptical"] as const;

export const DEFAULT_CONDITIONING_INTERVAL_IDS = [
  "treadmill_sprint_intervals",
  "zone2_bike",
  "rower",
  "ski_erg",
  "burpee",
  "box_jump",
  "jump_rope",
  "mountain_climbers",
  "sled_push",
  "kb_swing",
] as const;

export const DEFAULT_HILLS_CARDIO_IDS = [
  "treadmill_hill_run",
  "treadmill_hill_sprints",
  "treadmill_incline_walk",
  "stair_climber_repeats",
  "sled_push",
] as const;

/** Threshold / tempo: simple machine cardio, not metcons or COD drills. */
export const DEFAULT_THRESHOLD_CARDIO_IDS = [
  "zone2_bike",
  "zone2_treadmill",
  "rower",
  "ski_erg",
  "treadmill_incline_walk",
  "stair_climber_repeats",
] as const;

const UNIQUE_STAPLES = [
  ...DEFAULT_ZONE2_CARDIO_IDS,
  ...DEFAULT_CONDITIONING_INTERVAL_IDS,
  ...DEFAULT_HILLS_CARDIO_IDS,
] as const;

/** Canonical default pool (≤20). Does not include elliptical or walking lunge. */
export const DEFAULT_ENGINE_CARDIO_STAPLE_IDS: readonly string[] = [
  ...new Set<string>(UNIQUE_STAPLES),
];

/**
 * Catalog variants that should count as the same staple.
 * Do not add COD / OTA drills or `ff_` creative variants here.
 */
export const DEFAULT_ENGINE_CARDIO_ID_ALIASES: Record<string, readonly string[]> = {
  zone2_bike: ["zone2_bike", "assault_bike_steady", "assault_bike_intervals"],
  zone2_treadmill: ["zone2_treadmill", "treadmill_run"],
  rower: ["rower", "zone2_rower", "rower_steady", "rower_threshold_intervals"],
  ski_erg: ["ski_erg", "ski_erg_steady", "ski_erg_threshold_intervals"],
  treadmill_incline_walk: ["treadmill_incline_walk"],
  stair_climber_repeats: ["stair_climber_repeats", "zone2_stair_climber", "stair_climber_steady"],
  elliptical: ["elliptical", "elliptical_steady"],
  treadmill_sprint_intervals: ["treadmill_sprint_intervals"],
  burpee: ["burpee"],
  box_jump: ["box_jump"],
  jump_rope: ["jump_rope"],
  mountain_climbers: ["mountain_climbers", "mountain_climber"],
  sled_push: ["sled_push"],
  kb_swing: ["kb_swing"],
  treadmill_hill_run: ["treadmill_hill_run"],
  treadmill_hill_sprints: ["treadmill_hill_sprints"],
};

export const ENGINE_CARDIO_DEFAULT_POOL_SLUGS = [
  "zone2_aerobic_base",
  "zone2_long_steady",
  "intervals_hiit",
  "intervals",
  "threshold_tempo",
  "hills",
  "durability",
] as const;

const ENGINE_CARDIO_DEFAULT_POOL_SLUG_SET = new Set<string>(ENGINE_CARDIO_DEFAULT_POOL_SLUGS);

/** Speed / power / COD intents keep the wider catalog (field drills, plyos). */
export const ENGINE_CARDIO_STAPLE_BYPASS_SLUGS = [
  "sprint",
  "repeat_sprint",
  "repeat_sprint_ability",
  "speed",
  "reactive_speed",
  "speed_power",
  "change_of_direction",
  "acceleration_power",
  "vertical_jump",
  "lower_body_power_plyos",
  "olympic_triple_extension",
  "upper_body_power",
] as const;

const ENGINE_CARDIO_STAPLE_BYPASS_SLUG_SET = new Set<string>(ENGINE_CARDIO_STAPLE_BYPASS_SLUGS);

export type DefaultEngineCardioFamily = "zone2" | "intervals" | "hills" | "threshold" | "generic";

function normId(id: string): string {
  return id.toLowerCase().replace(/[\s-]+/g, "_");
}

const ALIAS_TO_CANONICAL: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(DEFAULT_ENGINE_CARDIO_ID_ALIASES)) {
    map.set(normId(canonical), canonical);
    for (const alias of aliases) {
      map.set(normId(alias), canonical);
    }
  }
  return map;
})();

export function canonicalDefaultEngineCardioId(exerciseId: string): string | undefined {
  return ALIAS_TO_CANONICAL.get(normId(exerciseId));
}

export function isWalkingLungeCardioId(exerciseId: string): boolean {
  return normId(exerciseId).includes("walking_lunge");
}

function expandCanonicalIds(canonicalIds: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const canonical of canonicalIds) {
    out.add(normId(canonical));
    for (const alias of DEFAULT_ENGINE_CARDIO_ID_ALIASES[canonical] ?? [canonical]) {
      out.add(normId(alias));
    }
  }
  return out;
}

const ZONE2_ID_SET = expandCanonicalIds(DEFAULT_ZONE2_CARDIO_IDS);
const ZONE2_ALTERNATE_ID_SET = expandCanonicalIds(DEFAULT_ZONE2_CARDIO_ALTERNATE_IDS);
const INTERVAL_ID_SET = expandCanonicalIds(DEFAULT_CONDITIONING_INTERVAL_IDS);
const HILLS_ID_SET = expandCanonicalIds(DEFAULT_HILLS_CARDIO_IDS);
const THRESHOLD_ID_SET = expandCanonicalIds(DEFAULT_THRESHOLD_CARDIO_IDS);
const GENERIC_ID_SET = expandCanonicalIds(DEFAULT_ENGINE_CARDIO_STAPLE_IDS);

export function allowedIdsForDefaultEngineCardioFamily(
  family: DefaultEngineCardioFamily
): Set<string> {
  if (family === "zone2") return ZONE2_ID_SET;
  if (family === "intervals") return INTERVAL_ID_SET;
  if (family === "hills") return HILLS_ID_SET;
  if (family === "threshold") return THRESHOLD_ID_SET;
  return GENERIC_ID_SET;
}

export function exerciseIdInDefaultEngineCardioSet(
  exerciseId: string,
  allowed: Set<string>
): boolean {
  return allowed.has(normId(exerciseId));
}

export function isDefaultZone2AlternateId(exerciseId: string): boolean {
  return ZONE2_ALTERNATE_ID_SET.has(normId(exerciseId));
}

/**
 * Map ranked conditioning intent slugs to a staple family.
 * `null` = do not restrict (power / sprint / COD / unrelated).
 */
export function resolveDefaultEngineCardioFamily(
  intentSlugs: string[] | undefined
): DefaultEngineCardioFamily | null {
  if (!intentSlugs?.length) return "generic";
  const top = intentSlugs[0]!.toLowerCase().replace(/\s/g, "_");
  if (ENGINE_CARDIO_STAPLE_BYPASS_SLUG_SET.has(top)) return null;
  if (top === "zone2_aerobic_base" || top === "zone2_long_steady" || top === "durability") {
    return "zone2";
  }
  if (top === "intervals_hiit" || top === "intervals") return "intervals";
  if (top === "hills") return "hills";
  if (top === "threshold_tempo") return "threshold";
  if (ENGINE_CARDIO_DEFAULT_POOL_SLUG_SET.has(top)) return "generic";
  return null;
}
