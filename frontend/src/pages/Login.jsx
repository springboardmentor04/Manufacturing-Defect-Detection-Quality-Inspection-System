import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();

    if (!email || !password || !role) {
      alert("Please enter email, password and select your role.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email,
        password: password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      const user = response.data.user;

      // Check that selected role matches registered role
      if (user.role !== role) {
        alert(
          `Role mismatch.\n\nThis account is registered as: ${user.role}`
        );
        setLoading(false);
        return;
      }

      // Save login information
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(user));

      alert(`Welcome ${user.name}!`);

      // ROLE-BASED REDIRECTION
      if (user.role === "Factory Supervisor") {
        navigate("/supervisor");
      } else if (user.role === "Quality Engineer") {
        navigate("/dashboard");
      } else {
        alert("Unknown user role.");
      }

    } catch (error) {
      console.error("Login Error:", error);

      if (error.response) {
        console.log("STATUS:", error.response.status);
        console.log("BACKEND ERROR:", error.response.data);

        alert(
          "Login failed:\n\n" +
          JSON.stringify(error.response.data, null, 2)
        );
      } else {
        alert("Cannot connect to backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* LEFT SIDE */}
        <div className="login-left">

          <div className="brand-icon">🔍</div>

          <h1>VisionInspectAI</h1>

          <h2>
            Smart Manufacturing
            <br />
            Quality Inspection
          </h2>

          <p>
            AI-powered visual inspection for reliable and efficient
            manufacturing quality control.
          </p>

          <div className="login-features">
            <p>✓ Automated Defect Detection</p>
            <p>✓ Quality Monitoring</p>
            <p>✓ Production Analytics</p>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="login-card">

          <h2>Welcome Back</h2>

          <p className="login-subtitle">
            Sign in to access your inspection workspace
          </p>

          <form onSubmit={loginUser}>

            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Select Role</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select your role</option>

              <option value="Quality Engineer">
                Quality Engineer
              </option>

              <option value="Factory Supervisor">
                Factory Supervisor
              </option>
            </select>

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <p className="register-link">
            Don't have an account?{" "}
            <Link to="/register">
              Create Account
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;