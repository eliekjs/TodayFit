import { describe, expect, it } from "vitest";
import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus";
import {
  clearBundledSportsCacheForTests,
  listBundledSportsForPrep,
} from "./localSportsCatalog";
import { isRemoteFetchError } from "./isRemoteFetchError";
import { isPlaceholderSupabaseConfig } from "./client";

describe("listBundledSportsForPrep", () => {
  it("maps canonical sport sub-focus data into Sport rows", () => {
    clearBundledSportsCacheForTests();
    const sports = listBundledSportsForPrep();
    expect(sports.length).toBe(SPORTS_WITH_SUB_FOCUSES.length);
    expect(sports[0]).toMatchObject({
      slug: SPORTS_WITH_SUB_FOCUSES[0].slug,
      name: SPORTS_WITH_SUB_FOCUSES[0].name,
      is_active: true,
    });
    expect(sports.every((s) => s.id.startsWith("bundled:"))).toBe(true);
  });
});

describe("isRemoteFetchError", () => {
  it("detects browser and RN network failures", () => {
    expect(isRemoteFetchError(new Error("Failed to fetch"))).toBe(true);
    expect(isRemoteFetchError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRemoteFetchError(new Error("Network request failed"))).toBe(true);
    expect(isRemoteFetchError(new Error("column popularity_tier does not exist"))).toBe(false);
  });
});

describe("isPlaceholderSupabaseConfig", () => {
  it("rejects copied example env values", () => {
    expect(
      isPlaceholderSupabaseConfig("https://your-project.supabase.co", "your-anon-key")
    ).toBe(true);
    expect(
      isPlaceholderSupabaseConfig("https://zwbrgxhehaufkypeiewh.supabase.co", "x".repeat(40))
    ).toBe(false);
  });
});
