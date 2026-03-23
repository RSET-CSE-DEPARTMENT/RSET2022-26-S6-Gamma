// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDQ5IuOLkNCnjG_efDCMorp7KuYFcxzndI",
  authDomain: "veridian-e12ee.firebaseapp.com",
  projectId: "veridian-e12ee",
  storageBucket: "veridian-e12ee.firebasestorage.app",
  messagingSenderId: "403814342932",
  appId: "1:403814342932:web:5db9d464869b7ae4562201",
  measurementId: "G-7BV1L17TD7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);