// FILE: src/context/AuthContext.js
// FIX: Added `role` state ("employee" | "driver" | null)
// On app reopen → reads maavu_role from AsyncStorage
// AppNavigator uses role to show correct dashboard:
//   role="driver"   → DriverApp (driver delivery dashboard)
//   role="employee" → Main (field sales tabs)
//   null            → Login screen

import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [role,    setRole]    = useState(null); // "employee" | "driver"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [[, tok], [, r], [, usr]] = await AsyncStorage.multiGet([
          "maavu_token", "maavu_role", "maavu_user"
        ]);

        if (tok && usr) {
          setToken(tok);
          setUser(JSON.parse(usr));
          setRole(r || "employee");

          // Background verify — only for employees (driver uses different endpoint)
          if (r === "driver") {
            axiosInstance.get("/api/driver/me")
              .then(async (res) => {
                const fresh = res.data.driver || res.data;
                setUser(fresh);
                await AsyncStorage.setItem("maavu_user", JSON.stringify(fresh));
              })
              .catch((err) => {
                if (err.response?.status === 401) {
                  AsyncStorage.multiRemove(["maavu_token","maavu_user","maavu_role"]);
                  setToken(null); setUser(null); setRole(null);
                }
              });
          } else {
            axiosInstance.get("/api/auth/me")
              .then(async (res) => {
                const fresh = res.data.user || res.data;
                setUser(fresh);
                await AsyncStorage.setItem("maavu_user", JSON.stringify(fresh));
              })
              .catch((err) => {
                if (err.response?.status === 401) {
                  AsyncStorage.multiRemove(["maavu_token","maavu_user","maavu_role"]);
                  setToken(null); setUser(null); setRole(null);
                }
              });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Employee login ─────────────────────────────────────────
  const login = async (newToken, newUser) => {
    await AsyncStorage.multiSet([
      ["maavu_token", newToken],
      ["maavu_role",  "employee"],
      ["maavu_user",  JSON.stringify(newUser)],
    ]);
    setToken(newToken);
    setUser(newUser);
    setRole("employee");
  };

  // ── Driver login ───────────────────────────────────────────
  // Called from LoginPage after driver JWT received
  const driverLogin = async (newToken, driverUser) => {
    await AsyncStorage.multiSet([
      ["maavu_token", newToken],
      ["maavu_role",  "driver"],
      ["maavu_user",  JSON.stringify(driverUser)],
    ]);
    setToken(newToken);
    setUser(driverUser);
    setRole("driver");
  };

  // ── Logout (works for both) ────────────────────────────────
  const logout = async () => {
    await AsyncStorage.multiRemove([
      "maavu_token", "maavu_user", "maavu_role", "maavu_location_online"
    ]);
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, loading, login, driverLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);