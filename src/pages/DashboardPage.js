// FILE: src/pages/DashboardPage.js — React Native Expo version
// Google Maps not embedded here (admin-only feature) — dashboard shows stats + online toggle
import { SafeAreaView } from "react-native-safe-area-context";

import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,  Modal, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import ShopVisitCard from "../components/ShopVisitCard";
import axiosInstance from "../api/axiosInstance";
import { Ionicons } from "@expo/vector-icons";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function OfflineModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.warnIcon}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
          <Text style={styles.modalTitle}>Go Offline?</Text>
          <Text style={styles.modalSub}>Your manager monitors your live location during work hours.</Text>
          <Text style={[styles.modalSub, { color: "#d97706", fontWeight: "600", marginTop: 4 }]}>Going offline will stop sharing your location.</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={onConfirm}><Text style={styles.dangerBtnText}>Go Offline Anyway</Text></TouchableOpacity>
          <TouchableOpacity style={styles.safeBtn}   onPress={onCancel}><Text style={styles.safeBtnText}>Stay Online ✓</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardPage() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isOnline, currentLocation, locationError, startTracking, stopTracking, getOnlineDuration, isExpoGo } = useLocation();

  const [stats, setStats]         = useState(null);
  const [recentVisits, setRecent] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "Employee";
  const initials  = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  const weeklyPct = stats ? Math.round((stats.weeklyDone / stats.weeklyTarget) * 100) : 0;

  const todayFollowups = recentVisits.filter(
    (v) => v.followUp?.needed && v.followUp?.date === new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, v] = await Promise.all([
          axiosInstance.get("/api/visits/stats"),
          axiosInstance.get("/api/visits/my?limit=3"),
        ]);
        setStats(s.data);
        setRecent(v.data.visits || []);
      } catch (err) {
        console.error("Dashboard fetch:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggle = () => isOnline ? setShowModal(true) : startTracking();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <OfflineModal
        visible={showModal}
        onConfirm={() => { setShowModal(false); stopTracking(); }}
        onCancel={() => setShowModal(false)}
      />

      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName} </Text>
            <Text style={styles.date}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.avatarBtn}>
            {user?.photo
              ? <Image source={{ uri: user.photo }} style={styles.avatar} />
              : <View style={[styles.avatar, { backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" }]}><Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{initials}</Text></View>
            }
          </TouchableOpacity>
        </View>

        {/* Online/Offline toggle */}
        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          <View style={[styles.onlineCard, isOnline && { backgroundColor: "#16a34a" }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? "#fff" : "#9ca3af" }} />
                <Text style={[styles.onlineTitle, isOnline && { color: "#fff" }]}>{isOnline ? "You're Online" : "You're Offline"}</Text>
              </View>
              {isOnline
                ? <>
                    <Text style={{ color: "#bbf7d0", fontSize: 12 }}>Sharing live location</Text>
                    {!!getOnlineDuration() && <Text style={{ color: "#86efac", fontSize: 11, marginTop: 2 }}>{getOnlineDuration()}</Text>}
                    {currentLocation && <Text style={{ color: "#86efac", fontSize: 11 }}>±{currentLocation.accuracy}m accuracy</Text>}
                  </>
                : <>
                    <Text style={{ color: "#9ca3af", fontSize: 12 }}>Tap to go online & share location</Text>
                    {!!locationError && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>{locationError}</Text>}
                  </>
              }
            </View>
            <TouchableOpacity
              onPress={handleToggle}
              style={[styles.toggleTrack, isOnline && { backgroundColor: "rgba(255,255,255,0.25)" }]}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, isOnline && { marginLeft: 28 }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expo Go warning — background GPS limited */}
        {isExpoGo && isOnline && (
          <View style={styles.expoGoBanner}>
            <Text style={styles.expoGoBannerIcon}><Ionicons name="information-circle" size={20} color="#92400e" /></Text>
            <Text style={styles.expoGoBannerText}>
              Testing in Expo Go: location works while app is open. For full background GPS (app closed), build with{" "}
              <Text style={{ fontWeight: "700" }}>eas build</Text>.
            </Text>
          </View>
        )}
        {todayFollowups.length > 0 && (
          <View style={styles.followupBanner}>
            <Text style={styles.followupTitle}><Ionicons name="notifications" size={20} color="#92400e" /> {todayFollowups.length} Follow-up{todayFollowups.length > 1 ? "s" : ""} Due Today</Text>
            <TouchableOpacity onPress={() => navigation.navigate("FollowUps")}><Text style={{ color: "#92400e", fontSize: 12, fontWeight: "600" }}>View →</Text></TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Visits</Text>
            {loading ? <ActivityIndicator style={{ marginTop: 4 }} /> : <Text style={[styles.statNum, { color: "#1d4ed8" }]}>{stats?.todayVisits || 0}</Text>}
            <Text style={styles.statSub}>shops visited</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Visits</Text>
            {loading ? <ActivityIndicator style={{ marginTop: 4 }} /> : <Text style={[styles.statNum, { color: "#111827" }]}>{stats?.totalVisits || 0}</Text>}
            <Text style={styles.statSub}>all time</Text>
          </View>
        </View>

        {/* Weekly target */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Weekly Target</Text>
            {!loading && <Text style={{ fontSize: 12, color: "#1d4ed8", fontWeight: "600" }}>{stats?.weeklyDone || 0}/{stats?.weeklyTarget || 100} visits</Text>}
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(weeklyPct, 100)}%` }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={styles.statSub}>{weeklyPct}% complete</Text>
            <Text style={styles.statSub}>{Math.max((stats?.weeklyTarget || 100) - (stats?.weeklyDone || 0), 0)} remaining</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: "#1d4ed8" }]} onPress={() => navigation.navigate("VisitShop")} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}><Ionicons name="add-circle" size={24} color="#fff" /></Text>
              <Text style={[styles.actionTitle, { color: "#fff" }]}>Start Visit</Text>
              <Text style={[styles.actionSub, { color: "#bfdbfe" }]}>Log a shop visit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Visits")} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}><Ionicons name="list" size={24} color="#1d4ed8" /></Text>
              <Text style={styles.actionTitle}>My Visits</Text>
              <Text style={styles.actionSub}>View history</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Target")} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}><Ionicons name="flag-outline" size={24} color="#1d4ed8" /></Text>
              <Text style={styles.actionTitle}>Daily Target</Text>
              <Text style={styles.actionSub}>Track progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { borderColor: "#fed7aa", borderWidth: 2 }]} onPress={() => navigation.navigate("EndOfDay")} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}><Ionicons name="document-text" size={24} color="#f97316" /></Text>
              <Text style={styles.actionTitle}>End of Day</Text>
              <Text style={[styles.actionSub, { color: "#f97316" }]}>Send report</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.actionCard, { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 0 }]} onPress={() => navigation.navigate("Performance")} activeOpacity={0.8}>
            <Text style={{ fontSize: 22 }}><Ionicons name="bar-chart" size={24} color="#1d4ed8" /></Text>
            <View>
              <Text style={styles.actionTitle}>Performance Ledger</Text>
              <Text style={styles.actionSub}>Track collections & sales margin</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Visits */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={styles.sectionLabel}>Recent Visits</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Visits")}><Text style={{ fontSize: 12, color: "#1d4ed8", fontWeight: "500" }}>See all →</Text></TouchableOpacity>
          </View>
          {loading
            ? [1, 2].map((i) => <View key={i} style={{ height: 80, backgroundColor: "#e5e7eb", borderRadius: 14, marginBottom: 8 }} />)
            : recentVisits.length === 0
              ? <View style={styles.emptyBox}><Text style={styles.emptyText}>No visits yet. Tap "Start Visit"!</Text></View>
              : recentVisits.map((v) => <ShopVisitCard key={v._id} visit={v} />)
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:       { backgroundColor: "#1d4ed8", paddingTop: 20, paddingBottom: 44, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:     { color: "#bfdbfe", fontSize: 12 },
  name:         { color: "#fff", fontSize: 22, fontWeight: "700" },
  date:         { color: "#bfdbfe", fontSize: 12, marginTop: 2 },
  avatarBtn:    { borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "#3b82f6" },
  avatar:       { width: 44, height: 44, borderRadius: 12 },
  onlineCard:   { backgroundColor: "#fff", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 12 },
  onlineTitle:  { fontSize: 16, fontWeight: "700", color: "#111827" },
  toggleTrack:  { width: 56, height: 28, borderRadius: 14, backgroundColor: "#e5e7eb", flexDirection: "row", alignItems: "center", padding: 3 },
  toggleThumb:  { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  expoGoBanner:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#fefce8", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#fde68a" },
  expoGoBannerIcon: { fontSize: 14 },
  expoGoBannerText: { flex: 1, fontSize: 11, color: "#92400e", lineHeight: 16 },
  followupBanner: { marginHorizontal: 16, backgroundColor: "#fffbeb", borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#fde68a", marginBottom: 12 },
  followupTitle: { fontSize: 13, fontWeight: "600", color: "#92400e" },
  statsRow:     { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  statCard:     { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, elevation: 1 },
  statLabel:    { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
  statNum:      { fontSize: 32, fontWeight: "700" },
  statSub:      { fontSize: 11, color: "#9ca3af" },
  section:      { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
  progressBg:   { height: 10, backgroundColor: "#e5e7eb", borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 10, backgroundColor: "#1d4ed8", borderRadius: 5 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  actionsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  actionCard:   { width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, elevation: 1 },
  actionTitle:  { fontSize: 14, fontWeight: "600", color: "#111827", marginTop: 6 },
  actionSub:    { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  emptyBox:     { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText:    { color: "#9ca3af", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard:    { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, alignItems: "center" },
  warnIcon:     { width: 60, height: 60, backgroundColor: "#fef3c7", borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  modalSub:     { fontSize: 14, color: "#6b7280", textAlign: "center" },
  dangerBtn:    { backgroundColor: "#ef4444", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: "100%", alignItems: "center", marginTop: 20, marginBottom: 10 },
  dangerBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  safeBtn:      { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, width: "100%", alignItems: "center" },
  safeBtnText:  { color: "#fff", fontWeight: "600", fontSize: 15 },
});