// FILE: src/utils/storage.js
// Replaces localStorage with AsyncStorage (React Native version)
// Same API feel — just add await

import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  get:    (key)        => AsyncStorage.getItem(key),
  set:    (key, value) => AsyncStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)),
  remove: (key)        => AsyncStorage.removeItem(key),
  clear:  ()           => AsyncStorage.clear(),
};