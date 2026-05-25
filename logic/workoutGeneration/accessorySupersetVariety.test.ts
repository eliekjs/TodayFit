import { describe, it, expect } from "vitest";
import { pickBestSupersetPairs } from "../workoutIntelligence/supersetPairing";
import type { Exercise } from "./types";

/** Symmetric upper-push accessories so several chest+triceps pairs tie; prefs equalize boosts. */
function accessoryStub(id: string, pairing: "chest" | "triceps"): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "push",
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: pairing,
    muscle_groups: [pairing],
    primary_movement_family: "upper_push",
  };
}

describe("accessory superset pairing variety", () => {
  it("pickBestSupersetPairs without rng matches always picking first top-tier pair (idx 0)", () => {
    const pool: Exercise[] = [
      accessoryStub("c1", "chest"),
      accessoryStub("t1", "triceps"),
      accessoryStub("c2", "chest"),
      accessoryStub("t2", "triceps"),
    ];
    const prefs = new Map(pool.map((e) => [e.id, 2]));
    const noRng = pickBestSupersetPairs(pool, 1, new Set(), undefined, prefs);
    const idx0 = pickBestSupersetPairs(pool, 1, new Set(), () => 0, prefs);
    expect(noRng).toEqual(idx0);
  });

  it("pickBestSupersetPairs with rng can vary among tied top-tier pairs", () => {
    const pool: Exercise[] = [
      accessoryStub("c1", "chest"),
      accessoryStub("t1", "triceps"),
      accessoryStub("c2", "chest"),
      accessoryStub("t2", "triceps"),
    ];
    const prefs = new Map(pool.map((e) => [e.id, 2]));
    const signatures = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const pairs = pickBestSupersetPairs(pool, 1, new Set(), () => i / 41, prefs);
      expect(pairs.length).toBe(1);
      const [a, b] = pairs[0]!;
      signatures.add([a.id, b.id].sort().join("+"));
    }
    expect(signatures.size).toBeGreaterThan(1);
  });
});
