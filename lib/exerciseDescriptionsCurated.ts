import curated from "../data/exerciseDescriptions.curated.json";
import {
  isGeneratedExerciseDescriptionStub,
  validateExerciseDescriptionCopy,
} from "./exerciseDisplayCue";

export type CuratedExerciseDescriptionEntry = {
  description: string;
  sources: string[];
  reviewed_at: string;
};

export type CuratedExerciseDescriptionsFile = {
  version: number;
  entries: Record<string, CuratedExerciseDescriptionEntry>;
};

const FILE = curated as CuratedExerciseDescriptionsFile;

const bySlug = new Map<string, CuratedExerciseDescriptionEntry>(
  Object.entries(FILE.entries ?? {})
);

/** Human-reviewed catalog copy keyed by exercise slug (repo source of truth for batch sync). */
export function getCuratedExerciseDescription(slug: string): string | undefined {
  const entry = bySlug.get(slug);
  const d = entry?.description?.trim();
  return d || undefined;
}

export function getCuratedExerciseDescriptionEntry(
  slug: string
): CuratedExerciseDescriptionEntry | undefined {
  return bySlug.get(slug);
}

export function resolveExerciseDescription(
  slug: string,
  catalogDescription?: string | null
): string | undefined {
  const curatedDesc = getCuratedExerciseDescription(slug);
  const catalogDesc = catalogDescription?.trim();
  if (curatedDesc && (!catalogDesc || isGeneratedExerciseDescriptionStub(catalogDesc))) {
    return curatedDesc;
  }
  return catalogDesc || curatedDesc;
}

export function listCuratedExerciseDescriptionSlugs(): string[] {
  return [...bySlug.keys()];
}

export function validateCuratedDescriptionsFile(
  knownSlugs?: Set<string>
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [slug, entry] of bySlug) {
    if (!entry.description?.trim()) {
      errors.push(`${slug}: missing description`);
      continue;
    }
    if (!entry.sources?.length || entry.sources.some((u) => !/^https?:\/\//i.test(u))) {
      errors.push(`${slug}: requires at least one http(s) source URL`);
    }
    if (!entry.reviewed_at?.trim()) {
      errors.push(`${slug}: missing reviewed_at`);
    }
    for (const msg of validateExerciseDescriptionCopy(entry.description)) {
      errors.push(`${slug}: ${msg}`);
    }
    if (knownSlugs && !knownSlugs.has(slug)) {
      errors.push(`${slug}: slug not in catalog`);
    }
  }
  return { ok: errors.length === 0, errors };
}
