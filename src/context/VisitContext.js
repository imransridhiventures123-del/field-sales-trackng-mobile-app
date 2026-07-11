// FILE: src/context/VisitContext.js — React Native Expo version
// OWNER: Naveen
// CHANGES FROM PWA: Bilkul kuch nahi badla.
// Yeh file sirf React useState aur submitVisitApi use karti hai —
// koi localStorage, koi browser API, koi DOM nahi.
// React Native mein bhi same kaam karta hai.
// Sirf extension .jsx → .js badla.

import { createContext, useContext, useState } from "react";
import { submitVisit as submitVisitApi } from "../api/visitApi";

const VisitContext = createContext();

export function VisitProvider({ children }) {
  const [visitForm, setVisitForm]     = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1, 2, 3 ka data yahan collect hota hai
  const updateVisitForm = (data) =>
    setVisitForm((prev) => ({ ...prev, ...data }));

  const resetVisitForm = () => setVisitForm({});

  // UploadPhotosPage se call hota hai — sab 3 steps ka data ek saath backend pe bhejta hai
  const submitVisit = async (finalData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...visitForm, ...finalData };
      const result  = await submitVisitApi(payload);
      if (result.success) resetVisitForm();
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VisitContext.Provider value={{
      visitForm,
      updateVisitForm,
      resetVisitForm,
      submitVisit,
      isSubmitting,
    }}>
      {children}
    </VisitContext.Provider>
  );
}

export function useVisit() {
  const ctx = useContext(VisitContext);
  if (!ctx) throw new Error("useVisit must be inside VisitProvider");
  return ctx;
}