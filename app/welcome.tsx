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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { AUTH_COPY } from "../lib/authCopy";
import { APP_CANVAS_BACKGROUND, themeFonts } from "../lib/theme";
import { useBusyLabel } from "../lib/useAnimatedEllipsis";
import { SeshLogicMark } from "../components/SeshLogicMark";

const AUTH_UI = {
  background: APP_CANVAS_BACKGROUND,
  ink: "#1A1A1A",
  muted: "#666666",
  placeholder: "#A3A3A3",
  accent: "#315F6A",
  field: "#FFFFFF",
  fieldBorder: "#E2E0D8",
  onAccent: "#FFFFFF",
  danger: "#B91C1C",
} as const;

export default function WelcomeScreen() {
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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(
    params.resetDone === "1" ? AUTH_COPY.passwordUpdated : null
  );
  const resendLabel = useBusyLabel(
    resendBusy ? "Sending…" : "Resend confirmation email",
    resendBusy
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
            <View style={styles.brandRow}>
              <SeshLogicMark size={36} background={AUTH_UI.accent} />
              <Text style={styles.brandName}>SESHLOGIC</Text>
            </View>

            <Text style={styles.kicker}>BUILT FOR YOUR SPORT</Text>
            <Text style={styles.headline}>
              {`TRAIN WITH\nPURPOSE.`}
            </Text>
            <Text style={styles.body}>
              Generate hyper-tailored strength and conditioning sessions designed around
              your athletic goals.
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@yourdomain.com"
                placeholderTextColor={AUTH_UI.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                accessibilityLabel="Email Address"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={AUTH_UI.placeholder}
                  secureTextEntry={!showPassword}
                  textContentType={isLogin ? "password" : "newPassword"}
                  autoComplete={isLogin ? "password" : "new-password"}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={AUTH_UI.muted}
                  />
                </Pressable>
              </View>
            </View>

            {isLogin ? (
              <Pressable
                onPress={onForgotPassword}
                disabled={busy || resendBusy}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            ) : (
              <View style={styles.forgotWrap} />
            )}

            {!isAuthConfigured ? (
              <Text style={styles.previewHint}>{AUTH_COPY.welcomePreviewHint}</Text>
            ) : null}

            {formInfo ? <Text style={styles.infoText}>{formInfo}</Text> : null}
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            {isLogin && needsConfirmation ? (
              <Pressable
                onPress={onResendConfirmation}
                disabled={busy || resendBusy}
                accessibilityRole="button"
                accessibilityLabel="Resend confirmation email"
                style={{ marginBottom: 12 }}
              >
                <Text style={styles.resendLink}>
                  {resendLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: pressed || busy ? 0.88 : 1 },
              ]}
              onPress={onSubmit}
              disabled={busy || resendBusy}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? "Log In" : "Sign Up"}
            >
              {busy ? (
                <ActivityIndicator color={AUTH_UI.onAccent} />
              ) : (
                <Text style={styles.primaryBtnText}>{isLogin ? "Log In" : "Sign Up"}</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              {isLogin ? (
                <Text style={styles.footerText}>
                  Don't have an account?{" "}
                  <Text
                    onPress={() => {
                      setIsLogin(false);
                      setFormError(null);
                    }}
                    style={styles.footerAction}
                    accessibilityRole="link"
                  >
                    Sign Up
                  </Text>
                </Text>
              ) : (
                <Text style={styles.footerText}>
                  Already have an account?{" "}
                  <Text
                    onPress={() => {
                      setIsLogin(true);
                      setFormError(null);
                    }}
                    style={styles.footerAction}
                    accessibilityRole="link"
                  >
                    Log In
                  </Text>
                </Text>
              )}
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
    backgroundColor: AUTH_UI.background,
  },
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 36,
  },
  brandName: {
    fontFamily: themeFonts.displayBold,
    fontSize: 22,
    letterSpacing: 0.6,
    color: AUTH_UI.ink,
  },
  kicker: {
    fontFamily: themeFonts.displayMedium,
    fontSize: 13,
    letterSpacing: 1.4,
    color: AUTH_UI.accent,
    marginBottom: 10,
  },
  headline: {
    fontFamily: themeFonts.displayBold,
    fontSize: 44,
    letterSpacing: -0.6,
    // Oswald ascenders clip on iOS when lineHeight ≈ fontSize.
    lineHeight: 54,
    paddingTop: Platform.OS === "ios" ? 6 : 0,
    color: AUTH_UI.ink,
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: AUTH_UI.muted,
    marginBottom: 32,
    maxWidth: 340,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_UI.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AUTH_UI.field,
    borderWidth: 1,
    borderColor: AUTH_UI.fieldBorder,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: AUTH_UI.ink,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AUTH_UI.field,
    borderWidth: 1,
    borderColor: AUTH_UI.fieldBorder,
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: AUTH_UI.ink,
  },
  eyeBtn: {
    padding: 10,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 22,
    minHeight: 20,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_UI.accent,
    textDecorationLine: "underline",
  },
  previewHint: {
    fontSize: 13,
    color: AUTH_UI.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: AUTH_UI.danger,
    marginBottom: 12,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 13,
    color: AUTH_UI.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_UI.accent,
    textDecorationLine: "underline",
  },
  primaryBtn: {
    backgroundColor: AUTH_UI.accent,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: AUTH_UI.onAccent,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 28,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: AUTH_UI.muted,
  },
  footerAction: {
    color: AUTH_UI.accent,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
