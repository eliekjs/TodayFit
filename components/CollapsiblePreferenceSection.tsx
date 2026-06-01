import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../lib/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  title: string;
  /** Shown below title when expanded */
  subtitle?: string;
  /** Right side of header when collapsed (e.g. current value) */
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Extra top margin for first section */
  marginTop?: number;
  /** Smaller header/body when nested inside another panel (e.g. Advanced options) */
  nested?: boolean;
};

/**
 * Accordion row: title + summary when collapsed; tap to expand content.
 */
export function CollapsiblePreferenceSection({
  title,
  subtitle,
  summary,
  expanded,
  onToggle,
  children,
  style,
  marginTop = 0,
  nested = false,
}: Props) {
  const theme = useTheme();

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const headerStyle = nested ? styles.headerNested : styles.header;
  const titleStyle = nested ? styles.titleNested : styles.title;
  const selectedValueStyle = nested ? styles.selectedValueNested : styles.selectedValue;
  const subtitleStyle = nested ? styles.subtitleNested : styles.subtitle;
  const bodyStyle = nested ? styles.bodyNested : styles.body;

  const showSurface = !nested;
  const surfaceBorderWidth = Platform.OS === "web" ? StyleSheet.hairlineWidth : 1;

  return (
    <View
      style={[
        styles.wrapper,
        showSurface && styles.wrapperSurface,
        showSurface && {
          backgroundColor: theme.cardOpaque,
          borderColor: theme.borderStrong,
          borderWidth: surfaceBorderWidth,
        },
        { marginTop },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          headerStyle,
          {
            borderBottomColor: expanded ? theme.border : "transparent",
            backgroundColor: pressed ? theme.cardOpaque : "transparent",
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${summary}. ${expanded ? "Collapse" : "Expand"}`}
      >
        <View style={[styles.headerTextCol, styles.passThroughWrap]}>
          <Text
            style={[selectedValueStyle, { color: theme.text }, styles.headerLabelPassThrough]}
            numberOfLines={2}
          >
            {summary}
          </Text>
          <Text
            style={[titleStyle, { color: theme.textMuted }, styles.headerLabelPassThrough]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {expanded && subtitle != null && subtitle.trim().length > 0 ? (
            <Text style={[subtitleStyle, { color: theme.textMuted }, styles.headerLabelPassThrough]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.headerRight, styles.passThroughWrap]}>
          <Text style={[styles.chevron, { color: theme.textMuted }, styles.headerLabelPassThrough]}>
            {expanded ? "▼" : "▶"}
          </Text>
        </View>
      </Pressable>
      {expanded ? (
        <View style={[bodyStyle, { borderColor: theme.borderStrong }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** RN Web: text nodes can steal taps from the parent Pressable; labels stay visual-only for hit-testing. */
  headerLabelPassThrough: {
    pointerEvents: "none",
  },
  passThroughWrap: {
    pointerEvents: "box-none",
  },
  wrapper: {
    marginBottom: 8,
  },
  wrapperSurface: {
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerNested: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  titleNested: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  selectedValue: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  selectedValueNested: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "400",
  },
  subtitleNested: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "400",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  chevron: {
    fontSize: 12,
    width: 18,
    textAlign: "center",
  },
  body: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 0,
  },
  bodyNested: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 0,
  },
});
