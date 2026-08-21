import React from "react";
import { Stack } from "expo-router";
import { themeFonts, useTheme } from "../../lib/theme";
import { OpaqueHeaderBackground } from "../navigation/tabFlowChrome";

export default function StackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerBackground: (props) => <OpaqueHeaderBackground {...props} />,
        headerBackgroundContainerStyle: { backgroundColor: theme.cardOpaque },
        headerStyle: {
          backgroundColor: theme.cardOpaque,
        },
        headerTitleStyle: {
          color: theme.text,
          fontFamily: themeFonts.displaySemi,
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}
    />
  );
}
