import { Platform } from "react-native";
import { loadGeneratorModule } from "./loadGeneratorModule";
import { isDbConfigured } from "./db/client";

export type PrefetchWorkoutGenerationOptions = {
  /**
   * Warm the merged exercise pool (Supabase catalog + static fallback).
   * Defaults to native-only: on web, the catalog is ~thousands of rows and dozens of
   * REST chunk requests — eager prefetch races first paint and freezes the main thread.
   */
  includeCatalog?: boolean;
  injurySlugs?: string[];
};

let modulePrefetchPromise: Promise<void> | null = null;
let catalogPrefetchPromise: Promise<void> | null = null;
let idleScheduled = false;
let pendingOptions: PrefetchWorkoutGenerationOptions = {};

function resolveIncludeCatalog(options: PrefetchWorkoutGenerationOptions): boolean {
  return options.includeCatalog ?? Platform.OS !== "web";
}

function runWhenIdle(task: () => void): void {
  const g = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof g.requestIdleCallback === "function") {
    g.requestIdleCallback(task, { timeout: Platform.OS === "web" ? 5000 : 2500 });
    return;
  }
  setTimeout(task, Platform.OS === "web" ? 1800 : 400);
}

async function warmGeneratorModule(): Promise<void> {
  if (!modulePrefetchPromise) {
    modulePrefetchPromise = (async () => {
      try {
        await loadGeneratorModule();
      } catch {
        modulePrefetchPromise = null;
      }
    })();
  }
  await modulePrefetchPromise;
}

async function warmExerciseCatalog(injurySlugs: string[]): Promise<void> {
  if (!isDbConfigured()) return;
  if (!catalogPrefetchPromise) {
    catalogPrefetchPromise = (async () => {
      try {
        const mod = await loadGeneratorModule();
        await mod.getExercisePoolForManualGeneration(injurySlugs);
      } catch {
        catalogPrefetchPromise = null;
      }
    })();
  }
  await catalogPrefetchPromise;
}

function flushPendingPrefetch(): void {
  idleScheduled = false;
  const options = pendingOptions;
  pendingOptions = {};
  const injurySlugs = options.injurySlugs ?? [];
  const includeCatalog = resolveIncludeCatalog(options);

  void (async () => {
    await warmGeneratorModule();
    if (includeCatalog) {
      await warmExerciseCatalog(injurySlugs);
    }
  })();
}

/**
 * Starts loading the generator bundle (and optionally the exercise catalog) before the user taps
 * Generate. Safe to call multiple times; work is coalesced and deferred until the browser/app is idle
 * so first paint / scroll stay responsive — especially on web.
 */
export function prefetchWorkoutGenerationStack(
  injurySlugsOrOptions: string[] | PrefetchWorkoutGenerationOptions = []
): Promise<void> {
  const options: PrefetchWorkoutGenerationOptions = Array.isArray(injurySlugsOrOptions)
    ? { injurySlugs: injurySlugsOrOptions }
    : injurySlugsOrOptions;

  // Prefer the strongest request seen before the idle flush (e.g. home then preferences).
  if (resolveIncludeCatalog(options)) {
    pendingOptions.includeCatalog = true;
  }
  if (options.injurySlugs != null) {
    pendingOptions.injurySlugs = options.injurySlugs;
  }

  if (!idleScheduled) {
    idleScheduled = true;
    runWhenIdle(flushPendingPrefetch);
  }

  return modulePrefetchPromise ?? Promise.resolve();
}
