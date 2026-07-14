import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { getSupabase } from "../lib/db";
import { isDbConfigured } from "../lib/db/supabaseEnv";

type AuthContextValue = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  isLoading: boolean;
  /** True when Supabase env is configured (auth API available). */
  isAuthConfigured: boolean;
  /** True after a recovery deep link established a session ready for password update. */
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
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

function authErrorMessage(error: { message?: string } | null | undefined, fallback: string): string {
  const msg = error?.message?.trim();
  return msg && msg.length > 0 ? msg : fallback;
}

function passwordResetRedirectUrl(): string {
  // Prefer Expo Linking URL so web + native redirect allowlists can share one pattern.
  try {
    return Linking.createURL("auth/reset-password");
  } catch {
    return "todayfit://auth/reset-password";
  }
}

async function consumeAuthUrl(url: string): Promise<"recovery" | "session" | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const parsed = Linking.parse(url);
    const query = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
    const code = typeof query.code === "string" ? query.code : undefined;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return null;
      return query.type === "recovery" || url.includes("type=recovery") ? "recovery" : "session";
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
      if (error) return null;
      return type === "recovery" ? "recovery" : "session";
    }
  } catch {
    return null;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const isAuthConfigured = isDbConfigured();

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
      void consumeAuthUrl(url).then((kind) => {
        if (kind === "recovery") setIsPasswordRecovery(true);
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
      return { error: "Sign-in is not configured. Add Supabase env vars." };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password,
    });
    return { error: error ? authErrorMessage(error, "Could not sign in.") : null };
  }, []);

  const signUpWithPassword = useCallback(async (emailInput: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        error: "Sign-up is not configured. Add Supabase env vars.",
        needsEmailConfirmation: false,
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.trim(),
      password,
    });
    if (error) {
      return { error: authErrorMessage(error, "Could not sign up."), needsEmailConfirmation: false };
    }
    const needsEmailConfirmation = Boolean(data.user) && !data.session;
    return { error: null, needsEmailConfirmation };
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
    return { error: error ? authErrorMessage(error, "Could not sign out.") : null };
  }, []);

  const resetPasswordForEmail = useCallback(async (emailInput: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: "Password reset is not configured." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim(), {
      redirectTo: passwordResetRedirectUrl(),
    });
    return { error: error ? authErrorMessage(error, "Could not send reset email.") : null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: "Password update is not configured." };
    }
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsPasswordRecovery(false);
    return { error: error ? authErrorMessage(error, "Could not update password.") : null };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: "Account deletion is not configured." };
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not signed in." };
    }
    const { error: rpcError } = await supabase.rpc("delete_own_account");
    if (!rpcError) {
      setIsPasswordRecovery(false);
      await supabase.auth.signOut();
      return { error: null };
    }
    // Fallback until delete_own_account migration is applied: wipe owned rows, then signs out.
    try {
      const uid = user.id;
      const tables = [
        "workouts",
        "preference_presets",
        "sport_presets",
        "user_preferences",
        "gym_profiles",
        "weekly_plan_instances",
        "user_sport_profiles",
        "sport_events",
        "user_training_plans",
        "user_goals",
      ] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq("user_id", uid);
        if (error && !/does not exist|schema cache/i.test(error.message)) {
          // Continue wiping other tables; report first hard failure at end if nothing wiped.
          console.warn(`[deleteAccount] ${table}:`, error.message);
        }
      }
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Could not delete account data. Apply delete_own_account migration.",
      };
    }
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  const value: AuthContextValue = {
    userId,
    email,
    displayName,
    isLoading,
    isAuthConfigured,
    isPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    resetPasswordForEmail,
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
