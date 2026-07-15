import React, { useEffect } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Legacy deep-link / recovery landing. Code-based reset lives on
 * `/auth/forgot-password`. Recovery deep links still dump here then bounce
 * into the password step of the forgot flow via recovery session.
 */
export default function ResetPasswordRedirect() {
  const params = useLocalSearchParams<{ email?: string }>();
  useEffect(() => {
    // no-op; Redirect handles navigation
  }, []);
  return (
    <Redirect
      href={{
        pathname: "/auth/forgot-password",
        params: typeof params.email === "string" ? { email: params.email } : undefined,
      }}
    />
  );
}
