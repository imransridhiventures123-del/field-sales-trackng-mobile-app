// FILE: src/pages/ProveLocationPage.js — React Native Expo version
// expo-location replaces navigator.geolocation
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useVisit } from "../context/VisitContext";

export default function ProveLocationPage() {
  const navigation = useNavigation();
  const { updateVisitForm } = useVisit();
  const [coords, setCoords]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleGetLocation = async () => {
    setError(""); setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setError("Location permission denied. Please allow in settings."); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: Math.round(loc.coords.accuracy) });
    } catch (e) {
      setError("Could not get location. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!coords) return;
    updateVisitForm({ latitude: coords.latitude, longitude: coords.longitude, locationAccuracy: coords.accuracy });
    navigation.navigate("UploadPhotos");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={{ color: "#bfdbfe" }}>←</Text></TouchableOpacity>
        <View><Text style={s.headerTitle}>Prove Location</Text><Text style={{ color: "#bfdbfe", fontSize: 12 }}>Step 2 of 3</Text></View>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={s.iconWrap}><Text style={{ fontSize: 48 }}>📍</Text></View>
        <Text style={s.title}>Confirm Your Location</Text>
        <Text style={s.subtitle}>We need your GPS location to verify this shop visit.</Text>

        {coords ? (
          <View style={s.coordBox}>
            <Text style={s.coordLabel}>✓ Location Captured</Text>
            <Text style={s.coordText}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
            <Text style={s.coordAcc}>Accuracy: ±{coords.accuracy}m</Text>
          </View>
        ) : (
          <TouchableOpacity style={[s.getBtn, loading && { opacity: 0.6 }]} onPress={handleGetLocation} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.getBtnText}>📍 Get My Location</Text>}
          </TouchableOpacity>
        )}

        {!!error && <Text style={s.errorText}>{error}</Text>}

        {coords && (
          <TouchableOpacity onPress={handleGetLocation} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "500" }}>Re-fetch location</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={[s.continueBtn, !coords && s.continueBtnDisabled]} onPress={handleContinue} disabled={!coords} activeOpacity={0.8}>
          <Text style={s.continueBtnText}>Continue to Photos →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: "#1d4ed8", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  iconWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title:       { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  subtitle:    { fontSize: 14, color: "#9ca3af", textAlign: "center", marginBottom: 24 },
  coordBox:    { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#bbf7d0", alignItems: "center", width: "100%" },
  coordLabel:  { fontSize: 13, fontWeight: "600", color: "#166534", marginBottom: 6 },
  coordText:   { fontSize: 13, color: "#374151", fontFamily: "monospace" },
  coordAcc:    { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  getBtn:      { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: "100%" },
  getBtnText:  { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
  errorText:   { color: "#ef4444", fontSize: 13, marginTop: 12, textAlign: "center" },
  footer:      { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  continueBtn: { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  continueBtnDisabled: { backgroundColor: "#93c5fd" },
  continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});