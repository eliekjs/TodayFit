import React from "react";
import { Text, type TextProps } from "react-native";
import { themeType, useTheme } from "../lib/theme";

type Props = TextProps & {
  children: React.ReactNode;
};

/** Sentence-case section label. */
export function SectionLabel({ children, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[themeType.label, { color: theme.textMuted, marginBottom: 8 }, style]}
    >
      {children}
    </Text>
  );
}
