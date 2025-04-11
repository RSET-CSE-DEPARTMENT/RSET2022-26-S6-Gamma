// firebase.js - CORRECTED
import { initializeApp } from "firebase/app";  // Fix this import
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBXf576av_-NIHRwwJRdxNQ-a6TLBnl-20",
  authDomain: "healthapp-e03f5.firebaseapp.com",
  projectId: "healthapp-e03f5",
  storageBucket: "healthapp-e03f5.appspot.com",  // Fixed bucket name
  messagingSenderId: "1049484630413",
  appId: "1:1049484630413:web:7e692a2531aa1162c285c4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };