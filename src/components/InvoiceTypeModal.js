// FILE: src/components/InvoiceTypeModal.js
// PURPOSE: "Select Invoice Type" popup shown when Download Invoice is
// tapped on a completed delivery, in the driver app. Reusable component.

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { downloadAndShareInvoice } from "../api/invoiceApi";

export default function InvoiceTypeModal({ visible, delivery, onClose }) {
  const [type, setType] = useState("without-gst");
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  if (!visible || !delivery) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setErr("");
    try {
      await downloadAndShareInvoice(delivery._id, type);
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Download Invoice</Text>
            <TouchableOpacity onPress={onClose} disabled={downloading}>
              <Ionicons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <Text style={s.sub}>Choose Invoice Type</Text>

          <TouchableOpacity
            style={[s.option, type === "with-gst" && s.optionActive]}
            onPress={() => setType("with-gst")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={type === "with-gst" ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={type === "with-gst" ? "#1d4ed8" : "#9ca3af"}
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.optionTitle}>With GST</Text>
              <Text style={s.optionSub}>Tax invoice with CGST/SGST breakup</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.option, type === "without-gst" && s.optionActive]}
            onPress={() => setType("without-gst")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={type === "without-gst" ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={type === "without-gst" ? "#1d4ed8" : "#9ca3af"}
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.optionTitle}>Without GST</Text>
              <Text style={s.optionSub}>Plain invoice, no tax breakup</Text>
            </View>
          </TouchableOpacity>

          {err ? <Text style={s.errText}>{err}</Text> : null}

          <View style={s.btnRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={downloading}
              style={[s.btn, { backgroundColor: "#f3f4f6" }]}
              activeOpacity={0.8}
            >
              <Text style={[s.btnText, { color: "#374151" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              style={[s.btn, { backgroundColor: "#16a34a" }]}
              activeOpacity={0.8}
            >
              {downloading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>Download</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  card:        { backgroundColor:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, padding:24 },
  headerRow:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  title:       { fontSize:18, fontWeight:"700", color:"#111827" },
  sub:         { fontSize:12, color:"#9ca3af", marginTop:4, marginBottom:12 },
  option:      { flexDirection:"row", alignItems:"center", paddingVertical:12, paddingHorizontal:14, borderRadius:12, borderWidth:2, borderColor:"#f3f4f6", marginBottom:8 },
  optionActive:{ borderColor:"#1d4ed8", backgroundColor:"#eff6ff" },
  optionTitle: { fontSize:14, fontWeight:"600", color:"#111827" },
  optionSub:   { fontSize:11, color:"#6b7280", marginTop:1 },
  errText:     { fontSize:12, color:"#ef4444", marginTop:4 },
  btnRow:      { flexDirection:"row", gap:10, marginTop:14 },
  btn:         { flex:1, borderRadius:10, paddingVertical:12, alignItems:"center" },
  btnText:     { color:"#fff", fontWeight:"600", fontSize:13 },
});