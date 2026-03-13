import React, { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "../lib/db";

type AuthContextValue = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function displayNameFromUser(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user?.user_metadata;
  if (!meta) return null;
  const name = (meta.full_name as string) ?? (meta.name as string) ?? (meta.user_name as string);
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const applySession = (session: { user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      const user = session?.user;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setDisplayName(user ? displayNameFromUser(user) : null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = { userId, email, displayName, isLoading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
