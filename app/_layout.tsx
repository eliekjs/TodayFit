import React from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AppStateProvider } from "../context/AppStateContext";
import { WelcomeProvider } from "../context/WelcomeContext";
import { RemoteSyncBanner } from "../components/RemoteSyncBanner";
import { GeometricPatternBackground } from "../components/GeometricPatternBackground";

function PasswordRecoveryRedirect() {
  const { isPasswordRecovery } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  React.useEffect(() => {
    if (!isPasswordRecovery) return;
    const path = segments.join("/");
    if (path !== "auth/reset-password") {
      router.replace("/auth/reset-password");
    }
  }, [isPasswordRecovery, router, segments]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <WelcomeProvider>
            <View style={styles.root}>
              <GeometricPatternBackground />
              <RemoteSyncBanner />
              <PasswordRecoveryRedirect />
              <View style={styles.stack}>
                <Slot />
              </View>
            </View>
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
