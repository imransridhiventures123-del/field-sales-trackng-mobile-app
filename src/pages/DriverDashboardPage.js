// FILE: src/pages/DriverDashboardPage.js
// Driver's main screen — today's deliveries sorted by priority.
// After completing a delivery, auto-sorts remaining by nearest GPS distance.

import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Linking, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";

// Haversine distance in km
function distance(lat1, lon1, lat2, lon2) {
  if (!lat1||!lon1||!lat2||!lon2) return 9999;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const STATUS_STYLE = {
  pending:   { bg:"#fffbeb", text:"#d97706", label:"Pending"   },
  completed: { bg:"#f0fdf4", text:"#16a34a", label:"Completed" },
  skipped:   { bg:"#f9fafb", text:"#9ca3af", label:"Skipped"   },
};

export default function DriverDashboardPage() {
  const navigation = useNavigation();
  const { logout } = useAuth(); // AuthContext logout clears token + role
  const [driver, setDriver]       = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const posRef = useRef(null);

  const sortByDistance = useCallback((list, pos) => {
    if (!pos) return list;
    const pending = list.filter(d => d.status === "pending")
      .sort((a, b) => distance(pos.lat, pos.lng, a.latitude, a.longitude) - distance(pos.lat, pos.lng, b.latitude, b.longitude));
    const done = list.filter(d => d.status !== "pending");
    return [...pending, ...done];
  }, []);

  const applyDeliveryList = useCallback((list, summaryData) => {
    setDeliveries(sortByDistance(list, posRef.current));
    if (summaryData) setSummary(summaryData);
  }, [sortByDistance]);

  const fetchData = useCallback(async ({ showRefresh = false, refreshGps = false } = {}) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("maavu_token");
      const role  = await AsyncStorage.getItem("maavu_role");
      if (!token || role !== "driver") { navigation.replace("Login"); return; }

      const [me, td] = await Promise.all([
        axiosInstance.get("/api/driver/me"),
        axiosInstance.get("/api/driver/deliveries/today"),
      ]);
      setDriver(me.data.driver);

      if (refreshGps || !posRef.current) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          posRef.current = pos;
          setCurrentPos(pos);
        } catch { /* no GPS — keep previous sort */ }
      }

      applyDeliveryList(td.data.deliveries || [], td.data.summary || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [navigation, applyDeliveryList]);

  const handleDeliveryUpdate = useCallback((updated) => {
    setDeliveries(prev => {
      const wasPending = prev.find(d => d._id === updated._id)?.status === "pending";
      if (wasPending) {
        setSummary(summaryPrev => {
          const next = { ...summaryPrev };
          if (updated.status === "completed") {
            next.completed = (summaryPrev.completed || 0) + 1;
            next.pending   = Math.max(0, (summaryPrev.pending || 0) - 1);
          } else if (updated.status === "skipped") {
            next.pending = Math.max(0, (summaryPrev.pending || 0) - 1);
          }
          return next;
        });
      }
      const exists = prev.some(d => d._id === updated._id);
      const next = exists
        ? prev.map(d => d._id === updated._id ? { ...d, ...updated } : d)
        : [...prev, updated];
      return sortByDistance(next, posRef.current);
    });
  }, [sortByDistance]);

  // Refetch when screen is shown again
  useFocusEffect(useCallback(() => { fetchData({ refreshGps: true }); }, [fetchData]));

  // Background poll — picks up admin deletes/adds without manual refresh
  useEffect(() => {
    const poll = () => {
      if (AppState.currentState === "active") fetchData();
    };
    const id = setInterval(poll, 5000);
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") fetchData();
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [fetchData]);

  const openMaps = (d) => {
    const url = d.latitude && d.longitude
      ? `https://maps.google.com/?q=${d.latitude},${d.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(d.address)}`;
    Linking.openURL(url);
  };

  const handleLogout = async () => {
    await logout(); // clears token + role → AppNavigator auto-shows Login
  };

  const pending   = deliveries.filter(d => d.status==="pending");
  const completed = deliveries.filter(d => d.status==="completed");

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f0f2f5" }}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex:1 }}>
          <Text style={s.greeting}>Good {new Date().getHours()<12?"Morning":"Afternoon"} 👋</Text>
          <Text style={s.driverName}>{driver?.name || "Driver"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#bfdbfe" />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={s.summaryRow}>
        {[
          { l:"Total",    v:summary.total||0,        color:"#1d4ed8" },
          { l:"Done",     v:summary.completed||0,     color:"#16a34a" },
          { l:"Pending",  v:summary.pending||0,       color:"#d97706" },
          { l:"Total KG", v:`${summary.totalKg||0}kg`,color:"#7c3aed" },
        ].map(x => (
          <View key={x.l} style={s.summaryCard}>
            <Text style={[s.summaryNum, { color:x.color }]}>{x.v}</Text>
            <Text style={s.summaryLabel}>{x.l}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData({ showRefresh: true, refreshGps: true })} tintColor="#1d4ed8" />}
      >
        {loading ? [1,2,3].map(i => <View key={i} style={s.skeleton} />) :
         deliveries.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No deliveries today</Text>
            <Text style={s.emptyHint}>Pull down to refresh</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && <Text style={s.sectionLabel}>Pending Deliveries ({pending.length})</Text>}
            {deliveries.map((d, i) => {
              const ss    = STATUS_STYLE[d.status];
              const dist  = currentPos ? distance(currentPos.lat, currentPos.lng, d.latitude, d.longitude) : null;
              const isNext = d.status === "pending" && i === deliveries.findIndex(x => x.status === "pending");
              return (
                <View key={d._id} style={[s.card, isNext && s.cardNext, d.status==="completed" && s.cardDone]}>
                  {isNext && (
                    <View style={s.nextBanner}>
                      <Ionicons name="navigate-outline" size={12} color="#fff" />
                      <Text style={s.nextBannerText}>NEXT DELIVERY</Text>
                    </View>
                  )}
                  <View style={s.cardRow}>
                    <View style={[s.priorityCircle, d.status==="completed" && { backgroundColor:"#16a34a" }]}>
                      {d.status==="completed"
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={s.priorityText}>{d.sortOrder || i+1}</Text>
                      }
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={s.shopName}>{d.shopName}</Text>
                      <Text style={s.ownerInfo}>{d.ownerName} · {d.phone}</Text>
                      <Text style={s.addressText} numberOfLines={2}>📍 {d.address}</Text>
                      <View style={s.tagRow}>
                        <View style={[s.tag, { backgroundColor:"#eff6ff" }]}>
                          <Text style={[s.tagText, { color:"#1d4ed8" }]}>{d.quantity} kg</Text>
                        </View>
                        <View style={[s.tag, { backgroundColor:"#f3f4f6" }]}>
                          <Text style={[s.tagText, { color:"#374151" }]}>₹{Number(d.totalAmount).toLocaleString("en-IN")}</Text>
                        </View>
                        {dist !== null && d.status==="pending" && (
                          <View style={[s.tag, { backgroundColor:"#f0fdf4" }]}>
                            <Text style={[s.tagText, { color:"#16a34a" }]}>{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}</Text>
                          </View>
                        )}
                        <View style={[s.tag, { backgroundColor: ss.bg }]}>
                          <Text style={[s.tagText, { color: ss.text }]}>{ss.label}</Text>
                        </View>
                      </View>
                      {d.status==="completed" && (
                        <Text style={s.paidText}>Collected: ₹{Number(d.amountReceived).toLocaleString("en-IN")} · {d.paymentType?.toUpperCase()}{d.pendingAmount>0 ? ` · Pending: ₹${Number(d.pendingAmount).toLocaleString("en-IN")}` : ""}</Text>
                      )}
                    </View>
                  </View>
                  {d.status === "pending" && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.mapsBtn} onPress={() => openMaps(d)} activeOpacity={0.8}>
                        <Ionicons name="navigate-outline" size={14} color="#1d4ed8" />
                        <Text style={s.mapsBtnText}>Direction</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${d.phone}`)} activeOpacity={0.8}>
                        <Ionicons name="call-outline" size={14} color="#16a34a" />
                        <Text style={s.callBtnText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.doneBtn} onPress={() => navigation.navigate("DeliveryDetail", { delivery: d, onUpdate: handleDeliveryUpdate })} activeOpacity={0.8}>
                        <Text style={s.doneBtnText}>Mark Done →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor:"#1d4ed8", paddingHorizontal:16, paddingVertical:14, flexDirection:"row", alignItems:"center" },
  greeting:     { color:"#bfdbfe", fontSize:11 },
  driverName:   { color:"#fff", fontSize:18, fontWeight:"700" },
  logoutBtn:    { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center", justifyContent:"center" },
  summaryRow:   { flexDirection:"row", backgroundColor:"#fff", paddingVertical:12, paddingHorizontal:8, borderBottomWidth:1, borderBottomColor:"#f3f4f6", gap:4 },
  summaryCard:  { flex:1, alignItems:"center" },
  summaryNum:   { fontSize:20, fontWeight:"800" },
  summaryLabel: { fontSize:10, color:"#9ca3af", marginTop:1 },
  sectionLabel: { fontSize:11, fontWeight:"700", color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 },
  skeleton:     { height:110, backgroundColor:"#e5e7eb", borderRadius:16, marginBottom:10 },
  empty:        { alignItems:"center", paddingVertical:60, gap:8 },
  emptyText:    { fontSize:16, fontWeight:"600", color:"#374151" },
  emptyHint:    { fontSize:13, color:"#9ca3af" },
  card:         { backgroundColor:"#fff", borderRadius:16, borderWidth:1, borderColor:"#f3f4f6", marginBottom:10, padding:14, shadowColor:"#000", shadowOpacity:0.04, elevation:1 },
  cardNext:     { borderColor:"#1d4ed8", borderWidth:2 },
  cardDone:     { opacity:0.7 },
  nextBanner:   { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"#1d4ed8", paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:"flex-start", marginBottom:10 },
  nextBannerText:{ color:"#fff", fontSize:10, fontWeight:"700", letterSpacing:0.5 },
  cardRow:      { flexDirection:"row", gap:12 },
  priorityCircle:{ width:32, height:32, borderRadius:16, backgroundColor:"#dbeafe", alignItems:"center", justifyContent:"center", flexShrink:0 },
  priorityText: { color:"#1d4ed8", fontWeight:"700", fontSize:13 },
  shopName:     { fontSize:15, fontWeight:"700", color:"#111827" },
  ownerInfo:    { fontSize:12, color:"#6b7280", marginTop:2 },
  addressText:  { fontSize:12, color:"#9ca3af", marginTop:4 },
  tagRow:       { flexDirection:"row", flexWrap:"wrap", gap:6, marginTop:8 },
  tag:          { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  tagText:      { fontSize:11, fontWeight:"600" },
  paidText:     { fontSize:11, color:"#16a34a", fontWeight:"600", marginTop:6 },
  actionRow:    { flexDirection:"row", gap:8, marginTop:12, borderTopWidth:1, borderTopColor:"#f3f4f6", paddingTop:12 },
  mapsBtn:      { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:"#eff6ff", borderWidth:1, borderColor:"#bfdbfe" },
  mapsBtnText:  { color:"#1d4ed8", fontSize:12, fontWeight:"600" },
  callBtn:      { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:"#f0fdf4", borderWidth:1, borderColor:"#bbf7d0" },
  callBtnText:  { color:"#16a34a", fontSize:12, fontWeight:"600" },
  doneBtn:      { flex:1, alignItems:"center", paddingVertical:8, borderRadius:10, backgroundColor:"#1d4ed8" },
  doneBtnText:  { color:"#fff", fontSize:13, fontWeight:"700" },
});