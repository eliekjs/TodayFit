import React from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View, StyleSheet } from "react-native";
import {
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
  useFonts,
} from "@expo-google-fonts/oswald";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AppStateProvider } from "../context/AppStateContext";
import { WelcomeProvider } from "../context/WelcomeContext";
import { RemoteSyncBanner } from "../components/RemoteSyncBanner";
import { GeometricPatternBackground } from "../components/GeometricPatternBackground";
import { APP_CANVAS_BACKGROUND } from "../lib/theme";

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

  return (
    <>
      {children}
      {isLoading ? <View style={styles.bootCover} pointerEvents="auto" /> : null}
    </>
  );
}

export default function RootLayout() {
  useFonts({
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  return (
    <SafeAreaProvider>
      {Platform.OS === "web" ? (
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      ) : null}
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
  /** Cover Slot until auth session is known — never unmount the navigator. */
  bootCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_CANVAS_BACKGROUND,
    zIndex: 100,
  },
});
