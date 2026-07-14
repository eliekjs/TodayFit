/**
 * Prove P05 is in PERSONA_FIXTURES and weekly fixtures are wired.
 * Run: npx vitest run logic/workoutGeneration/personaFixtures.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  PERSONA_FIXTURES,
  PERSONA_WEEKLY_FIXTURES,
  dayRepresentativeForWeeklyPersona,
  getPersonaById,
  pickPersonaForLoop,
  singleDayPrefsForPersona,
  weeklyFixturesForPersona,
} from "./personaSimulationFixtures";
import { expectationsForPersona, personaStory } from "./personaExpectationContracts";

describe("P05 persona fixtures (Phase 3 G3.1)", () => {
  it("includes P05 in PERSONA_FIXTURES as goal_week P0", () => {
    const p05 = getPersonaById("P05");
    expect(p05).toBeDefined();
    expect(p05!.name).toMatch(/Jordan/i);
    expect(p05!.testPriority).toBe("P0");
    expect(p05!.mode).toBe("goal_week");
    expect(p05!.weeklyScenario?.scenarioId).toBe("A");
    expect(p05!.manualPreferences.primaryFocus).toContain("Build Muscle (Hypertrophy)");
    expect(p05!.manualPreferences.primaryFocus).toContain("Athletic Performance");
    expect(p05!.manualPreferences.subFocusByGoal["Athletic Performance"]).toEqual(
      expect.arrayContaining(["Speed / Sprint", "Vertical jump"])
    );
    expect(PERSONA_FIXTURES.some((p) => p.id === "P05")).toBe(true);
  });

  it("exports PERSONA_WEEKLY_FIXTURES with scenario A day representatives", () => {
    const weekly = weeklyFixturesForPersona("P05");
    expect(weekly.length).toBeGreaterThanOrEqual(3);
    expect(PERSONA_WEEKLY_FIXTURES.some((d) => d.dayKey === "athletic_vertical_jump")).toBe(true);
    expect(PERSONA_WEEKLY_FIXTURES.some((d) => d.dayKey === "hypertrophy_glutes")).toBe(true);
  });

  it("single-day prefs resolve to athletic/power representative for P05", () => {
    const p05 = getPersonaById("P05")!;
    const day = dayRepresentativeForWeeklyPersona(p05);
    expect(day?.dayKey).toBe("athletic_vertical_jump");
    const prefs = singleDayPrefsForPersona(p05);
    expect(prefs.primaryFocus).toEqual(["Athletic Performance"]);
    expect(prefs.subFocusByGoal["Athletic Performance"]).toContain("Vertical jump");
  });

  it("wires P05 into expectation contracts and loop picker", () => {
    expect(expectationsForPersona("P05").length).toBeGreaterThanOrEqual(2);
    expect(personaStory(getPersonaById("P05")!)).toMatch(/Multi-goal week/i);
    const picked = pickPersonaForLoop(1, "P05");
    expect(picked.id).toBe("P05");
  });
});
