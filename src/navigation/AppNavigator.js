// FILE: src/navigation/AppNavigator.js
// Routes based on BOTH token AND role:
//   token + role="employee" → Main (field sales tabs)
//   token + role="driver"   → DriverStack (delivery dashboard)
//   no token                → Auth (Login / Register)
// App reopen mein correct dashboard aata hai kyunki
// AuthContext maavu_role AsyncStorage se padhta hai.

import { NavigationContainer }      from "@react-navigation/native";
import { createStackNavigator }     from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth }  from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ActivityIndicator } from "react-native";

// Auth screens
import LoginPage    from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

// Employee screens
import DashboardPage     from "../pages/DashboardPage";
import MyVisitsPage      from "../pages/MyVisitsPage";
import DailyTargetPage   from "../pages/DailyTargetPage";
import FollowUpPage      from "../pages/FollowUpPage";
import ProfilePage       from "../pages/ProfilePage";
import EndOfDayPage      from "../pages/EndOfDayPage";
import VisitShopPage     from "../pages/VisitShopPage";
import ProveLocationPage from "../pages/ProveLocationPage";
import UploadPhotosPage  from "../pages/UploadPhotosPage";
import VisitSummaryPage  from "../pages/VisitSummaryPage";
import VisitDetailPage   from "../pages/VisitDetailPage";
import PerformanceLedger from "../pages/PerformanceLedger";

// Driver screens
import DriverDashboardPage from "../pages/DriverDashboardPage";
import DeliveryDetailPage  from "../pages/DeliveryDetailPage";

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const tabIcon = (name) => ({ color, size }) =>
  <Ionicons name={name} size={size ?? 22} color={color} />;

// ── Employee bottom tabs ──────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle:            { backgroundColor: "#fff", borderTopColor: "#f0f0f0", height: 62, paddingBottom: 6 },
        tabBarActiveTintColor:  "#1D4ED8",
        tabBarInactiveTintColor:"#9CA3AF",
        tabBarLabelStyle:       { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home"      component={DashboardPage}   options={{ tabBarLabel: "Home",       tabBarIcon: tabIcon("home-outline")          }} />
      <Tab.Screen name="Visits"    component={MyVisitsPage}    options={{ tabBarLabel: "Visits",      tabBarIcon: tabIcon("list-outline")          }} />
      <Tab.Screen name="Target"    component={DailyTargetPage} options={{ tabBarLabel: "Target",      tabBarIcon: tabIcon("trophy-outline")        }} />
      <Tab.Screen name="FollowUps" component={FollowUpPage}    options={{ tabBarLabel: "Follow-ups",  tabBarIcon: tabIcon("notifications-outline") }} />
      <Tab.Screen name="Profile"   component={ProfilePage}     options={{ tabBarLabel: "Profile",     tabBarIcon: tabIcon("person-outline")        }} />
    </Tab.Navigator>
  );
}

// ── Driver bottom tabs ────────────────────────────────────────
function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle:            { backgroundColor: "#fff", borderTopColor: "#f0f0f0", height: 62, paddingBottom: 6 },
        tabBarActiveTintColor:  "#16a34a",
        tabBarInactiveTintColor:"#9CA3AF",
        tabBarLabelStyle:       { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="DriverHome"
        component={DriverDashboardPage}
        options={{ tabBarLabel: "Deliveries", tabBarIcon: tabIcon("cube-outline") }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────
export default function AppNavigator() {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1D4ED8" }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>Sridhi Field Sales</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {token && role === "driver" ? (
          // ── DRIVER logged in ──────────────────────────────────
          // App close → reopen → driver dashboard aata hai ✅
          <>
            <Stack.Screen name="DriverApp"      component={DriverTabs}         />
            <Stack.Screen name="DeliveryDetail" component={DeliveryDetailPage} />
          </>

        ) : token && role === "employee" ? (
          // ── EMPLOYEE logged in ────────────────────────────────
          // App close → reopen → field sales dashboard aata hai ✅
          <>
            <Stack.Screen name="Main"          component={MainTabs}          />
            <Stack.Screen name="EndOfDay"      component={EndOfDayPage}      />
            <Stack.Screen name="VisitShop"     component={VisitShopPage}     />
            <Stack.Screen name="ProveLocation" component={ProveLocationPage} />
            <Stack.Screen name="UploadPhotos"  component={UploadPhotosPage}  />
            <Stack.Screen name="VisitSummary"  component={VisitSummaryPage}  />
            <Stack.Screen name="VisitDetail"   component={VisitDetailPage}   />
            <Stack.Screen name="Performance"   component={PerformanceLedger} />
          </>

        ) : (
          // ── NOT logged in ─────────────────────────────────────
          <>
            <Stack.Screen name="Login"    component={LoginPage}    />
            <Stack.Screen name="Register" component={RegisterPage} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}