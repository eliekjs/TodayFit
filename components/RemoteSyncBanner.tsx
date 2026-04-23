import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { useAppState } from "../context/AppStateContext";

/**
 * Inline notice when cloud snapshot load fails or must be refreshed after a merge skip.
 * Parent should render inside SafeAreaProvider (root layout already does).
 */
export function RemoteSyncBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    remoteSyncStatus,
    remoteSyncError,
    remoteSyncSkippedMerge,
    reloadRemoteAppState,
    dismissRemoteSyncSkippedMerge,
  } = useAppState();

  const showError = remoteSyncStatus === "error" && remoteSyncError;
  const showSkipped = remoteSyncSkippedMerge && remoteSyncStatus === "ready";

  if (!showError && !showSkipped) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: showError ? "rgba(248,113,113,0.18)" : "rgba(59,130,246,0.2)",
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.message, { color: theme.text }]}>
        {showError ? (
          <>
            <Text style={styles.bold}>Couldn&apos;t sync your data.</Text> {remoteSyncError}
          </>
        ) : (
          <>
            <Text style={styles.bold}>Local changes kept.</Text> Cloud data didn&apos;t load during
            sign-in because you edited settings first. Reload to replace this device with your cloud
            copy (this device may lose unsynced edits).
          </>
        )}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => reloadRemoteAppState()}
          style={[styles.primaryBtn, { backgroundColor: theme.primarySoft }]}
        >
          <Text style={[styles.primaryBtnLabel, { color: theme.primary }]}>
            {showError ? "Retry" : "Reload from cloud"}
          </Text>
        </Pressable>
        {!showError ? (
          <Pressable onPress={dismissRemoteSyncSkippedMerge} hitSlop={12}>
            <Text style={[styles.secondary, { color: theme.textMuted }]}>Dismiss</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 16,
    marginTop: 10,
    flexWrap: "wrap",
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondary: {
    fontSize: 14,
    fontWeight: "500",
  },
});
