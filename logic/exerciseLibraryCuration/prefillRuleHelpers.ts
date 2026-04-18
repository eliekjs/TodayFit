/**
 * Shared text, catalog context, and small utilities for deterministic prefill rules.
 */

import type { CatalogExerciseRow } from "./types";
import type { CurationEquipmentClass, CurationMovementPattern, CurationSportTransferTag } from "./enums";

export const DEFAULT_MIN_CONFIDENCE = 0.75;
export const DEFAULT_HIGH_CONFIDENCE = 0.88;

/** Normalize for substring / token matching (lowercase, collapse whitespace). */
export function normalizeText(s: string | null | undefined): string {
  if (s == null) return "";
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export type PrefillCatalogContext = {
  row: CatalogExerciseRow;
  norm_name: string;
  norm_description: string;
  combined_text: string;
  equipment_lower: string[];
  tags_lower: string[];
  modalities_lower: string[];
  muscles_lower: string[];
  legacy_movement_pattern: string | null;
  ontology_movement_patterns: string[];
  ontology_exercise_role: string | null;
  ontology_pairing_category: string | null;
  ontology_primary_movement_family: string | null;
  ontology_unilateral: boolean | null;
};

export function buildPrefillCatalogContext(row: CatalogExerciseRow): PrefillCatalogContext {
  const norm_name = normalizeText(row.name);
  const norm_description = normalizeText(row.description);
  const tags_lower = (row.tags ?? []).map((t) => normalizeText(t));
  const modalities_lower = (row.modalities ?? []).map((m) => normalizeText(m));
  const muscles_lower = [...(row.muscles ?? []), ...(row.primary_muscles ?? []), ...(row.secondary_muscles ?? [])].map(
    (m) => normalizeText(m)
  );
  const equipment_lower = (row.equipment ?? []).map((e) => normalizeText(e));
  const combined_text = [norm_name, norm_description, tags_lower.join(" "), modalities_lower.join(" ")]
    .filter(Boolean)
    .join(" ");

  const ont = row.ontology;
  return {
    row,
    norm_name,
    norm_description,
    combined_text,
    equipment_lower,
    tags_lower,
    modalities_lower,
    muscles_lower,
    legacy_movement_pattern: row.movement_pattern ? normalizeText(row.movement_pattern) : null,
    ontology_movement_patterns: (ont?.movement_patterns ?? []).map((p) => normalizeText(String(p))),
    ontology_exercise_role: ont?.exercise_role ? normalizeText(ont.exercise_role) : null,
    ontology_pairing_category: ont?.pairing_category ? normalizeText(ont.pairing_category) : null,
    ontology_primary_movement_family: ont?.primary_movement_family ? normalizeText(ont.primary_movement_family) : null,
    ontology_unilateral: typeof ont?.unilateral === "boolean" ? ont.unilateral : null,
  };
}

const CURATION_MOVEMENT_SET = new Set<string>([
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "rotation",
  "anti_rotation",
  "carry",
  "locomotion",
  "isometric",
]);

/**
 * Map ontology/engine movement_pattern slugs to curation movement patterns.
 * Ontology uses the same fine-grained set as MOVEMENT_PATTERNS where possible; some slugs need soft mapping.
 */
export function mapOntologySlugToCurationMovement(slug: string): CurationMovementPattern | null {
  const s = normalizeText(slug).replace(/\s/g, "_");
  if (CURATION_MOVEMENT_SET.has(s)) return s as CurationMovementPattern;
  if (s === "shoulder_stability") return "anti_rotation";
  if (s === "thoracic_mobility") return "rotation";
  return null;
}

/** Legacy generator movement_pattern (coarse) — used only as a weak hint with name. */
export function mapLegacyPatternHint(legacy: string | null): "squat" | "hinge" | "push" | "pull" | "carry" | "rotate" | "locomotion" | null {
  if (!legacy) return null;
  const s = legacy.replace(/\s/g, "_");
  if (s === "squat" || s === "hinge" || s === "push" || s === "pull" || s === "carry" || s === "rotate" || s === "locomotion") return s;
  return null;
}

export type EquipmentClassSignal = {
  equipment_class: CurationEquipmentClass;
  confidence: number;
  reason_code: string;
};

/** Slugs that support the main lift but are not themselves the primary implement (bench, fixed bar, etc.). */
function isSupportImplementSlug(normalizedSlug: string): boolean {
  const e = normalizedSlug.replace(/\s/g, "_");
  if (
    e === "bench" ||
    e.includes("pullup_bar") ||
    e.includes("dip_bar") ||
    e === "mat" ||
    e.includes("foam") ||
    e.includes("abmat") ||
    e === "wall"
  ) {
    return true;
  }
  return false;
}

type MainClass = CurationEquipmentClass;

function slugToMainClass(e: string): MainClass | null | "support" {
  const raw = e.replace(/\s/g, "_");
  if (isSupportImplementSlug(raw)) return "support";
  if (raw.includes("barbell") || raw === "ez_bar" || raw === "trap_bar") return "barbell";
  if (raw.includes("dumbbell")) return "dumbbell";
  if (raw.includes("kettlebell")) return "kettlebell";
  if (raw.includes("cable") || raw === "cable_machine") return "cable";
  if (
    raw.includes("treadmill") ||
    raw.includes("bike") ||
    raw.includes("rower") ||
    raw.includes("erg") ||
    raw.includes("stair") ||
    raw.includes("elliptical") ||
    raw === "ski_erg" ||
    raw === "assault_bike"
  ) {
    return "cardio_machine";
  }
  if (
    raw.includes("machine") ||
    raw.includes("leg_press") ||
    raw.includes("smith") ||
    raw.includes("hack_squat")
  ) {
    return "machine";
  }
  if (raw.includes("band") || raw === "bands") return "band";
  if (raw === "bodyweight" || raw.includes("bodyweight")) return "bodyweight";
  if (raw.includes("trx") || raw.includes("ring") || raw === "plyo_box" || raw.includes("sled")) return "specialty";
  return null;
}

function nameHintsMainClass(normName: string): MainClass | null {
  const n = normName;
  if (/\bbarbell\b/i.test(n)) return "barbell";
  if (/\bdumbbell\b/i.test(n) || /\bdb\b/i.test(n)) return "dumbbell";
  if (/\bkettlebell\b/i.test(n) || /\bkb\b/i.test(n)) return "kettlebell";
  if (/\bcable\b/i.test(n)) return "cable";
  if (/\btrx\b/i.test(n)) return "specialty";
  return null;
}

/**
 * Infer equipment class from structured equipment slugs + optional name tie-break.
 * Prefer a dominant implement when one main class + support-only slugs (e.g. dumbbells + bench).
 */
export function inferEquipmentClassFromSlugs(equipmentLower: string[], normName: string = ""): EquipmentClassSignal | null {
  if (!equipmentLower.length) return null;

  const tallies = new Map<MainClass, number>();
  for (const raw of equipmentLower) {
    const mc = slugToMainClass(raw);
    if (mc === "support" || mc === null) continue;
    tallies.set(mc, (tallies.get(mc) ?? 0) + 1);
  }

  if (tallies.size === 0) {
    const allSupport = equipmentLower.every((r) => slugToMainClass(r) === "support" || slugToMainClass(r) === null);
    if (allSupport) {
      return { equipment_class: "specialty", confidence: 0.78, reason_code: "equipment_support_only_slugs_fallback_specialty" };
    }
    return null;
  }

  if (tallies.size === 1) {
    const only = [...tallies.keys()][0]!;
    const hadSupport = equipmentLower.some((r) => slugToMainClass(r) === "support");
    const reason = hadSupport
      ? "equipment_dominant_single_main_with_support_slugs"
      : slugReasonForClass(only, equipmentLower);
    return {
      equipment_class: only,
      confidence: only === "cardio_machine" ? 0.94 : hadSupport ? 0.92 : 0.93,
      reason_code: reason,
    };
  }

  const sorted = [...tallies.entries()].sort((a, b) => b[1] - a[1]);
  const [topClass, topCount] = sorted[0]!;
  const second = sorted[1];
  const nameHint = nameHintsMainClass(normName);

  if (second && topCount === second[1]) {
    if (nameHint && (nameHint === topClass || nameHint === second[0])) {
      const picked = nameHint;
      return {
        equipment_class: picked,
        confidence: 0.88,
        reason_code: "equipment_dominant_name_tiebreak_equal_weight",
      };
    }
    return {
      equipment_class: "mixed",
      confidence: 0.81,
      reason_code: "equipment_true_mixed_two_mains_equal_weight",
    };
  }

  const ratio = topCount / (topCount + (second?.[1] ?? 0));
  if (ratio >= 0.65) {
    return {
      equipment_class: topClass,
      confidence: 0.89,
      reason_code: "equipment_dominant_weighted_majority",
    };
  }

  if (nameHint && tallies.has(nameHint)) {
    return {
      equipment_class: nameHint,
      confidence: 0.87,
      reason_code: "equipment_dominant_name_hint_multi_main",
    };
  }

  return {
    equipment_class: "mixed",
    confidence: 0.81,
    reason_code: "equipment_true_mixed_distinct_mains",
  };
}

function slugReasonForClass(c: MainClass, equipmentLower: string[]): string {
  for (const raw of equipmentLower) {
    const e = raw.replace(/\s/g, "_");
    const mc = slugToMainClass(raw);
    if (mc !== c) continue;
    if (e.includes("barbell") || e === "ez_bar" || e === "trap_bar") return "equipment_slug_barbell_family";
    if (e.includes("dumbbell")) return "equipment_slug_dumbbell";
    if (e.includes("kettlebell")) return "equipment_slug_kettlebell";
    if (e.includes("cable") || e === "cable_machine") return "equipment_slug_cable";
    if (
      e.includes("treadmill") ||
      e.includes("bike") ||
      e.includes("rower") ||
      e.includes("erg") ||
      e.includes("stair") ||
      e.includes("elliptical") ||
      e === "ski_erg" ||
      e === "assault_bike"
    ) {
      return "equipment_slug_cardio_machine";
    }
    if (e.includes("machine") || e.includes("leg_press") || e.includes("smith")) return "equipment_slug_machine_family";
    if (e.includes("band") || e === "bands") return "equipment_slug_band";
    if (e === "bodyweight" || e.includes("bodyweight")) return "equipment_slug_bodyweight";
    if (e.includes("trx") || e.includes("ring") || e === "plyo_box" || e.includes("sled")) return "equipment_slug_specialty";
  }
  return "equipment_single_class";
}

export function inferEquipmentClassFromNameFallback(normName: string): EquipmentClassSignal | null {
  const n = normName;
  if (/\bkb\b/i.test(n) && /kettlebell/i.test(n)) return null;
  if (/\bbarbell\b/i.test(n)) return { equipment_class: "barbell", confidence: 0.86, reason_code: "name_contains_barbell" };
  if (/\bdumbbell\b/i.test(n) || /\bdb\b/i.test(n)) return { equipment_class: "dumbbell", confidence: 0.86, reason_code: "name_contains_dumbbell" };
  if (/\bkettlebell\b/i.test(n) || /\bkb\b/i.test(n)) return { equipment_class: "kettlebell", confidence: 0.85, reason_code: "name_contains_kettlebell" };
  if (/\bcable\b/i.test(n)) return { equipment_class: "cable", confidence: 0.84, reason_code: "name_contains_cable" };
  if (/\btrx\b/i.test(n)) return { equipment_class: "specialty", confidence: 0.8, reason_code: "name_contains_trx" };
  return null;
}

const SPORT_TAG_KEYWORDS: { tag: CurationSportTransferTag; patterns: RegExp[]; tag_slugs: string[]; reason: string }[] = [
  {
    tag: "climbing",
    patterns: [/\bclimb/i, /\bboulder/i, /\bhangboard/i, /\bcampus\b/i],
    tag_slugs: ["climbing", "rock_climbing", "bouldering"],
    reason: "sport_signal_climbing",
  },
  {
    tag: "skiing",
    patterns: [/\bski\b/i, /\bskiing/i, /\balpine\b/i, /\bskier\b/i],
    tag_slugs: ["skiing", "alpine_skiing", "snow_sport"],
    reason: "sport_signal_skiing",
  },
  {
    tag: "running",
    patterns: [/\brunning\b/i, /\bjog/i, /\bmarathon/i, /\b5k\b/i, /\b10k\b/i],
    tag_slugs: ["running", "trail_running", "track"],
    reason: "sport_signal_running",
  },
  {
    tag: "rehab_friendly",
    patterns: [/\brehab\b/i, /\bprehab\b/i, /\bphysio/i, /\brotator cuff/i, /\bankle mobility/i],
    tag_slugs: ["rehab", "prehab", "mobility", "activation"],
    reason: "sport_signal_rehab",
  },
];

export function inferSportTransferTags(ctx: PrefillCatalogContext): CurationSportTransferTag[] {
  const out = new Set<CurationSportTransferTag>();
  const text = `${ctx.norm_name} ${ctx.norm_description} ${ctx.tags_lower.join(" ")}`;

  for (const row of SPORT_TAG_KEYWORDS) {
    if (row.patterns.some((re) => re.test(text))) {
      out.add(row.tag);
      continue;
    }
    for (const slug of row.tag_slugs) {
      if (ctx.tags_lower.some((t) => t === slug || t.includes(slug))) {
        out.add(row.tag);
        break;
      }
    }
  }

  const generalSignals =
    ctx.tags_lower.some((t) => t === "general_athletic" || t === "athletic_performance") ||
    /\bathletic performance\b/i.test(text);
  if (generalSignals) out.add("general_athletic");

  return [...out].sort();
}
