// FILE: src/api/authApi.js — React Native Expo version
// CHANGES FROM PWA: None needed — yeh file sirf axiosInstance use karti hai,
// koi localStorage nahi hai. Sirf import path same rakha.
// Same backend endpoints — same Render URL already axiosInstance mein hai.

import axiosInstance from "./axiosInstance";

// Register new employee
export const registerUser = async (data) => {
  const res = await axiosInstance.post("/api/auth/register", data);
  return res.data; // { token, user }
};

// Login
export const loginUser = async (mobile, password) => {
  const res = await axiosInstance.post("/api/auth/login", { mobile, password });
  return res.data; // { token, user }
};

// Get current logged-in user
export const getMe = async () => {
  const res = await axiosInstance.get("/api/auth/me");
  return res.data;
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  const res = await axiosInstance.post("/api/auth/change-password", { currentPassword, newPassword });
  return res.data;
};

// Save Expo push token to backend (React Native only — PWA mein nahi tha)
export const savePushToken = async (expoPushToken) => {
  try {
    await axiosInstance.post("/api/auth/push-token", { expoPushToken });
  } catch {}
};

// Logout (optional server-side call)
export const logoutUser = async () => {
  try { await axiosInstance.post("/api/auth/logout"); } catch {}
};