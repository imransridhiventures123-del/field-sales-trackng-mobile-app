// FILE: App.js — Main entry point
// IMPORTANT: locationTask.js must be imported here at the TOP
// so TaskManager registers the background task before anything else.
import "./src/tasks/locationTask"; // ← must be first import

import { useEffect } from "react";
import Constants     from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { AuthProvider }     from "./src/context/AuthContext";
import { LocationProvider } from "./src/context/LocationContext";
import { VisitProvider }    from "./src/context/VisitContext";
import AppNavigator         from "./src/navigation/AppNavigator";

// expo-notifications only works in a real development build or production app.
// In Expo Go (SDK 53+) push notifications are removed — guard it here.
// When you run `eas build` for Play Store, this will work automatically.
const isExpoGo = Constants.appOwnership === "expo";

let Notifications = null;
let registerForPushNotifications = () => {};

if (!isExpoGo) {
  // Only import when NOT in Expo Go — avoids the runtime error
  Notifications = require("expo-notifications").default || require("expo-notifications");
  registerForPushNotifications = require("./src/utils/notifications").registerForPushNotifications;
}

export default function App() {
  useEffect(() => {
    if (isExpoGo) {
      // Skip push notification setup in Expo Go
      // It will work when you build with `eas build --platform android`
      return;
    }

    // Register for push notifications (real build only)
    registerForPushNotifications();

    // Handle notification tap
    const sub = Notifications?.addNotificationResponseReceivedListener?.((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);
    });

    return () => sub?.remove?.();
  }, []);

  return (
    <AuthProvider>
      <LocationProvider>
        <VisitProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </VisitProvider>
      </LocationProvider>
    </AuthProvider>
  );
}