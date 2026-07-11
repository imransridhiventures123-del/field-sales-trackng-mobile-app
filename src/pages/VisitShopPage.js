// FILE: src/pages/VisitShopPage.js — React Native Expo version
// FIXES:
//  1. Ionicons — emoji hataaye, professional icons
//  2. DateTimePicker — follow-up date ke liye proper date picker
//  3. KeyboardAvoidingView — keyboard aane pe scroll properly kaam kare
//  4. F component BAHAR — keyboard band hone ka bug fix

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView }  from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker    from "@react-native-community/datetimepicker";
import { Ionicons }      from "@expo/vector-icons";
import { useVisit }      from "../context/VisitContext";

const FIELD_TYPES = ["Field Sales", "Collection"];

const FOLLOWUP_OPTIONS = [
  { value: "interested",     label: "Interested",        color: "#16a34a", icon: "star-outline"          },
  { value: "callback",       label: "Call Back",          color: "#2563eb", icon: "call-outline"          },
  { value: "not_interested", label: "Not Interested",    color: "#ef4444", icon: "close-circle-outline"  },
  { value: "busy",           label: "Busy",               color: "#d97706", icon: "time-outline"          },
  { value: "order_placed",   label: "Order Placed",       color: "#7c3aed", icon: "checkmark-circle-outline"},
  { value: "payment_due",    label: "Payment Due",        color: "#ea580c", icon: "cash-outline"          },
];

const NEEDS_DATE = ["interested", "callback", "payment_due", "busy"];

