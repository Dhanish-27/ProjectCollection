import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDppqWOLPC2x54v9iRXpYE0eOZgssRvqCI",
    authDomain: "nlpproject-71a6c.firebaseapp.com",
    projectId: "nlpproject-71a6c",
    storageBucket: "nlpproject-71a6c.firebasestorage.app",
    messagingSenderId: "742566967618",
    appId: "1:742566967618:web:c5e27d7685841bed18f0db",
    measurementId: "G-XWF6E04K7L"
};

// Initialize Firebase
console.log("[Firebase] Initializing Firebase application...");
const app = initializeApp(firebaseConfig);
console.log("[Firebase] Initialization successful.");

// Initialize Cloud Firestore and get a reference to the service
console.log("[Firestore] Connecting to Firestore database...");
const db = getFirestore(app);
console.log("[Firestore] Connection initialized.");

export { db };
