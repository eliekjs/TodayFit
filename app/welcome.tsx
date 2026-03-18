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
import { GeometricPatternBackground } from "../components/GeometricPatternBackground";

// Landing: dark teal/blue, geometric feel, logo in teal rounded square, frosted card
const BG_DARK = "#0e3d4d"; // deep teal-blue
const BG_TOP = "#0a2f3d";
const LOGO_BG = "#2dd4bf"; // vibrant teal (rounded square behind icon)
const TAGLINE_GREEN = "#86efac"; // light green slogan
const FROSTED_CARD = "rgba(255,255,255,0.08)";
const INPUT_BG = "rgba(0,0,0,0.25)";
const FORGOT_GREEN = "#4ade80";
const BTN_GRADIENT_LEFT = "#22c55e";
const BTN_GRADIENT_RIGHT = "#3b82f6";
const SOCIAL_BG = "rgba(0,0,0,0.2)";

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
      <StatusBar style="light" />
      <View style={styles.bgBase} />
      <GeometricPatternBackground />
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
                <Ionicons name="barbell" size={36} color="#fff" />
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
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.5)"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={false}
                pointerEvents="none"
              />
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                secureTextEntry
                editable={false}
                pointerEvents="none"
              />

              {isLogin && (
                <Pressable onPress={enterApp} style={styles.forgotWrap}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [styles.primaryBtnWrap, { opacity: pressed ? 0.9 : 1 }]}
                onPress={enterApp}
              >
                <LinearGradient
                  colors={[BTN_GRADIENT_LEFT, BTN_GRADIENT_RIGHT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {isLogin ? "Login" : "Create Account"}
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
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_DARK,
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
    backgroundColor: LOGO_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    elevation: 4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: TAGLINE_GREEN,
    textAlign: "center",
  },
  authCard: {
    backgroundColor: FROSTED_CARD,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  toggleTextActive: {
    color: "#0f172a",
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
  },
  inputLast: {
    marginBottom: 8,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    color: FORGOT_GREEN,
    fontWeight: "500",
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
    color: "#fff",
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
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  socialBtn: {
    backgroundColor: SOCIAL_BG,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  helpBtn: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SOCIAL_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  helpText: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
});
