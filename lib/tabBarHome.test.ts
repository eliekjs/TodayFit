import { describe, expect, it } from "vitest";
import { isAlreadyOnTabHome, tabBarHomeHref } from "./tabBarHome";

describe("tabBarHomeHref", () => {
  it("maps each visible tab to its home screen", () => {
    expect(tabBarHomeHref("index")).toBe("/");
    expect(tabBarHomeHref("library/index")).toBe("/library");
    expect(tabBarHomeHref("profiles/index")).toBe("/profiles");
  });

  it("treats unknown / flow routes as Today home", () => {
    expect(tabBarHomeHref("manual/preferences")).toBe("/");
    expect(tabBarHomeHref("sport-mode/index")).toBe("/");
  });
});

describe("isAlreadyOnTabHome", () => {
  it("is true only on that tab's root screen", () => {
    expect(isAlreadyOnTabHome("index", "/")).toBe(true);
    expect(isAlreadyOnTabHome("library/index", "/library")).toBe(true);
    expect(isAlreadyOnTabHome("manual/preferences", "/")).toBe(false);
    expect(isAlreadyOnTabHome("index", "/library")).toBe(false);
  });
});
