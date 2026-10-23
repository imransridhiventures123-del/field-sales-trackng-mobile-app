// FILE: src/config.js
// ─────────────────────────────────────────────────────────
// BACKEND URL — ek jagah change karo, poora app switch hoga
// Admin dashboard ke .env file jaisa hi kaam karta hai
// ─────────────────────────────────────────────────────────

// LOCAL DEVELOPMENT — comment karo jab live pe jaana ho
const API_URL = "http://192.168.29.128:5000";

// const API_URL = "http://localhost:5000";


// Live / Production for backend in AWS lambda
// const API_URL = "https://27ucp55e3al7xmizfgtmdhhrji0dqttv.lambda-url.ap-south-1.on.aws/";

// LIVE / PRODUCTION — comment karo jab local pe kaam karna ho
// const API_URL = "https://field-sales-backend.onrender.com";

export default API_URL;

