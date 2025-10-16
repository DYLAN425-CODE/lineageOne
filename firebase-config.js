import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmAxl9cHiK7gLEdbPGCWYBFuCFQFmA3EY",
  authDomain: "lo-project-72db5.firebaseapp.com",
  projectId: "lo-project-72db5",
  storageBucket: "lo-project-72db5.firebasestorage.app",
  messagingSenderId: "682883493943",
  appId: "1:682883493943:web:1ebce79913ee3e4d9d4fb2",
  measurementId: "G-P6N57PBY5N"
};

// Initialize Firebase and export the services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('[Firebase] Firebase initialized.');