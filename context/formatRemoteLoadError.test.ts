import { describe, it, expect } from "vitest";
import { formatRemoteLoadError } from "./formatRemoteLoadError";

describe("formatRemoteLoadError", () => {
  it("labels common network failures", () => {
    expect(formatRemoteLoadError(new Error("Network request failed"))).toContain("connection");
    expect(formatRemoteLoadError(new Error("Failed to fetch"))).toContain("connection");
    expect(formatRemoteLoadError(new Error("ETIMEDOUT"))).toContain("connection");
  });

  it("labels auth-ish failures", () => {
    expect(formatRemoteLoadError(new Error("JWT expired"))).toContain("signing out");
  });

  it("passes through other messages", () => {
    expect(formatRemoteLoadError(new Error("custom problem"))).toBe("custom problem");
  });

  it("falls back when empty", () => {
    expect(formatRemoteLoadError(new Error(""))).toContain("Couldn't load");
    expect(formatRemoteLoadError(null)).toContain("Couldn't load");
  });
});
