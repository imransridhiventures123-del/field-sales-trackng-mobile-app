// FILE: src/tasks/locationTask.js
// OWNER: Imran
// CHANGE: API_BASE ab config.js se aata hai.
// Background task mein axiosInstance use nahi kar sakte (separate context)
// isliye yahan seedha axios use hota hai, lekin URL wahi config.js se.

import * as TaskManager from "expo-task-manager";
import * as Location   from "expo-location";
import AsyncStorage    from "@react-native-async-storage/async-storage";
import axios           from "axios";
import API_URL         from "../config";   // ← same config.js

export const LOCATION_TASK_NAME = "background-location-task";

// config.js se URL — local ya live, wahin se control hoga
const API_BASE = API_URL;

// Background mein chalta hai — app band hone ke baad bhi
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) { console.error("BG Location error:", error); return; }
  if (!data) return;

  const { locations } = data;
  if (!locations?.length) return;

  const { latitude, longitude, accuracy } = locations[0].coords;

  try {
    const token = await AsyncStorage.getItem("maavu_token");
    if (!token) return;

    await axios.post(
      `${API_BASE}/api/location/update`,
      { latitude, longitude, accuracy: Math.round(accuracy) },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    );
  } catch {
    // Silent fail — agli GPS update pe retry
  }
});

export async function startBackgroundTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== "granted") {
    console.warn("Background location permission not granted");
    return false;
  }

  const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    .catch(() => false);

  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy:              Location.Accuracy.High,
      distanceInterval:      10,
      timeInterval:          3000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Sridhi Field Sales",
        notificationBody:  "Live location sharing is active",
        notificationColor: "#1D4ED8",
      },
      pausesUpdatesAutomatically: false,
    });
  }
  return true;
}

export async function stopBackgroundTracking() {
  const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    .catch(() => false);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}