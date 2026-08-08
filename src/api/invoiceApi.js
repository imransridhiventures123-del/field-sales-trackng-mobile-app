// FILE: src/api/invoiceApi.js
// PURPOSE: Download the invoice PDF for a completed delivery and open the
// native share sheet (same pattern already used in EndOfDayPage.js) so the
// driver can save it, print it, or send it straight to the customer.

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "./axiosInstance";

// type is "with-gst" | "without-gst"
export async function downloadAndShareInvoice(deliveryId, type) {
  const token = await AsyncStorage.getItem("maavu_token");
  if (!token) throw new Error("Not logged in.");

  const baseURL = axiosInstance.defaults.baseURL;
  const url = `${baseURL}/api/invoice/${deliveryId}?type=${type}`;
  const fileUri = `${FileSystem.cacheDirectory}invoice-${deliveryId}-${type}.pdf`;

  let result;
  try {
    result = await FileSystem.downloadAsync(url, fileUri, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Network error. Please check your connection.");
  }

  if (result.status !== 200) {
    // Backend returned an error JSON body instead of a PDF — read and surface it.
    let message = "Failed to generate invoice. Please try again.";
    try {
      const text = await FileSystem.readAsStringAsync(result.uri);
      const parsed = JSON.parse(text);
      if (parsed.message) message = parsed.message;
    } catch { /* ignore parse failure, use default message */ }
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error(message);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Download / Share Invoice",
      UTI: "com.adobe.pdf",
    });
  }

  return result.uri;
}