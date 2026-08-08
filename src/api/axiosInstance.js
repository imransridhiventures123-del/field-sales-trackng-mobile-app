// FILE: src/api/axiosInstance.js
// OWNER: Imran
// CHANGE: baseURL ab config.js se aata hai.
// Sirf src/config.js mein ek line comment/uncomment karo
// → poora app local ya live pe switch ho jaata hai.

import axios        from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL      from "../config";   // ← single source of truth

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Har request pe token automatically attach hoga
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("maavu_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 — sirf error reject karo, storage mat chuo
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