import { describe, it, expect, vi } from "vitest";
import { persistWithHandling } from "./persistWithHandling";

describe("persistWithHandling", () => {
  it("returns true when persistence succeeds", async () => {
    const action = vi.fn(async () => {});
    const rollback = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const ok = await persistWithHandling({
        operation: "test_success",
        action,
        rollback,
      });
      expect(ok).toBe(true);
      expect(action).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("logs context and runs rollback when persistence fails", async () => {
    const failure = new Error("persist failed");
    const action = vi.fn(async () => {
      throw failure;
    });
    const rollback = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const ok = await persistWithHandling({
        operation: "remove_saved_workout",
        action,
        rollback,
      });
      expect(ok).toBe(false);
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("[AppStatePersistenceError]", {
        operation: "remove_saved_workout",
        error: failure,
      });
    } finally {
      errorSpy.mockRestore();
    }
  });
});
