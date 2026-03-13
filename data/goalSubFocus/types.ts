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
