// FILE: src/pages/EndOfDayPage.js — React Native Expo version
// FIXES:
//  1. Back arrow navigation fixed — goBack() use kiya
//  2. Emoji → Ionicons professional icons
//  3. WhatsApp auto-redirect — PDF generate karo, share sheet khulega
//     WhatsApp pe tap karo → PDF seedha attach ho jaata hai (React Native me possible!)
//     + WhatsApp text message bhi pre-filled bhejna → Linking.openURL()
//  4. Download PDF button — employee apne phone mein save kar sake

import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, Alert, Linking,
} from "react-native";
import { SafeAreaView }  from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem   from "expo-file-system";
import * as Sharing      from "expo-sharing";
import { Ionicons }      from "@expo/vector-icons";
import { useAuth }       from "../context/AuthContext";
import ShopVisitCard     from "../components/ShopVisitCard";
import { getTodayVisits, getTelecallers } from "../api/visitApi";
import { generateAndSharePDF }            from "../utils/pdfGenerator";

// ── Summary calc ──────────────────────────────────────────────
const getSummary = (visits) => ({
  total:       visits.length,
  interested:  visits.filter((v) => v.followUp?.status === "interested").length,
  callback:    visits.filter((v) => ["callback", "busy"].includes(v.followUp?.status)).length,
  orderPlaced: visits.filter((v) => v.followUp?.status === "order_placed").length,
  paymentDue:  visits.filter((v) => v.followUp?.status === "payment_due").length,
});

// ── Build WhatsApp message ────────────────────────────────────
function buildWAMessage({ telecaller, employee, summary, filename, date }) {
  return (
    `Hi ${telecaller.name},\n\n` +
    `Here is today's visit report for ${date}.\n\n` +
    `📊 Summary:\n` +
    `• Total shops visited: ${summary.total}\n` +
    `• Interested: ${summary.interested}\n` +
    `• Call Back: ${summary.callback}\n` +
    `• Orders Placed: ${summary.orderPlaced}\n` +
    `• Payment Due: ${summary.paymentDue}\n\n` +
    `📎 PDF: ${filename}\n\n` +
    `Please follow up with all shops. Priority: Interested & Payment Due first.\n\n` +
    `— ${employee?.name || "Field Employee"} (${employee?.employeeId || ""})`
  );
}

