import { loadGeneratorModule } from "./loadGeneratorModule";

let prefetchPromise: Promise<void> | null = null;

export type PrefetchScheduleOptions = {
  /** Minimum wait before starting prefetch (ms). Use on tab shell so first paint stays fast. */
  delayMs?: number;
  /** When supported (web), defer until the browser is idle. */
  waitForIdle?: boolean;
};

/**
 * Loads only the generator JS bundle — not the exercise catalog (Supabase or static chunks).
 * Catalog loading stays on first Generate so initial web render stays lighter.
 * Safe to call multiple times; work runs once per app session unless the first attempt fails.
 */
export function prefetchWorkoutGenerationStack(): Promise<void> {
  if (!prefetchPromise) {
    prefetchPromise = loadGeneratorModule()
      .then(() => undefined)
      .catch(() => {
        prefetchPromise = null;
      });
  }
  return prefetchPromise;
}

/**
 * Schedules generator-bundle prefetch after optional delay / idle time.
 * Returns a cleanup function (for useEffect) that cancels the scheduled work.
 */
export function scheduleWorkoutGenerationPrefetch(
  options: PrefetchScheduleOptions = {}
): () => void {
  const { delayMs = 0, waitForIdle = false } = options;
  let cancelled = false;
  let idleCallbackId: number | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const run = () => {
    if (!cancelled) {
      void prefetchWorkoutGenerationStack();
    }
  };

  const startAfterDelay = () => {
    if (cancelled) return;
    if (delayMs > 0) {
      timeoutId = setTimeout(run, delayMs);
    } else {
      run();
    }
  };

  const requestIdle =
    typeof globalThis.requestIdleCallback === "function" ? globalThis.requestIdleCallback : null;

  if (waitForIdle && requestIdle) {
    idleCallbackId = requestIdle(startAfterDelay, { timeout: Math.max(delayMs + 2000, 3000) });
  } else if (delayMs > 0) {
    timeoutId = setTimeout(run, delayMs);
  } else {
    run();
  }

  return () => {
    cancelled = true;
    if (timeoutId != null) clearTimeout(timeoutId);
    if (idleCallbackId != null && typeof globalThis.cancelIdleCallback === "function") {
      globalThis.cancelIdleCallback(idleCallbackId);
    }
  };
}
