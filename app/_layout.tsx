import React from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { AppStateProvider } from "../context/AppStateContext";
import { WelcomeProvider } from "../context/WelcomeContext";
import { RemoteSyncBanner } from "../components/RemoteSyncBanner";
import { GeometricPatternBackground } from "../components/GeometricPatternBackground";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <WelcomeProvider>
            <View style={styles.root}>
              <GeometricPatternBackground />
              <RemoteSyncBanner />
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
