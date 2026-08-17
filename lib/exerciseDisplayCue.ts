import type { WorkoutItem } from "./types";
import { listGoalPrescriptionCoachingCues } from "./generation/prescriptionRules";
import { BODY_RECOMP_CUES } from "./workoutRules";

/** Max sentences for in-app exercise help copy (catalog + display). */
export const MAX_EXERCISE_DESCRIPTION_SENTENCES = 4;

/** Soft cap per sentence when validating curated copy. */
export const MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS = 140;

/** Session prescription fallbacks — not exercise-specific setup copy. */
const GENERIC_PRESCRIPTION_COACHING_CUES = new Set([
  ...listGoalPrescriptionCoachingCues(),
  BODY_RECOMP_CUES.strength,
  BODY_RECOMP_CUES.cardio,
  "Controlled, full range of motion. Breathe steadily.",
  "Controlled, full range of motion.",
  "Focus on form and control. Quality over weight.",
  "Controlled tempo. Own the joint position before adding load.",
  "Explosive intent. Quality over volume.",
  "Steady effort. Keep heart rate in target zone.",
  "Controlled tempo. Muscular balance.",
  /** Legacy wording; keep so older sessions still hide this cue. */
  "Heavy, controlled. Full lockout.",
  "Heavy load, controlled tempo. Full lockout.",
  "Moderate load. Squeeze at peak contraction.",
  "Moderate load. Controlled tempo.",
  "Controlled tempo.",
  "Slow, controlled breathing.",
  "Mobility, breathing, stability. Light band work.",
  "Explosive, controlled.",
  "High intensity. Rest 45 s between rounds.",
  "Short interval rounds with recovery between efforts.",
]);

export function isGenericPrescriptionCoachingCue(text: string | null | undefined): boolean {
  const normalized = text?.trim();
  if (!normalized) return false;
  if (GENERIC_PRESCRIPTION_COACHING_CUES.has(normalized)) return true;
  if (/^Controlled, full range of motion/i.test(normalized)) return true;
  // Zone-2 / steady cardio cues often append HR guidance to a base prescription line.
  if (/^Steady(?:, lower-intensity)? effort\b/i.test(normalized)) return true;
  if (/^Lower intensity\. Focus on time under tension/i.test(normalized)) return true;
  return false;
}

/**
 * User-facing setup help: catalog description first, else a non-generic prescription cue.
 * Callers that have curated copy should set `item.exercise_description` (or pass it via
 * {@link withResolvedExerciseDescription}) before calling this.
 */
export function formatExerciseDisplayCue(item: WorkoutItem): string | null {
  const desc = item.exercise_description?.trim();
  if (desc && !isGeneratedExerciseDescriptionStub(desc)) return desc;
  const cues = item.coaching_cues?.trim();
  if (cues && !isGenericPrescriptionCoachingCue(cues)) return cues;
  return null;
}

/** Last-resort setup copy so every exercise can show a Setup card. */
export function fallbackExerciseSetupDescription(exerciseName: string): string {
  const name = exerciseName.trim() || "this exercise";
  return `Set up for ${name} with a stable base and the equipment this movement uses. Move through each phase with control and a braced core. Keep form strict and reduce load or range if balance or control breaks down.`;
}

/** True when text is the vague last-resort Setup modal template (not exercise-specific coaching). */
export function isVagueExerciseSetupFallback(text: string | null | undefined): boolean {
  const normalized = text?.trim();
  if (!normalized) return false;
  return (
    /Set up for .+ with a stable base and the equipment this movement uses/i.test(normalized) &&
    /Move through each phase with control and a braced core/i.test(normalized)
  );
}

/**
 * Setup modal text for any workout item. Prefers curated/catalog copy, never generic
 * prescription cues, then a name-specific fallback so the Setup button can always show.
 */
export function resolveExerciseSetupText(item: WorkoutItem): string {
  return formatExerciseDisplayCue(item) ?? fallbackExerciseSetupDescription(item.exercise_name);
}

/** Prefer item description, then curated slug copy (when loaded). */
export function withResolvedExerciseDescription(
  item: WorkoutItem,
  curatedLookup: (slug: string) => string | undefined
): WorkoutItem {
  const existing = item.exercise_description?.trim();
  if (existing && !isGeneratedExerciseDescriptionStub(existing)) return item;
  const curated = curatedLookup(item.exercise_id)?.trim();
  if (!curated) return item;
  return { ...item, exercise_description: curated };
}

/** Old DB backfills used terse, machine-generated stubs that are not useful as coaching copy. */
export function isGeneratedExerciseDescriptionStub(text: string | null | undefined): boolean {
  const normalized = text?.trim();
  if (!normalized) return false;
  return (
    /\bis an? [^.]+ exercise\./i.test(normalized) &&
    /\b(?:primarily )?targets\b/i.test(normalized) &&
    /\bequipment\s*:/i.test(normalized)
  );
}

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0).length;
}

export function validateExerciseDescriptionCopy(text: string): string[] {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    errors.push("description is empty");
    return errors;
  }
  if (isGeneratedExerciseDescriptionStub(trimmed)) {
    errors.push("description looks like generated stub copy");
  }
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length < 2) {
    errors.push(`too few sentences (${sentences.length} < 2)`);
  }
  if (sentences.length > MAX_EXERCISE_DESCRIPTION_SENTENCES) {
    errors.push(`too many sentences (${sentences.length} > ${MAX_EXERCISE_DESCRIPTION_SENTENCES})`);
  }
  for (const s of sentences) {
    if (s.length > MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS) {
      errors.push(`sentence too long (${s.length} chars)`);
      break;
    }
  }
  return errors;
}
