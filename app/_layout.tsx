import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "../context/AppStateContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
          }}
        >
          {/* Root tabs */}
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />

          {/* Flows that are pushed on top of tabs */}
          <Stack.Screen
            name="manual/preferences"
            options={{ title: "Workout Preferences" }}
          />
          <Stack.Screen
            name="manual/workout"
            options={{ title: "Today's Workout" }}
          />
          <Stack.Screen
            name="manual/execute"
            options={{ title: "Execute" }}
          />
          <Stack.Screen
            name="adaptive/index"
            options={{ title: "Adaptive Mode" }}
          />
          <Stack.Screen
            name="adaptive/recommendation"
            options={{ title: "Recommended Session" }}
          />
          <Stack.Screen
            name="history/complete"
            options={{ title: "Workout Saved" }}
          />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
