// FILE: src/pages/VisitSummaryPage.js — React Native Expo version
// FIXES:
//  1. ✅ emoji → Ionicons checkmark-circle (emoji render nahi hota Android pe)
//  2. navigation.navigate("Home") → navigation.navigate("Main", { screen: "Home" })
//     Tab screens stack ke andar hain, seedha naam se navigate nahi hota
//  3. Professional icons on all buttons
//  4. Animated success state

import { useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing,
} from "react-native";
import { SafeAreaView }  from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons }      from "@expo/vector-icons";

export default function VisitSummaryPage() {
  const navigation = useNavigation();

  // Scale animation for success icon
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // ── Navigation helpers ──────────────────────────────────────
  // Tab screens ("Home", "Visits", etc.) live inside "Main" stack screen.
  // From a non-tab screen, navigate like this:
  const goHome    = () => navigation.navigate("Main", { screen: "Home"    });
  const goVisits  = () => navigation.navigate("Main", { screen: "Visits"  });
  const goVisit   = () => navigation.navigate("VisitShop");
  const goEndOfDay= () => navigation.navigate("EndOfDay");

  return (
    <SafeAreaView style={s.container}>

      {/* Success icon with animation */}
      <Animated.View style={[s.iconWrap, { transform: [{ scale }], opacity }]}>
        <Ionicons name="checkmark" size={44} color="#fff" />
      </Animated.View>

      <Animated.View style={{ opacity, alignItems: "center" }}>
        <Text style={s.title}>Visit Submitted!</Text>
        <Text style={s.sub}>Great work today! Keep it up 🎯</Text>
      </Animated.View>

      {/* Summary stats row */}
      <Animated.View style={[s.statsRow, { opacity }]}>
        {[
          { icon: "checkmark-circle-outline", label: "Logged",   color: "#16a34a" },
          { icon: "cloud-upload-outline",     label: "Synced",   color: "#1d4ed8" },
          { icon: "location-outline",         label: "GPS Saved", color: "#7c3aed" },
        ].map((item) => (
          <View key={item.label} style={s.statItem}>
            <Ionicons name={item.icon} size={22} color={item.color} />
            <Text style={[s.statLabel, { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Action buttons */}
      <Animated.View style={[s.btns, { opacity }]}>

        {/* Primary — start another visit */}
        <TouchableOpacity style={s.primaryBtn} onPress={goVisit} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.primaryBtnText}>Start Another Visit</Text>
        </TouchableOpacity>

        {/* End of day report */}
        <TouchableOpacity style={s.outlineBtn} onPress={goEndOfDay} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={17} color="#1d4ed8" />
          <Text style={s.outlineBtnText}>End of Day — Send Report</Text>
        </TouchableOpacity>

        {/* View my visits */}
        <TouchableOpacity style={s.ghostBtn} onPress={goVisits} activeOpacity={0.85}>
          <Ionicons name="list-outline" size={17} color="#374151" />
          <Text style={s.ghostBtnText}>View My Visits</Text>
        </TouchableOpacity>

        {/* Back to home */}
        <TouchableOpacity style={s.textBtn} onPress={goHome} activeOpacity={0.7}>
          <Ionicons name="home-outline" size={14} color="#9ca3af" />
          <Text style={s.textBtnText}>Back to Home</Text>
        </TouchableOpacity>

      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f8faff", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  iconWrap:       { width: 88, height: 88, borderRadius: 44, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", marginBottom: 20, shadowColor: "#22c55e", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  title:          { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 6, textAlign: "center" },
  sub:            { fontSize: 15, color: "#6b7280", marginBottom: 28, textAlign: "center" },
  statsRow:       { flexDirection: "row", gap: 24, marginBottom: 36 },
  statItem:       { alignItems: "center", gap: 4 },
  statLabel:      { fontSize: 11, fontWeight: "700" },
  btns:           { width: "100%", gap: 10 },

  primaryBtn:     { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#1d4ed8", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  outlineBtn:     { borderWidth: 2, borderColor: "#1d4ed8", borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  outlineBtnText: { color: "#1d4ed8", fontSize: 15, fontWeight: "600" },

  ghostBtn:       { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff" },
  ghostBtnText:   { color: "#374151", fontSize: 15, fontWeight: "600" },

  textBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, marginTop: 2 },
  textBtnText:    { color: "#9ca3af", fontSize: 13 },
});                   