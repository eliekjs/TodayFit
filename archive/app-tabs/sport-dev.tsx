/**
 * Dev-only screen to verify Sport Mode data layer:
 * - Load sports and qualities
 * - Save a user_sport_profile and read it back
 * - RLS: cannot read another user's profile (we only read own)
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../lib/theme";
import { isDbConfigured, getSupabase } from "../../lib/db";
import {
  getSportCategories,
  getQualitiesForSport,
  getLatestUserSportProfile,
  upsertUserSportProfile,
} from "../../lib/db";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function SportDevScreen() {
  const theme = useTheme();
  const [status, setStatus] = useState<string>("");
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [qualitiesForClimbing, setQualitiesForClimbing] = useState<string[]>([]);
  const [profileResult, setProfileResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isDbConfigured()) {
      setStatus("DB not configured (missing env vars)");
      return;
    }
    setStatus("DB configured");
  }, []);

  const loadSportsAndQualities = async () => {
    setError("");
    try {
      const cats = await getSportCategories();
      setCategories(cats.map((c) => ({ category: c.category, count: c.sports.length })));
      const qualities = await getQualitiesForSport("climbing");
      setQualitiesForClimbing(qualities.map((q) => q.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const saveAndReadProfile = async () => {
    setError("");
    setProfileResult("");
    try {
      await upsertUserSportProfile(TEST_USER_ID, {
        sportId: null,
        seasonPhase: "off_season",
        notes: "Dev test",
        qualityIds: [],
      });
      const latest = await getLatestUserSportProfile(TEST_USER_ID);
      setProfileResult(latest ? `Saved & read back: id=${latest.id}` : "Saved but read back null");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const checkRls = async () => {
    setError("");
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id;
      if (!uid) {
        setProfileResult("RLS check: Not signed in. Sign in to verify RLS (own rows only).");
        return;
      }
      const otherUserId = "00000000-0000-0000-0000-000000000002";
      const profile = await getLatestUserSportProfile(otherUserId);
      setProfileResult(
        profile === null
          ? "RLS OK: Cannot read another user's profile (got null)."
          : "RLS issue: Read another user's profile!"
      );
    } catch (e) {
      setProfileResult("RLS check error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (!__DEV__) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Not available in production.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>Sport Mode DB (Dev)</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{status}</Text>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.btn, { backgroundColor: theme.primary }]}
        onPress={loadSportsAndQualities}
      >
        <Text style={styles.btnText}>Load sports & qualities</Text>
      </Pressable>
      {categories.length > 0 && (
        <Text style={[styles.result, { color: theme.text }]}>
          Categories: {categories.map((c) => `${c.category} (${c.count})`).join(", ")}
        </Text>
      )}
      {qualitiesForClimbing.length > 0 && (
        <Text style={[styles.result, { color: theme.text }]}>
          Qualities for climbing: {qualitiesForClimbing.join(", ")}
        </Text>
      )}

      <Pressable
        style={[styles.btn, { backgroundColor: theme.primary }]}
        onPress={saveAndReadProfile}
      >
        <Text style={styles.btnText}>Save test profile & read back</Text>
      </Pressable>
      {profileResult ? (
        <Text style={[styles.result, { color: theme.text }]}>{profileResult}</Text>
      ) : null}

      <Pressable style={[styles.btn, { backgroundColor: theme.card }]} onPress={checkRls}>
        <Text style={[styles.btnText, { color: theme.text }]}>Check RLS (own rows only)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  error: { fontSize: 14 },
  btn: { padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  result: { fontSize: 13 },
});
