import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { getSupabase } from "../lib/db";
import { isDbConfigured } from "../lib/db/supabaseEnv";
import { AUTH_COPY, isEmailNotConfirmedMessage, mapAuthError } from "../lib/authCopy";

type AuthContextValue = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  isLoading: boolean;
  /** True when Supabase env is configured (auth API available). */
  isAuthConfigured: boolean;
  /** True after recovery OTP/deep link established a session ready for password update. */
  isPasswordRecovery: boolean;
  /** Last failed auth deep-link / email-link consume error (cleared when read or dismissed). */
  authLinkError: string | null;
  clearAuthLinkError: () => void;
  /** Set after a confirm-email deep link establishes a session. */
  emailJustConfirmed: boolean;
  clearEmailJustConfirmed: () => void;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; emailNotConfirmed?: boolean }>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  /** Resends the signup confirmation email. */
  resendConfirmationEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  /** Sends Supabase recovery email (includes 6-digit code when template uses {{ .Token }}). */
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  /** Verifies the 6-digit recovery code from email; creates a short-lived recovery session. */
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
  /** Deletes app rows for the user via RPC (or wipe fallback), then signs out. */
  deleteAccount: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function displayNameFromUser(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user?.user_metadata;
  if (!meta) return null;
  const name = (meta.full_name as string) ?? (meta.name as string) ?? (meta.user_name as string);
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function authErrorMessage(
  error: { message?: string } | null | undefined,
  context: Parameters<typeof mapAuthError>[1],
  fallback?: string
): string {
  return mapAuthError(error?.message, context, fallback);
}

function passwordResetRedirectUrl(): string {
  try {
    return Linking.createURL("auth/reset-password");
  } catch {
    return "todayfit://auth/reset-password";
  }
}

function emailConfirmRedirectUrl(): string {
  try {
    return Linking.createURL("welcome");
  } catch {
    return "todayfit://welcome";
  }
}

type ConsumeResult =
  | { kind: "recovery" | "session" }
  | { kind: "error"; message: string }
  | { kind: null };

async function consumeAuthUrl(url: string): Promise<ConsumeResult> {
  const supabase = getSupabase();
  if (!supabase) return { kind: null };
  try {
    const parsed = Linking.parse(url);
    const query = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
    const code = typeof query.code === "string" ? query.code : undefined;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return {
          kind: "error",
          message: authErrorMessage(error, "link", AUTH_COPY.linkInvalidOrExpired),
        };
      }
      return {
        kind: query.type === "recovery" || url.includes("type=recovery") ? "recovery" : "session",
      };
    }
    // Implicit/hash style tokens (some email clients)
    const hash = url.includes("#") ? url.split("#")[1] : "";
    const params = new URLSearchParams(hash || url.split("?")[1] || "");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        return {
          kind: "error",
          message: authErrorMessage(error, "link", AUTH_COPY.linkInvalidOrExpired),
        };
      }
      return { kind: type === "recovery" ? "recovery" : "session" };
    }
  } catch {
    return {
      kind: "error",
      message: AUTH_COPY.linkOpenFailed,
    };
  }
  return { kind: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);
  const [emailJustConfirmed, setEmailJustConfirmed] = useState(false);
  const isAuthConfigured = isDbConfigured();

  const clearAuthLinkError = useCallback(() => setAuthLinkError(null), []);
  const clearEmailJustConfirmed = useCallback(() => setEmailJustConfirmed(false), []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const applySession = (session: {
      user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
    } | null) => {
      const user = session?.user;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setDisplayName(user ? displayNameFromUser(user) : null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    const handleUrl = (url: string | null) => {
      if (!url) return;
      void consumeAuthUrl(url).then((result) => {
        if (result.kind === "recovery") {
          setIsPasswordRecovery(true);
          setAuthLinkError(null);
        } else if (result.kind === "session") {
          setEmailJustConfirmed(true);
          setAuthLinkError(null);
        } else if (result.kind === "error") {
          setAuthLinkError(result.message);
        }
      });
    };
    void Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signInWithPassword = useCallback(async (emailInput: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password,
    });
    if (!error) return { error: null };
    if (isEmailNotConfirmedMessage(error.message)) {
      return {
        error: AUTH_COPY.emailNotConfirmed,
        emailNotConfirmed: true,
      };
    }
    return { error: authErrorMessage(error, "signIn") };
  }, []);

  const signUpWithPassword = useCallback(async (emailInput: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        error: AUTH_COPY.authUnavailable,
        needsEmailConfirmation: false,
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.trim(),
      password,
      options: {
        emailRedirectTo: emailConfirmRedirectUrl(),
      },
    });
    if (error) {
      return { error: authErrorMessage(error, "signUp"), needsEmailConfirmation: false };
    }
    const needsEmailConfirmation = Boolean(data.user) && !data.session;
    return { error: null, needsEmailConfirmation };
  }, []);

  const resendConfirmationEmail = useCallback(async (emailInput: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      return { error: AUTH_COPY.invalidEmail };
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: {
        emailRedirectTo: emailConfirmRedirectUrl(),
      },
    });
    if (error) {
      return { error: authErrorMessage(error, "resend") };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    setIsPasswordRecovery(false);
    if (!supabase) {
      setUserId(null);
      setEmail(null);
      setDisplayName(null);
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error: error ? authErrorMessage(error, "signOut") : null };
  }, []);

  const resetPasswordForEmail = useCallback(async (emailInput: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      return { error: AUTH_COPY.invalidEmail };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: passwordResetRedirectUrl(),
    });
    // Avoid account enumeration: rate-limit shown; unknown emails still look like success.
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("rate") ||
        msg.includes("security") ||
        msg.includes("after") ||
        msg.includes("seconds")
      ) {
        return { error: authErrorMessage(error, "resetSend") };
      }
      console.warn("[resetPasswordForEmail]", error.message);
    }
    return { error: null };
  }, []);

  const verifyRecoveryOtp = useCallback(async (emailInput: string, token: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedToken = token.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(trimmedToken)) {
      return { error: AUTH_COPY.enterResetCode };
    }
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: "recovery",
    });
    if (error) {
      return { error: authErrorMessage(error, "resetVerify") };
    }
    setIsPasswordRecovery(true);
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    if (password.length < 6) {
      return { error: AUTH_COPY.passwordTooShort };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsPasswordRecovery(false);
    return { error: error ? authErrorMessage(error, "updatePassword") : null };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: AUTH_COPY.authUnavailable };
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: AUTH_COPY.notSignedIn };
    }

    // Prefer Edge Function (service-role Admin API) — RPC alone often cannot delete auth.users.
    const { data: fnData, error: fnError } = await supabase.functions.invoke("delete-own-account", {
      method: "POST",
      body: {},
    });
    const fnPayload = (fnData ?? null) as { ok?: boolean; error?: string } | null;
    const fnFailed =
      Boolean(fnError) ||
      Boolean(fnPayload?.error) ||
      fnPayload?.ok !== true;

    if (fnFailed) {
      const { error: rpcError } = await supabase.rpc("delete_own_account");
      if (rpcError) {
        return {
          error: mapAuthError(
            fnPayload?.error || fnError?.message || rpcError.message,
            "delete",
            AUTH_COPY.couldNotDeleteAccount
          ),
        };
      }
    }

    setIsPasswordRecovery(false);
    setUserId(null);
    setEmail(null);
    setDisplayName(null);
    await supabase.auth.signOut({ scope: "local" });
    return { error: null };
  }, []);

  const value: AuthContextValue = {
    userId,
    email,
    displayName,
    isLoading,
    isAuthConfigured,
    isPasswordRecovery,
    authLinkError,
    clearAuthLinkError,
    emailJustConfirmed,
    clearEmailJustConfirmed,
    signInWithPassword,
    signUpWithPassword,
    resendConfirmationEmail,
    signOut,
    resetPasswordForEmail,
    verifyRecoveryOtp,
    updatePassword,
    clearPasswordRecovery,
    deleteAccount,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
