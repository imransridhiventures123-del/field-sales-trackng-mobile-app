// FILE: src/api/locationApi.js — React Native Expo version
// CHANGE FROM PWA: localStorage.getItem() → AsyncStorage.getItem()
// React Native mein localStorage exist nahi karta.
// AsyncStorage async hai isliye functions ab async hain.
// Logic same hai — token check karo pehle, phir send karo.

import axiosInstance from "./axiosInstance";
import AsyncStorage  from "@react-native-async-storage/async-storage";

// Send current GPS coordinates to backend
// Background task (locationTask.js) bhi yeh call karta hai directly axios se
// Yeh function foreground mein use hota hai (LocationContext)
export const updateLocation = async (latitude, longitude, accuracy) => {
  try {
    const token = await AsyncStorage.getItem("maavu_token");
    if (!token) return; // not logged in — skip, no 401 loop
    await axiosInstance.post("/api/location/update", { latitude, longitude, accuracy });
  } catch {}
};

// Mark employee as offline in backend
// Sirf manual "Go Offline" tap pe call hoti hai
export const goOffline = async () => {
  try {
    const token = await AsyncStorage.getItem("maavu_token");
    if (!token) return; // not logged in — skip
    await axiosInstance.post("/api/location/offline");
  } catch {}
};