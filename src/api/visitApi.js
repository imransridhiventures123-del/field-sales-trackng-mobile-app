// FILE: src/api/visitApi.js — React Native Expo version
// CHANGES FROM PWA: None needed — yeh file sirf axiosInstance use karti hai,
// koi localStorage nahi hai. All endpoints same — same Render backend.

import axiosInstance from "./axiosInstance";

// Submit completed visit (photos base64 ya Cloudinary URL ke saath)
export const submitVisit = async (visitData) => {
  try {
    const res = await axiosInstance.post("/api/visits", visitData);
    return { success: true, visit: res.data.visit };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || "Submission failed" };
  }
};

// Get logged-in employee's all visits
export const getMyVisits = async (params = {}) => {
  const res = await axiosInstance.get("/api/visits/my", { params });
  return res.data; // { visits, total, page }
};

// Get single visit detail
export const getVisitById = async (id) => {
  const res = await axiosInstance.get(`/api/visits/${id}`);
  return res.data; // { visit }
};

// Get today's visits (DashboardPage + EndOfDayPage)
export const getTodayVisits = async () => {
  const res = await axiosInstance.get("/api/visits/today");
  return res.data; // { visits, total }
};

// Get telecallers list (EndOfDayPage modal)
export const getTelecallers = async () => {
  const res = await axiosInstance.get("/api/visits/telecallers");
  return res.data.telecallers || [];
};

// Get employee stats (DashboardPage)
export const getMyStats = async () => {
  const res = await axiosInstance.get("/api/visits/stats");
  return res.data;
};

// Get visits with active follow-ups (FollowUpPage)
export const getMyFollowUps = async () => {
  const res = await axiosInstance.get("/api/visits/my", { params: { limit: 200 } });
  const visits = res.data.visits || [];
  return visits.filter((v) => v.followUp?.needed);
};

// Reschedule follow-up date
export const rescheduleFollowUp = async (id, date) => {
  const res = await axiosInstance.put(`/api/visits/${id}/followup`, { date });
  return res.data;
};

// Mark follow-up as done
export const markFollowUpDone = async (id, outcomeLabel, note) => {
  const payload = { needed: false };
  if (note || outcomeLabel) {
    payload.note = `[${outcomeLabel || "Done"}] ${note || ""}`.trim();
  }
  const res = await axiosInstance.put(`/api/visits/${id}/followup`, payload);
  return res.data;
};