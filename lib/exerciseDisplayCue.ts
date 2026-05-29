import type { WorkoutItem } from "./types";

/** Max sentences for in-app exercise help copy (catalog + display). */
export const MAX_EXERCISE_DESCRIPTION_SENTENCES = 4;

/** Soft cap per sentence when validating curated copy. */
export const MAX_EXERCISE_DESCRIPTION_SENTENCE_CHARS = 140;

/** Session prescription fallbacks — not exercise-specific setup copy. */
const GENERIC_PRESCRIPTION_COACHING_CUES = new Set([
  "Controlled, full range of motion. Breathe steadily.",
  "Controlled, full range of motion.",
  "Focus on form and control. Quality over weight.",
  "Controlled tempo. Own the joint position before adding load.",
  "Explosive intent. Quality over volume.",
  "Steady effort. Keep heart rate in target zone.",
  "Controlled tempo. Muscular balance.",
  "Heavy, controlled. Full lockout.",
  "Moderate load. Squeeze at peak contraction.",
  "Controlled tempo.",
  "Slow, controlled breathing.",
  "Mobility, breathing, stability. Light band work.",
]);

export function isGenericPrescriptionCoachingCue(text: string | null | undefined): boolean {
  const normalized = text?.trim();
  if (!normalized) return false;
  if (GENERIC_PRESCRIPTION_COACHING_CUES.has(normalized)) return true;
  return /^Controlled, full range of motion/i.test(normalized);
}

/**
 * User-facing line under an exercise row: curated description first, else session prescription cue.
 */
export function formatExerciseDisplayCue(item: WorkoutItem): string | null {
  const desc = item.exercise_description?.trim();
  if (desc && !isGeneratedExerciseDescriptionStub(desc)) return desc;
  const cues = item.coaching_cues?.trim();
  if (cues && !isGenericPrescriptionCoachingCue(cues)) return cues;
  return null;
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
