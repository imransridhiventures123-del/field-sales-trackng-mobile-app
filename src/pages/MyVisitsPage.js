// FILE: src/pages/MyVisitsPage.js
// FIX: Tabs were disappearing on scroll. Moved tabs into a fixed View
// with borderBottom so they stick at top. Content ScrollView has flex:1
// so it fills remaining space and scrolls independently of the tabs.

import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons }      from "@expo/vector-icons";
import ShopVisitCard from "../components/ShopVisitCard";
import { getMyVisits } from "../api/visitApi";

const TABS = [
  { key: "All",         label: "All",         icon: "list-outline"      },
  { key: "Field Sales", label: "Field Sales",  icon: "briefcase-outline" },
  { key: "Collection",  label: "Collection",   icon: "wallet-outline"    },
  { key: "Follow-up",   label: "Follow-up",    icon: "calendar-outline"  },
];

const hasActiveFollowup = (v) => !!(v.followUp?.needed && v.followUp?.status);
const isTodayFollowup   = (v) => {
  if (!v.followUp?.needed || !v.followUp?.date) return false;
  return v.followUp.date === new Date().toISOString().split("T")[0];
};

export default function MyVisitsPage() {
  const navigation = useNavigation();
  const [tab, setTab]     = useState("All");
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayFollowups, setTodayFollowups] = useState([]);

  // TASK 2 FIX: useFocusEffect — reloads data every time tab is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getMyVisits()
        .then((d) => {
          const data = d.visits || [];
          setVisits(data);
          setTodayFollowups(data.filter(isTodayFollowup));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [])
  );

  const filtered = visits.filter((v) => {
    if (tab === "All") return true;
    if (tab === "Follow-up") return hasActiveFollowup(v);
    return v.fieldType === tab;
  });

  const counts = {
    "All":        visits.length,
    "Field Sales": visits.filter(v => v.fieldType === "Field Sales").length,
    "Collection":  visits.filter(v => v.fieldType === "Collection").length,
    "Follow-up":   visits.filter(hasActiveFollowup).length,
  };

  return (
    <SafeAreaView style={s.screen}>

      {/* ── HEADER — always visible ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#bfdbfe" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Visits</Text>
        {todayFollowups.length > 0 && (
          <View style={s.badge}>
            <Ionicons name="notifications-outline" size={11} color="#78350f" />
            <Text style={s.badgeText}>{todayFollowups.length} today</Text>
          </View>
        )}
      </View>

      {/* ── TABS — sticky, never scrolls away ── */}
      {/* Key fix: this View has fixed height with borderBottom.
          It is NOT inside the content ScrollView, so it never scrolls. */}
      <View style={s.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsContent}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[s.tab, active && s.tabActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={active ? "#fff" : "#6b7280"}
                />
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {t.label}
                  {counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT — flex:1 so it fills remaining space and scrolls ── */}
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            [1, 2, 3].map(i => (
              <View key={i} style={s.skeleton} />
            ))
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="storefront-outline" size={40} color="#d1d5db" />
              <Text style={s.emptyText}>
                No {tab === "All" ? "" : tab} visits yet.
              </Text>
            </View>
          ) : (
            filtered.map((v) => (
              <ShopVisitCard key={v._id} visit={v} isFollowupToday={isTodayFollowup(v)} />
            ))
          )}
        </ScrollView>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#f8faff" },

  // Header
  header:       { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  badge:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fbbf24", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:    { color: "#78350f", fontSize: 11, fontWeight: "700" },

  // Tabs — fixed strip, explicit height
  tabsBar:      { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tabsContent:  { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: "row" },
  tab:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  tabActive:    { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  tabText:      { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  tabTextActive:{ color: "#fff" },

  // Content states
  skeleton:     { height: 88, backgroundColor: "#e5e7eb", borderRadius: 14, marginBottom: 10 },
  empty:        { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText:    { color: "#9ca3af", fontSize: 14 },
});