// FILE: src/pages/VisitDetailPage.js — React Native Expo version
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet,  Image, ActivityIndicator, Linking } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getVisitById } from "../api/visitApi";
import { Ionicons } from "@expo/vector-icons";
export default function VisitDetailPage() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { id }     = route.params;
  const [visit, setVisit]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  useEffect(() => {
    getVisitById(id).then(d => setVisit(d.visit)).catch(e => setError(e.response?.data?.message || "Could not load.")).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color="#1d4ed8" /></SafeAreaView>;
  if (error || !visit) return <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#9ca3af" }}>{error || "Visit not found"}</Text><TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 10 }}><Text style={{ color: "#1d4ed8" }}>Go back</Text></TouchableOpacity></SafeAreaView>;
  const statusC = { Completed: "#16a34a", Pending: "#d97706", Rejected: "#ef4444" };
  const R = ({ l, v }) => <View style={s.row}><Text style={s.rl}>{l}</Text><Text style={s.rv}>{v || "—"}</Text></View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={{ color: "#bfdbfe" }}><Ionicons name="arrow-back" size={18} color="#eef0f5" /></Text></TouchableOpacity><Text style={s.headerTitle}>Visit Details</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[s.card, { backgroundColor: `${statusC[visit.status]}15`, borderWidth: 1, borderColor: `${statusC[visit.status]}40` }]}>
          <Text style={[s.statusText, { color: statusC[visit.status] }]}>{visit.status}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.sectionLabel}>Shop Information</Text>
          {[["Shop Name",visit.shopName],["Shop Code",visit.shopCode],["Owner",visit.ownerName],["Mobile",visit.mobile],["Type",visit.fieldType],["Address",visit.address]].map(([l,v]) => <R key={l} l={l} v={v} />)}
        </View>
        {visit.photos?.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Photos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {visit.photos.map((p,i) => <Image key={i} source={{ uri: p.url }} style={{ width: 90, height: 90, borderRadius: 10 }} />)}
            </View>
          </View>
        )}
        {visit.latitude && visit.longitude && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Location</Text>
            <Text style={{ fontFamily: "monospace", fontSize: 13, color: "#374151" }}>{visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}</Text>
            {visit.locationAccuracy && <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>±{visit.locationAccuracy}m</Text>}
            <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`)} style={s.mapsBtn} activeOpacity={0.8}>
              <Text style={s.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}
        {visit.followUp?.needed && (
          <View style={[s.card, { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[s.sectionLabel, { color: "#92400e" }]}>Follow-up</Text>
            <Text style={{ fontSize: 14, color: "#92400e", fontWeight: "600" }}>{visit.followUp.status?.replace("_"," ")}</Text>
            {visit.followUp.date && <Text style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>Due: {visit.followUp.date}</Text>}
          </View>
        )}
        {visit.notes && (
          <View style={s.card}><Text style={s.sectionLabel}>Notes</Text><Text style={{ fontSize: 14, color: "#374151" }}>{visit.notes}</Text></View>
        )}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Visit Time</Text>
          <Text style={{ fontSize: 14, color: "#374151" }}>{new Date(visit.createdAt).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  header:      { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, elevation: 1 },
  sectionLabel:{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  statusText:  { fontSize: 15, fontWeight: "700" },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  rl:          { fontSize: 12, color: "#9ca3af", flex: 1 },
  rv:          { fontSize: 12, color: "#111827", fontWeight: "500", flex: 1.5, textAlign: "right" },
  mapsBtn:     { backgroundColor: "#1d4ed8", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  mapsBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});