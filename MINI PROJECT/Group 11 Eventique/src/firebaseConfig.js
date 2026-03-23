import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore'; // Firestore imports
import { getAuth } from 'firebase/auth'; // Auth imports
import { getStorage } from 'firebase/storage'; // Firebase Storage import

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

// Initialize Firestore, Auth, and Storage
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize Firebase Storage

// Export Firestore, Auth, and Storage
export { db, collection, addDoc, auth, storage }; // Export Firebase Storage too