function formatDate(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

// ── Field wrapper — OUTSIDE component (keyboard fix) ─────────
function F({ label, required, error, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: "#ef4444" }}> *</Text>}
      </Text>
      {children}
      {!!error && (
        <View style={s.errRow}>
          <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
          <Text style={s.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────
export default function VisitShopPage() {
  const navigation        = useNavigation();
  const { updateVisitForm } = useVisit();

  const [form, setForm] = useState({
    shopName: "", shopCode: "", ownerName: "", mobile: "",
    fieldType: "", address: "", followUpStatus: "", followUpNeeded: false,
  });
  const [errors, setErrors]       = useState({});
  const [followUpDate, setFollowUpDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.shopName.trim())              e.shopName       = "Shop name is required";
    if (!form.shopCode.trim())              e.shopCode       = "Shop contact is required";
    if (!form.ownerName.trim())             e.ownerName      = "Owner name is required";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile         = "Enter valid 10-digit number";
    if (!form.fieldType)                    e.fieldType      = "Select field type";
    if (!form.address.trim())               e.address        = "Address is required";
    if (!form.followUpStatus)               e.followUpStatus = "Select a follow-up status";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    updateVisitForm({
      ...form,
      followUp: {
        needed: form.followUpNeeded,
        status: form.followUpStatus,
        date:   followUpDate ? formatDate(followUpDate) : null,
      },
    });
    navigation.navigate("ProveLocation");
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selected) setFollowUpDate(selected);
  };

  const minDate = new Date(Date.now() + 86400000); // tomorrow

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8faff" }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#bfdbfe" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>New Shop Visit</Text>
          <Text style={s.headerSub}>Step 1 of 3 — Shop Details</Text>
        </View>
        {/* Progress dots */}
        <View style={{ flexDirection: "row", gap: 5 }}>
          {[1,2,3].map(i => (
            <View key={i} style={[s.progDot, i === 1 && s.progDotActive]} />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Shop Name */}
          <F label="Shop Name" required error={errors.shopName}>
            <View style={s.inputRow}>
              <Ionicons name="storefront-outline" size={16} color="#9ca3af" style={s.icon} />
              <TextInput
                style={s.inputField}
                placeholder="e.g. Annas Provision Store"
                placeholderTextColor="#d1d5db"
                autoCapitalize="words"
                returnKeyType="next"
                value={form.shopName}
                onChangeText={(t) => set("shopName", t)}
              />
            </View>
          </F>

          {/* Shop Contact */}
          <F label="Shop Contact Number" required error={errors.shopCode}>
            <View style={s.inputRow}>
              <Ionicons name="call-outline" size={16} color="#9ca3af" style={s.icon} />
              <TextInput
                style={s.inputField}
                placeholder="9999999999"
                placeholderTextColor="#d1d5db"
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
                value={form.shopCode}
                onChangeText={(t) => set("shopCode", t.replace(/\D/g, ""))}
              />
            </View>
          </F>

          {/* Owner Name */}
          <F label="Owner Name" required error={errors.ownerName}>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={16} color="#9ca3af" style={s.icon} />
              <TextInput
                style={s.inputField}
                placeholder="e.g. Annas"
                placeholderTextColor="#d1d5db"
                autoCapitalize="words"
                returnKeyType="next"
                value={form.ownerName}
                onChangeText={(t) => set("ownerName", t)}
              />
            </View>
          </F>

          {/* Mobile */}
          <F label="Mobile Number" required error={errors.mobile}>
            <View style={[s.inputRow, errors.mobile && s.inputErr]}>
              <View style={s.prefixBox}>
                <Text style={s.prefixText}>+91</Text>
              </View>
              <TextInput
                style={[s.inputField, { borderLeftWidth: 0 }]}
                placeholder="98765 43210"
                placeholderTextColor="#d1d5db"
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
                value={form.mobile}
                onChangeText={(t) => set("mobile", t.replace(/\D/g, ""))}
              />
            </View>
          </F>

          {/* Field Type */}
          <F label="Field Type" required error={errors.fieldType}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {FIELD_TYPES.map((t) => {
                const active = form.fieldType === t;
                const isFS   = t === "Field Sales";
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => set("fieldType", t)}
                    activeOpacity={0.8}
                    style={[s.typeBtn, active && { backgroundColor: isFS ? "#1d4ed8" : "#7c3aed", borderColor: isFS ? "#1d4ed8" : "#7c3aed" }]}
                  >
                    <Ionicons
                      name={isFS ? "briefcase-outline" : "wallet-outline"}
                      size={16}
                      color={active ? "#fff" : "#6b7280"}
                    />
                    <Text style={[s.typeBtnText, active && { color: "#fff" }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </F>

          {/* Address */}
          <F label="Shop Address" required error={errors.address}>
            <View style={[s.inputRow, { alignItems: "flex-start", paddingTop: 4 }]}>
              <Ionicons name="location-outline" size={16} color="#9ca3af" style={[s.icon, { marginTop: 10 }]} />
              <TextInput
                style={[s.inputField, { minHeight: 72, textAlignVertical: "top" }]}
                placeholder="Door no., Street, Area, City"
                placeholderTextColor="#d1d5db"
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                value={form.address}
                onChangeText={(t) => set("address", t)}
              />
            </View>
          </F>

          {/* Follow-up Status */}
          <F label="Follow-up Status" required error={errors.followUpStatus}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FOLLOWUP_OPTIONS.map((opt) => {
                const active = form.followUpStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      set("followUpStatus", opt.value);
                      set("followUpNeeded", true);
                      if (!NEEDS_DATE.includes(opt.value)) setFollowUpDate(null);
                    }}
                    activeOpacity={0.8}
                    style={[s.chip, active && { backgroundColor: opt.color, borderColor: opt.color }]}
                  >
                    <Ionicons name={opt.icon} size={13} color={active ? "#fff" : opt.color} />
                    <Text style={[s.chipText, active && { color: "#fff" }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </F>

          {/* Follow-up Date picker */}
          {form.followUpStatus && NEEDS_DATE.includes(form.followUpStatus) && (
            <F label="Follow-up Date" required={false} error={null}>
              <TouchableOpacity
                style={s.dateBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={followUpDate ? "#1d4ed8" : "#9ca3af"} />
                <Text style={[s.dateBtnText, !followUpDate && { color: "#d1d5db" }]}>
                  {followUpDate ? formatDate(followUpDate) : "Select follow-up date"}
                </Text>
                {followUpDate && (
                  <TouchableOpacity onPress={() => setFollowUpDate(null)}>
                    <Ionicons name="close-circle" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={followUpDate || minDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={minDate}
                  onChange={onDateChange}
                />
              )}
            </F>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={s.submitBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSub:    { color: "#bfdbfe", fontSize: 11, marginTop: 1 },
  progDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)" },
  progDotActive:{ backgroundColor: "#fff", width: 18 },

  label:        { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 7 },
  inputRow:     { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, backgroundColor: "#fff", overflow: "hidden" },
  inputErr:     { borderColor: "#f87171" },
  icon:         { paddingLeft: 14 },
  inputField:   { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 14, color: "#111827" },
  prefixBox:    { paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#f8fafc", borderRightWidth: 1, borderRightColor: "#e5e7eb" },
  prefixText:   { fontSize: 14, color: "#374151", fontWeight: "600" },

  typeBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 14, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  typeBtnText:  { fontSize: 14, fontWeight: "600", color: "#6b7280" },

  chip:         { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipText:     { fontSize: 13, fontWeight: "600", color: "#4b5563" },

  dateBtn:      { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#bfdbfe", borderRadius: 14, backgroundColor: "#eff6ff", paddingHorizontal: 16, paddingVertical: 13 },
  dateBtnText:  { flex: 1, fontSize: 14, color: "#1d4ed8", fontWeight: "500" },

  errRow:       { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  errText:      { color: "#ef4444", fontSize: 12 },

  footer:       { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  submitBtn:    { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#1d4ed8", shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitBtnText:{ color: "#fff", fontSize: 16, fontWeight: "700" },
});