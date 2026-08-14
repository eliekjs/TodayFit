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
import { AUTH_COPY } from "../../lib/authCopy";
import { themeRadius, useTheme } from "../../lib/theme";

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
  const theme = useTheme();
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
      setError(AUTH_COPY.invalidEmail);
      return;
    }
    if (!isAuthConfigured) {
      setError(AUTH_COPY.authUnavailable);
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
      setInfo(AUTH_COPY.resetCodeSent);
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
      setError(AUTH_COPY.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(AUTH_COPY.passwordsMismatch);
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderRadius: themeRadius.card,
                },
              ]}
            >
              <Text style={[styles.stepLabel, { color: theme.textMuted }]}>
                {step === "email" ? "Step 1 of 3" : step === "code" ? "Step 2 of 3" : "Step 3 of 3"}
              </Text>
              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                {step === "email"
                  ? "Forgot password"
                  : step === "code"
                    ? "Enter reset code"
                    : "Choose a new password"}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {step === "email"
                  ? AUTH_COPY.resetEmailStepSubtitle
                  : step === "code"
                    ? AUTH_COPY.resetCodeStepSubtitle(email)
                    : AUTH_COPY.resetPasswordStepSubtitle}
              </Text>

              {step === "email" && (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.card,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={theme.textMuted}
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
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.card,
                    },
                  ]}
                  placeholder="6-digit code"
                  placeholderTextColor={theme.textMuted}
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
                    style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.card,
                    },
                  ]}
                    placeholder="New password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="new-password"
                    value={password}
                    onChangeText={setPassword}
                    editable={!busy}
                    accessibilityLabel="New password"
                  />
                  <TextInput
                    style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.card,
                    },
                  ]}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    textContentType="newPassword"
                    value={confirm}
                    onChangeText={setConfirm}
                    editable={!busy}
                    accessibilityLabel="Confirm password"
                  />
                </>
              )}

              {info ? (
                <Text style={[styles.info, { color: theme.textMuted }]}>{info}</Text>
              ) : null}
              {error ? (
                <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.primary,
                  { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 },
                ]}
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
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={[styles.primaryText, { color: theme.onPrimary }]}>
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
                  <Text style={[styles.link, { color: theme.primary }]}>Resend code</Text>
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
                  <Text style={[styles.link, { color: theme.primary }]}>Back</Text>
                </Pressable>
              )}

              <Pressable onPress={goLogin} disabled={busy} accessibilityRole="button">
                <Text style={[styles.linkMuted, { color: theme.textMuted }]}>Back to login</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    padding: 24,
    borderWidth: 1,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.85,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  info: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center",
  },
  error: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  primary: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryText: {
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 10,
  },
  linkMuted: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4,
  },
});
