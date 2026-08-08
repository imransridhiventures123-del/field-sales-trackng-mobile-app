// FILE: src/pages/FollowUpPage.js — React Native Expo version
// Linking.openURL for phone calls, same filter logic as PWA
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet,  Modal, ActivityIndicator, Linking } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons }      from "@expo/vector-icons";
import { getMyFollowUps, rescheduleFollowUp, markFollowUpDone } from "../api/visitApi";

const TODAY = new Date().toISOString().split("T")[0];
const daysDiff = (d) => Math.floor((new Date(d) - new Date(TODAY)) / 86400000);
const addDays  = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };

const STATUS_LABELS = { interested:"Interested", callback:"Call Back", not_interested:"Not Interested", busy:"Busy / Come Later", order_placed:"Order Placed", payment_due:"Payment Due" };
const STATUS_COLORS = { "Interested": "#16a34a", "Call Back": "#2563eb", "Payment Due": "#ef4444", "Busy / Come Later": "#d97706", "Order Placed": "#7c3aed", "Not Interested": "#6b7280" };
const OUTCOME_OPTIONS = [{ key:"order_placed", label:"Order Placed" }, { key:"payment_received", label:"Payment Received" }, { key:"call_back_again", label:"Call Back Again" }, { key:"not_interested", label:"Not Interested" }, { key:"meeting_done", label:"Meeting Done" }];

const mapVisit = (v) => ({
  _id: v._id, shopName: v.shopName, shopCode: v.shopCode, ownerName: v.ownerName, ownerMobile: v.mobile,
  fieldType: v.fieldType, followUpStatus: STATUS_LABELS[v.followUp?.status] || "Follow-up",
  followUpDate: v.followUp?.date || TODAY, lastNote: v.notes || "", visitDate: v.createdAt, outcome: null,
});

