import { describe, expect, it, vi } from "vitest";
import { createLatestSerializedPersistenceQueue } from "./latestSerializedPersistenceQueue";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("createLatestSerializedPersistenceQueue", () => {
  it("serializes writes and coalesces queued values to latest", async () => {
    const first = createDeferred<void>();
    const persist = vi
      .fn<(value: string) => Promise<unknown>>()
      .mockImplementationOnce(async () => first.promise)
      .mockResolvedValue(undefined);
    const queue = createLatestSerializedPersistenceQueue(persist);

    queue.enqueue("A");
    queue.enqueue("B");
    queue.enqueue("C");

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenNthCalledWith(1, "A");

    first.resolve();
    await first.promise;
    await flushMicrotasks();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(2, "C");
  });

  it("continues with latest queued value after a failed write", async () => {
    const first = createDeferred<void>();
    const persist = vi
      .fn<(value: string) => Promise<unknown>>()
      .mockImplementationOnce(async () => first.promise)
      .mockResolvedValue(undefined);
    const queue = createLatestSerializedPersistenceQueue(persist);

    queue.enqueue("A");
    queue.enqueue("B");

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenNthCalledWith(1, "A");

    first.reject(new Error("boom"));
    await first.promise.catch(() => {});
    await flushMicrotasks();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenNthCalledWith(2, "B");
  });
});
