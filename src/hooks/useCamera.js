// FILE: src/hooks/useCamera.js — React Native
// FIXES:
//  1. mediaTypes: ['images'] — works on ALL expo-image-picker versions
//     (MediaType.IMAGE crashes on older SDK versions silently)
//  2. base64: true — getBase64Photos returns real base64 (fixes "Submission failed")
//  3. quality: 0.7 — compresses photos (fixes 5MB error on high-res cameras)

import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

const MAX_PHOTOS  = 5;
const MAX_SIZE_MB = 10;

export function useCamera() {
  const [photos, setPhotos] = useState([]);
  const [error,  setError]  = useState(null);

  const takePhoto = useCallback(async () => {
    setError(null);

    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission",
        "Please allow camera access in your phone settings.",
        [{ text: "OK" }]
      );
      return;
    }

    // ── ['images'] works on ALL expo-image-picker versions ──
    // MediaType.IMAGE crashes silently on older SDK → camera never opens
    // ['images'] is the safest cross-version format
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],   // ← safe for all versions
      allowsEditing: false,
      quality: 0.7,            // compress → ~2MB (fixes 5MB error)
      base64: true,            // get base64 from picker (fixes submission)
      exif: false,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    if (asset.fileSize && asset.fileSize > MAX_SIZE_MB * 1024 * 1024) {
      setError("Photo is too large. Please try again.");
      return;
    }

    setPhotos(prev => [
      ...prev,
      {
        uri:    asset.uri,
        base64: asset.base64,
      },
    ]);
  }, [photos]);

  const removePhoto = useCallback((index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
    setError(null);
  }, []);

  // Returns base64 for API — backend expects "data:image/jpeg;base64,..."
  const getBase64Photos = useCallback(() => {
    return photos.map(p =>
      p.base64
        ? `data:image/jpeg;base64,${p.base64}`
        : p.uri
    );
  }, [photos]);

  return {
    photos,
    error,
    takePhoto,
    removePhoto,
    clearPhotos,
    getBase64Photos,
    hasPhotos: photos.length > 0,
    isFull:    photos.length >= MAX_PHOTOS,
    count:     photos.length,
  };
}