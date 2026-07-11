// FILE: src/tasks/locationTask.js
// OWNER: Imran
// PURPOSE: Background location task — runs even when app is CLOSED.
// This is what PWA could NOT do. React Native can register a background
// task that iOS and Android keep alive specifically for location tracking.
// TaskManager runs this function every time the OS gets a new GPS fix.

import * as TaskManager from "expo-task-manager";
import * as Location   from "expo-location";
import AsyncStorage    from "@react-native-async-storage/async-storage";
import axios           from "axios";

export const LOCATION_TASK_NAME = "background-location-task";
const API_BASE = "https://field-sales-backend.onrender.com"; // your Render URL

// This function runs in background — even app is killed
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) { console.error("BG Location error:", error); return; }
  if (!data) return;

  const { locations } = data;
  if (!locations?.length) return;

  const { latitude, longitude, accuracy } = locations[0].coords;

  try {
    const token = await AsyncStorage.getItem("maavu_token");
    if (!token) return; // not logged in — skip

    // Send to your existing backend endpoint — same as PWA
    await axios.post(
      `${API_BASE}/api/location/update`,
      { latitude, longitude, accuracy: Math.round(accuracy) },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    );
  } catch (err) {
    // Silent fail — try again on next GPS update
  }
});

// Start background tracking (call this when employee goes Online)
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
      distanceInterval:      10,   // update every 10 meters moved
      timeInterval:          3000, // OR every 3 seconds
      showsBackgroundLocationIndicator: true, // iOS blue bar
      foregroundService: {          // Android — keeps task alive
        notificationTitle: "Sridhi Field Sales",
        notificationBody:  "Live location sharing is active",
        notificationColor: "#1D4ED8",
      },
      pausesUpdatesAutomatically: false,
    });
  }
  return true;
}

// Stop background tracking (call when employee goes Offline)
export async function stopBackgroundTracking() {
  const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    .catch(() => false);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}