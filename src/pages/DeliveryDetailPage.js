// FILE: src/pages/DeliveryDetailPage.js
// Driver fills payment form and marks delivery as done.

import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "../api/axiosInstance";

const PAYMENT_TYPES = [
  { key:"cash",    label:"Cash",         icon:"cash-outline",    color:"#16a34a" },
  { key:"gpay",    label:"GPay/UPI",     icon:"phone-portrait-outline", color:"#2563eb" },
  { key:"mixed",   label:"Cash + GPay",  icon:"shuffle-outline", color:"#7c3aed" },
  { key:"pending", label:"Pending",      icon:"time-outline",    color:"#ef4444" },
];

export default function DeliveryDetailPage() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { delivery, onUpdate } = route.params;

  const [paymentType, setPaymentType] = useState("cash");
  const [received,    setReceived]    = useState(String(delivery.totalAmount));
  const [pending,     setPending]     = useState("0");
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  // Auto-calculate pending when received changes
  const totalBill = delivery.totalAmount;
  const autoCalcPending = () => {
    const rec = parseFloat(received) || 0;
    setPending(String(Math.max(0, totalBill - rec)));
  };

  const handleSubmit = async () => {
    const rec = parseFloat(received);
    if (isNaN(rec) || rec < 0) return setError("Enter valid amount received.");
    if (rec > totalBill)       return setError(`Amount cannot exceed total bill ₹${totalBill.toLocaleString("en-IN")}.`);
    setSaving(true); setError("");
    try {
      await axiosInstance.put(`/api/driver/deliveries/${delivery._id}/complete`, {
        amountReceived: rec,
        paymentType,
        pendingAmount:  parseFloat(pending) || 0,
        notes,
      });
      onUpdate?.({
        ...delivery,
        status: "completed",
        amountReceived: rec,
        paymentType,
        pendingAmount: parseFloat(pending) || 0,
        notes,
      });
      Alert.alert("✓ Delivery Complete!", "Moving to next nearest delivery.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      setError(e.response?.data?.message || "Could not save. Try again.");
    } finally { setSaving(false); }
  };

  const handleSkip = () => {
    Alert.alert("Skip Delivery?", "Mark this delivery as skipped?", [
      { text: "Cancel", style:"cancel" },
      { text: "Skip", style:"destructive", onPress: async () => {
        try {
          await axiosInstance.put(`/api/driver/deliveries/${delivery._id}/skip`, { notes: notes||"Skipped by driver" });
          onUpdate?.({ ...delivery, status: "skipped", notes: notes || "Skipped by driver" });
          navigation.goBack();
        } catch { Alert.alert("Error","Could not skip."); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f8faff" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#bfdbfe" />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>Mark Delivery Done</Text>
          <Text style={s.headerSub}>{delivery.shopName}</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
          <Text style={s.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Shop info card */}
        <View style={s.shopCard}>
          <Text style={s.shopName}>{delivery.shopName}</Text>
          <Text style={s.shopSub}>{delivery.ownerName} · {delivery.phone}</Text>
          <Text style={s.shopAddr}>📍 {delivery.address}</Text>
          <View style={s.deliveryInfo}>
            <View style={s.infoChip}><Text style={s.infoChipText}>{delivery.quantity} kg {delivery.productName||"Batter"}</Text></View>
            <View style={[s.infoChip, { backgroundColor:"#1d4ed8" }]}><Text style={[s.infoChipText, { color:"#fff" }]}>Bill: ₹{Number(delivery.totalAmount).toLocaleString("en-IN")}</Text></View>
          </View>
          <View style={s.directionRow}>
            <TouchableOpacity style={s.mapsBtn} onPress={() => {
              const url = delivery.latitude && delivery.longitude
                ? `https://maps.google.com/?q=${delivery.latitude},${delivery.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(delivery.address)}`;
              Linking.openURL(url);
            }} activeOpacity={0.8}>
              <Ionicons name="navigate-outline" size={14} color="#1d4ed8" />
              <Text style={s.mapsBtnText}>Open in Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${delivery.phone}`)} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={14} color="#16a34a" />
              <Text style={s.callBtnText}>Call Owner</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment Details</Text>

          {/* Payment type */}
          <Text style={s.label}>Payment Type</Text>
          <View style={s.paymentGrid}>
            {PAYMENT_TYPES.map(p => (
              <TouchableOpacity key={p.key} onPress={() => setPaymentType(p.key)}
                style={[s.paymentBtn, paymentType===p.key && { borderColor:p.color, backgroundColor:p.color+"15" }]}
                activeOpacity={0.8}>
                <Ionicons name={p.icon} size={18} color={paymentType===p.key ? p.color : "#9ca3af"} />
                <Text style={[s.paymentBtnText, paymentType===p.key && { color:p.color }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount received */}
          <Text style={[s.label, { marginTop:16 }]}>Amount Received (₹)</Text>
          <View style={s.amtRow}>
            <Text style={s.amtPrefix}>₹</Text>
            <TextInput style={s.amtInput} keyboardType="decimal-pad" value={received}
              onChangeText={v => { setReceived(v); setPending(String(Math.max(0, totalBill - (parseFloat(v)||0)))); }}
              onBlur={autoCalcPending} placeholder="0" placeholderTextColor="#d1d5db" />
            <TouchableOpacity onPress={() => { setReceived(String(totalBill)); setPending("0"); }} style={s.fullBtn}>
              <Text style={s.fullBtnText}>Full</Text>
            </TouchableOpacity>
          </View>

          {/* Pending amount */}
          <Text style={[s.label, { marginTop:12 }]}>Pending Amount (₹)</Text>
          <View style={s.amtRow}>
            <Text style={s.amtPrefix}>₹</Text>
            <TextInput style={s.amtInput} keyboardType="decimal-pad" value={pending}
              onChangeText={setPending} placeholder="0" placeholderTextColor="#d1d5db" />
          </View>

          {/* Summary */}
          {received && (
            <View style={s.summary}>
              <View style={s.summaryRow}><Text style={s.summaryLabel}>Total Bill</Text><Text style={s.summaryValue}>₹{Number(totalBill).toLocaleString("en-IN")}</Text></View>
              <View style={s.summaryRow}><Text style={s.summaryLabel}>Received</Text><Text style={[s.summaryValue,{color:"#16a34a"}]}>₹{Number(received||0).toLocaleString("en-IN")}</Text></View>
              <View style={[s.summaryRow,{borderTopWidth:1,borderTopColor:"#f3f4f6",marginTop:4,paddingTop:6}]}>
                <Text style={[s.summaryLabel,{fontWeight:"700"}]}>Pending</Text>
                <Text style={[s.summaryValue,{color:parseFloat(pending)>0?"#ef4444":"#16a34a",fontWeight:"700"}]}>₹{Number(pending||0).toLocaleString("en-IN")}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          <Text style={[s.label,{marginTop:14}]}>Notes (optional)</Text>
          <TextInput style={s.notesInput} multiline numberOfLines={3} placeholder="Any remarks about this delivery..."
            placeholderTextColor="#d1d5db" value={notes} onChangeText={setNotes} textAlignVertical="top" />

          {!!error && <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={14} color="#ef4444" /><Text style={s.errorText}>{error}</Text></View>}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.submitBtn, saving && {opacity:0.7}]} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.submitBtnText}>Confirm Delivery Done</Text></>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor:"#1d4ed8", flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:16, paddingVertical:14 },
  backBtn:      { width:34,height:34,borderRadius:17,backgroundColor:"rgba(255,255,255,0.15)",alignItems:"center",justifyContent:"center" },
  headerTitle:  { color:"#fff",fontSize:15,fontWeight:"700" },
  headerSub:    { color:"#bfdbfe",fontSize:11,marginTop:1 },
  skipBtn:      { paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:"rgba(255,255,255,0.15)" },
  skipBtnText:  { color:"#fde68a",fontSize:12,fontWeight:"600" },
  shopCard:     { backgroundColor:"#fff",borderRadius:18,padding:16,marginBottom:12,shadowColor:"#000",shadowOpacity:0.04,elevation:1 },
  shopName:     { fontSize:17,fontWeight:"800",color:"#111827" },
  shopSub:      { fontSize:12,color:"#6b7280",marginTop:3 },
  shopAddr:     { fontSize:12,color:"#9ca3af",marginTop:6 },
  deliveryInfo: { flexDirection:"row",gap:8,marginTop:10 },
  infoChip:     { paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:"#eff6ff" },
  infoChipText: { fontSize:12,fontWeight:"700",color:"#1d4ed8" },
  directionRow: { flexDirection:"row",gap:8,marginTop:12 },
  mapsBtn:      { flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:14,paddingVertical:9,borderRadius:10,backgroundColor:"#eff6ff",borderWidth:1,borderColor:"#bfdbfe" },
  mapsBtnText:  { color:"#1d4ed8",fontSize:12,fontWeight:"600" },
  callBtn:      { flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:14,paddingVertical:9,borderRadius:10,backgroundColor:"#f0fdf4",borderWidth:1,borderColor:"#bbf7d0" },
  callBtnText:  { color:"#16a34a",fontSize:12,fontWeight:"600" },
  section:      { backgroundColor:"#fff",borderRadius:18,padding:16,shadowColor:"#000",shadowOpacity:0.04,elevation:1 },
  sectionTitle: { fontSize:15,fontWeight:"700",color:"#111827",marginBottom:14 },
  label:        { fontSize:13,fontWeight:"600",color:"#374151",marginBottom:8 },
  paymentGrid:  { flexDirection:"row",flexWrap:"wrap",gap:8 },
  paymentBtn:   { flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:2,borderColor:"#e5e7eb",backgroundColor:"#fff" },
  paymentBtnText:{ fontSize:13,fontWeight:"600",color:"#9ca3af" },
  amtRow:       { flexDirection:"row",alignItems:"center",borderWidth:1.5,borderColor:"#e5e7eb",borderRadius:14,overflow:"hidden",backgroundColor:"#fff" },
  amtPrefix:    { paddingHorizontal:14,paddingVertical:13,backgroundColor:"#f8fafc",fontSize:16,color:"#374151",fontWeight:"700",borderRightWidth:1,borderRightColor:"#e5e7eb" },
  amtInput:     { flex:1,paddingHorizontal:14,paddingVertical:13,fontSize:18,color:"#111827",fontWeight:"700" },
  fullBtn:      { paddingHorizontal:14,paddingVertical:13,backgroundColor:"#eff6ff",borderLeftWidth:1,borderLeftColor:"#bfdbfe" },
  fullBtnText:  { color:"#1d4ed8",fontSize:12,fontWeight:"700" },
  summary:      { backgroundColor:"#f8faff",borderRadius:12,padding:12,marginTop:12 },
  summaryRow:   { flexDirection:"row",justifyContent:"space-between",paddingVertical:3 },
  summaryLabel: { fontSize:13,color:"#6b7280" },
  summaryValue: { fontSize:13,fontWeight:"600",color:"#111827" },
  notesInput:   { borderWidth:1.5,borderColor:"#e5e7eb",borderRadius:14,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:"#111827",backgroundColor:"#fff",minHeight:80 },
  errorBox:     { flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#fef2f2",borderRadius:10,padding:10,marginTop:10,borderWidth:1,borderColor:"#fecaca" },
  errorText:    { color:"#ef4444",fontSize:12,flex:1 },
  footer:       { padding:16,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:"#f3f4f6" },
  submitBtn:    { backgroundColor:"#1d4ed8",borderRadius:14,paddingVertical:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,shadowColor:"#1d4ed8",shadowOpacity:0.3,shadowRadius:8,elevation:4 },
  submitBtnText:{ color:"#fff",fontSize:16,fontWeight:"700" },
});