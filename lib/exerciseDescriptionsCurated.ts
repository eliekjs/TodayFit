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

let bySlug: Map<string, CuratedExerciseDescriptionEntry> | null = null;
let loadPromise: Promise<Map<string, CuratedExerciseDescriptionEntry>> | null = null;

function buildSlugMap(file: CuratedExerciseDescriptionsFile): Map<string, CuratedExerciseDescriptionEntry> {
  return new Map(Object.entries(file.entries ?? {}));
}

/** Loads the curated JSON chunk on first use (separate Metro async bundle). */
export function ensureCuratedDescriptionsLoaded(): Promise<void> {
  if (bySlug) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = import("../data/exerciseDescriptions.curated.json").then((mod) => {
      bySlug = buildSlugMap(mod.default as CuratedExerciseDescriptionsFile);
      return bySlug;
    });
  }
  return loadPromise.then(() => undefined);
}

function requireSlugMap(): Map<string, CuratedExerciseDescriptionEntry> {
  if (!bySlug) {
    throw new Error(
      "Curated exercise descriptions not loaded. Call ensureCuratedDescriptionsLoaded() first."
    );
  }
  return bySlug;
}

/** Human-reviewed catalog copy keyed by exercise slug (repo source of truth for batch sync). */
export function getCuratedExerciseDescription(slug: string): string | undefined {
  const entry = bySlug?.get(slug);
  const d = entry?.description?.trim();
  return d || undefined;
}

export function getCuratedExerciseDescriptionEntry(
  slug: string
): CuratedExerciseDescriptionEntry | undefined {
  return bySlug?.get(slug);
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
  return [...requireSlugMap().keys()];
}

export function validateCuratedDescriptionsFile(
  knownSlugs?: Set<string>
): { ok: boolean; errors: string[] } {
  const map = requireSlugMap();
  const errors: string[] = [];
  for (const [slug, entry] of map) {
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
