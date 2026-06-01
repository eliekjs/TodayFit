import { loadGeneratorModule } from "./loadGeneratorModule";
import { isDbConfigured } from "./db/client";

let prefetchPromise: Promise<void> | null = null;

/**
 * Starts loading the generator bundle (and optionally the exercise catalog) before the user taps
 * Generate. Safe to call multiple times; work runs once per app session unless the first attempt fails.
 */
export function prefetchWorkoutGenerationStack(injurySlugs: string[] = []): Promise<void> {
  if (!prefetchPromise) {
    prefetchPromise = (async () => {
      try {
        const mod = await loadGeneratorModule();
        if (isDbConfigured()) {
          void mod.getExercisePoolForManualGeneration(injurySlugs).catch(() => {});
        }
      } catch {
        prefetchPromise = null;
      }
    })();
  }
  return prefetchPromise;
}
