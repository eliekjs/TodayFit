import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { AUTH_COPY } from "../lib/authCopy";
import { themeRadius, useTheme } from "../lib/theme";
import { PillTabs } from "../components/PillTabs";

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; resetDone?: string }>();
  const {
    isAuthConfigured,
    signInWithPassword,
    signUpWithPassword,
    resendConfirmationEmail,
    authLinkError,
    clearAuthLinkError,
    emailJustConfirmed,
    clearEmailJustConfirmed,
    userId,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : ""
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(
    params.resetDone === "1" ? AUTH_COPY.passwordUpdated : null
  );

  useEffect(() => {
    if (authLinkError) {
      setFormError(authLinkError);
      setFormInfo(null);
      clearAuthLinkError();
    }
  }, [authLinkError, clearAuthLinkError]);

  useEffect(() => {
    if (!emailJustConfirmed) return;
    setFormError(null);
    setNeedsConfirmation(false);
    if (userId) {
      clearEmailJustConfirmed();
      router.replace("/");
      return;
    }
    setIsLogin(true);
    setFormInfo(AUTH_COPY.emailConfirmed);
    clearEmailJustConfirmed();
  }, [emailJustConfirmed, userId, clearEmailJustConfirmed, router]);

  const enterAfterAuth = () => {
    router.replace("/");
  };

  const onSubmit = async () => {
    setFormError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setFormError(AUTH_COPY.enterEmailPassword);
      return;
    }
    if (password.length < 6) {
      setFormError(AUTH_COPY.passwordTooShort);
      return;
    }
    if (!isAuthConfigured) {
      setFormError(AUTH_COPY.authUnavailable);
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        const { error, emailNotConfirmed } = await signInWithPassword(trimmed, password);
        if (error) {
          setFormError(error);
          if (emailNotConfirmed) {
            setNeedsConfirmation(true);
            setFormInfo(AUTH_COPY.checkEmailConfirm(trimmed));
          }
          return;
        }
        setNeedsConfirmation(false);
        enterAfterAuth();
        return;
      }
      const { error, needsEmailConfirmation } = await signUpWithPassword(trimmed, password);
      if (error) {
        setFormError(error);
        return;
      }
      if (needsEmailConfirmation) {
        setIsLogin(true);
        setNeedsConfirmation(true);
        setFormInfo(AUTH_COPY.checkEmailConfirm(trimmed));
        setFormError(null);
        return;
      }
      enterAfterAuth();
    } finally {
      setBusy(false);
    }
  };

  const onResendConfirmation = async () => {
    setFormError(null);
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setFormError(AUTH_COPY.enterSignupEmailForResend);
      return;
    }
    if (!isAuthConfigured) {
      setFormError(AUTH_COPY.authUnavailable);
      return;
    }
    setResendBusy(true);
    try {
      const { error } = await resendConfirmationEmail(trimmed);
      if (error) {
        setFormError(error);
        return;
      }
      setNeedsConfirmation(true);
      setFormInfo(AUTH_COPY.confirmationResent);
    } finally {
      setResendBusy(false);
    }
  };

  const onForgotPassword = () => {
    setFormError(null);
    setFormInfo(null);
    setNeedsConfirmation(false);
    router.push({
      pathname: "/auth/forgot-password",
      params: email.trim() ? { email: email.trim() } : undefined,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
              <Text style={[styles.brandName, { color: theme.text }]}>
                SeshLogic
              </Text>
              <Text style={[styles.tagline, { color: theme.textMuted }]}>
                Gym sessions for your sport and goals.
              </Text>
            </View>

            <View
              style={[
                styles.authCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderRadius: themeRadius.card,
                },
              ]}
            >
              <PillTabs
                tabs={[
                  { key: "login", label: "Login" },
                  { key: "signup", label: "Sign up" },
                ]}
                value={isLogin ? "login" : "signup"}
                onChange={(key) => {
                  setIsLogin(key === "login");
                  setFormError(null);
                }}
                style={{ marginBottom: 20 }}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
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
              <TextInput
                style={[
                  styles.input,
                  styles.inputLast,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                textContentType={isLogin ? "password" : "newPassword"}
                autoComplete={isLogin ? "password" : "new-password"}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                accessibilityLabel="Password"
              />

              {!isAuthConfigured && (
                <Text style={[styles.previewHint, { color: theme.textMuted }]}>
                  {AUTH_COPY.welcomePreviewHint}
                </Text>
              )}

              {formInfo ? (
                <Text style={[styles.infoText, { color: theme.textMuted }]}>{formInfo}</Text>
              ) : null}
              {formError ? (
                <Text style={[styles.errorText, { color: theme.danger }]}>{formError}</Text>
              ) : null}

              {isLogin && needsConfirmation ? (
                <Pressable
                  onPress={onResendConfirmation}
                  disabled={busy || resendBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Resend confirmation email"
                >
                  <Text style={[styles.forgotLink, { color: theme.primarySolid }]}>
                    {resendBusy ? "Sending…" : "Resend confirmation email"}
                  </Text>
                </Pressable>
              ) : null}

              {isLogin && (
                <Pressable
                  onPress={onForgotPassword}
                  disabled={busy || resendBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={[styles.forgotLink, { color: theme.primarySolid }]}>
                    Forgot password?
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || busy ? 0.85 : 1,
                  },
                ]}
                onPress={onSubmit}
                disabled={busy || resendBusy}
                accessibilityRole="button"
                accessibilityLabel={isLogin ? "Log in" : "Sign up"}
              >
                {busy ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>
                    {isLogin ? "Log in" : "Create account"}
                  </Text>
                )}
              </Pressable>
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
    gap: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
  },
  authCard: {
    padding: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  inputLast: {
    marginBottom: 10,
  },
  previewHint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  forgotLink: {
    fontSize: 13,
    alignSelf: "center",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: themeRadius.button,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginBottom: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
