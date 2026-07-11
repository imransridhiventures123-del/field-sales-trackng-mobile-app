// FILE: src/pages/RegisterPage.js — React Native Expo version
// FIXES:
//  1. Ionicons — emoji hata ke professional vector icons
//  2. DateTimePicker — DOB ke liye proper date picker
//  3. KeyboardAvoidingView — keyboard aane pe scroll properly kaam kare
//  4. Aadhaar auto-format XXXX XXXX XXXX, PAN auto-uppercase
//  5. Camera fix — updated ImagePicker API
//  6. Password show/hide toggle
//  7. All data properly sent to database via registerUser

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker   from "@react-native-community/datetimepicker";
import { Ionicons }     from "@expo/vector-icons";
import { useAuth }      from "../context/AuthContext";
import { registerUser } from "../api/authApi";

// ── Constants ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Personal", icon: "person-outline"    },
  { id: 2, label: "Identity", icon: "card-outline"      },
  { id: 3, label: "Work",     icon: "briefcase-outline" },
  { id: 4, label: "Security", icon: "lock-closed-outline" },
];

function getAge(date) {
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) age--;
  return age;
}

function formatDate(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

// Aadhaar: XXXX XXXX XXXX auto-format
function formatAadhaar(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(" ")
  );
}

// PAN: auto-uppercase, max 10
function formatPan(raw) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

