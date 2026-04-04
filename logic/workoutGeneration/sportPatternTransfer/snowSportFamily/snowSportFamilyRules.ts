/**
 * Mountain snow family: slot rules, quality ladder anchors, minimum coverage — per SnowSportKind.
 */

import type { Exercise } from "../../types";
import type { SportCoverageContext } from "../types";
import type { SportPatternSlotRule } from "../../sportPattern/framework/types";
import {
  exerciseMatchesAnySnowSportCategory,
  getSnowSportPatternCategoriesForExercise,
  isSnowSportConditioningExercise,
} from "./snowSportExerciseCategories";
import type { SnowSportKind, SnowSportPatternCategory } from "./snowSportTypes";

/** Shared “noise” categories across snow sports (alpine baseline). */
export const SNOW_SHARED_DEPRIORITIZED: readonly SnowSportPatternCategory[] = [
  "running_gait_identity",
  "low_transfer_sagittal_only",
  "unrelated_upper_body_dominant",
  "overly_complex_skill_lift",
];

export const SNOW_DESCENT_MAIN_GATE: readonly SnowSportPatternCategory[] = [
  "eccentric_braking_control",
  "lateral_frontal_plane_stability",
  "quad_dominant_endurance",
  "sustained_tension_lower_body",
  "landing_deceleration_support",
];

export const SNOW_ECCENTRIC_OR_DECEL: readonly SnowSportPatternCategory[] = [
  "eccentric_braking_control",
  "landing_deceleration_support",
];

export const SNOW_ECCENTRIC_CONTROL_FAMILY: readonly SnowSportPatternCategory[] = [
  "eccentric_braking_control",
  "sustained_tension_lower_body",
  "landing_deceleration_support",
];

export const SNOW_LATERAL_TRUNK: readonly SnowSportPatternCategory[] = [
  "lateral_frontal_plane_stability",
  "trunk_bracing_dynamic",
];

export const SNOW_QUAD_SUSTAINED: readonly SnowSportPatternCategory[] = [
  "quad_dominant_endurance",
  "sustained_tension_lower_body",
];

export const SNOW_QUALITY_LADDER_MIN_SCORE = 0.35;

function collectCategoriesForIds(ids: string[], exerciseById: Map<string, Exercise>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const c of getSnowSportPatternCategoriesForExercise(ex)) out.add(c);
  }
  return out;
}

function sessionHasAnyCategory(
  ids: string[],
  exerciseById: Map<string, Exercise>,
  cats: readonly string[]
): boolean {
  const set = collectCategoriesForIds(ids, exerciseById);
  return cats.some((c) => set.has(c));
}

export function getSnowQualityLadderAnchors(kind: SnowSportKind): readonly SnowSportPatternCategory[] {
  const base = new Set<string>([
    ...SNOW_DESCENT_MAIN_GATE,
    "hip_knee_control",
    "trunk_bracing_dynamic",
    "ski_conditioning",
  ]);
  if (kind === "snowboarding") {
    base.add("snowboard_asymmetric_stance");
  }
  if (kind === "backcountry_skiing") {
    base.add("uphill_skin_travel_endurance");
    base.add("locomotion_hiking_trail_identity");
  }
  if (kind === "xc_skiing") {
    base.add("nordic_poling_pull_endurance");
  }
  return [...base] as SnowSportPatternCategory[];
}

export function getSnowSportDeprioritized(kind: SnowSportKind): readonly SnowSportPatternCategory[] {
  if (kind === "backcountry_skiing") {
    return SNOW_SHARED_DEPRIORITIZED;
  }
  return [
    "locomotion_hiking_trail_identity",
    ...SNOW_SHARED_DEPRIORITIZED,
  ] as const;
}

