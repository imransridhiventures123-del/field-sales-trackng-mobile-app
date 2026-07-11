// FILE: src/pages/UploadPhotosPage.js — React Native Expo version
// Camera only via expo-image-picker. Gallery disabled.
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,  Image, TextInput, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVisit } from "../context/VisitContext";
import { useCamera } from "../hooks/useCamera";

export default function UploadPhotosPage() {
  const navigation = useNavigation();
  const { visitForm, updateVisitForm, submitVisit, isSubmitting } = useVisit();
  const { photos, error: cameraError, takePhoto, removePhoto, getBase64Photos, isFull, count } = useCamera();
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    if (count === 0) return;
    setSubmitError("");
    updateVisitForm({ notes });
    const base64Photos = getBase64Photos();
    const result = await submitVisit({ photos: base64Photos, notes });
    if (result.success) navigation.navigate("VisitSummary");
    else setSubmitError(result.error || "Submission failed.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={{ color: "#bfdbfe" }}>←</Text></TouchableOpacity>
        <View><Text style={s.headerTitle}>Upload Photos</Text><Text style={{ color: "#bfdbfe", fontSize: 12 }}>Step 3 of 3</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Visit summary */}
        <View style={s.summaryCard}>
          <Text style={s.sectionLabel}>Visit Summary</Text>
          {[["Shop", visitForm.shopName], ["Code", visitForm.shopCode], ["Owner", visitForm.ownerName],
            ["GPS", visitForm.latitude ? `${visitForm.latitude.toFixed(4)}, ${visitForm.longitude.toFixed(4)}` : "—"]
          ].map(([l, v]) => (
            <View key={l} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{l}</Text>
              <Text style={s.summaryValue}>{v || "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>Shop Photos</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Camera only — take photos live at the shop. Gallery disabled.</Text>

        {/* Photo grid */}
        <View style={s.photoGrid}>
          {photos.map((p, i) => (
            <View key={i} style={s.photoWrap}>
              <Image source={{ uri: p.uri }} style={s.photo} />
              <TouchableOpacity onPress={() => removePhoto(i)} style={s.removeBtn}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {!isFull && (
            <TouchableOpacity onPress={takePhoto} style={s.addPhotoBtn} activeOpacity={0.8}>
              <Text style={{ fontSize: 28 }}>📷</Text>
              <Text style={s.addPhotoText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{count}/5 photos added</Text>
        {!!cameraError && <Text style={s.errText}>{cameraError}</Text>}

        <Text style={s.label}>Notes <Text style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</Text></Text>
        <TextInput
          style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
          placeholder="Any observations about this shop visit..."
          placeholderTextColor="#d1d5db"
          multiline value={notes} onChangeText={setNotes}
        />
        {!!submitError && <View style={s.errorBox}><Text style={s.errText}>{submitError}</Text></View>}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.submitBtn, (isSubmitting || count === 0) && s.submitBtnDisabled]} onPress={handleSubmit} disabled={isSubmitting || count === 0} activeOpacity={0.8}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Visit ✓</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: "#fff", fontSize: 16, fontWeight: "600" },
  summaryCard:  { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: "#9ca3af" },
  summaryValue: { fontSize: 13, fontWeight: "500", color: "#111827" },
  photoGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  photoWrap:    { width: "30%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
  photo:        { width: "100%", height: "100%", borderRadius: 12 },
  removeBtn:    { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  addPhotoBtn:  { width: "30%", aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: "#93c5fd", backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoText: { fontSize: 11, color: "#1d4ed8", fontWeight: "600" },
  label:        { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input:        { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: "#111827", backgroundColor: "#fff" },
  errText:      { color: "#ef4444", fontSize: 12, textAlign: "center", marginBottom: 8 },
  errorBox:     { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#fecaca" },
  footer:       { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  submitBtn:    { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnDisabled: { backgroundColor: "#93c5fd" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});