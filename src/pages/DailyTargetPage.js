// FILE: src/pages/DailyTargetPage.js — React Native Expo version
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,  ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getMyStats, getTodayVisits } from "../api/visitApi";
import { Ionicons } from "@expo/vector-icons";

export default function DailyTargetPage() {
  const navigation = useNavigation();
  const [target, setTarget]       = useState(20);
  const [completed, setCompleted] = useState(0);
  const [pending, setPending]     = useState(0);
  const [rejected, setRejected]   = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getMyStats(), getTodayVisits()]).then(([stats, today]) => {
      const v = today.visits || [];
      setTarget(stats.dailyTarget || 20);
      setCompleted(v.filter(x => x.status === "Completed").length);
      setPending(v.filter(x => x.status === "Pending").length);
      setRejected(v.filter(x => x.status === "Rejected").length);
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, []);

  const pct       = target > 0 ? Math.round((completed / target) * 100) : 0;
  const remaining = Math.max(target - completed, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#bfdbfe" / ></TouchableOpacity>
        <Text style={s.headerTitle}>Daily Target</Text>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1d4ed8" /> :
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Progress */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Today's Progress</Text>
          <View style={s.circleWrap}>
            <View style={s.circle}>
              <Text style={s.circleNum}>{pct}%</Text>
              <Text style={s.circleSub}>done</Text>
            </View>
          </View>
          <Text style={{ textAlign: "center", color: "#374151", fontSize: 15 }}>
            <Text style={{ fontWeight: "700", fontSize: 22, color: "#111827" }}>{completed}</Text> of {target} shops visited
          </Text>
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[{ label: "Completed", val: completed, bg: "#f0fdf4", col: "#16a34a" },
            { label: "Pending",   val: pending,   bg: "#fffbeb", col: "#d97706" },
            { label: "Rejected",  val: rejected,  bg: "#fef2f2", col: "#ef4444" }].map(x => (
            <View key={x.label} style={[s.statBox, { backgroundColor: x.bg, flex: 1 }]}>
              <Text style={[s.statNum, { color: x.col }]}>{x.val}</Text>
              <Text style={s.statLabel}>{x.label}</Text>
            </View>
          ))}
        </View>

        {/* Remaining */}
        <View style={s.remainBox}>
          <Text style={s.remainLabel}>Remaining Today</Text>
          <Text style={s.remainNum}>{remaining}</Text>
          <Text style={s.remainSub}>shops left to visit</Text>
        </View>

        <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate("VisitShop")} activeOpacity={0.8}>
          <Text style={s.ctaBtnText}>+ Start a Visit</Text>
        </TouchableOpacity>
      </ScrollView>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card:        { backgroundColor: "#fff", borderRadius: 18, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  cardLabel:   { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 },
  circleWrap:  { width: 120, height: 120, borderRadius: 60, borderWidth: 10, borderColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  circle:      { alignItems: "center" },
  circleNum:   { fontSize: 28, fontWeight: "700", color: "#1d4ed8" },
  circleSub:   { fontSize: 12, color: "#9ca3af" },
  statBox:     { borderRadius: 14, padding: 14, alignItems: "center" },
  statNum:     { fontSize: 26, fontWeight: "700" },
  statLabel:   { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  remainBox:   { backgroundColor: "#1d4ed8", borderRadius: 18, padding: 20, alignItems: "center" },
  remainLabel: { fontSize: 11, color: "#bfdbfe", textTransform: "uppercase" },
  remainNum:   { fontSize: 48, fontWeight: "700", color: "#fff" },
  remainSub:   { fontSize: 12, color: "#bfdbfe" },
  ctaBtn:      { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  ctaBtnText:  { color: "#fff", fontSize: 16, fontWeight: "600" },
});