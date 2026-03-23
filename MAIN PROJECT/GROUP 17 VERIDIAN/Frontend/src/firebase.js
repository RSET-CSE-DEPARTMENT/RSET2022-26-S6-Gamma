import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvj79N2l6mF6HVI9TUlgTESRdKg-WveME",
  authDomain: "veridian-8d4a0.firebaseapp.com",
  projectId: "veridian-8d4a0",
  storageBucket: "veridian-8d4a0.firebasestorage.app",
  messagingSenderId: "373296536753",
  appId: "1:373296536753:web:c40cafab35f56b1f90d690",
  measurementId: "G-RC1BVV8GJ7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// optional
getAnalytics(app);