export function getSnowSportSelectionRules(kind: SnowSportKind): {
  allowedConditioningEquipmentOrIdSubstrings: readonly string[];
  slots: readonly SportPatternSlotRule[];
} {
  const dep = getSnowSportDeprioritized(kind);

  if (kind === "alpine_skiing") {
    return {
      allowedConditioningEquipmentOrIdSubstrings: [
        "interval",
        "hiit",
        "tabata",
        "emom",
        "amrap",
        "assault",
        "bike",
        "row",
        "ski_erg",
        "sled",
        "battle_rope",
        "conditioning",
        "metcon",
        "round",
        "repeat",
      ],
      slots: [
        {
          slotRuleId: "alpine_main_strength",
          blockTypes: ["main_strength", "main_hypertrophy"],
          gateMatchAnyOf: [...SNOW_DESCENT_MAIN_GATE],
          preferMatchAnyOf: [
            "eccentric_braking_control",
            "lateral_frontal_plane_stability",
            "landing_deceleration_support",
            "sustained_tension_lower_body",
            "quad_dominant_endurance",
            "hip_knee_control",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "alpine_accessory",
          blockTypes: ["accessory"],
          gateMatchAnyOf: [
            "eccentric_braking_control",
            "lateral_frontal_plane_stability",
            "quad_dominant_endurance",
            "sustained_tension_lower_body",
            "hip_knee_control",
            "trunk_bracing_dynamic",
            "landing_deceleration_support",
          ],
          preferMatchAnyOf: [
            "lateral_frontal_plane_stability",
            "trunk_bracing_dynamic",
            "eccentric_braking_control",
            "hip_knee_control",
            "quad_dominant_endurance",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "alpine_conditioning",
          blockTypes: ["conditioning"],
          gateMatchAnyOf: ["ski_conditioning"],
          preferMatchAnyOf: ["ski_conditioning", "quad_dominant_endurance", "lateral_frontal_plane_stability"],
          deprioritizeMatchAnyOf: ["running_gait_identity", "locomotion_hiking_trail_identity", "low_transfer_sagittal_only"],
        },
      ],
    };
  }

  if (kind === "snowboarding") {
    const mainGate: SnowSportPatternCategory[] = [
      ...SNOW_DESCENT_MAIN_GATE,
      "snowboard_asymmetric_stance",
    ];
    return {
      allowedConditioningEquipmentOrIdSubstrings: [
        "interval",
        "hiit",
        "tabata",
        "emom",
        "amrap",
        "assault",
        "bike",
        "row",
        "ski_erg",
        "sled",
        "battle_rope",
        "conditioning",
        "metcon",
        "round",
        "repeat",
      ],
      slots: [
        {
          slotRuleId: "snowboard_main_strength",
          blockTypes: ["main_strength", "main_hypertrophy"],
          gateMatchAnyOf: [...mainGate],
          preferMatchAnyOf: [
            "lateral_frontal_plane_stability",
            "snowboard_asymmetric_stance",
            "trunk_bracing_dynamic",
            "eccentric_braking_control",
            "landing_deceleration_support",
            "hip_knee_control",
            "quad_dominant_endurance",
            "sustained_tension_lower_body",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "snowboard_accessory",
          blockTypes: ["accessory"],
          gateMatchAnyOf: [
            "eccentric_braking_control",
            "lateral_frontal_plane_stability",
            "quad_dominant_endurance",
            "sustained_tension_lower_body",
            "hip_knee_control",
            "trunk_bracing_dynamic",
            "landing_deceleration_support",
            "snowboard_asymmetric_stance",
          ],
          preferMatchAnyOf: [
            "lateral_frontal_plane_stability",
            "snowboard_asymmetric_stance",
            "trunk_bracing_dynamic",
            "eccentric_braking_control",
            "hip_knee_control",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "snowboard_conditioning",
          blockTypes: ["conditioning"],
          gateMatchAnyOf: ["ski_conditioning"],
          preferMatchAnyOf: ["ski_conditioning", "lateral_frontal_plane_stability", "quad_dominant_endurance"],
          deprioritizeMatchAnyOf: ["running_gait_identity", "locomotion_hiking_trail_identity", "low_transfer_sagittal_only"],
        },
      ],
    };
  }

  if (kind === "backcountry_skiing") {
    const mainGate: SnowSportPatternCategory[] = [
      ...SNOW_DESCENT_MAIN_GATE,
      "uphill_skin_travel_endurance",
      "locomotion_hiking_trail_identity",
    ];
    return {
      allowedConditioningEquipmentOrIdSubstrings: [
        "interval",
        "hiit",
        "tabata",
        "emom",
        "amrap",
        "assault",
        "bike",
        "row",
        "ski_erg",
        "sled",
        "battle_rope",
        "conditioning",
        "metcon",
        "round",
        "repeat",
        "incline",
        "stair",
        "walk",
        "treadmill",
        "hill",
      ],
      slots: [
        {
          slotRuleId: "backcountry_main_strength",
          blockTypes: ["main_strength", "main_hypertrophy"],
          gateMatchAnyOf: [...mainGate],
          preferMatchAnyOf: [
            "eccentric_braking_control",
            "uphill_skin_travel_endurance",
            "sustained_tension_lower_body",
            "quad_dominant_endurance",
            "lateral_frontal_plane_stability",
            "landing_deceleration_support",
            "hip_knee_control",
            "locomotion_hiking_trail_identity",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "backcountry_accessory",
          blockTypes: ["accessory"],
          gateMatchAnyOf: [
            "eccentric_braking_control",
            "lateral_frontal_plane_stability",
            "quad_dominant_endurance",
            "sustained_tension_lower_body",
            "hip_knee_control",
            "trunk_bracing_dynamic",
            "landing_deceleration_support",
            "uphill_skin_travel_endurance",
            "locomotion_hiking_trail_identity",
          ],
          preferMatchAnyOf: [
            "uphill_skin_travel_endurance",
            "eccentric_braking_control",
            "lateral_frontal_plane_stability",
            "trunk_bracing_dynamic",
            "quad_dominant_endurance",
          ],
          deprioritizeMatchAnyOf: [...dep],
        },
        {
          slotRuleId: "backcountry_conditioning",
          blockTypes: ["conditioning"],
          gateMatchAnyOf: ["ski_conditioning", "uphill_skin_travel_endurance", "locomotion_hiking_trail_identity"],
          preferMatchAnyOf: [
            "ski_conditioning",
            "uphill_skin_travel_endurance",
            "quad_dominant_endurance",
            "sustained_tension_lower_body",
          ],
          deprioritizeMatchAnyOf: ["running_gait_identity", "low_transfer_sagittal_only"],
        },
      ],
    };
  }

  /* xc_skiing */
  const xcMainGate: SnowSportPatternCategory[] = [
    "nordic_poling_pull_endurance",
    "quad_dominant_endurance",
    "sustained_tension_lower_body",
    "hip_knee_control",
    "eccentric_braking_control",
    "lateral_frontal_plane_stability",
  ];
  return {
    allowedConditioningEquipmentOrIdSubstrings: [
      "interval",
      "row",
      "ski_erg",
      "bike",
      "run",
      "erg",
      "assault",
      "conditioning",
      "tempo",
      "threshold",
    ],
    slots: [
      {
        slotRuleId: "xc_main_strength",
        blockTypes: ["main_strength", "main_hypertrophy"],
        gateMatchAnyOf: [...xcMainGate],
        preferMatchAnyOf: [
          "nordic_poling_pull_endurance",
          "quad_dominant_endurance",
          "sustained_tension_lower_body",
          "hip_knee_control",
          "trunk_bracing_dynamic",
        ],
        deprioritizeMatchAnyOf: [...dep],
      },
      {
        slotRuleId: "xc_accessory",
        blockTypes: ["accessory"],
        gateMatchAnyOf: [
          "nordic_poling_pull_endurance",
          "quad_dominant_endurance",
          "sustained_tension_lower_body",
          "hip_knee_control",
          "trunk_bracing_dynamic",
          "eccentric_braking_control",
          "lateral_frontal_plane_stability",
        ],
        preferMatchAnyOf: [
          "nordic_poling_pull_endurance",
          "trunk_bracing_dynamic",
          "hip_knee_control",
          "quad_dominant_endurance",
        ],
        deprioritizeMatchAnyOf: [...dep],
      },
      {
        slotRuleId: "xc_conditioning",
        blockTypes: ["conditioning"],
        gateMatchAnyOf: ["ski_conditioning", "running_gait_identity"],
        preferMatchAnyOf: ["ski_conditioning", "running_gait_identity", "quad_dominant_endurance"],
        deprioritizeMatchAnyOf: ["locomotion_hiking_trail_identity", "low_transfer_sagittal_only"],
      },
    ],
  };
}

export type SnowMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

function conditioningRelevant(ex: Exercise | undefined, kind: SnowSportKind): boolean {
  if (!ex) return false;
  return isSnowSportConditioningExercise(ex, kind);
}

function snowCoverageRuleId(kind: SnowSportKind, suffix: string): string {
  if (kind === "alpine_skiing") return `alpine_${suffix}`;
  return `${kind}_${suffix}`;
}

export function getSnowMinimumCoverageRules(kind: SnowSportKind): readonly SnowMinimumCoverageRule[] {
  const rules: SnowMinimumCoverageRule[] = [];

  if (kind !== "xc_skiing") {
    rules.push({
      id: snowCoverageRuleId(kind, "main_eccentric_or_deceleration"),
      description:
        kind === "backcountry_skiing"
          ? "At least one main movement must include eccentric braking or landing/deceleration (downhill transfer)."
          : "At least one main movement must include eccentric braking or landing/deceleration support.",
      applies: (ctx) => ctx.hasMainStrengthBlock,
      scanBlockTypes: ["main_strength", "main_hypertrophy"],
      mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SNOW_ECCENTRIC_OR_DECEL),
    });
  } else {
    rules.push({
      id: snowCoverageRuleId(kind, "main_engine_anchor"),
      description:
        "At least one main movement should express Nordic poling/pull endurance or leg-drive endurance (XC engine).",
      applies: (ctx) => ctx.hasMainStrengthBlock,
      scanBlockTypes: ["main_strength", "main_hypertrophy"],
      mustSatisfy: (ids, byId) =>
        sessionHasAnyCategory(ids, byId, [
          "nordic_poling_pull_endurance",
          "quad_dominant_endurance",
          "sustained_tension_lower_body",
          "eccentric_braking_control",
        ]),
    });
  }

  if (kind !== "xc_skiing") {
    rules.push({
      id: snowCoverageRuleId(kind, "eccentric_control_presence"),
      description:
        "Include at least one eccentric braking, sustained tension, or landing/deceleration pattern (snow control).",
      applies: (ctx) => ctx.hasMainStrengthBlock,
      scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory"],
      mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SNOW_ECCENTRIC_CONTROL_FAMILY),
    });
  } else {
    rules.push({
      id: snowCoverageRuleId(kind, "endurance_or_trunk_presence"),
      description: "Include Nordic pull, sustained leg tension, or dynamic trunk bracing somewhere in strength work.",
      applies: (ctx) => ctx.hasMainStrengthBlock,
      scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory"],
      mustSatisfy: (ids, byId) =>
        sessionHasAnyCategory(ids, byId, [
          "nordic_poling_pull_endurance",
          "sustained_tension_lower_body",
          "quad_dominant_endurance",
          "trunk_bracing_dynamic",
        ]),
    });
  }

  rules.push({
    id: snowCoverageRuleId(kind, "lateral_or_trunk_stability"),
    description:
      "With 2+ training blocks, include lateral/frontal stability or dynamic trunk bracing (anti-rotation).",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "conditioning"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SNOW_LATERAL_TRUNK),
  });

  rules.push({
    id: snowCoverageRuleId(kind, "lower_body_tension_endurance"),
    description:
      "Include at least one sustained-tension or quad-endurance movement to support on-snow leg demands.",
    applies: (ctx) => ctx.hasMainStrengthBlock || ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SNOW_QUAD_SUSTAINED),
  });

  rules.push({
    id: snowCoverageRuleId(kind, "conditioning_relevance"),
    description: "When conditioning is present, use a modality aligned to this snow sport (family policy).",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) => ids.some((id) => conditioningRelevant(byId.get(id), kind)),
  });

  if (kind === "backcountry_skiing") {
    rules.push({
      id: "backcountry_uphill_engine_touch",
      description: "With 2+ training blocks, include an uphill/skin or loaded-step locomotion signal (ascent transfer).",
      applies: (ctx) => ctx.trainingBlockCount >= 2,
      scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "conditioning"],
      mustSatisfy: (ids, byId) =>
        sessionHasAnyCategory(ids, byId, ["uphill_skin_travel_endurance", "locomotion_hiking_trail_identity"]),
    });
  }

  return rules;
}

export function evaluateSnowSportMinimumCoverage(
  kind: SnowSportKind,
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of getSnowMinimumCoverageRules(kind)) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((t) => blocksExerciseIdsByType.get(t) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}

export function getSnowSportSlotRuleForBlockType(
  blockType: string,
  kind: SnowSportKind
): SportPatternSlotRule | undefined {
  const { slots } = getSnowSportSelectionRules(kind);
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  return slots.find((s) => s.blockTypes.map((x) => x.toLowerCase().replace(/\s/g, "_")).includes(bt));
}
