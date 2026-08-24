// FILE: src/pages/DriverDashboardPage.js
// FEATURES ADDED:
// 1. Live location sharing (on/off toggle) — shows driver on admin Live Map
// 2. Porter tab — driver can move deliveries to porter section
// 3. GPS-based delivery sorting — nearest delivery shown first, updates as driver moves
// 4. Delivery count tab (main deliveries / porter)

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Linking, Alert, Switch, AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import InvoiceTypeModal from "../components/InvoiceTypeModal";

// ── Haversine distance (km) ─────────────────────────────────
function dist(lat1, lon1, lat2, lon2) {
  if (!lat1||!lon1||!lat2||!lon2) return 99999;
  const R = 6371, r = d => d * Math.PI / 180;
  const a = Math.sin(r(lat2-lat1)/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(r(lon2-lon1)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmtDist(km) {
  if (km > 99990) return "";
  return km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
}

// FIX (GST not shown on driver's card): totalAmount from the API is
// intentionally the PRE-GST bill (invoices apply GST separately at
// download time on the admin side — see driverController's
// computeDeliveryPricing comment). But the driver's card was showing that
// raw pre-GST number even when the admin had GST turned ON for this
// delivery, so it never matched what the admin confirmed at assign time.
// This adds gstAmount back in for display only, when gstEnabled is true —
// doesn't touch how totalAmount itself is calculated or stored.
function cardTotal(d) {
  const base = Number(d?.totalAmount) || 0;
  const gst  = d?.gstEnabled ? (Number(d?.gstAmount) || 0) : 0;
  return Math.round((base + gst + Number.EPSILON) * 100) / 100;
}

const STATUS_STYLE = {
  pending:   { bg:"#fffbeb", text:"#d97706" },
  completed: { bg:"#f0fdf4", text:"#16a34a" },
  skipped:   { bg:"#f9fafb", text:"#9ca3af" },
};

export default function DriverDashboardPage() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  // Data state
  const [deliveries, setDeliveries] = useState([]); // main deliveries
  const [porter,     setPorter]     = useState([]); // porter deliveries
  const [summary,    setSummary]    = useState({});
  const [activeTab,  setActiveTab]  = useState("delivery"); // "delivery" | "porter"
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState(null); // delivery for which the invoice popup is open

  // Location state
  const [isOnline,    setIsOnline]    = useState(false);
  const [currentPos,  setCurrentPos]  = useState(null);
  const [locationErr, setLocationErr] = useState("");
  const locationSubRef = useRef(null);
  const sortTimerRef   = useRef(null);

  // ── Fetch deliveries + sort by distance ──────────────────
  const fetchData = useCallback(async (pos) => {
    try {
      const [main, por] = await Promise.all([
        axiosInstance.get("/api/driver/deliveries/today"),
        axiosInstance.get("/api/driver/deliveries/porter"),
      ]);
      setSummary(main.data.summary || {});
      setPorter(por.data.deliveries || []);

      let list = main.data.deliveries || [];
      const p  = pos || currentPos;
      if (p) {
        const pending   = list.filter(d => d.status === "pending")
          .sort((a,b) => dist(p.lat,p.lng,a.latitude,a.longitude) - dist(p.lat,p.lng,b.latitude,b.longitude));
        const done      = list.filter(d => d.status !== "pending");
        list = [...pending, ...done];
      }
      setDeliveries(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentPos]);

  // ── Re-sort when GPS position changes ────────────────────
  const sortByPos = useCallback((pos) => {
    setDeliveries(prev => {
      const pending = prev.filter(d => d.status === "pending")
        .sort((a,b) => dist(pos.lat,pos.lng,a.latitude,a.longitude) - dist(pos.lat,pos.lng,b.latitude,b.longitude));
      const done    = prev.filter(d => d.status !== "pending");
      return [...pending, ...done];
    });
  }, []);

  // ── Refetch when screen comes into focus ─────────────────
  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => () => {
    locationSubRef.current?.remove?.();
    clearTimeout(sortTimerRef.current);
  }, []);

  // FIX ("changes only show after refresh"): this screen only refetched
  // on navigation focus (useFocusEffect above) — so if the driver just
  // sits on this screen (the normal case — they don't leave and come
  // back), a delivery the admin adds/edits never appears until they
  // background the app and reopen it. Polling every 5s while the app is
  // in the foreground means a newly-assigned delivery (with its correct
  // GST-inclusive amount) shows up on its own, no manual refresh needed.
  // Mirrors the same pattern already used elsewhere in this app for the
  // same reason.
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

  // ── Start live location sharing ──────────────────────────
  const startLocation = async () => {
    setLocationErr("");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationErr("Location permission denied.");
      return;
    }
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
      async (loc) => {
        const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setCurrentPos(pos);
        sortByPos(pos);
        // Send location to backend (same endpoint as field sales employees)
        try {
          await axiosInstance.post("/api/location/update", {
            latitude:  pos.lat,
            longitude: pos.lng,
            accuracy:  Math.round(loc.coords.accuracy),
          });
        } catch {}
      }
    );
    locationSubRef.current = sub;
    setIsOnline(true);
  };

  const stopLocation = async () => {
    locationSubRef.current?.remove?.();
    locationSubRef.current = null;
    setIsOnline(false);
    setCurrentPos(null);
    try { await axiosInstance.post("/api/location/offline"); } catch {}
  };

  const toggleLocation = () => {
    if (isOnline) {
      Alert.alert("Go Offline?", "Stop sharing your live location?", [
        { text: "Cancel", style: "cancel" },
        { text: "Go Offline", style: "destructive", onPress: stopLocation },
      ]);
    } else {
      startLocation();
    }
  };

  // ── Move to porter ───────────────────────────────────────
  const handleMoveToPorter = (delivery) => {
    Alert.alert(
      "Move to Porter?",
      `Move "${delivery.shopName}" to porter section?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Move to Porter", onPress: async () => {
            try {
              await axiosInstance.put(`/api/driver/deliveries/${delivery._id}/porter`, { note: "Moved to porter by driver" });
              fetchData();
            } catch { Alert.alert("Error", "Could not move to porter."); }
          }
        },
      ]
    );
  };

  // ── Move back to delivery ────────────────────────────────
  const handleUnporter = async (delivery) => {
    try {
      await axiosInstance.put(`/api/driver/deliveries/${delivery._id}/unporter`);
      fetchData();
    } catch { Alert.alert("Error", "Could not move back."); }
  };

  const handleLogout = async () => {
    await stopLocation();
    await logout();
  };

  const openMaps = (d) => {
    const url = d.latitude && d.longitude
      ? `https://maps.google.com/?q=${d.latitude},${d.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(d.address)}`;
    Linking.openURL(url);
  };

  // ── Render delivery card ─────────────────────────────────
  const renderCard = (d, i, isPorterTab = false) => {
    const ss      = STATUS_STYLE[d.status] || STATUS_STYLE.pending;
    const km      = currentPos ? dist(currentPos.lat, currentPos.lng, d.latitude, d.longitude) : null;
    const isFirst = !isPorterTab && d.status === "pending" && i === deliveries.findIndex(x => x.status === "pending");

    return (
      <View key={d._id} style={[s.card, isFirst && s.cardNext, d.status==="completed" && { opacity:0.7 }]}>
        {isFirst && (
          <View style={s.nextBadge}>
            <Ionicons name="navigate-outline" size={11} color="#fff" />
            <Text style={s.nextBadgeText}>NEXT DELIVERY</Text>
          </View>
        )}

        <View style={s.cardRow}>
          <View style={[s.numCircle, d.status==="completed" && { backgroundColor:"#16a34a" }]}>
            {d.status==="completed"
              ? <Ionicons name="checkmark" size={14} color="#fff" />
              : <Text style={s.numText}>{isPorterTab ? "P" : (d.sortOrder || i+1)}</Text>
            }
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.shopName}>{d.shopName}</Text>
            <Text style={s.ownerInfo}>{d.ownerName} · {d.phone}</Text>
            <Text style={s.addrText} numberOfLines={1}>📍 {d.address}</Text>

            <View style={s.tagRow}>
              <View style={[s.tag,{backgroundColor:"#eff6ff"}]}>
                <Text style={[s.tagTxt,{color:"#1d4ed8"}]}>{d.quantity} kg</Text>
              </View>
              <View style={[s.tag,{backgroundColor:"#f3f4f6"}]}>
                <Text style={[s.tagTxt,{color:"#374151"}]}>₹{cardTotal(d).toLocaleString("en-IN")}</Text>
              </View>
              {km !== null && km < 99990 && d.status === "pending" && (
                <View style={[s.tag,{backgroundColor:"#f0fdf4"}]}>
                  <Text style={[s.tagTxt,{color:"#16a34a"}]}>{fmtDist(km)}</Text>
                </View>
              )}
              <View style={[s.tag,{backgroundColor:ss.bg}]}>
                <Text style={[s.tagTxt,{color:ss.text}]}>{d.status==="completed" ? "✅ Completed" : d.status.charAt(0).toUpperCase()+d.status.slice(1)}</Text>
              </View>
            </View>

            {isPorterTab && d.porterNote && (
              <Text style={{fontSize:11,color:"#9ca3af",marginTop:4}}>📦 {d.porterNote}</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        {d.status === "pending" && !isPorterTab && (
          <View style={s.actRow}>
            <TouchableOpacity style={s.mapsBtn} onPress={() => openMaps(d)}>
              <Ionicons name="navigate-outline" size={13} color="#1d4ed8" />
              <Text style={s.mapsTxt}>Direction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${d.phone}`)}>
              <Ionicons name="call-outline" size={13} color="#16a34a" />
              <Text style={s.callTxt}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.porterBtn} onPress={() => handleMoveToPorter(d)}>
              <Ionicons name="cube-outline" size={13} color="#7c3aed" />
              <Text style={s.porterTxt}>Porter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn}
              onPress={() => navigation.navigate("DeliveryDetail", { delivery: d })}>
              <Text style={s.doneTxt}>Mark Done →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Porter tab — show unporter button */}
        {isPorterTab && d.status === "pending" && (
          <View style={s.actRow}>
            <TouchableOpacity style={s.mapsBtn} onPress={() => openMaps(d)}>
              <Ionicons name="navigate-outline" size={13} color="#1d4ed8" />
              <Text style={s.mapsTxt}>Direction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.mapsBtn,{backgroundColor:"#ede9fe",borderColor:"#c4b5fd"}]} onPress={() => handleUnporter(d)}>
              <Ionicons name="arrow-undo-outline" size={13} color="#7c3aed" />
              <Text style={[s.mapsTxt,{color:"#7c3aed"}]}>Move Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn}
              onPress={() => navigation.navigate("DeliveryDetail", { delivery: d })}>
              <Text style={s.doneTxt}>Mark Done →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completed — show Download Invoice button (delivery + porter tabs) */}
        {d.status === "completed" && (
          <View style={s.actRow}>
            <TouchableOpacity style={s.invoiceBtn} onPress={() => setInvoiceFor(d)}>
              <Ionicons name="download-outline" size={13} color="#fff" />
              <Text style={s.invoiceTxt}>Download Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const displayList = activeTab === "porter" ? porter : deliveries;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f0f2f5" }}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex:1 }}>
          <Text style={s.greeting}>Good {new Date().getHours()<12?"Morning":"Afternoon"} 👋</Text>
          <Text style={s.driverName}>{user?.name || "Driver"}</Text>
        </View>

        {/* Live location toggle */}
        <View style={s.locRow}>
          <View style={[s.locDot, { backgroundColor: isOnline ? "#4ade80" : "#94a3b8" }]} />
          <Text style={s.locLabel}>{isOnline ? "Live" : "Offline"}</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleLocation}
            trackColor={{ false: "#334155", true: "#166534" }}
            thumbColor={isOnline ? "#4ade80" : "#94a3b8"}
          />
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#bfdbfe" />
        </TouchableOpacity>
      </View>

      {locationErr ? <View style={s.errBanner}><Text style={s.errTxt}>{locationErr}</Text></View> : null}

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { l:"Total",   v:summary.total||0,     c:"#1d4ed8" },
          { l:"Done",    v:summary.completed||0,  c:"#16a34a" },
          { l:"Pending", v:summary.pending||0,    c:"#d97706" },
          { l:"Porter",  v:porter.length,         c:"#7c3aed" },
        ].map(x => (
          <View key={x.l} style={s.sumCard}>
            <Text style={[s.sumNum,{color:x.c}]}>{x.v}</Text>
            <Text style={s.sumLabel}>{x.l}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tab, activeTab==="delivery" && s.tabActive]}
          onPress={() => setActiveTab("delivery")}>
          <Ionicons name="cube-outline" size={14} color={activeTab==="delivery"?"#1d4ed8":"#9ca3af"} />
          <Text style={[s.tabTxt, activeTab==="delivery" && s.tabTxtActive]}>
            Deliveries ({deliveries.filter(d=>d.status==="pending").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab==="porter" && { ...s.tabActive, borderColor:"#7c3aed" }]}
          onPress={() => setActiveTab("porter")}>
          <Ionicons name="person-outline" size={14} color={activeTab==="porter"?"#7c3aed":"#9ca3af"} />
          <Text style={[s.tabTxt, activeTab==="porter" && { color:"#7c3aed" }]}>
            Porter ({porter.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ padding:14, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#1d4ed8" />}
      >
        {loading ? [1,2,3].map(i=><View key={i} style={s.skeleton}/>) :
         displayList.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name={activeTab==="porter"?"person-outline":"cube-outline"} size={48} color="#d1d5db" />
            <Text style={s.emptyTxt}>
              {activeTab==="porter" ? "No porter deliveries" : "No deliveries today"}
            </Text>
            {activeTab==="porter" && (
              <Text style={s.emptyHint}>Tap "Porter" on a delivery card to move it here</Text>
            )}
          </View>
         ) : displayList.map((d, i) => renderCard(d, i, activeTab==="porter"))
        }
      </ScrollView>

      <InvoiceTypeModal
        visible={!!invoiceFor}
        delivery={invoiceFor}
        onClose={() => setInvoiceFor(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor:"#1d4ed8", paddingHorizontal:16, paddingVertical:12, flexDirection:"row", alignItems:"center", gap:10 },
  greeting:     { color:"#bfdbfe", fontSize:11 },
  driverName:   { color:"#fff", fontSize:17, fontWeight:"700" },
  locRow:       { flexDirection:"row", alignItems:"center", gap:6 },
  locDot:       { width:8, height:8, borderRadius:4 },
  locLabel:     { color:"#fff", fontSize:11, fontWeight:"600" },
  logoutBtn:    { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center", justifyContent:"center" },
  errBanner:    { backgroundColor:"#fef2f2", borderBottomWidth:1, borderBottomColor:"#fecaca", paddingHorizontal:16, paddingVertical:8 },
  errTxt:       { color:"#ef4444", fontSize:12 },
  summaryRow:   { flexDirection:"row", backgroundColor:"#fff", paddingVertical:10, paddingHorizontal:8, borderBottomWidth:1, borderBottomColor:"#f3f4f6" },
  sumCard:      { flex:1, alignItems:"center" },
  sumNum:       { fontSize:20, fontWeight:"800" },
  sumLabel:     { fontSize:10, color:"#9ca3af", marginTop:1 },
  tabBar:       { flexDirection:"row", backgroundColor:"#fff", borderBottomWidth:1, borderBottomColor:"#f3f4f6", paddingHorizontal:12, paddingVertical:8, gap:10 },
  tab:          { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:"#e5e7eb", backgroundColor:"#f9fafb" },
  tabActive:    { backgroundColor:"#eff6ff", borderColor:"#1d4ed8" },
  tabTxt:       { fontSize:12, fontWeight:"600", color:"#9ca3af" },
  tabTxtActive: { color:"#1d4ed8" },
  skeleton:     { height:110, backgroundColor:"#e5e7eb", borderRadius:16, marginBottom:10 },
  empty:        { alignItems:"center", paddingVertical:60, gap:10 },
  emptyTxt:     { fontSize:16, fontWeight:"600", color:"#374151" },
  emptyHint:    { fontSize:13, color:"#9ca3af", textAlign:"center" },
  card:         { backgroundColor:"#fff", borderRadius:16, borderWidth:1, borderColor:"#f3f4f6", marginBottom:10, padding:14, elevation:1 },
  cardNext:     { borderColor:"#1d4ed8", borderWidth:2 },
  nextBadge:    { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"#1d4ed8", paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:"flex-start", marginBottom:10 },
  nextBadgeText:{ color:"#fff", fontSize:10, fontWeight:"700" },
  cardRow:      { flexDirection:"row", gap:12 },
  numCircle:    { width:32, height:32, borderRadius:16, backgroundColor:"#dbeafe", alignItems:"center", justifyContent:"center", flexShrink:0 },
  numText:      { color:"#1d4ed8", fontWeight:"700", fontSize:13 },
  shopName:     { fontSize:15, fontWeight:"700", color:"#111827" },
  ownerInfo:    { fontSize:12, color:"#6b7280", marginTop:2 },
  addrText:     { fontSize:12, color:"#9ca3af", marginTop:4 },
  tagRow:       { flexDirection:"row", flexWrap:"wrap", gap:6, marginTop:8 },
  tag:          { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  tagTxt:       { fontSize:11, fontWeight:"600" },
  actRow:       { flexDirection:"row", gap:8, marginTop:12, borderTopWidth:1, borderTopColor:"#f3f4f6", paddingTop:12 },
  mapsBtn:      { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:8, borderRadius:10, backgroundColor:"#eff6ff", borderWidth:1, borderColor:"#bfdbfe" },
  mapsTxt:      { color:"#1d4ed8", fontSize:12, fontWeight:"600" },
  callBtn:      { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:8, borderRadius:10, backgroundColor:"#f0fdf4", borderWidth:1, borderColor:"#bbf7d0" },
  callTxt:      { color:"#16a34a", fontSize:12, fontWeight:"600" },
  porterBtn:    { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:8, borderRadius:10, backgroundColor:"#f5f3ff", borderWidth:1, borderColor:"#ddd6fe" },
  porterTxt:    { color:"#7c3aed", fontSize:12, fontWeight:"600" },
  doneBtn:      { flex:1, alignItems:"center", paddingVertical:8, borderRadius:10, backgroundColor:"#1d4ed8" },
  doneTxt:      { color:"#fff", fontSize:13, fontWeight:"700" },
  invoiceBtn:   { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:9, borderRadius:10, backgroundColor:"#16a34a" },
  invoiceTxt:   { color:"#fff", fontSize:13, fontWeight:"700" },
});