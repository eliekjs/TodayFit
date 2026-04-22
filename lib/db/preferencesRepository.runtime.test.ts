import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
}));

vi.mock("./client", () => ({
  getSupabase: getSupabaseMock,
}));

import { getPreferences, listPresets } from "./preferencesRepository";

describe("preferencesRepository runtime normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes malformed preferences payloads in getPreferences", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        default_duration: "forty-five",
        default_energy: "extreme",
        preferences: {
          primaryFocus: "strength",
          injuries: ["knee", 10, "wrist"],
          targetBody: "Planet",
          includeCreativeVariations: "yes",
          goalMatchPrimaryPct: "50",
        },
      },
      error: null,
    });

    getSupabaseMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    });

    const prefs = await getPreferences("user-1");

    expect(prefs).not.toBeNull();
    expect(prefs?.durationMinutes).toBeNull();
    expect(prefs?.energyLevel).toBeNull();
    expect(prefs?.primaryFocus).toEqual([]);
    expect(prefs?.injuries).toEqual(["knee", "wrist"]);
    expect(prefs?.targetBody).toBeNull();
    expect(prefs?.includeCreativeVariations).toBe(false);
    expect(prefs?.goalMatchPrimaryPct).toBe(50);
    expect(prefs?.goalMatchSecondaryPct).toBe(30);
    expect(prefs?.goalMatchTertiaryPct).toBe(20);
  });

  it("normalizes malformed preset preferences from listPresets", async () => {
    getSupabaseMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "preset-1",
                  name: "Bad payload",
                  saved_at: "2026-04-22T00:00:00Z",
                  preferences: null,
                },
              ],
              error: null,
            }),
          })),
        })),
      })),
    });

    const presets = await listPresets("user-1");

    expect(presets).toHaveLength(1);
    expect(presets[0]?.preferences).toMatchObject({
      primaryFocus: [],
      durationMinutes: null,
      energyLevel: null,
      goalMatchPrimaryPct: 50,
      goalMatchSecondaryPct: 30,
      goalMatchTertiaryPct: 20,
    });
  });
});
