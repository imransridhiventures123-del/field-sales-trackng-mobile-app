// FILE: src/utils/notifications.js
// Real push notifications — impossible in PWA, easy in Expo.
// Shows notification on phone even when app is closed.

import * as Notifications from "expo-notifications";
import * as Device        from "expo-device";
import AsyncStorage       from "@react-native-async-storage/async-storage";
import axiosInstance      from "../api/axiosInstance";

// How notifications look when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// Request permission + get push token
export async function registerForPushNotifications() {
  if (!Device.isDevice) return null; // simulator pe kaam nahi karta

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await AsyncStorage.setItem("expo_push_token", token);

  // Send to backend so admin can send notifications
  try {
    await axiosInstance.post("/api/auth/push-token", { expoPushToken: token });
  } catch {}

  return token;
}

// Local notification (no server needed — instant)
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // immediately
  });
}

// Examples of notifications you can send:
// showLocalNotification("Follow-up Reminder", "Imran Store — follow up due today!")
// showLocalNotification("Target Achieved! 🎉", "You visited 20 shops today!")
// showLocalNotification("New Visit Assigned", "Please visit Navin Store")