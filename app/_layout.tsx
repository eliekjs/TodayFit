import React from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "../context/AppStateContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Slot />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
