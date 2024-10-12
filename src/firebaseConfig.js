
// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAXZ-ulCd01HSUG3ujMG0FFocDZdsK-CiQ",
    authDomain: "eventique-3da24.firebaseapp.com",
    projectId: "eventique-3da24",
    storageBucket: "eventique-3da24.appspot.com",
    messagingSenderId: "868008697819",
    appId: "1:868008697819:web:027672cec052d2d91311fe",
    measurementId: "G-TNLG535GQB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };