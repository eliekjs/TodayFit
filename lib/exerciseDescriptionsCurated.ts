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

export function isCuratedDescriptionsFile(value: unknown): value is CuratedExerciseDescriptionsFile {
  if (!value || typeof value !== "object") return false;
  const entries = (value as { entries?: unknown }).entries;
  return typeof entries === "object" && entries != null && !Array.isArray(entries);
}

/**
 * Metro / Vite / web interop is inconsistent for JSON: `{ default: file }`, the file itself,
 * double-wrapped `default`, or (on web export) an asset URL string.
 */
export function unwrapCuratedDescriptionsSource(
  mod: unknown
): CuratedExerciseDescriptionsFile | string {
  let current: unknown = mod;
  for (let i = 0; i < 4; i++) {
    if (typeof current === "string" && current.trim()) return current.trim();
    if (isCuratedDescriptionsFile(current)) return current;
    if (current && typeof current === "object" && "default" in current) {
      current = (current as { default: unknown }).default;
      continue;
    }
    break;
  }
  throw new Error("Curated exercise descriptions module is not a valid catalog file.");
}

async function readCuratedDescriptionsFile(): Promise<CuratedExerciseDescriptionsFile> {
  const mod: unknown = await import("../data/exerciseDescriptions.curated.json");
  const unwrapped = unwrapCuratedDescriptionsSource(mod);
  if (typeof unwrapped === "string") {
    const res = await fetch(unwrapped);
    if (!res.ok) {
      throw new Error(`Failed to fetch curated exercise descriptions (${res.status})`);
    }
    const parsed = unwrapCuratedDescriptionsSource(await res.json());
    if (typeof parsed === "string" || !isCuratedDescriptionsFile(parsed)) {
      throw new Error("Curated exercise descriptions asset did not contain a catalog file.");
    }
    return parsed;
  }
  return unwrapped;
}

/** Loads the curated JSON chunk on first use (separate Metro async bundle). */
export function ensureCuratedDescriptionsLoaded(): Promise<void> {
  if (bySlug) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = readCuratedDescriptionsFile()
      .then((file) => {
        const map = buildSlugMap(file);
        if (map.size === 0) {
          throw new Error("Curated exercise descriptions loaded empty.");
        }
        bySlug = map;
        return bySlug;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
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

/**
 * DB and generator slugs sometimes differ by a trailing plural on the last token
 * (e.g. plank_shoulder_tap vs plank_shoulder_taps). Try both so setup copy still resolves.
 */
export function curatedSlugCandidates(slug: string): string[] {
  const normalized = slug.trim();
  if (!normalized) return [];
  const candidates = [normalized];
  const parts = normalized.split("_");
  const last = parts[parts.length - 1];
  if (!last || last.length < 3) return candidates;

  let altLast: string | null = null;
  if (last.endsWith("ies") && last.length > 4) {
    altLast = `${last.slice(0, -3)}y`;
  } else if (last.endsWith("y") && last.length > 3 && !/[aeiou]y$/i.test(last)) {
    altLast = `${last.slice(0, -1)}ies`;
  } else if (/(?:ches|shes|sses|xes|zes)$/i.test(last)) {
    altLast = last.replace(/es$/i, "");
  } else if (last.endsWith("s") && !last.endsWith("ss")) {
    altLast = last.slice(0, -1);
  } else {
    altLast = `${last}s`;
  }

  if (altLast && altLast !== last) {
    const alt = [...parts.slice(0, -1), altLast].join("_");
    if (!candidates.includes(alt)) candidates.push(alt);
  }
  return candidates;
}

function lookupCuratedEntry(slug: string): CuratedExerciseDescriptionEntry | undefined {
  if (!bySlug) return undefined;
  for (const candidate of curatedSlugCandidates(slug)) {
    const entry = bySlug.get(candidate);
    if (entry) return entry;
  }
  return undefined;
}

/** Human-reviewed catalog copy keyed by exercise slug (repo source of truth for batch sync). */
export function getCuratedExerciseDescription(slug: string): string | undefined {
  const d = lookupCuratedEntry(slug)?.description?.trim();
  return d || undefined;
}

export function getCuratedExerciseDescriptionEntry(
  slug: string
): CuratedExerciseDescriptionEntry | undefined {
  return lookupCuratedEntry(slug);
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