// ── Field wrapper — OUTSIDE component (keyboard fix) ──────────
function Field({ label, required, error, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={st.label}>
        {label}
        {required && <Text style={{ color: "#ef4444" }}> *</Text>}
      </Text>
      {children}
      {!!error && (
        <View style={st.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text style={st.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Step indicator pill — OUTSIDE component ───────────────────
function StepDot({ step, current, icon }) {
  const done   = current > step;
  const active = current === step;
  return (
    <View style={[st.stepDot, done && st.stepDone, active && st.stepActive]}>
      {done
        ? <Ionicons name="checkmark" size={16} color="#fff" />
        : <Ionicons name={icon} size={16} color={active ? "#fff" : "#9ca3af"} />
      }
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigation    = useNavigation();
  const { login }     = useAuth();

  const [step, setStep]             = useState(1);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [apiError, setApiError]     = useState("");
  const [photoUri, setPhotoUri]     = useState(null);
  const [photoB64, setPhotoB64]     = useState(null);
  const [showDOB, setShowDOB]       = useState(false);
  const [dobDate, setDobDate]       = useState(null);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    fullName: "", phone: "", address: "", city: "", pincode: "",
    aadhaar: "", pan: "", salary: "", password: "", confirmPassword: "",
  });

  const age = getAge(dobDate);

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setApiError("");
  };

  // ── Validation ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.fullName.trim())                       e.fullName = "Full name is required";
      if (!/^[6-9]\d{9}$/.test(form.phone))           e.phone    = "Enter valid 10-digit mobile number";
      if (!dobDate)                                    e.dob      = "Date of birth is required";
      else if (age !== null && age < 18)               e.dob      = "Must be at least 18 years old";
      if (!form.address.trim())                        e.address  = "Address is required";
      if (!form.city.trim())                           e.city     = "City is required";
      if (!/^\d{6}$/.test(form.pincode))              e.pincode  = "Enter valid 6-digit pincode";
    }
    if (step === 2) {
      const digits = form.aadhaar.replace(/\s/g, "");
      if (!/^\d{12}$/.test(digits))                   e.aadhaar  = "Enter valid 12-digit Aadhaar number";
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) e.pan      = "Enter valid PAN (e.g. ABCDE1234F)";
    }
    if (step === 3) {
      if (!form.salary || Number(form.salary) < 1000) e.salary   = "Enter valid monthly salary (min ₹1000)";
      if (!photoUri)                                  e.photo    = "Profile photo is required";
    }
    if (step === 4) {
      if (form.password.length < 6)                  e.password      = "Password must be at least 6 characters";
      if (form.password !== form.confirmPassword)    e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validate()) setStep((s) => s + 1); };
  const prevStep = () => { setErrors({}); setStep((s) => s - 1); };

  // ── Camera / Selfie ──────────────────────────────────────────
  const takeSelfie = async () => {
    try {
      // 1. Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera access in your device settings to take a profile photo.",
          [{ text: "OK" }]
        );
        return;
      }

      // 2. Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect:  [1, 1],
        quality: 0.6,
        base64:  true,
      });

      // 3. Save if not cancelled
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoB64(`data:image/jpeg;base64,${asset.base64}`);
        setErrors((p) => ({ ...p, photo: "" }));
      }
    } catch (err) {
      Alert.alert("Camera Error", "Could not open camera. Please try again.");
    }
  };

  // ── Date picker handler ──────────────────────────────────────
  const onDobChange = (event, selected) => {
    setShowDOB(false);
    if (event.type === "dismissed") return;
    if (selected) {
      setDobDate(selected);
      setErrors((p) => ({ ...p, dob: "" }));
    }
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await registerUser({
        name:     form.fullName.trim(),
        mobile:   form.phone.trim(),
        dob:      formatDate(dobDate),
        age:      age,
        address:  `${form.address.trim()}, ${form.city.trim()} - ${form.pincode.trim()}`,
        aadhaar:  form.aadhaar.replace(/\s/g, ""),
        pan:      form.pan.toUpperCase(),
        salary:   Number(form.salary),
        photo:    photoB64,
        password: form.password,
      });
      await login(res.token, res.user);
      // ← NO navigation.replace("Main") — AppNavigator handles it automatically
    } catch (err) {
      setApiError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8faff" }}>

      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={step > 1 ? prevStep : () => navigation.goBack()}
          style={st.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#bfdbfe" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Create Account</Text>
          <Text style={st.headerSub}>
            Step {step} of {STEPS.length} —{" "}
            {step === 1 ? "Personal Info" : step === 2 ? "Identity Documents" : step === 3 ? "Work Details" : "Set Password"}
          </Text>
        </View>
      </View>

      {/* ── Step dots ── */}
      <View style={st.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={s.id} style={{ alignItems: "center", flexDirection: "row" }}>
            <StepDot step={s.id} current={step} icon={s.icon} />
            {i < STEPS.length - 1 && (
              <View style={[st.stepLine, step > s.id && st.stepLineDone]} />
            )}
          </View>
        ))}
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* API Error */}
          {!!apiError && (
            <View style={st.apiErrorBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={st.apiErrorText}>{apiError}</Text>
            </View>
          )}

          {/* ═══ STEP 1 — Personal Info ═══ */}
          {step === 1 && (
            <>
              <Field label="Full Name" required error={errors.fullName}>
                <View style={st.inputRow}>
                  <Ionicons name="person-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={st.inputWithIcon}
                    placeholder="e.g. Rakesh Kumar"
                    placeholderTextColor="#d1d5db"
                    autoCapitalize="words"
                    returnKeyType="next"
                    value={form.fullName}
                    onChangeText={(t) => set("fullName", t)}
                  />
                </View>
              </Field>

              <Field label="Mobile Number" required error={errors.phone}>
                <View style={st.prefixRow}>
                  <View style={st.prefixBox}>
                    <Text style={st.prefixText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={st.prefixInput}
                    placeholder="98765 43210"
                    placeholderTextColor="#d1d5db"
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="next"
                    value={form.phone}
                    onChangeText={(t) => set("phone", t.replace(/\D/g, ""))}
                  />
                </View>
              </Field>

              <Field label="Date of Birth" required error={errors.dob}>
                <TouchableOpacity
                  style={[st.inputRow, st.dobBtn, errors.dob && st.inputErr]}
                  onPress={() => setShowDOB(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={dobDate ? "#111827" : "#9ca3af"} style={st.inputIcon} />
                  <Text style={[st.dobText, !dobDate && { color: "#d1d5db" }]}>
                    {dobDate ? formatDate(dobDate) : "Select your date of birth"}
                  </Text>
                  {dobDate && (
                    <View style={st.ageBadge}>
                      <Text style={st.ageBadgeText}>{age} yrs</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {showDOB && (
                  <DateTimePicker
                    value={dobDate || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                    minimumDate={new Date(1960, 0, 1)}
                    onChange={onDobChange}
                  />
                )}
              </Field>

              <Field label="Address" required error={errors.address}>
                <View style={st.inputRow}>
                  <Ionicons name="location-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={[st.inputWithIcon, { minHeight: 50, textAlignVertical: "top" }]}
                    placeholder="Door no., Street, Area"
                    placeholderTextColor="#d1d5db"
                    autoCapitalize="sentences"
                    multiline
                    value={form.address}
                    onChangeText={(t) => set("address", t)}
                  />
                </View>
              </Field>

              <Field label="City" required error={errors.city}>
                <View style={st.inputRow}>
                  <Ionicons name="business-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={st.inputWithIcon}
                    placeholder="Chennai"
                    placeholderTextColor="#d1d5db"
                    autoCapitalize="words"
                    returnKeyType="next"
                    value={form.city}
                    onChangeText={(t) => set("city", t)}
                  />
                </View>
              </Field>

              <Field label="Pincode" required error={errors.pincode}>
                <View style={st.inputRow}>
                  <Ionicons name="map-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={st.inputWithIcon}
                    placeholder="600001"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    value={form.pincode}
                    onChangeText={(t) => set("pincode", t.replace(/\D/g, ""))}
                  />
                </View>
              </Field>
            </>
          )}

          {/* ═══ STEP 2 — Identity ═══ */}
          {step === 2 && (
            <>
              <View style={st.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#1d4ed8" />
                <Text style={st.infoText}>Your identity documents are stored securely and encrypted.</Text>
              </View>

              <Field label="Aadhaar Number" required error={errors.aadhaar}>
                <View style={st.inputRow}>
                  <Ionicons name="card-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={st.inputWithIcon}
                    placeholder="XXXX  XXXX  XXXX"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    maxLength={14}
                    returnKeyType="next"
                    value={form.aadhaar}
                    onChangeText={(t) => set("aadhaar", formatAadhaar(t))}
                  />
                </View>
                <Text style={st.hintText}>12-digit unique identification number</Text>
              </Field>

              <Field label="PAN Number" required error={errors.pan}>
                <View style={st.inputRow}>
                  <Ionicons name="document-text-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={st.inputWithIcon}
                    placeholder="ABCDE 1234 F"
                    placeholderTextColor="#d1d5db"
                    autoCapitalize="characters"
                    maxLength={10}
                    returnKeyType="done"
                    value={form.pan}
                    onChangeText={(t) => set("pan", formatPan(t))}
                  />
                </View>
                <Text style={st.hintText}>Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)</Text>
                {form.pan.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan) && (
                  <View style={st.validRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                    <Text style={st.validText}>Valid PAN format</Text>
                  </View>
                )}
              </Field>
            </>
          )}

          {/* ═══ STEP 3 — Work Details ═══ */}
          {step === 3 && (
            <>
              <Field label="Profile Photo" required error={errors.photo}>
                <View style={st.photoSection}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={st.photoCircle} />
                  ) : (
                    <View style={[st.photoCircle, st.photoPlaceholder]}>
                      <Ionicons name="person-outline" size={36} color="#93c5fd" />
                    </View>
                  )}
                  <TouchableOpacity onPress={takeSelfie} style={st.cameraBtn} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={st.cameraBtnText}>
                      {photoUri ? "Retake Selfie" : "Take Selfie"}
                    </Text>
                  </TouchableOpacity>
                  {photoUri && (
                    <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoB64(null); }} style={st.removePhotoBtn}>
                      <Text style={{ color: "#ef4444", fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Field>

              <Field label="Monthly Salary (₹)" required error={errors.salary}>
                <View style={st.prefixRow}>
                  <View style={st.prefixBox}>
                    <Text style={st.prefixText}>₹</Text>
                  </View>
                  <TextInput
                    style={st.prefixInput}
                    placeholder="25,000"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={form.salary}
                    onChangeText={(t) => set("salary", t.replace(/\D/g, ""))}
                  />
                </View>
                {form.salary && Number(form.salary) >= 1000 && (
                  <Text style={st.hintText}>
                    ₹{Number(form.salary).toLocaleString("en-IN")} per month
                  </Text>
                )}
              </Field>
            </>
          )}

          {/* ═══ STEP 4 — Password ═══ */}
          {step === 4 && (
            <>
              <View style={st.infoCard}>
                <Ionicons name="lock-closed-outline" size={16} color="#1d4ed8" />
                <Text style={st.infoText}>Use a strong password with at least 6 characters.</Text>
              </View>

              <Field label="Set Password" required error={errors.password}>
                <View style={st.inputRow}>
                  <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={[st.inputWithIcon, { flex: 1 }]}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#d1d5db"
                    secureTextEntry={!showPass}
                    returnKeyType="next"
                    value={form.password}
                    onChangeText={(t) => set("password", t)}
                  />
                  <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={{ paddingHorizontal: 12 }}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {/* Strength indicator */}
                {form.password.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {[1,2,3,4].map((i) => (
                        <View key={i} style={[st.strengthBar, {
                          backgroundColor:
                            form.password.length >= i * 3
                              ? form.password.length >= 10 ? "#16a34a" : form.password.length >= 6 ? "#f59e0b" : "#ef4444"
                              : "#e5e7eb"
                        }]} />
                      ))}
                    </View>
                    <Text style={[st.strengthText, {
                      color: form.password.length >= 10 ? "#16a34a" : form.password.length >= 6 ? "#f59e0b" : "#ef4444"
                    }]}>
                      {form.password.length < 6 ? "Too short" : form.password.length < 10 ? "Good" : "Strong"}
                    </Text>
                  </View>
                )}
              </Field>

              <Field label="Confirm Password" required error={errors.confirmPassword}>
                <View style={st.inputRow}>
                  <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" style={st.inputIcon} />
                  <TextInput
                    style={[st.inputWithIcon, { flex: 1 }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#d1d5db"
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    value={form.confirmPassword}
                    onChangeText={(t) => set("confirmPassword", t)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={{ paddingHorizontal: 12 }}>
                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {form.confirmPassword.length > 0 && form.password === form.confirmPassword && (
                  <View style={st.validRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                    <Text style={st.validText}>Passwords match</Text>
                  </View>
                )}
              </Field>
            </>
          )}

          {/* ── Buttons ── */}
          <View style={{ marginTop: 8, gap: 12 }}>
            {step < STEPS.length ? (
              <TouchableOpacity style={st.primaryBtn} onPress={nextStep} activeOpacity={0.85}>
                <Text style={st.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[st.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleFinish}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={st.primaryBtnText}>Create Account</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {step === 1 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                  Already have an account?{" "}
                  <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Layout
  header:          { backgroundColor: "#1d4ed8", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:     { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub:       { color: "#bfdbfe", fontSize: 12, marginTop: 1 },

  // Steps
  stepsRow:        { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  stepDot:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  stepActive:      { backgroundColor: "#1d4ed8" },
  stepDone:        { backgroundColor: "#22c55e" },
  stepLine:        { width: 32, height: 2, backgroundColor: "#f3f4f6", marginHorizontal: 4 },
  stepLineDone:    { backgroundColor: "#22c55e" },

  // Form
  label:           { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 7 },
  inputRow:        { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, backgroundColor: "#fff", overflow: "hidden" },
  inputIcon:       { paddingLeft: 14 },
  inputWithIcon:   { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 14, color: "#111827" },
  inputErr:        { borderColor: "#f87171", backgroundColor: "#fef9f9" },

  // Prefix row (mobile, salary)
  prefixRow:       { flexDirection: "row", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", alignItems: "center" },
  prefixBox:       { paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#f8fafc", borderRightWidth: 1, borderRightColor: "#e5e7eb" },
  prefixText:      { fontSize: 14, color: "#374151", fontWeight: "600" },
  prefixInput:     { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: "#111827" },

  // DOB
  dobBtn:          { paddingHorizontal: 14, paddingVertical: 13, alignItems: "center" },
  dobText:         { flex: 1, fontSize: 14, color: "#111827", marginLeft: 8 },
  ageBadge:        { backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ageBadgeText:    { fontSize: 11, color: "#1d4ed8", fontWeight: "700" },

  // Photo
  photoSection:    { alignItems: "center", paddingVertical: 8, gap: 12 },
  photoCircle:     { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: "#dbeafe" },
  photoPlaceholder:{ backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  cameraBtn:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1d4ed8", paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22 },
  cameraBtnText:   { color: "#fff", fontWeight: "600", fontSize: 14 },
  removePhotoBtn:  { paddingVertical: 4 },

  // Password strength
  strengthBar:     { flex: 1, height: 3, borderRadius: 2 },
  strengthText:    { fontSize: 11, marginTop: 4, fontWeight: "600" },

  // Info / Error
  infoCard:        { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, marginBottom: 16 },
  infoText:        { flex: 1, fontSize: 12, color: "#1d4ed8", lineHeight: 18 },
  apiErrorBox:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#fecaca" },
  apiErrorText:    { flex: 1, color: "#ef4444", fontSize: 13 },
  errRow:          { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  errText:         { color: "#ef4444", fontSize: 12 },
  hintText:        { fontSize: 11, color: "#9ca3af", marginTop: 5 },
  validRow:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  validText:       { fontSize: 11, color: "#16a34a", fontWeight: "600" },

  // Button
  primaryBtn:      { backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#1d4ed8", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  primaryBtnText:  { color: "#fff", fontSize: 16, fontWeight: "700" },
});