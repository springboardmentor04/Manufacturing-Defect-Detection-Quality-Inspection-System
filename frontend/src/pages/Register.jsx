import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const handleRegister = () => {
    if (!role) {
      alert("Please select a role");
      return;
    }

    if (role === "Quality Engineer") {
      navigate("/quality-dashboard");
    } else if (role === "Factory Supervisor") {
      navigate("/supervisor-dashboard");
    }
  };

  return (
    <div className="login-card">
      <h2>Create Account</h2>

      <input type="text" placeholder="Full Name" />
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <input type="password" placeholder="Confirm Password" />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="">Select Role</option>
        <option>Quality Engineer</option>
        <option>Factory Supervisor</option>
      </select>

      <button onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}

export default Register;