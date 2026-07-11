// FILE: src/api/entryApi.js — React Native Expo version
// CHANGES FROM PWA: None — same endpoints, axiosInstance handles token
import axiosInstance from "./axiosInstance";

export const getMyEntries = async () => {
  const res = await axiosInstance.get("/api/entries/my");
  return res.data.entries || [];
};

export const addEntry = async (entry) => {
  const res = await axiosInstance.post("/api/entries", entry);
  return res.data.entry;
};

export const deleteEntry = async (id) => {
  const res = await axiosInstance.delete(`/api/entries/${id}`);
  return res.data;
};