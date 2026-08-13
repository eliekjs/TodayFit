import React from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AppStateProvider } from "../context/AppStateContext";
import { WelcomeProvider } from "../context/WelcomeContext";
import { RemoteSyncBanner } from "../components/RemoteSyncBanner";
import { GeometricPatternBackground } from "../components/GeometricPatternBackground";

function isPublicAuthRoute(segments: string[]): boolean {
  const root = segments[0];
  return root === "welcome" || root === "auth";
}

/** Require a signed-in session for all app routes; login/signup/reset stay public. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { userId, isLoading, isPasswordRecovery } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (isLoading) return;
    const onPublicAuth = isPublicAuthRoute(segments as string[]);

    if (isPasswordRecovery && segments.join("/") !== "auth/forgot-password") {
      router.replace("/auth/forgot-password");
      return;
    }

    if (!userId && !onPublicAuth) {
      router.replace("/welcome");
      return;
    }

    if (userId && segments[0] === "welcome" && !isPasswordRecovery) {
      router.replace("/");
    }
  }, [userId, isLoading, isPasswordRecovery, router, segments]);

  // Avoid flashing app chrome before session is known.
  if (isLoading) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <WelcomeProvider>
            <AuthGate>
              <View style={styles.root}>
                <GeometricPatternBackground />
                <RemoteSyncBanner />
                <View style={styles.stack}>
                  <Slot />
                </View>
              </View>
            </AuthGate>
          </WelcomeProvider>
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
});
