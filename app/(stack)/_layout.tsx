import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../lib/theme";

export default function StackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTintColor: theme.text,
        headerStyle: {
          backgroundColor: theme.cardOpaque,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}
    />
  );
}
