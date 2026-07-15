import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";

const CLEAN_BG = "#f7f3ec";
const CLEAN_CARD = "#fffdf8";
const CLEAN_TEXT = "#231f1a";
const CLEAN_MUTED = "rgba(35,31,26,0.66)";
const CLEAN_BORDER = "rgba(44,38,32,0.12)";
const CLEAN_ACCENT = "#b7791f";

type Step = "email" | "code" | "password";

/**
 * Secure forgot-password flow:
 * 1) email → Supabase sends recovery mail (code via {{ .Token }} in template)
 * 2) enter 6-digit code → verifyOtp(type: recovery)
 * 3) set new password → sign out → return to login
 *
 * Supabase sends the email; you do not need your own mail server for v1.
 * For reliable delivery in production, point Auth → SMTP to Resend/SendGrid/etc.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    isAuthConfigured,
    isPasswordRecovery,
    resetPasswordForEmail,
    verifyRecoveryOtp,
    updatePassword,
    signOut,
  } = useAuth();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email]
  );

  const [step, setStep] = useState<Step>(isPasswordRecovery ? "password" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      setStep("password");
    }
  }, [isPasswordRecovery]);

  const goLogin = () => {
    router.replace("/welcome");
  };

  const onSendCode = async () => {
    setError(null);
    setInfo(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isAuthConfigured) {
      setError("Auth is not configured on this build.");
      return;
    }
    setBusy(true);
    try {
      const { error: sendError } = await resetPasswordForEmail(trimmed);
      if (sendError) {
        setError(sendError);
        return;
      }
      setEmail(trimmed);
      setInfo(
        "If an account exists for that email, we sent a reset code. Check inbox and spam."
      );
      setStep("code");
    } finally {
      setBusy(false);
    }
  };

  const onVerifyCode = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error: verifyError } = await verifyRecoveryOtp(email, code);
      if (verifyError) {
        setError(verifyError);
        return;
      }
      setStep("password");
    } finally {
      setBusy(false);
    }
  };

  const onUpdatePassword = async () => {
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError);
        return;
      }
      await signOut();
      router.replace({
        pathname: "/welcome",
        params: { resetDone: "1", email },
      });
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
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.stepLabel}>
                {step === "email" ? "Step 1 of 3" : step === "code" ? "Step 2 of 3" : "Step 3 of 3"}
              </Text>
              <Text style={styles.title}>
                {step === "email"
                  ? "Forgot password"
                  : step === "code"
                    ? "Enter reset code"
                    : "Choose a new password"}
              </Text>
              <Text style={styles.subtitle}>
                {step === "email"
                  ? "We'll email you a one-time code. You stay signed out until the reset finishes."
                  : step === "code"
                    ? `Enter the 6-digit code we sent to ${email}.`
                    : "After you save, you'll log in again with your new password."}
              </Text>

              {step === "email" && (
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
              )}

              {step === "code" && (
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor={CLEAN_MUTED}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={code}
                  onChangeText={setCode}
                  editable={!busy}
                  accessibilityLabel="Reset code"
                />
              )}

              {step === "password" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={CLEAN_MUTED}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="new-password"
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
                    textContentType="newPassword"
                    value={confirm}
                    onChangeText={setConfirm}
                    editable={!busy}
                    accessibilityLabel="Confirm password"
                  />
                </>
              )}

              {info ? <Text style={styles.info}>{info}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.primary, { opacity: busy ? 0.7 : 1 }]}
                onPress={
                  step === "email"
                    ? onSendCode
                    : step === "code"
                      ? onVerifyCode
                      : onUpdatePassword
                }
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={
                  step === "email"
                    ? "Send reset code"
                    : step === "code"
                      ? "Verify code"
                      : "Save new password"
                }
              >
                {busy ? (
                  <ActivityIndicator color="#fffdf8" />
                ) : (
                  <Text style={styles.primaryText}>
                    {step === "email"
                      ? "Email me a code"
                      : step === "code"
                        ? "Verify code"
                        : "Save password & go to login"}
                  </Text>
                )}
              </Pressable>

              {step === "code" && (
                <Pressable onPress={onSendCode} disabled={busy} accessibilityRole="button">
                  <Text style={styles.link}>Resend code</Text>
                </Pressable>
              )}

              {step !== "email" && !isPasswordRecovery && (
                <Pressable
                  onPress={() => {
                    setError(null);
                    setInfo(null);
                    if (step === "password") setStep("code");
                    else setStep("email");
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>Back</Text>
                </Pressable>
              )}

              <Pressable onPress={goLogin} disabled={busy} accessibilityRole="button">
                <Text style={styles.linkMuted}>Back to login</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CLEAN_BG },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: CLEAN_CARD,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: CLEAN_MUTED,
    marginBottom: 8,
    letterSpacing: 0.3,
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
  info: {
    color: CLEAN_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center",
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
    marginBottom: 14,
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
    marginBottom: 10,
  },
  linkMuted: {
    textAlign: "center",
    color: CLEAN_MUTED,
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4,
  },
});
