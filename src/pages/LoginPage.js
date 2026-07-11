// FILE: src/pages/LoginPage.js — With Driver/Employee role selector
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../api/authApi";
import axiosInstance from "../api/axiosInstance";

const ADMIN_NUMBER = "8939720567";

function ForgotPasswordModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.card}>
          <View style={m.iconWrap}><Ionicons name="lock-open-outline" size={28} color="#f59e0b" /></View>
          <Text style={m.title}>Forgot Password?</Text>
          <Text style={m.sub}>Contact your admin to reset your password.</Text>
          <View style={m.numberCard}>
            <Ionicons name="person-circle-outline" size={20} color="#1d4ed8" />
            <View style={{ flex:1 }}><Text style={m.numberLabel}>Admin Contact</Text><Text style={m.numberVal}>+91 {ADMIN_NUMBER}</Text></View>
          </View>
          <TouchableOpacity style={m.callBtn} onPress={() => Linking.openURL(`tel:${ADMIN_NUMBER}`)} activeOpacity={0.85}>
            <Ionicons name="call-outline" size={18} color="#fff" />
            <Text style={m.callBtnText}>Call Admin Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={m.waBtn}
            onPress={() => Linking.openURL(`whatsapp://send?phone=91${ADMIN_NUMBER}&text=Hi%2C%20I%20forgot%20my%20password.%20Please%20reset%20it.`)}
            activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={m.waBtnText}>Message on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}><Text style={m.closeBtnText}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function LoginPage() {
  const navigation = useNavigation();
  const { login, driverLogin } = useAuth(); // driverLogin saves role="driver"

  const [role,     setRole]     = useState("employee"); // "employee" | "driver"
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const validate = () => {
    if (!mobile.trim())           { setError("Enter your mobile number."); return false; }
    if (!/^\d{10}$/.test(mobile)) { setError("Enter valid 10-digit number."); return false; }
    if (password.length < 6)      { setError("Password must be at least 6 characters."); return false; }
    return true;
  };

  const handleLogin = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      if (role === "driver") {
        // Driver login — uses driverLogin which saves role="driver" in AsyncStorage
        // So app reopen → AppNavigator reads role → shows DriverApp automatically ✅
        const res = await axiosInstance.post("/api/driver/auth/login", { mobile, password });
        await driverLogin(res.data.token, res.data.driver);
        // AppNavigator auto-switches to DriverApp (no navigation.replace needed)
      } else {
        // Employee login — uses login which saves role="employee"
        const res = await loginUser(mobile, password);
        await login(res.token, res.user);
        // AppNavigator auto-switches to Main
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Check your details.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f0f4ff" }}>
      <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoBox}><Ionicons name="location-outline" size={28} color="#fff" /></View>
          <Text style={s.logoTitle}>Sridhi Field Sales</Text>
          <Text style={s.logoSub}>Field Sales & Distribution</Text>
        </View>

        <View style={s.card}>
          {/* Role selector */}
          <Text style={s.sectionLabel}>Login As</Text>
          <View style={s.roleRow}>
            <TouchableOpacity style={[s.roleBtn, role==="employee" && s.roleBtnActive]} onPress={() => { setRole("employee"); setError(""); }} activeOpacity={0.8}>
              <Ionicons name="briefcase-outline" size={20} color={role==="employee" ? "#fff" : "#6b7280"} />
              <Text style={[s.roleBtnText, role==="employee" && s.roleBtnTextActive]}>Field Sales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.roleBtn, role==="driver" && { backgroundColor:"#16a34a", borderColor:"#16a34a" }]} onPress={() => { setRole("driver"); setError(""); }} activeOpacity={0.8}>
              <Ionicons name="car-outline" size={20} color={role==="driver" ? "#fff" : "#6b7280"} />
              <Text style={[s.roleBtnText, role==="driver" && s.roleBtnTextActive]}>Driver</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heading}>{role==="driver" ? "Driver Login" : "Welcome Back!"}</Text>
          <Text style={s.subheading}>Login with your mobile & password</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Mobile */}
          <Text style={s.label}>Mobile Number</Text>
          <View style={s.prefixRow}>
            <Text style={s.prefix}>🇮🇳 +91</Text>
            <TextInput style={s.prefixInput} placeholder="98765 43210" placeholderTextColor="#d1d5db"
              keyboardType="phone-pad" maxLength={10} returnKeyType="next"
              value={mobile} onChangeText={t => { setMobile(t.replace(/\D/g,"")); setError(""); }} />
          </View>

          {/* Password */}
          <Text style={[s.label,{marginTop:14}]}>Password</Text>
          <View style={s.passRow}>
            <TextInput style={[s.input,{flex:1}]} placeholder="Enter your password"
              placeholderTextColor="#d1d5db" secureTextEntry={!showPass}
              returnKeyType="done" onSubmitEditing={handleLogin}
              value={password} onChangeText={t => { setPassword(t); setError(""); }} />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{paddingHorizontal:14}}>
              <Ionicons name={showPass?"eye-off-outline":"eye-outline"} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotBtn} onPress={() => setShowForgot(true)}>
            <Ionicons name="help-circle-outline" size={13} color="#1d4ed8" />
            <Text style={s.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.loginBtn, role==="driver" && {backgroundColor:"#16a34a"}, loading && {opacity:0.7}]}
            onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <><Ionicons name={role==="driver"?"car-outline":"log-in-outline"} size={18} color="#fff" />
              <Text style={s.loginBtnText}>{role==="driver" ? "Driver Login" : "Login"}</Text></>
            )}
          </TouchableOpacity>

          {role === "employee" && (
            <TouchableOpacity onPress={() => navigation.navigate("Register")} style={s.signupRow}>
              <Text style={s.signupText}>Don't have an account? </Text>
              <Text style={s.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          )}
         </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

const s = StyleSheet.create({
  container:    { flexGrow:1, alignItems:"center", justifyContent:"center", padding:20 },
  logoSection:  { alignItems:"center", marginBottom:24 },
  logoBox:      { width:64, height:64, borderRadius:20, backgroundColor:"#1d4ed8", alignItems:"center", justifyContent:"center", marginBottom:10, shadowColor:"#1d4ed8", shadowOpacity:0.3, shadowRadius:12, elevation:6 },
  logoTitle:    { fontSize:20, fontWeight:"800", color:"#111827" },
  logoSub:      { fontSize:12, color:"#9ca3af", marginTop:2 },
  card:         { backgroundColor:"#fff", borderRadius:24, padding:24, width:"100%", maxWidth:400, shadowColor:"#1d4ed8", shadowOpacity:0.06, shadowRadius:20, elevation:4 },
  sectionLabel: { fontSize:11, fontWeight:"700", color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 },
  roleRow:      { flexDirection:"row", gap:10, marginBottom:20 },
  roleBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:7, paddingVertical:12, borderRadius:14, borderWidth:2, borderColor:"#e5e7eb", backgroundColor:"#f9fafb" },
  roleBtnActive:{ backgroundColor:"#1d4ed8", borderColor:"#1d4ed8" },
  roleBtnText:  { fontSize:14, fontWeight:"700", color:"#6b7280" },
  roleBtnTextActive:{ color:"#fff" },
  heading:      { fontSize:22, fontWeight:"800", color:"#111827", marginBottom:4 },
  subheading:   { fontSize:13, color:"#9ca3af", marginBottom:18 },
  errorBox:     { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"#fef2f2", borderRadius:12, padding:12, marginBottom:14, borderWidth:1, borderColor:"#fecaca" },
  errorText:    { flex:1, color:"#ef4444", fontSize:13 },
  label:        { fontSize:13, fontWeight:"600", color:"#374151", marginBottom:7 },
  prefixRow:    { flexDirection:"row", alignItems:"center", borderWidth:1.5, borderColor:"#e5e7eb", borderRadius:14, overflow:"hidden", backgroundColor:"#fff" },
  prefix:       { paddingHorizontal:12, paddingVertical:13, backgroundColor:"#f8fafc", fontSize:14, color:"#374151", fontWeight:"600", borderRightWidth:1, borderRightColor:"#e5e7eb" },
  prefixInput:  { flex:1, paddingHorizontal:14, paddingVertical:13, fontSize:14, color:"#111827" },
  passRow:      { flexDirection:"row", alignItems:"center", borderWidth:1.5, borderColor:"#e5e7eb", borderRadius:14, backgroundColor:"#fff", overflow:"hidden" },
  input:        { paddingHorizontal:16, paddingVertical:13, fontSize:14, color:"#111827" },
  forgotBtn:    { flexDirection:"row", alignItems:"center", gap:4, alignSelf:"flex-end", marginTop:8, marginBottom:18 },
  forgotText:   { fontSize:12, color:"#1d4ed8", fontWeight:"600" },
  loginBtn:     { backgroundColor:"#1d4ed8", borderRadius:14, paddingVertical:15, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginBottom:16, shadowColor:"#1d4ed8", shadowOpacity:0.25, shadowRadius:8, elevation:4 },
  loginBtnText: { color:"#fff", fontSize:16, fontWeight:"700" },
  signupRow:    { flexDirection:"row", justifyContent:"center" },
  signupText:   { fontSize:14, color:"#9ca3af" },
  signupLink:   { fontSize:14, color:"#1d4ed8", fontWeight:"700" },
});
const m = StyleSheet.create({
  overlay:     { flex:1, backgroundColor:"rgba(0,0,0,0.5)", alignItems:"center", justifyContent:"center", padding:24 },
  card:        { backgroundColor:"#fff", borderRadius:24, padding:28, width:"100%", maxWidth:360, alignItems:"center" },
  iconWrap:    { width:64, height:64, borderRadius:20, backgroundColor:"#fffbeb", alignItems:"center", justifyContent:"center", marginBottom:16 },
  title:       { fontSize:20, fontWeight:"800", color:"#111827", marginBottom:8 },
  sub:         { fontSize:13, color:"#6b7280", textAlign:"center", marginBottom:20 },
  numberCard:  { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"#eff6ff", borderRadius:14, padding:14, width:"100%", marginBottom:16 },
  numberLabel: { fontSize:11, color:"#9ca3af" },
  numberVal:   { fontSize:16, fontWeight:"700", color:"#1d4ed8" },
  callBtn:     { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#1d4ed8", borderRadius:14, paddingVertical:14, width:"100%", justifyContent:"center", marginBottom:10, elevation:4 },
  callBtnText: { color:"#fff", fontSize:15, fontWeight:"700" },
  waBtn:       { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#f0fdf4", borderRadius:14, paddingVertical:12, width:"100%", justifyContent:"center", marginBottom:14, borderWidth:1, borderColor:"#bbf7d0" },
  waBtnText:   { color:"#16a34a", fontSize:14, fontWeight:"600" },
  closeBtn:    { paddingVertical:8 },
  closeBtnText:{ color:"#9ca3af", fontSize:14 },
});