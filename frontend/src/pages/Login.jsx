import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/quality-dashboard");
  };

  return (
  <div className="login-page">
    <div className="login-card">
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
      />

      <input
        type="password"
        placeholder="Password"
      />

      <button>Login</button>

      <p className="register-link">
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  </div>
);
}

export default Login;