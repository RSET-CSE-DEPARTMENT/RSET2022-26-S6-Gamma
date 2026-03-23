import { auth, db, createUserWithEmailAndPassword, setDoc, doc } from "./firebase.js";

document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name || "Anonymous",
            email: user.email,
        });

        alert("Account created successfully!");
        window.location.href = "login.html"; // Redirect to login
    } catch (error) {
        alert(error.message);
    }
});
