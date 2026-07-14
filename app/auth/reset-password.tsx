import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";
import { useWelcome } from "../../context/WelcomeContext";

const CLEAN_BG = "#f7f3ec";
const CLEAN_CARD = "#fffdf8";
const CLEAN_TEXT = "#231f1a";
const CLEAN_MUTED = "rgba(35,31,26,0.66)";
const CLEAN_BORDER = "rgba(44,38,32,0.12)";
const CLEAN_ACCENT = "#b7791f";

/**
 * Deep-link target for password recovery (`todayfit://auth/reset-password`
 * or Expo Linking URL). Requires a recovery session from the email link.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { setHasEntered } = useWelcome();
  const { updatePassword, isPasswordRecovery, userId, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpdate = Boolean(userId) || isPasswordRecovery;

  const onSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!canUpdate) {
      setError("Open the reset link from your email first, then set a new password.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError);
        return;
      }
      setHasEntered();
      Alert.alert("Password updated", "You can keep training with your account.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>
              {canUpdate
                ? "Choose a new password for your TodayFit account."
                : "Waiting for a valid reset link. Use Forgot password on the welcome screen, then open the email link."}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={CLEAN_MUTED}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              accessibilityLabel="New password"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={CLEAN_MUTED}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              editable={!busy}
              accessibilityLabel="Confirm password"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.primary, { opacity: busy ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Update password"
            >
              {busy ? (
                <ActivityIndicator color="#fffdf8" />
              ) : (
                <Text style={styles.primaryText}>Update password</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                void signOut().then(() => router.replace("/welcome"));
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
            >
              <Text style={styles.link}>Back to welcome</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CLEAN_BG },
  safe: { flex: 1 },
  flex: { flex: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: CLEAN_CARD,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: CLEAN_TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: CLEAN_MUTED,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: CLEAN_TEXT,
    marginBottom: 12,
    backgroundColor: "rgba(255,253,248,0.92)",
  },
  error: {
    color: "#9b2c2c",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  primary: {
    backgroundColor: CLEAN_ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryText: {
    color: "#fffdf8",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    color: CLEAN_ACCENT,
    fontWeight: "600",
    fontSize: 14,
  },
});
