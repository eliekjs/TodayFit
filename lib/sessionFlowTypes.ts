/** Goal day/week or sport day/week — one active session at a time. */
export type SessionFlow = "goal_day" | "goal_week" | "sport_day" | "sport_week";

export type SessionPhase = "setup" | "review" | "train";

export const SESSION_PHASES: { key: SessionPhase; label: string }[] = [
  { key: "setup", label: "Set up" },
  { key: "review", label: "Review" },
  { key: "train", label: "Train" },
];
