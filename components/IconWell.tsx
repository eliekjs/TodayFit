import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

type Props = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  wellSize?: number;
};

/** Pale teal circle with a thin-stroke icon — Ethos icon well. */
export function IconWell({ name, size = 20, wellSize = 40 }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.well,
        {
          backgroundColor: theme.primarySoft,
          width: wellSize,
          height: wellSize,
          borderRadius: wellSize / 2,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
