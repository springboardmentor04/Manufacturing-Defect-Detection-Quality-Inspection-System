import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">VisionInspect AI</div>

      <ul className="nav-links">
        <li><Link to="/">🏠 Home</Link></li>
        <li><Link to="/login">🔐 Login</Link></li>
        <li><Link to="/register">📝 Register</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;