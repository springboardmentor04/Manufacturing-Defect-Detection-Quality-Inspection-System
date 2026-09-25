document.addEventListener("DOMContentLoaded", () => {
    // LOGIN
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");
            const msg = document.getElementById("msg");

            try {
                msg.style.color = "var(--cyan)";
                msg.textContent = "Authenticating...";
                const data = await api("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passwordInput.value
                    })
                });

                setSession(data);
                if (data.user.role === "QUALITY_ENGINEER") {
                    window.location.href = "qe-dashboard.html";
                } else {
                    window.location.href = "pm-dashboard.html";
                }
            } catch (error) {
                msg.style.color = "var(--rose)";
                msg.textContent = error.message;
            }
        });
    }

    // REGISTER
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullNameInput = document.getElementById("fullName");
            const emailInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");
            const confirmInput = document.getElementById("confirm");
            const roleInput = document.getElementById("role");
            const msg = document.getElementById("msg");

            if (passwordInput.value !== confirmInput.value) {
                msg.style.color = "var(--rose)";
                msg.textContent = "Passwords do not match.";
                return;
            }

            try {
                msg.style.color = "var(--cyan)";
                msg.textContent = "Creating account...";
                const data = await api("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        full_name: fullNameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password: passwordInput.value,
                        role: roleInput.value
                    })
                });

                setSession(data);
                if (data.user.role === "QUALITY_ENGINEER") {
                    window.location.href = "qe-dashboard.html";
                } else {
                    window.location.href = "pm-dashboard.html";
                }
            } catch (error) {
                msg.style.color = "var(--rose)";
                msg.textContent = error.message;
            }
        });
    }
});

async function demoLogin(email, password) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
        document.getElementById("loginForm").dispatchEvent(new Event("submit"));
    }
}