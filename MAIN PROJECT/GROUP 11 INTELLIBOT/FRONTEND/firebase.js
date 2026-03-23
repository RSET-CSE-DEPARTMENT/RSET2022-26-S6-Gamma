import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDjDFgXyB-wtKSbt2heFcn6WBm2OaJjYYI",
  authDomain: "intellibot-41f62.firebaseapp.com",
  projectId: "intellibot-41f62",
  storageBucket: "intellibot-41f62.firebasestorage.app",
  messagingSenderId: "949497045275",
  appId: "1:949497045275:web:0a9bcfd7278abef7a873be"
};

const app = initializeApp(firebaseConfig);

// 🔥 Firestore
export const db = getFirestore(app);

// 🔥 Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
