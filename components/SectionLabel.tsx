import React from "react";
import { Text, type TextProps } from "react-native";
import { themeType, useTheme } from "../lib/theme";

type Props = TextProps & {
  children: React.ReactNode;
};

/** All-caps tracked section label (Ethos “REQUIRED” / “PER HOUR” style). */
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
