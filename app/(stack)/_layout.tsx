import React from "react";
import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        contentStyle: {
          backgroundColor: "#041631",
        },
      }}
    />
  );
}
