import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppScreenWrapper } from "./AppScreenWrapper";
import { useTheme } from "../lib/theme";

type Props = {
  message: string;
};

export function GenerationLoadingScreen({ message }: Props) {
  const theme = useTheme();

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 15,
  },
});
