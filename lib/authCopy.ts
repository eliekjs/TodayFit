/**
 * Productized auth copy — keep UI/email tone aligned with docs/PRODUCT_VOICE.md.
 * Never surface raw Supabase/API strings to users when a mapped phrase exists.
 */

export const AUTH_COPY = {
  checkEmailConfirm: (email?: string) =>
    email
      ? `We sent a confirmation link to ${email}. Open it, then log in. If you don’t see it, check spam.`
      : "We sent a confirmation link. Open it, then log in. If you don’t see it, check spam.",

  confirmationResent:
    "Confirmation email sent again. Check inbox and spam, then log in.",

  emailConfirmed: "Email confirmed. Log in to continue.",

  passwordUpdated: "Password updated. Log in with your new password.",

  enterEmailPassword: "Enter your email and password.",

  passwordTooShort: "Password must be at least 6 characters.",

  passwordsMismatch: "Passwords do not match.",

  invalidEmail: "Enter a valid email address.",

  enterSignupEmailForResend: "Enter the email you signed up with, then resend.",

  enterResetCode: "Enter the 6-digit code from your email.",

  authUnavailable: "Sign-in isn’t available in this build.",

  loginIncorrect: "Email or password is incorrect.",

  emailNotConfirmed:
    "Confirm your email before logging in. Check inbox and spam, or resend the link.",

  accountExists: "An account with this email already exists. Log in, or reset your password.",

  resetCodeSent:
    "If an account exists for that email, we sent a reset code. Check inbox and spam.",

  invalidOrExpiredCode: "That code is invalid or expired. Request a new one.",

  rateLimited: "Too many attempts. Try again in a few minutes.",

  linkInvalidOrExpired:
    "That email link is invalid or expired. Request a new one, or log in if you already confirmed.",

  linkOpenFailed: "Couldn’t open that email link. Try again from the app, or request a new email.",

  couldNotSignIn: "Couldn’t sign in. Try again.",

  couldNotSignUp: "Couldn’t create your account. Try again.",

  couldNotResend: "Couldn’t resend the confirmation email. Try again.",

  couldNotSignOut: "Couldn’t sign out. Try again.",

  couldNotUpdatePassword: "Couldn’t update your password. Try again.",

  couldNotDeleteAccount: "Couldn’t delete your account. Try again.",

  notSignedIn: "You’re not signed in.",

  signedOut: "Signed out.",

  resetEmailStepSubtitle:
    "We’ll email you a one-time code. You’ll stay signed out until the reset finishes.",

  resetCodeStepSubtitle: (email: string) => `Enter the 6-digit code we sent to ${email}.`,

  resetPasswordStepSubtitle: "After you save, log in again with your new password.",

  deleteAccountBody: (email: string | null) =>
    email
      ? `This permanently deletes ${email} and synced gyms, presets, and history. This cannot be undone.`
      : "This permanently deletes your account and synced gyms, presets, and history. This cannot be undone.",

  welcomePreviewHint: "Sign-in isn’t available in this build.",
} as const;

export type AuthErrorContext =
  | "signIn"
  | "signUp"
  | "resend"
  | "resetSend"
  | "resetVerify"
  | "updatePassword"
  | "signOut"
  | "delete"
  | "link"
  | "generic";

/** Map vendor/API error text → product voice. Prefer this over error.message in UI. */
export function mapAuthError(
  raw: string | null | undefined,
  context: AuthErrorContext,
  fallback?: string
): string {
  const msg = (raw ?? "").trim().toLowerCase();

  if (!msg) {
    return fallback ?? defaultFallback(context);
  }

  if (
    msg.includes("email not confirmed") ||
    msg.includes("confirm your email") ||
    msg.includes("email_not_confirmed")
  ) {
    return AUTH_COPY.emailNotConfirmed;
  }

  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid_credentials") ||
    (context === "signIn" && (msg.includes("invalid") || msg.includes("wrong")))
  ) {
    return AUTH_COPY.loginIncorrect;
  }

  if (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already exists") ||
    msg.includes("email address is already")
  ) {
    return AUTH_COPY.accountExists;
  }

  if (
    msg.includes("rate") ||
    msg.includes("too many") ||
    msg.includes("security purposes") ||
    (msg.includes("after") && msg.includes("second"))
  ) {
    return AUTH_COPY.rateLimited;
  }

  if (
    (msg.includes("token") && (msg.includes("expired") || msg.includes("invalid"))) ||
    (msg.includes("otp") && (msg.includes("expired") || msg.includes("invalid"))) ||
    (msg.includes("code") && (msg.includes("expired") || msg.includes("invalid")))
  ) {
    return context === "link" ? AUTH_COPY.linkInvalidOrExpired : AUTH_COPY.invalidOrExpiredCode;
  }

  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  // Never leak vendor/infra wording.
  if (
    msg.includes("supabase") ||
    msg.includes("jwt") ||
    msg.includes("gotrue") ||
    msg.includes("postgres")
  ) {
    return fallback ?? defaultFallback(context);
  }

  // Short, human-looking messages from our own code can pass through.
  if (raw && raw.length > 0 && raw.length < 120 && !/[{\[]/.test(raw) && !msg.includes("error")) {
    // Still prefer mapped defaults for known contexts when message is opaque codes.
    if (/^[a-z0-9_]+$/i.test(raw.trim())) {
      return fallback ?? defaultFallback(context);
    }
  }

  return fallback ?? defaultFallback(context);
}

function defaultFallback(context: AuthErrorContext): string {
  switch (context) {
    case "signIn":
      return AUTH_COPY.couldNotSignIn;
    case "signUp":
      return AUTH_COPY.couldNotSignUp;
    case "resend":
      return AUTH_COPY.couldNotResend;
    case "resetVerify":
      return AUTH_COPY.invalidOrExpiredCode;
    case "updatePassword":
      return AUTH_COPY.couldNotUpdatePassword;
    case "signOut":
      return AUTH_COPY.couldNotSignOut;
    case "delete":
      return AUTH_COPY.couldNotDeleteAccount;
    case "link":
      return AUTH_COPY.linkInvalidOrExpired;
    case "resetSend":
      return AUTH_COPY.rateLimited;
    default:
      return "Something went wrong. Try again.";
  }
}

export function isEmailNotConfirmedMessage(raw: string | null | undefined): boolean {
  const msg = (raw ?? "").toLowerCase();
  return msg.includes("email not confirmed") || msg.includes("confirm your email");
}
