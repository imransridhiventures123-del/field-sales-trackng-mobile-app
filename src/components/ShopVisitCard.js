// FILE: src/components/ShopVisitCard.js — React Native Expo version
// OWNER: Naveen
// CHANGES: div→View, p→Text, onClick→TouchableOpacity, useNavigate→useNavigation

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

const STATUS_STYLE = {
  Completed: { bg: "#f0fdf4", text: "#16a34a" },
  Pending:   { bg: "#fffbeb", text: "#d97706" },
  Rejected:  { bg: "#fef2f2", text: "#ef4444" },
};
const FIELD_STYLE = {
  "Field Sales": { bg: "#eff6ff", text: "#2563eb" },
  "Collection":  { bg: "#f5f3ff", text: "#7c3aed" },
};

export default function ShopVisitCard({ visit, isFollowupToday }) {
  const navigation = useNavigation();
  const statusS = STATUS_STYLE[visit.status] || { bg: "#f9fafb", text: "#6b7280" };
  const fieldS  = FIELD_STYLE[visit.fieldType] || { bg: "#f9fafb", text: "#6b7280" };

  return (
    <TouchableOpacity
      style={[styles.card, isFollowupToday && styles.cardHighlight]}
      onPress={() => navigation.navigate("VisitDetail", { id: visit._id })}
      activeOpacity={0.8}
    >
      {isFollowupToday && (
        <View style={styles.followupBanner}>
          <Text style={styles.followupBannerText}>🔔 Follow-up due today!</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>{visit.shopName}</Text>
          <Text style={styles.shopSub}>{visit.shopCode} · {visit.ownerName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusS.bg }]}>
          <Text style={[styles.badgeText, { color: statusS.text }]}>{visit.status}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {visit.fieldType && (
          <View style={[styles.badge, { backgroundColor: fieldS.bg }]}>
            <Text style={[styles.badgeText, { color: fieldS.text }]}>{visit.fieldType}</Text>
          </View>
        )}
        <Text style={styles.metaText}>🕐 {formatTime(visit.createdAt)}</Text>
        <Text style={styles.metaText}>📅 {formatDate(visit.createdAt)}</Text>
        {visit.photos?.length > 0 && (
          <Text style={styles.metaText}>📷 {visit.photos.length}</Text>
        )}
      </View>

      {visit.followUp?.needed && (
        <View style={[styles.followupRow, isFollowupToday && { borderTopColor: "#fde68a" }]}>
          <Text style={[styles.followupText, isFollowupToday && { color: "#d97706" }]}>
            📅 Follow-up: {visit.followUp.date
              ? new Date(visit.followUp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "Scheduled"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:           { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHighlight:  { borderColor: "#fcd34d" },
  row:            { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  shopName:       { fontSize: 14, fontWeight: "600", color: "#111827" },
  shopSub:        { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:      { fontSize: 10, fontWeight: "600" },
  metaRow:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  metaText:       { fontSize: 11, color: "#9ca3af" },
  followupRow:    { borderTopWidth: 1, borderTopColor: "#f9fafb", marginTop: 10, paddingTop: 10 },
  followupText:   { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  followupBanner: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  followupBannerText: { fontSize: 12, fontWeight: "600", color: "#b45309" },
});