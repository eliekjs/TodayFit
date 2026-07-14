/**
 * Unit-level checks for auth helpers that do not need a live Supabase project.
 */
import { describe, expect, it } from "vitest";
import { isPlaceholderSupabaseConfig } from "./supabaseEnv";

describe("isPlaceholderSupabaseConfig", () => {
  it("rejects empty and example placeholders", () => {
    expect(isPlaceholderSupabaseConfig("", "")).toBe(true);
    expect(isPlaceholderSupabaseConfig("https://your-project.supabase.co", "your-anon-key")).toBe(
      true
    );
    expect(isPlaceholderSupabaseConfig("https://example.com", "x".repeat(40))).toBe(true);
  });

  it("accepts plausible url + anon key", () => {
    expect(
      isPlaceholderSupabaseConfig(
        "https://abcdefghijklmnop.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test"
      )
    ).toBe(false);
  });
});
