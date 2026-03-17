import React from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import { AppStateProvider } from "../context/AppStateContext";
import { WelcomeProvider } from "../context/WelcomeContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <WelcomeProvider>
            <Slot />
          </WelcomeProvider>
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
