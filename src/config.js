// FILE: src/config.js
// ─────────────────────────────────────────────────────────
// BACKEND URL — ek jagah change karo, poora app switch hoga
// Admin dashboard ke .env file jaisa hi kaam karta hai
// ─────────────────────────────────────────────────────────

// LOCAL DEVELOPMENT — comment karo jab live pe jaana ho
const API_URL = "http://192.168.29.129:5000";

// LIVE / PRODUCTION — comment karo jab local pe kaam karna ho
// const API_URL = "https://field-sales-backend.onrender.com";

export default API_URL;