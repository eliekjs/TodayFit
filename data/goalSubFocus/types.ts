/**
 * Goal sub-focus: sub-goals under each primary focus (Manual mode) with slug + display name.
 * Used to derive SUB_FOCUS_BY_PRIMARY and to look up tag weights for exercise ranking.
 */

export type GoalSubFocusOption = {
  slug: string;
  name: string;
};

/** Per primary focus label: goal slug (for tag lookup) and sub-focus options. */
export type GoalSubFocusOptionsEntry = {
  goalSlug: string;
  subFocuses: GoalSubFocusOption[];
};

/** Mapping: "goal_slug:sub_focus_slug" → tag slugs + weights (for scoring). */
export type GoalSubFocusTagMapEntry = {
  tag_slug: string;
  weight?: number;
};

export type GoalSubFocusTagMap = Record<string, GoalSubFocusTagMapEntry[]>;

// ---------------------------------------------------------------------------
// Sub-focus architecture: intent vs overlay, conflict handling, resolver
// ---------------------------------------------------------------------------

/** Sub-focus class: intent = training intent (e.g. zone2, intervals, hills); overlay = body/session scope (e.g. upper, lower, core, full_body). */
export type SubFocusClass = "intent" | "overlay";

/** Per-goal config: which class each sub-focus slug belongs to. */
export type SubFocusClassMap = Record<string, SubFocusClass>;

/**
 * Conflict rule: sub-focuses in the same conflict group (within same class) are resolved by user rank.
 * First in user order gets highest weight; others get diminishing weights.
 */
export type SubFocusConflictGroup = string[];

/** Per-goal config: optional conflict groups per class. Slugs in a group are mutually competing; rank determines weights. */
export type SubFocusConflictConfig = {
  intent?: SubFocusConflictGroup[];
  overlay?: SubFocusConflictGroup[];
};

/**
 * Normalized profile produced by the sub-focus resolver.
 * Consumed by selection (filtering), scoring (tag weights), and templates (block/structure hints).
 */
export type SubFocusProfile = {
  /** Goal slug this profile is for. */
  goalSlug: string;
  /** Tag slugs that must be present (hard filter). Empty = no hard requirement. */
  requiredAttributes: string[];
  /** Tag slug → weight for preferred-attribute scoring. Merged from intent + overlay, rank-weighted. */
  preferredAttributes: Record<string, number>;
  /** Tag slugs to exclude from selection. */
  excludedAttributes: string[];
  /** Resolved overlay filter: e.g. "upper" | "lower" | "core" | "full_body" when overlay resolves to one; else undefined. */
  overlayFilter?: string;
  /** Hints for block/session template (e.g. "zone2_block", "hiit_intervals", "steady_state"). */
  templateHints: string[];
  /** Sub-focus slug → resolved weight (0–1). Used when looking up tag map so higher-rank sub-focuses contribute more. */
  resolvedWeights: Record<string, number>;
  /** Ordered list of sub-focus slugs that contributed (intent then overlay, each in user rank order). */
  effectiveSubFocusSlugs: string[];
};

/** Input to the shared sub-focus resolver. */
export type SubFocusResolverInput = {
  goalSlug: string;
  /** User-ranked sub-focus slugs (first = highest priority). */
  rankedSubFocusSlugs: string[];
  /** Optional explicit weights by rank (e.g. [0.5, 0.3, 0.2]). If not provided, derived from rank. */
  rankWeights?: number[];
  /** Optional user preferences that may influence resolution (e.g. prefer_full_body when multiple overlays). */
  preferences?: {
    preferFullBodyWhenMultipleOverlays?: boolean;
  };
};
