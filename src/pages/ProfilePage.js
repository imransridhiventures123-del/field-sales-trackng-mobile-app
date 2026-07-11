// FILE: src/pages/ProfilePage.js — React Native Expo version
// FIXES:
//  1. Better UI — hero card, section cards with icons, clean typography
//  2. Pull-to-refresh syncs latest profile from backend (/api/auth/me)
//     → when admin updates profile in dashboard, employee sees it here

import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, Alert, RefreshControl, Linking,
} from "react-native";
import { SafeAreaView }  from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons }      from "@expo/vector-icons";
import { useAuth }       from "../context/AuthContext";
import axiosInstance     from "../api/axiosInstance";

// ── Info row ─────────────────────────────────────────────────
function InfoRow({ icon, label, value, mono, color }) {
  if (!value || value === "—") return null;
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={14} color="#9ca3af" />
      </View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, mono && { fontFamily: "monospace" }, color && { color }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ── Section card ─────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon} size={14} color="#1d4ed8" />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <View style={s.divider} />
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigation          = useNavigation();
  const { user, login, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  // ── Pull to refresh — fetches latest from backend ─────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res  = await axiosInstance.get("/api/auth/me");
      const fresh = res.data.user || res.data;
      // Update stored user (AuthContext login reuses the existing token)
      const token = (await import("@react-native-async-storage/async-storage")).default
        .getItem("maavu_token").then(t => t);
      // Simpler: just update user state directly
      await import("@react-native-async-storage/async-storage").then(async ({ default: AS }) => {
        const tok = await AS.getItem("maavu_token");
        if (tok) await login(tok, fresh);
      });
    } catch (err) {
      console.error("Profile refresh error:", err.message);
    } finally {
      setRefreshing(false);
    }
  }, [login]);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            // ← NO navigation.replace("Login") here
            // AppNavigator's {token ? Main : Auth} conditional
            // automatically switches to Login when token is cleared
          },
        },
      ]
    );
  };

  const dob = user?.dob
    ? new Date(user.dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4ff" }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color="#bfdbfe" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1d4ed8"
            colors={["#1d4ed8"]}
          />
        }
      >
        {/* ── Hero card ── */}
        <View style={s.heroWrap}>
          <View style={s.heroCard}>
            {/* Photo */}
            <View style={s.photoWrap}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={s.photo} />
              ) : (
                <View style={[s.photo, s.photoFallback]}>
                  <Text style={s.photoInitials}>{initials}</Text>
                </View>
              )}
              <View style={[s.onlineDot, { backgroundColor: "#d1d5db" }]} />
            </View>

            {/* Name & role */}
            <Text style={s.heroName}>{user?.name || "Employee"}</Text>
            <View style={s.roleBadge}>
              <Ionicons name="briefcase-outline" size={11} color="#1d4ed8" />
              <Text style={s.roleBadgeText}>Field Sales Employee</Text>
            </View>
            <Text style={s.heroId}>{user?.employeeId || "—"}</Text>

            {/* Quick stats */}
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Ionicons name="call-outline" size={16} color="#1d4ed8" />
                <Text style={s.heroStatVal}>+91 {user?.mobile || "—"}</Text>
              </View>
              {user?.salary && (
                <View style={s.heroStat}>
                  <Ionicons name="cash-outline" size={16} color="#16a34a" />
                  <Text style={s.heroStatVal}>₹{Number(user.salary).toLocaleString("en-IN")}/mo</Text>
                </View>
              )}
            </View>

            {/* Pull to refresh hint */}
            <Text style={s.refreshHint}>
              <Ionicons name="arrow-down-outline" size={11} color="#9ca3af" /> Pull down to sync latest data from admin
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>

          {/* Personal info */}
          <Section title="Personal Information" icon="person-outline">
            <InfoRow icon="person-outline"    label="Full Name"     value={user?.name}            />
            <InfoRow icon="call-outline"       label="Mobile"        value={user?.mobile ? `+91 ${user.mobile}` : "—"} color="#1d4ed8" />
            <InfoRow icon="calendar-outline"   label="Date of Birth" value={dob}                   />
            <InfoRow icon="time-outline"       label="Age"           value={user?.age ? `${user.age} years` : "—"} />
            <InfoRow icon="location-outline"   label="Address"       value={user?.address}          />
          </Section>

          {/* Work info */}
          <Section title="Work Details" icon="briefcase-outline">
            <InfoRow icon="id-card-outline"   label="Employee ID"   value={user?.employeeId} mono />
            <InfoRow icon="cash-outline"      label="Salary"        value={user?.salary ? `₹${Number(user.salary).toLocaleString("en-IN")} / month` : "—"} color="#16a34a" />
            <InfoRow icon="shield-outline"    label="Role"          value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "—"} />
          </Section>

          {/* Identity (masked) */}
          <Section title="Identity Documents" icon="card-outline">
            <InfoRow icon="finger-print-outline" label="Aadhaar" value={user?.aadhaar ? `XXXX XXXX ${user.aadhaar.replace(/\s/g,"").slice(-4)}` : "—"} mono />
            <InfoRow icon="document-text-outline" label="PAN"    value={user?.pan} mono />
          </Section>

          {/* Contact admin card */}
          <View style={s.adminCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.adminCardTitle}>Need to update your details?</Text>
              <Text style={s.adminCardSub}>Contact your admin to update profile or reset password.</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL("tel:8939720567")}
              style={s.callAdminBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={14} color="#fff" />
              <Text style={s.callAdminText}>Call Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Header
  header:         { backgroundColor: "#1d4ed8", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle:    { color: "#fff", fontSize: 18, fontWeight: "700" },
  refreshBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  // Hero
  heroWrap:       { backgroundColor: "#1d4ed8", paddingBottom: 32, paddingHorizontal: 16 },
  heroCard:       { backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", shadowColor: "#1d4ed8", shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  photoWrap:      { position: "relative", marginBottom: 12 },
  photo:          { width: 90, height: 90, borderRadius: 28, borderWidth: 3, borderColor: "#dbeafe" },
  photoFallback:  { backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center" },
  photoInitials:  { color: "#fff", fontSize: 30, fontWeight: "700" },
  onlineDot:      { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: "#fff" },
  heroName:       { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 6 },
  roleBadge:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 6 },
  roleBadgeText:  { fontSize: 12, color: "#1d4ed8", fontWeight: "600" },
  heroId:         { fontSize: 12, color: "#9ca3af", fontFamily: "monospace", marginBottom: 14 },
  heroStats:      { flexDirection: "row", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 },
  heroStat:       { flexDirection: "row", alignItems: "center", gap: 5 },
  heroStatVal:    { fontSize: 13, fontWeight: "600", color: "#374151" },
  refreshHint:    { fontSize: 11, color: "#d1d5db", textAlign: "center" },

  // Section card
  card:           { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, elevation: 1 },
  cardHeader:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  cardTitle:      { fontSize: 12, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
  divider:        { height: 1, backgroundColor: "#f3f4f6" },

  // Info rows
  infoRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  infoIcon:       { width: 24, alignItems: "center" },
  infoLabel:      { fontSize: 12, color: "#9ca3af", width: 100 },
  infoValue:      { flex: 1, fontSize: 13, fontWeight: "600", color: "#111827", textAlign: "right" },

  // Admin card
  adminCard:      { backgroundColor: "#fffbeb", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#fde68a" },
  adminCardTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  adminCardSub:   { fontSize: 11, color: "#b45309", marginTop: 2, lineHeight: 16 },
  callAdminBtn:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f59e0b", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  callAdminText:  { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Logout
  logoutBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fef2f2", borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: "#fecaca" },
  logoutText:     { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});