// ── Main component ────────────────────────────────────────────
export default function EndOfDayPage() {
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [visits, setVisits]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [telecallers, setTelecallers] = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [pdfUri, setPdfUri]           = useState(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [sentTo, setSentTo]           = useState(null);
  const [waMessage, setWaMessage]     = useState("");

  useEffect(() => {
    Promise.all([getTodayVisits(), getTelecallers()])
      .then(([v, t]) => { setVisits(v.visits || []); setTelecallers(t || []); })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const summary = getSummary(visits);
  const today   = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Generate PDF ──────────────────────────────────────────────
  const generatePDF = async (telecaller) => {
    const { uri, filename } = await generateAndSharePDF({
      visits, employee: user, telecaller, date: today,
    });
    const msg = buildWAMessage({ telecaller, employee: user, summary, filename, date: today });
    return { uri, filename, msg };
  };

  // ── Option 1: Share PDF (native share sheet → user picks WhatsApp) ──
  const handleSharePDF = async (telecaller) => {
    setGenerating(true);
    setShowModal(false);
    try {
      const { uri, filename, msg } = await generatePDF(telecaller);
      setPdfUri(uri);
      setPdfFilename(filename);
      setWaMessage(msg);
      setSentTo(telecaller);

      // Native share sheet — user picks WhatsApp → PDF auto-attached
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert("Sharing not available on this device."); return; }
      await Sharing.shareAsync(uri, {
        mimeType:    "application/pdf",
        dialogTitle: `Send report to ${telecaller.name}`,
        UTI:         "com.adobe.pdf",
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Could not generate report.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Option 2: WhatsApp direct — open chat with pre-filled text ──
  // PDF auto-attach is via share sheet. Text message is separate via deep link.
  const handleWhatsApp = async (telecaller) => {
    setShowModal(false);
    setGenerating(true);
    try {
      const { uri, filename, msg } = await generatePDF(telecaller);
      setPdfUri(uri);
      setPdfFilename(filename);
      setWaMessage(msg);
      setSentTo(telecaller);

      // Step 1: Share PDF via share sheet (WhatsApp picks it up)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType:    "application/pdf",
          dialogTitle: `Share PDF with ${telecaller.name} via WhatsApp`,
          UTI:         "com.adobe.pdf",
        });
      }

      // Step 2: Open WhatsApp with pre-filled text (separate action)
      const encoded = encodeURIComponent(msg);
      const waUrl   = `whatsapp://send?phone=91${telecaller.phone}&text=${encoded}`;
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        // WhatsApp not installed — fallback to web
        await Linking.openURL(
          `https://wa.me/91${telecaller.phone}?text=${encoded}`
        );
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Could not open WhatsApp.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Option 3: Download PDF to device ─────────────────────────
  const handleDownloadPDF = async () => {
    if (!pdfUri) return;
    try {
      const dest = `${FileSystem.documentDirectory}${pdfFilename}`;
      await FileSystem.copyAsync({ from: pdfUri, to: dest });
      Alert.alert(
        "PDF Downloaded",
        `Saved as:\n${pdfFilename}\n\nYou can find it in the app's documents folder.`,
        [{ text: "OK" }]
      );
    } catch (err) {
      Alert.alert("Download Error", err.message || "Could not save PDF.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8faff" }}>

      {/* ── Telecaller Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Ionicons name="people-outline" size={22} color="#1d4ed8" />
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Assign Telecaller</Text>
                <Text style={s.modalSub}>Select who will follow up with these shops</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {telecallers.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Ionicons name="person-outline" size={36} color="#d1d5db" />
                <Text style={{ color: "#9ca3af", marginTop: 8 }}>No telecallers found.</Text>
              </View>
            ) : (
              telecallers.map((t) => (
                <View key={t._id} style={s.telecallerCard}>
                  <View style={s.telecallerAvatar}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{t.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.telecallerName}>{t.name}</Text>
                    <Text style={s.telecallerPhone}>+91 {t.phone}</Text>
                  </View>
                  {/* Two action buttons per telecaller */}
                  <View style={{ gap: 6 }}>
                    {/* WhatsApp — PDF + message */}
                    <TouchableOpacity
                      onPress={() => handleWhatsApp(t)}
                      style={s.waBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                      <Text style={s.waBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                    {/* Share PDF only */}
                    <TouchableOpacity
                      onPress={() => handleSharePDF(t)}
                      style={s.shareBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-outline" size={14} color="#1d4ed8" />
                      <Text style={s.shareBtnText}>Share PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity onPress={() => setShowModal(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#bfdbfe" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>End of Day</Text>
          <Text style={s.headerSub}>{today}</Text>
        </View>
      </View>

      {/* ── Stats bar ── */}
      <View style={s.statsRow}>
        {[
          { l: "Total",    v: summary.total,       c: "#1d4ed8", icon: "storefront-outline"      },
          { l: "Interest", v: summary.interested,  c: "#16a34a", icon: "star-outline"            },
          { l: "Orders",   v: summary.orderPlaced, c: "#7c3aed", icon: "checkmark-circle-outline"},
          { l: "Payment",  v: summary.paymentDue,  c: "#d97706", icon: "cash-outline"            },
        ].map((stat) => (
          <View key={stat.l} style={s.statBox}>
            <Ionicons name={stat.icon} size={14} color={stat.c} style={{ marginBottom: 2 }} />
            <Text style={[s.statNum, { color: stat.c }]}>{stat.v}</Text>
            <Text style={s.statLabel}>{stat.l}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ── Success banner — after assigning telecaller ── */}
        {sentTo && (
          <View style={s.successBanner}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.successTitle}>Report Sent to {sentTo.name}</Text>
              <Text style={s.successSub}>+91 {sentTo.phone}</Text>
            </View>

            {/* Action buttons after success */}
            <View style={s.successActions}>
              {/* Re-send WhatsApp text */}
              <TouchableOpacity
                onPress={async () => {
                  const encoded = encodeURIComponent(waMessage);
                  const waUrl   = `whatsapp://send?phone=91${sentTo.phone}&text=${encoded}`;
                  const can     = await Linking.canOpenURL(waUrl);
                  Linking.openURL(can ? waUrl : `https://wa.me/91${sentTo.phone}?text=${encoded}`);
                }}
                style={s.resendWABtn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                <Text style={s.resendWAText}>WhatsApp</Text>
              </TouchableOpacity>

              {/* Download PDF */}
              {pdfUri && (
                <TouchableOpacity onPress={handleDownloadPDF} style={s.downloadBtn} activeOpacity={0.8}>
                  <Ionicons name="download-outline" size={15} color="#1d4ed8" />
                  <Text style={s.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              )}

              {/* Re-share PDF */}
              {pdfUri && (
                <TouchableOpacity
                  onPress={async () => {
                    await Sharing.shareAsync(pdfUri, {
                      mimeType: "application/pdf",
                      dialogTitle: "Share Visit Report",
                    });
                  }}
                  style={s.downloadBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={15} color="#1d4ed8" />
                  <Text style={s.downloadBtnText}>Share PDF</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => { setSentTo(null); setPdfUri(null); setShowModal(true); }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#166534", fontSize: 12, textDecorationLine: "underline" }}>
                Assign to different telecaller
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Visit list ── */}
        <View style={s.sectionRow}>
          <Ionicons name="list-outline" size={14} color="#9ca3af" />
          <Text style={s.sectionLabel}>
            Today's Visits ({visits.length})
          </Text>
        </View>

        {loading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ height: 80, backgroundColor: "#e5e7eb", borderRadius: 14, marginBottom: 10 }} />
          ))
        ) : visits.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="storefront-outline" size={40} color="#d1d5db" />
            <Text style={s.emptyText}>No visits recorded today.</Text>
            <Text style={s.emptyHint}>Start a visit first, then come back here.</Text>
          </View>
        ) : (
          visits.map((v) => <ShopVisitCard key={v._id} visit={v} />)
        )}
      </ScrollView>

      {/* ── Footer button ── */}
      {!sentTo && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.sendBtn, (generating || loading || visits.length === 0) && s.sendBtnDisabled]}
            onPress={() => setShowModal(true)}
            disabled={generating || loading || visits.length === 0}
            activeOpacity={0.85}
          >
            {generating ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.sendBtnText}>Generating PDF...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={s.sendBtnText}>Assign Telecaller & Send Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header:       { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSub:    { color: "#bfdbfe", fontSize: 11, marginTop: 1 },

  // Stats
  statsRow:     { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  statBox:      { flex: 1, backgroundColor: "#f8faff", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  statNum:      { fontSize: 20, fontWeight: "800" },
  statLabel:    { fontSize: 10, color: "#9ca3af", marginTop: 1 },

  // Section
  sectionRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },

  // Empty
  emptyBox:     { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 6 },
  emptyText:    { fontSize: 15, fontWeight: "600", color: "#374151", marginTop: 6 },
  emptyHint:    { fontSize: 12, color: "#9ca3af", textAlign: "center" },

  // Success banner
  successBanner:    { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#bbf7d0", marginBottom: 16 },
  successIconWrap:  { marginBottom: 8 },
  successTitle:     { fontSize: 15, fontWeight: "700", color: "#166534" },
  successSub:       { fontSize: 13, color: "#16a34a", marginTop: 2 },
  successActions:   { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  resendWABtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#25D366", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  resendWAText:     { color: "#fff", fontWeight: "700", fontSize: 13 },
  downloadBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  downloadBtnText:  { color: "#1d4ed8", fontWeight: "600", fontSize: 13 },

  // Footer
  footer:        { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  sendBtn:       { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#1d4ed8", shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  sendBtnDisabled: { backgroundColor: "#93c5fd", shadowOpacity: 0 },
  sendBtnText:   { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard:      { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "75%" },
  modalHandle:    { width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  modalClose:     { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  modalTitle:     { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalSub:       { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  telecallerCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#f8faff", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  telecallerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center" },
  telecallerName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  telecallerPhone:{ fontSize: 12, color: "#6b7280", marginTop: 2 },
  waBtn:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#25D366", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  waBtnText:      { color: "#fff", fontWeight: "700", fontSize: 12 },
  shareBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  shareBtnText:   { color: "#1d4ed8", fontWeight: "600", fontSize: 12 },
  cancelBtn:      { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  cancelBtnText:  { color: "#9ca3af", fontSize: 14 },
});