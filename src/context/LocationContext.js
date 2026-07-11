// FILE: src/context/LocationContext.js
// FIXES:
//  1. foregroundSubRef: plain object {} → useRef() 
//     Plain object was recreated on every render so stopTracking()
//     was calling .remove() on a NEW empty object, not the actual
//     subscription. Location kept running even after "Go Offline".
//     useRef persists the same reference across all renders.
//  2. startTracking now clears existing subscription before starting
//     a new one (prevents duplicate subscriptions on re-call).

import { createContext, useContext, useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import Constants     from "expo-constants";
import AsyncStorage  from "@react-native-async-storage/async-storage";
import { updateLocation, goOffline } from "../api/locationApi";
import { startBackgroundTracking, stopBackgroundTracking } from "../tasks/locationTask";

const LocationContext = createContext(null);
const ONLINE_KEY = "maavu_location_online";
const IS_EXPO_GO = Constants.appOwnership === "expo";

export function LocationProvider({ children }) {
  const [isOnline, setIsOnline]           = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [onlineSince, setOnlineSince]     = useState(null);
  const [accuracy, setAccuracy]           = useState(null);

  // ── useRef — persists the SAME object across every render ──
  // Plain object {} was the bug: new object on every render meant
  // stopTracking() couldn't find the subscription to remove it.
  const foregroundSubRef = useRef(null);

  const startTracking = async () => {
    setLocationError("");

    // Always clear any existing subscription first
    // Prevents duplicate subscriptions if called multiple times
    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;
    }

    // Request foreground permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission denied. Please enable in phone settings.");
      return;
    }

    // Start foreground subscription
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude, accuracy: acc } = loc.coords;
        setCurrentLocation({ lat: latitude, lng: longitude, accuracy: Math.round(acc) });
        setAccuracy(Math.round(acc));
        updateLocation(latitude, longitude, Math.round(acc));
      }
    );

    // Store subscription in ref — same reference persists across renders
    foregroundSubRef.current = sub;

    // Background task (real build only, not Expo Go)
    if (!IS_EXPO_GO) {
      const bgGranted = await startBackgroundTracking();
      if (!bgGranted) {
        setLocationError("Background location not granted. Location may pause when app is minimised.");
      }
    }

    setIsOnline(true);
    setOnlineSince(new Date());
    await AsyncStorage.setItem(ONLINE_KEY, "true");
  };

  const stopTracking = async () => {
    // Remove subscription using the SAME ref that stored it
    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;  // clear reference
    }

    // Stop background task
    if (!IS_EXPO_GO) {
      await stopBackgroundTracking();
    }

    setIsOnline(false);
    setCurrentLocation(null);
    setOnlineSince(null);
    setAccuracy(null);
    await AsyncStorage.removeItem(ONLINE_KEY);
    goOffline();
  };

  useEffect(() => {
    // Auto-resume if employee was online before app restarted
    const checkResume = async () => {
      const wasOnline = await AsyncStorage.getItem(ONLINE_KEY);
      const token     = await AsyncStorage.getItem("maavu_token");
      if (wasOnline === "true" && token) {
        startTracking();
      }
    };
    checkResume();

    // Cleanup on unmount
    return () => {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getOnlineDuration = () => {
    if (!onlineSince) return "";
    const ms = Date.now() - onlineSince.getTime();
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m online` : `${m}m online`;
  };

  return (
    <LocationContext.Provider value={{
      isOnline, currentLocation, locationError, accuracy,
      onlineSince, startTracking, stopTracking, getOnlineDuration,
      isExpoGo: IS_EXPO_GO,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be inside LocationProvider");
  return ctx;
};