import { describe, expect, it } from "vitest";
import { AUTH_COPY, isEmailNotConfirmedMessage, mapAuthError } from "./authCopy";

describe("mapAuthError", () => {
  it("maps invalid login to generic incorrect credentials", () => {
    expect(mapAuthError("Invalid login credentials", "signIn")).toBe(AUTH_COPY.loginIncorrect);
  });

  it("maps email not confirmed", () => {
    expect(mapAuthError("Email not confirmed", "signIn")).toBe(AUTH_COPY.emailNotConfirmed);
    expect(isEmailNotConfirmedMessage("Email not confirmed")).toBe(true);
  });

  it("maps already registered", () => {
    expect(mapAuthError("User already registered", "signUp")).toBe(AUTH_COPY.accountExists);
  });

  it("maps rate limits", () => {
    expect(mapAuthError("For security purposes, you can only request this after 60 seconds", "resend")).toBe(
      AUTH_COPY.rateLimited
    );
  });

  it("hides supabase vendor text", () => {
    expect(mapAuthError("supabase auth failed jwt", "signIn")).toBe(AUTH_COPY.couldNotSignIn);
  });

  it("maps expired otp for verify", () => {
    expect(mapAuthError("Token has expired or is invalid", "resetVerify")).toBe(
      AUTH_COPY.invalidOrExpiredCode
    );
  });
});
