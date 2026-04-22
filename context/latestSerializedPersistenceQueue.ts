type PersistLatestFn<T> = (value: T) => Promise<unknown>;

type LatestSerializedPersistenceQueue<T> = {
  enqueue: (value: T) => void;
};

/**
 * Keeps at most one persistence call in-flight and coalesces queued writes
 * down to the latest value observed while that call is running.
 */
export function createLatestSerializedPersistenceQueue<T>(
  persistLatest: PersistLatestFn<T>
): LatestSerializedPersistenceQueue<T> {
  let inFlight = false;
  let queued: T | null = null;

  const flush = () => {
    if (inFlight || queued == null) return;
    const next = queued;
    queued = null;
    inFlight = true;
    Promise.resolve(persistLatest(next))
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
        flush();
      });
  };

  return {
    enqueue(value: T) {
      queued = value;
      flush();
    },
  };
}
