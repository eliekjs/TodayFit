import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useWelcome } from "../context/WelcomeContext";
import { useAuth } from "../context/AuthContext";

const CLEAN_BG = "#f7f3ec";
const CLEAN_CARD = "#fffdf8";
const CLEAN_TEXT = "#231f1a";
const CLEAN_MUTED = "rgba(35,31,26,0.66)";
const CLEAN_BORDER = "rgba(44,38,32,0.12)";
const CLEAN_ACCENT = "#b7791f";
const CLEAN_ACCENT_DARK = "#9c6417";
const INPUT_BG = "rgba(255,253,248,0.92)";

export default function WelcomeScreen() {
  const router = useRouter();
  const { setHasEntered } = useWelcome();
  const {
    isAuthConfigured,
    signInWithPassword,
    signUpWithPassword,
    resetPasswordForEmail,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const enterAsGuest = () => {
    setHasEntered();
    router.replace("/");
  };

  const enterAfterAuth = () => {
    setHasEntered();
    router.replace("/");
  };

  const onSubmit = async () => {
    setFormError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setFormError("Enter email and password.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (!isAuthConfigured) {
      setFormError("Auth is not configured on this build. Continue as guest, or set Supabase env.");
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        const { error } = await signInWithPassword(trimmed, password);
        if (error) {
          setFormError(error);
          return;
        }
        enterAfterAuth();
        return;
      }
      const { error, needsEmailConfirmation } = await signUpWithPassword(trimmed, password);
      if (error) {
        setFormError(error);
        return;
      }
      if (needsEmailConfirmation) {
        Alert.alert(
          "Check your email",
          "We sent a confirmation link. After confirming, come back and log in.",
          [{ text: "OK" }]
        );
        setIsLogin(true);
        return;
      }
      enterAfterAuth();
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    setFormError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Enter your email above, then tap Forgot password.");
      return;
    }
    if (!isAuthConfigured) {
      setFormError("Auth is not configured on this build.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await resetPasswordForEmail(trimmed);
      if (error) {
        setFormError(error);
        return;
      }
      Alert.alert("Reset email sent", "Check your inbox for a password reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <View style={styles.logoBox}>
                <Ionicons name="barbell" size={36} color="#fffdf8" />
              </View>
              <Text style={styles.brandName}>TodayFit</Text>
              <Text style={styles.tagline}>Your intelligent training partner</Text>
            </View>

            <View style={styles.authCard}>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => {
                    setIsLogin(true);
                    setFormError(null);
                  }}
                  style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isLogin }}
                >
                  <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setIsLogin(false);
                    setFormError(null);
                  }}
                  style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isLogin }}
                >
                  <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={CLEAN_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                accessibilityLabel="Email"
              />
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="Password"
                placeholderTextColor={CLEAN_MUTED}
                secureTextEntry
                textContentType={isLogin ? "password" : "newPassword"}
                autoComplete={isLogin ? "password" : "new-password"}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                accessibilityLabel="Password"
              />

              {!isAuthConfigured && (
                <Text style={styles.previewHint}>
                  Supabase is not configured in this build. You can still continue as a guest —
                  sign-in will not sync data until env is set.
                </Text>
              )}

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              {isLogin && (
                <Pressable
                  onPress={onForgotPassword}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [styles.primaryBtnWrap, { opacity: pressed || busy ? 0.85 : 1 }]}
                onPress={onSubmit}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={isLogin ? "Log in" : "Sign up"}
              >
                <LinearGradient
                  colors={[CLEAN_ACCENT, CLEAN_ACCENT_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {busy ? (
                    <ActivityIndicator color="#fffdf8" />
                  ) : (
                    <Text style={styles.primaryBtnText}>{isLogin ? "Log in" : "Create account"}</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.9 : 1 }]}
                onPress={enterAsGuest}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Continue as guest"
              >
                <Text style={styles.socialBtnText}>Continue as guest</Text>
              </Pressable>
              <Text style={styles.guestHint}>
                Guest sessions are not saved to the cloud. Sign in to keep presets, gyms, and history.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLEAN_BG,
  },
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: CLEAN_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    boxShadow: "0 8px 20px rgba(44,38,32,0.12)",
    elevation: 4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: CLEAN_TEXT,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: CLEAN_MUTED,
    textAlign: "center",
  },
  authCard: {
    backgroundColor: CLEAN_CARD,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: CLEAN_BG,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: CLEAN_MUTED,
  },
  toggleTextActive: {
    color: CLEAN_TEXT,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: CLEAN_TEXT,
    marginBottom: 12,
  },
  inputLast: {
    marginBottom: 10,
  },
  previewHint: {
    fontSize: 13,
    color: CLEAN_MUTED,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: "#9b2c2c",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  forgotLink: {
    fontSize: 13,
    alignSelf: "center",
    textAlign: "center",
    marginBottom: 16,
    color: CLEAN_ACCENT_DARK,
    fontWeight: "600",
  },
  primaryBtnWrap: {
    marginBottom: 20,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fffdf8",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: CLEAN_BORDER,
  },
  dividerText: {
    fontSize: 13,
    color: CLEAN_MUTED,
  },
  socialBtn: {
    backgroundColor: CLEAN_CARD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: CLEAN_TEXT,
  },
  guestHint: {
    fontSize: 12,
    color: CLEAN_MUTED,
    textAlign: "center",
    lineHeight: 17,
  },
});
