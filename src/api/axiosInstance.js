// FILE: src/api/axiosInstance.js
// Same backend as PWA — just use the Render URL directly.
// No VITE_API_URL needed in React Native.

import axios        from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const axiosInstance = axios.create({
  // baseURL: "https://field-sales-backend.onrender.com",
  baseURL: "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach token automatically
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("maavu_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 — just reject, don't clear storage (AuthContext handles it)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("[401] Unauthorized:", err.config?.url);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;