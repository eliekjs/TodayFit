import { describe, expect, it } from "vitest";
import { filterSportsForPrepPicker } from "./sportRepository";
import type { Sport } from "./types";

function sport(slug: string, name: string): Sport {
  return {
    id: slug,
    slug,
    name,
    category: "Strength/Power",
    is_active: true,
    sort_order: 0,
  };
}

describe("filterSportsForPrepPicker", () => {
  it("removes legacy sprinting slug when canonical track_sprinting is present", () => {
    const filtered = filterSportsForPrepPicker([
      sport("sprinting", "Sprinting"),
      sport("track_sprinting", "Sprinting"),
      sport("soccer", "Soccer"),
    ]);
    expect(filtered.map((s) => s.slug)).toEqual(["track_sprinting", "soccer"]);
  });

  it("removes other legacy catalog slugs superseded by canonical rows", () => {
    const filtered = filterSportsForPrepPicker([
      sport("marathon", "Marathon / Road Running"),
      sport("road_running", "Running (road & marathon)"),
      sport("tennis", "Tennis"),
      sport("court_racquet", "Racquet & Court Sports"),
    ]);
    expect(filtered.map((s) => s.slug)).toEqual(["road_running", "court_racquet"]);
  });

  it("leaves bundled canonical catalog unchanged", () => {
    const filtered = filterSportsForPrepPicker([sport("track_sprinting", "Sprinting")]);
    expect(filtered).toHaveLength(1);
  });
});
