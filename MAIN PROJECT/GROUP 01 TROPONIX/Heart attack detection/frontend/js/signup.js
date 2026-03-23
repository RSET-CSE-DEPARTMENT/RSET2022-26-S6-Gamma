// js/signup.js
document.getElementById("signupBtn").addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    let role = document.querySelector(".role-option.active")?.dataset.role;

    const errorBox = document.getElementById("errorAlert");
    const successBox = document.getElementById("successAlert");

    // Reset alerts
    errorBox.style.display = "none";
    successBox.style.display = "none";

    if (!name || !username || !password || !role) {
        errorBox.style.display = "block";
        errorBox.textContent = "Please fill all fields.";
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/auth/signup", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                name,
                username,
                password,
                role
            })
        });

        const data = await res.json();

        if (!res.ok) {
            errorBox.style.display = "block";
            errorBox.textContent = data.error || "Signup failed.";
            return;
        }

        // Success
        successBox.style.display = "block";
        successBox.textContent = "Account created successfully! Redirecting...";

        setTimeout(() => {
            window.location.href = "index.html";   // redirect to login
        }, 1200);

    } catch (err) {
        errorBox.style.display = "block";
        errorBox.textContent = "Server error. Please try again.";
    }
});


// Role Selector
document.querySelectorAll(".role-option").forEach(option => {
    option.addEventListener("click", () => {
        document.querySelectorAll(".role-option").forEach(o => o.classList.remove("active"));
        option.classList.add("active");
    });
});