export default function FollowUpPage() {
  const navigation = useNavigation();
  const [followups, setFollowups]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [doneModal, setDoneModal]     = useState(null);
  const [toast, setToast]             = useState("");

  // TASK 2 FIX: useFocusEffect — data reloads every time screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getMyFollowUps()
        .then(v => setFollowups(v.map(mapVisit)))
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
    }, [])
  );

  const active   = followups.filter(f => !f.outcome);
  const overdue  = active.filter(f => daysDiff(f.followUpDate) < 0);
  const todayList= active.filter(f => f.followUpDate === TODAY);
  const upcoming = active.filter(f => daysDiff(f.followUpDate) > 0);

  const filtered = useMemo(() => {
    let list = filter==="overdue"?overdue:filter==="today"?todayList:filter==="upcoming"?upcoming:active;
    if (search.trim()) { const q=search.toLowerCase(); list=list.filter(f=>f.shopName.toLowerCase().includes(q)||f.ownerName.toLowerCase().includes(q)); }
    return list;
  }, [followups, filter, search]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleReschedule = async (id) => {
    if (!rescheduleDate) return;
    try { await rescheduleFollowUp(id, rescheduleDate); setFollowups(p => p.map(f => f._id===id ? {...f, followUpDate:rescheduleDate}:f)); setRescheduleId(null); showToast("Rescheduled."); } catch {}
  };
  const handleDone = async (id, outcomeKey, note) => {
    const label = OUTCOME_OPTIONS.find(o=>o.key===outcomeKey)?.label || "Done";
    try { await markFollowUpDone(id, label, note); setFollowups(p => p.map(f => f._id===id ? {...f, outcome:outcomeKey||"done"}:f)); setDoneModal(null); showToast("Marked done."); } catch {}
  };

  const getDayLabel = (d) => { const diff=daysDiff(d); if(diff<0) return { label:`${Math.abs(diff)}d overdue`,color:"#ef4444" }; if(diff===0) return { label:"Today",color:"#d97706" }; return { label:`In ${diff} days`,color:"#2563eb" }; };

  const renderCard = (f) => {
    const dayL = getDayLabel(f.followUpDate);
    const sColor = STATUS_COLORS[f.followUpStatus] || "#6b7280";
    return (
      <View key={f._id} style={s.card}>
        <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <View style={{ flex:1 }}>
            <Text style={s.shopName}>{f.shopName}</Text>
            <Text style={s.shopSub}>{f.ownerName} · {f.shopCode}</Text>
          </View>
          <View style={[s.chipSmall, { backgroundColor: sColor+"20", marginLeft: 8 }]}>
            <Text style={[s.chipSmallText, { color: sColor }]}>{f.followUpStatus}</Text>
          </View>
        </View>
        <View style={[s.chipSmall, { backgroundColor: dayL.color+"20", alignSelf:"flex-start", marginBottom:10 }]}>
          <Text style={[s.chipSmallText, { color: dayL.color }]}>{dayL.label} · {new Date(f.followUpDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</Text>
        </View>
        {/* Actions */}
        <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap" }}>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${f.ownerMobile}`)} style={[s.actionBtn, { backgroundColor:"#16a34a" }]} activeOpacity={0.8}>
            <Text style={s.actionBtnText}><Ionicons name="call" size={16} color="#fff" /> Call</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRescheduleId(rescheduleId===f._id?null:f._id)} style={[s.actionBtn, { backgroundColor:"#eff6ff", borderWidth:1, borderColor:"#bfdbfe" }]} activeOpacity={0.8}>
            <Text style={[s.actionBtnText, { color:"#1d4ed8" }]}><Ionicons name="calendar" size={16} color="#1d4ed8" /> Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDoneModal({ id:f._id, selectedOutcome:"", note:"" })} style={[s.actionBtn, { backgroundColor:"#111827", marginLeft:"auto" }]} activeOpacity={0.8}>
            <Text style={s.actionBtnText}><Ionicons name="checkmark" size={16} color="#fff" /> Done</Text>
          </TouchableOpacity>
        </View>
        {rescheduleId === f._id && (
          <View style={s.rescheduleBox}>
            <TextInput style={s.dateInput} placeholder="YYYY-MM-DD (e.g. 2026-07-01)" placeholderTextColor="#93c5fd" value={rescheduleDate} onChangeText={setRescheduleDate} />
            <TouchableOpacity onPress={() => handleReschedule(f._id)} style={s.confirmBtn} disabled={!rescheduleDate} activeOpacity={0.8}>
              <Text style={s.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f0f2f5" }}>
      {/* ── HEADER — fixed ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerSub}>Follow-ups</Text>
          <Text style={s.headerTitle}>{loading?"Loading...":`${active.length} pending · ${overdue.length} overdue`}</Text>
        </View>
      </View>

      {/* ── SEARCH — fixed ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight:8 }} />
        <TextInput style={{ flex:1, fontSize:14, color:"#111827" }} placeholder="Search shop or owner..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTER TABS — fixed, never scrolls away ── */}
      {/* Wrapped in View with borderBottom — sits above content, stays fixed */}
      <View style={s.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
          {[
            { key:"all",      label:"All",      count: active.length   },
            { key:"overdue",  label:"Overdue",  count: overdue.length  },
            { key:"today",    label:"Today",    count: todayList.length},
            { key:"upcoming", label:"Upcoming", count: upcoming.length },
          ].map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              style={[s.filterTab, filter===f.key && s.filterTabActive]}>
              <Text style={[s.filterTabText, filter===f.key && s.filterTabTextActive]}>
                {f.label}{f.count > 0 ? ` (${f.count})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── CONTENT — flex:1 so it fills remaining height and scrolls ── */}
      <View style={{ flex:1 }}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1d4ed8" /> :
        <ScrollView contentContainerStyle={{ padding:16 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0
            ? <View style={{ alignItems:"center", paddingVertical:60 }}>
                <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
                <Text style={{ color:"#9ca3af", fontSize:14, marginTop:10 }}>No follow-ups found</Text>
              </View>
            : filtered.map(renderCard)
          }
        </ScrollView>}
      </View>

      {/* Done modal */}
      {doneModal && (
        <Modal visible transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Mark as Done</Text>
              <Text style={s.modalSub}>What was the outcome?</Text>
              {OUTCOME_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} onPress={() => setDoneModal(d => ({ ...d, selectedOutcome:opt.key }))} style={[s.outcomeBtn, doneModal.selectedOutcome===opt.key && s.outcomeBtnActive]}>
                  <Text style={[s.outcomeBtnText, doneModal.selectedOutcome===opt.key && { color:"#1d4ed8" }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TextInput style={[s.dateInput, { marginTop:10 }]} placeholder="Quick note (optional)" placeholderTextColor="#9ca3af" value={doneModal.note} onChangeText={t => setDoneModal(d => ({...d,note:t}))} />
              <View style={{ flexDirection:"row", gap:10, marginTop:14 }}>
                <TouchableOpacity onPress={() => setDoneModal(null)} style={[s.confirmBtn, { flex:1, backgroundColor:"#f3f4f6" }]} activeOpacity={0.8}><Text style={[s.confirmBtnText, { color:"#374151" }]}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDone(doneModal.id, doneModal.selectedOutcome, doneModal.note)} style={[s.confirmBtn, { flex:1 }]} activeOpacity={0.8}><Text style={s.confirmBtnText}>Confirm</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {!!toast && (
        <View style={s.toast}><Text style={{ color:"#fff", fontSize:13 }}>{toast}</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:          { backgroundColor:"#fff", flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:"#f3f4f6" },
  backBtn:         { width:32, height:32, borderRadius:16, backgroundColor:"#eff6ff", alignItems:"center", justifyContent:"center" },
  headerSub:       { fontSize:11, color:"#9ca3af" },
  headerTitle:     { fontSize:14, fontWeight:"600", color:"#111827" },
  searchRow:       { flexDirection:"row", alignItems:"center", backgroundColor:"#f3f4f6", marginHorizontal:12, marginTop:10, marginBottom:4, borderRadius:12, paddingHorizontal:12, paddingVertical:10 },
  tabsBar:         { backgroundColor:"#fff", borderBottomWidth:1, borderBottomColor:"#f3f4f6" },
  tabsContent:     { paddingHorizontal:12, paddingVertical:8, flexDirection:"row", gap:8 },
  filterTab:       { paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor:"#f3f4f6" },
  filterTabActive: { backgroundColor:"#1d4ed8" },
  filterTabText:   { fontSize:12, fontWeight:"600", color:"#6b7280" },
  filterTabTextActive: { color:"#fff" },
  card:            { backgroundColor:"#fff", borderRadius:16, padding:16, marginBottom:10, shadowColor:"#000", shadowOpacity:0.04, elevation:1 },
  shopName:        { fontSize:14, fontWeight:"600", color:"#111827" },
  shopSub:         { fontSize:12, color:"#9ca3af", marginTop:2 },
  chipSmall:       { paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  chipSmallText:   { fontSize:11, fontWeight:"600" },
  actionBtn:       { paddingHorizontal:14, paddingVertical:8, borderRadius:10 },
  actionBtnText:   { color:"#fff", fontSize:12, fontWeight:"600" },
  rescheduleBox:   { backgroundColor:"#eff6ff", borderRadius:12, padding:12, marginTop:10, flexDirection:"row", gap:8, alignItems:"center" },
  dateInput:       { flex:1, borderWidth:1, borderColor:"#bfdbfe", borderRadius:10, paddingHorizontal:12, paddingVertical:8, fontSize:13, color:"#111827", backgroundColor:"#fff" },
  confirmBtn:      { backgroundColor:"#1d4ed8", borderRadius:10, paddingHorizontal:16, paddingVertical:10, alignItems:"center" },
  confirmBtnText:  { color:"#fff", fontWeight:"600", fontSize:13 },
  modalOverlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  modalCard:       { backgroundColor:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, padding:24 },
  modalTitle:      { fontSize:18, fontWeight:"700", color:"#111827", marginBottom:4 },
  modalSub:        { fontSize:12, color:"#9ca3af", marginBottom:12 },
  outcomeBtn:      { paddingVertical:12, paddingHorizontal:16, borderRadius:12, borderWidth:2, borderColor:"#f3f4f6", marginBottom:6 },
  outcomeBtnActive:{ borderColor:"#1d4ed8", backgroundColor:"#eff6ff" },
  outcomeBtnText:  { fontSize:14, color:"#374151", fontWeight:"500" },
  toast:           { position:"absolute", bottom:100, alignSelf:"center", backgroundColor:"#111827", paddingHorizontal:20, paddingVertical:10, borderRadius:20 },
});