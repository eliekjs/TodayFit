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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useWelcome } from "../context/WelcomeContext";

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
  const [isLogin, setIsLogin] = useState(true);

  const enterApp = () => {
    setHasEntered();
    router.replace("/");
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
                  onPress={() => setIsLogin(true)}
                  style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsLogin(false)}
                  style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={[styles.input, styles.inputNonInteractive]}
                placeholder="Email"
                placeholderTextColor={CLEAN_MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={false}
              />
              <TextInput
                style={[styles.input, styles.inputLast, styles.inputNonInteractive]}
                placeholder="Password"
                placeholderTextColor={CLEAN_MUTED}
                secureTextEntry
                editable={false}
              />

              <Text style={styles.previewHint}>
                Preview build: sign-in fields are placeholders. Tap below to use the app.
              </Text>

              {isLogin && (
                <Text style={styles.forgotStatic}>
                  Forgot password? Recovery is not available in this preview.
                </Text>
              )}

              <Pressable
                style={({ pressed }) => [styles.primaryBtnWrap, { opacity: pressed ? 0.9 : 1 }]}
                onPress={enterApp}
              >
                <LinearGradient
                  colors={[CLEAN_ACCENT, CLEAN_ACCENT_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    Continue to app
                  </Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.9 : 1 }]}
                onPress={enterApp}
              >
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.9 : 1 }]}
                onPress={enterApp}
              >
                <Text style={styles.socialBtnText}>Continue with Apple</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Pressable style={styles.helpBtn} onPress={enterApp}>
          <Text style={styles.helpText}>?</Text>
        </Pressable>
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
  inputNonInteractive: {
    pointerEvents: "none",
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
  forgotStatic: {
    fontSize: 13,
    alignSelf: "center",
    textAlign: "center",
    marginBottom: 16,
    color: CLEAN_MUTED,
    fontWeight: "400",
  },
  primaryBtnWrap: {
    marginBottom: 20,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  helpBtn: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CLEAN_CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CLEAN_BORDER,
  },
  helpText: {
    fontSize: 20,
    fontWeight: "600",
    color: CLEAN_TEXT,
  },
});
