// FILE: src/pages/PerformanceLedger.js — React Native Expo version
// FIX: salary ab har mount pe backend se /api/auth/me se fresh fetch hoti hai.
// Pehle sirf cached user.salary use hoti thi — admin ne salary badhaya toh
// employee ko app restart karna padta tha. Ab mount pe auto-update hota hai.

import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
   ActivityIndicator, RefreshControl, TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage        from "@react-native-async-storage/async-storage";
import { Ionicons }        from "@expo/vector-icons";
import { useAuth }         from "../context/AuthContext";
import { getMyEntries, addEntry as addEntryApi } from "../api/entryApi";
import axiosInstance       from "../api/axiosInstance";


const DEFAULT_PRODUCTS = [
  { id:"batter", name:"Batter", unit:"kg",    margin:3   },
  { id:"water",  name:"Water",  unit:"litre", margin:1.5 },
];

const fmt = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits:0, maximumFractionDigits:2 }).format(n);

export default function PerformanceLedger() {
  const navigation = useNavigation();
  const { user, login } = useAuth();

  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [entries, setEntries]   = useState([]);
  const [salary, setSalary]     = useState(user?.salary || 0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState("overview");
  const [addType, setAddType]   = useState("collection");
  const [form, setForm]         = useState({ amount:"", productId:DEFAULT_PRODUCTS[0]?.id||"", qty:"", note:"" });
  const [formError, setFormError] = useState("");
  const [toast, setToast]       = useState("");

  const dailySalaryCost = salary / 30;

  // ── Fetch fresh salary + entries from backend ───────────────
  // Salary is fetched fresh every time this page opens so admin
  // salary updates reflect immediately — no pull-to-refresh needed.
  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      // 1. Get fresh user data (includes latest salary from admin)
      const meRes = await axiosInstance.get("/api/auth/me");
      const freshUser = meRes.data.user || meRes.data;
      if (freshUser?.salary) {
        setSalary(Number(freshUser.salary));
        // Sync to AuthContext + AsyncStorage so app-wide is consistent
        const tok = await AsyncStorage.getItem("maavu_token");
        if (tok) await login(tok, freshUser);
      }

      // 2. Get entries
      const entriesData = await getMyEntries();
      setEntries(entriesData);

      // 3. Get saved product margins
      const saved = await AsyncStorage.getItem("pl_products");
      if (saved) setProducts(JSON.parse(saved));

    } catch (e) {
      console.error("PerformanceLedger load error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // TASK 2 FIX: useFocusEffect — salary and entries reload on every screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  useEffect(() => { AsyncStorage.setItem("pl_products", JSON.stringify(products)); }, [products]);

  const totalCollection = entries.filter(e=>e.type==="collection").reduce((s,e)=>s+e.amount,0);
  const salesRevenue    = entries.filter(e=>e.type==="sale").reduce((s,e)=>{ const p=products.find(x=>x.id===e.productId); return s+(p?p.margin*e.qty:0); },0);
  const totalRevenue    = totalCollection + salesRevenue;
  const netResult       = totalRevenue - dailySalaryCost;
  const isProfit        = netResult >= 0;

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  const handleAddEntry = async () => {
    setFormError("");
    let newEntry;
    if (addType === "collection") {
      const amt = parseFloat(form.amount);
      if (!amt || amt <= 0) return setFormError("Enter a valid amount.");
      newEntry = { type:"collection", amount:amt, note:form.note||"Manual entry" };
    } else {
      const qty = parseFloat(form.qty);
      if (!form.productId) return setFormError("Select a product.");
      if (!qty || qty <= 0) return setFormError("Enter valid quantity.");
      newEntry = { type:"sale", productId:form.productId, qty, note:form.note||"Manual entry" };
    }
    try {
      const saved = await addEntryApi(newEntry);
      setEntries(p => [saved, ...p]);
      setForm({ amount:"", productId:products[0]?.id||"", qty:"", note:"" });
      showToast("Entry added."); setTab("overview");
    } catch (e) { setFormError(e.response?.data?.message || "Could not save."); }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f0f2f5" }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#bfdbfe" /></TouchableOpacity>
        <View style={{ flex:1 }}><Text style={s.headerSub}>Performance Ledger</Text><Text style={s.headerTitle}>{user?.name || "Employee"}</Text></View>
        <Text style={{ color:"#bfdbfe", fontSize:11 }}>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {[{key:"overview",label:"Overview"},{key:"add",label:"Add Entry"},{key:"products",label:"Products"}].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tabItem, tab===t.key && s.tabItemActive]}>
            <Text style={[s.tabText, tab===t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#1d4ed8"
              colors={["#1d4ed8"]}
            />
          }
        >
          {/* Salary info card — shows current salary from backend */}
          <View style={[s.card, { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:"#eff6ff" }]}>
            <Ionicons name="cash-outline" size={22} color="#1d4ed8" />
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:11, color:"#6b7280" }}>Monthly Salary (from Admin)</Text>
              <Text style={{ fontSize:18, fontWeight:"800", color:"#1d4ed8" }}>
                ₹{fmt(salary)}<Text style={{ fontSize:12, fontWeight:"400", color:"#9ca3af" }}>/month</Text>
              </Text>
            </View>
            <View style={{ alignItems:"flex-end" }}>
              <Text style={{ fontSize:10, color:"#9ca3af" }}>Daily cost</Text>
              <Text style={{ fontSize:13, fontWeight:"700", color:"#ea580c" }}>₹{fmt(dailySalaryCost)}</Text>
            </View>
          </View>
          <View style={[s.resultBanner, { backgroundColor: isProfit?"#0A7C59":"#C0392B" }]}>
            <Text style={{ color:"rgba(255,255,255,0.6)", fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>{isProfit?"Net Profit":"Net Loss"}</Text>
            <Text style={s.resultNum}>{isProfit?"+":"−"}₹{fmt(Math.abs(netResult))}</Text>
            <Text style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>After salary cost ₹{fmt(dailySalaryCost)}/day</Text>
          </View>

          {/* 3 stat cards */}
          <View style={{ flexDirection:"row", gap:10 }}>
            {[{l:"Collection",v:`₹${fmt(totalCollection)}`,c:"#1d4ed8"},{l:"Sales Margin",v:`₹${fmt(salesRevenue)}`,c:"#7c3aed"},{l:"Daily Salary",v:`₹${fmt(dailySalaryCost)}`,c:"#ea580c"}].map(x => (
              <View key={x.l} style={[s.card, { flex:1, alignItems:"flex-start" }]}>
                <Text style={{ fontSize:10, color:"#9ca3af", marginBottom:4 }}>{x.l}</Text>
                <Text style={{ fontSize:14, fontWeight:"700", color:x.c }}>{x.v}</Text>
              </View>
            ))}
          </View>

          {/* Collection log */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Collection Log</Text>
            {loading ? <ActivityIndicator /> :
             entries.filter(e=>e.type==="collection").length === 0 ? <Text style={{ color:"#9ca3af", fontSize:12 }}>No collections yet.</Text> :
             entries.filter(e=>e.type==="collection").map(e => (
               <View key={e._id} style={s.logRow}><Text style={s.logNote}>{e.note}</Text><Text style={s.logAmt}>+₹{fmt(e.amount)}</Text></View>
             ))
            }
          </View>

          {/* Sales log */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Sales Log</Text>
            {loading ? <ActivityIndicator /> :
             entries.filter(e=>e.type==="sale").length === 0 ? <Text style={{ color:"#9ca3af", fontSize:12 }}>No sales yet.</Text> :
             entries.filter(e=>e.type==="sale").map(e => {
               const p = products.find(x=>x.id===e.productId);
               return <View key={e._id} style={s.logRow}><Text style={s.logNote}>{p?.name||"Product"} × {e.qty}{p?.unit||""}</Text><Text style={[s.logAmt,{color:"#7c3aed"}]}>+₹{fmt((p?.margin||0)*e.qty)}</Text></View>;
             })
            }
          </View>
        </ScrollView>
      )}

      {/* ADD ENTRY TAB */}
      {tab === "add" && (
        <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
          <View style={s.card}>
            <Text style={s.sectionLabel}>Entry Type</Text>
            <View style={{ flexDirection:"row", gap:10 }}>
              {[{key:"collection",label:"Collection",desc:"Cash received"},{key:"sale",label:"Product Sale",desc:"Units sold"}].map(t => (
                <TouchableOpacity key={t.key} onPress={() => {setAddType(t.key);setFormError("");}} style={[s.typeBtn, addType===t.key && s.typeBtnActive]}>
                  <Text style={[s.typeBtnText, addType===t.key && s.typeBtnTextActive]}>{t.label}</Text>
                  <Text style={{ fontSize:11, color:addType===t.key?"#2563eb":"#9ca3af", marginTop:2 }}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.card}>
            {addType === "collection" ? <>
              <Text style={s.label}>Amount (₹)</Text>
              <TextInput style={s.input} placeholder="0.00" placeholderTextColor="#d1d5db" keyboardType="decimal-pad" value={form.amount} onChangeText={t=>setForm(f=>({...f,amount:t}))} />
              <Text style={[s.label,{marginTop:12}]}>Shop / Note</Text>
              <TextInput style={s.input} placeholder="Shop name or reference" placeholderTextColor="#d1d5db" value={form.note} onChangeText={t=>setForm(f=>({...f,note:t}))} />
            </> : <>
              <Text style={s.label}>Product</Text>
              {products.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setForm(f=>({...f,productId:p.id}))} style={[s.productBtn, form.productId===p.id && s.productBtnActive]}>
                  <Text style={{ fontSize:14, color:form.productId===p.id?"#1d4ed8":"#374151", fontWeight:"500" }}>{p.name} — ₹{p.margin}/{p.unit}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[s.label,{marginTop:12}]}>Quantity ({products.find(p=>p.id===form.productId)?.unit||"unit"})</Text>
              <TextInput style={s.input} placeholder="0" placeholderTextColor="#d1d5db" keyboardType="decimal-pad" value={form.qty} onChangeText={t=>setForm(f=>({...f,qty:t}))} />
            </>}
            {!!formError && <Text style={{ color:"#ef4444", fontSize:12, marginTop:8 }}>{formError}</Text>}
            <TouchableOpacity style={[s.submitBtn,{marginTop:14}]} onPress={handleAddEntry} activeOpacity={0.8}>
              <Text style={s.submitBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* PRODUCTS TAB */}
      {tab === "products" && (
        <ScrollView contentContainerStyle={{ padding:16 }}>
          <View style={s.card}>
            <Text style={s.sectionLabel}>Margin Rates</Text>
            {products.map(p => (
              <View key={p.id} style={s.logRow}>
                <View><Text style={{ fontSize:14, fontWeight:"500", color:"#111827" }}>{p.name}</Text><Text style={{ fontSize:11, color:"#9ca3af" }}>per {p.unit}</Text></View>
                <Text style={{ fontSize:14, fontWeight:"700", color:"#7c3aed" }}>₹{fmt(p.margin)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {!!toast && <View style={s.toast}><Text style={{ color:"#fff", fontSize:13 }}>{toast}</Text></View>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:         { backgroundColor:"#fff", flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:"#f3f4f6" },
  backBtn:        { width:32, height:32, borderRadius:16, backgroundColor:"#eff6ff", alignItems:"center", justifyContent:"center" },
  headerSub:      { fontSize:11, color:"#9ca3af" },
  headerTitle:    { fontSize:14, fontWeight:"600", color:"#111827" },
  tabsRow:        { flexDirection:"row", backgroundColor:"#fff", borderBottomWidth:1, borderBottomColor:"#f3f4f6" },
  tabItem:        { flex:1, paddingVertical:12, alignItems:"center", borderBottomWidth:2, borderBottomColor:"transparent" },
  tabItemActive:  { borderBottomColor:"#1d4ed8" },
  tabText:        { fontSize:12, fontWeight:"600", color:"#9ca3af" },
  tabTextActive:  { color:"#1d4ed8" },
  card:           { backgroundColor:"#fff", borderRadius:16, padding:16, shadowColor:"#000", shadowOpacity:0.04, elevation:1 },
  sectionLabel:   { fontSize:11, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 },
  resultBanner:   { borderRadius:18, padding:20 },
  resultNum:      { fontSize:40, fontWeight:"700", color:"#fff", marginVertical:4 },
  logRow:         { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#f9fafb" },
  logNote:        { fontSize:13, color:"#374151", flex:1 },
  logAmt:         { fontSize:14, fontWeight:"600", color:"#1d4ed8" },
  label:          { fontSize:13, fontWeight:"500", color:"#374151", marginBottom:6 },
  input:          { borderWidth:1.5, borderColor:"#e5e7eb", borderRadius:12, paddingHorizontal:14, paddingVertical:11, fontSize:14, color:"#111827", backgroundColor:"#fff" },
  typeBtn:        { flex:1, borderWidth:2, borderColor:"#f3f4f6", borderRadius:12, padding:12, backgroundColor:"#f9fafb" },
  typeBtnActive:  { borderColor:"#1d4ed8", backgroundColor:"#eff6ff" },
  typeBtnText:    { fontSize:14, fontWeight:"600", color:"#374151" },
  typeBtnTextActive: { color:"#1d4ed8" },
  productBtn:     { borderWidth:1.5, borderColor:"#e5e7eb", borderRadius:12, padding:12, marginBottom:6, backgroundColor:"#fff" },
  productBtnActive: { borderColor:"#1d4ed8", backgroundColor:"#eff6ff" },
  submitBtn:      { backgroundColor:"#1d4ed8", borderRadius:12, paddingVertical:14, alignItems:"center" },
  submitBtnText:  { color:"#fff", fontSize:15, fontWeight:"600" },
  toast:          { position:"absolute", bottom:100, alignSelf:"center", backgroundColor:"#111827", paddingHorizontal:20, paddingVertical:10, borderRadius:20 },
});