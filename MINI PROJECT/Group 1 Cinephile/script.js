// Ensure Firebase is loaded before initializing
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Check your HTML file!");
}

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwLRRKIwsSPmvFXnDn5UcweXli12w1Qr0",
    authDomain: "cinephile-250fc.firebaseapp.com",
    databaseURL: "https://cinephile-250fc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cinephile-250fc",
    storageBucket: "cinephile-250fc.firebasestorage.app",
    messagingSenderId: "995080104071",
    appId: "1:995080104071:web:150cd3e9f3d8a905097022",
    measurementId: "G-QX66DDM9ZD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // Initialize Firebase Auth

// Select the form element
const signupForm = document.querySelector("form");

// Listen for form submission
signupForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent page reload

    // Get user input values
    const email = document.querySelector("input[name='email']").value;
    const password = document.querySelector("input[name='password']").value;

    // Sign up user with Firebase Authentication
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert("Signup successful! Welcome, " + user.email);
            console.log("User signed up:", user);
        })
        .catch((error) => {
            alert(error.message);
            console.error("Signup error:", error);
        });
});
