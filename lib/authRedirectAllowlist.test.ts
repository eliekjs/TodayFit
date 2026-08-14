import { describe, expect, it } from "vitest";
import {
  buildAuthRedirectAllowlist,
  normalizeHttpsOrigin,
  resolvePilotWebOriginFromEnv,
} from "./authRedirectAllowlist";

describe("authRedirectAllowlist", () => {
  it("keeps native and local redirects when no web origin is set", () => {
    const list = buildAuthRedirectAllowlist();
    expect(list).toContain("todayfit://welcome");
    expect(list.some((u) => u.startsWith("https://"))).toBe(false);
  });

  it("adds https origin and wildcard, stripping a trailing slash", () => {
    const list = buildAuthRedirectAllowlist("https://app.seshlogic.com/");
    expect(list).toContain("https://app.seshlogic.com");
    expect(list).toContain("https://app.seshlogic.com/**");
    expect(list).toContain("todayfit://**");
  });

  it("rejects http and empty origins", () => {
    expect(normalizeHttpsOrigin("http://example.com")).toBeNull();
    expect(normalizeHttpsOrigin("")).toBeNull();
    expect(normalizeHttpsOrigin("seshlogic.com")).toBeNull();
  });

  it("reads PUBLIC_APP_ORIGIN over the Expo public alias", () => {
    expect(
      resolvePilotWebOriginFromEnv({
        PUBLIC_APP_ORIGIN: "https://seshlogic.com",
        EXPO_PUBLIC_APP_ORIGIN: "https://ignored.example",
      })
    ).toBe("https://seshlogic.com");
  });
});
