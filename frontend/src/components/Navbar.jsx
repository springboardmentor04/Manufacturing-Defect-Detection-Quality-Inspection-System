import { Link, useNavigate } from "react-router-dom";

function Navbar() {

  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );


  const logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate(
      "/login",
      { replace: true }
    );
  };


  return (

    <nav className="navbar">

      <div className="navbar-brand">

        <Link to="/dashboard">
          🔍 VisionInspectAI
        </Link>

      </div>


      <div className="navbar-links">

        <Link to="/dashboard">
          Dashboard
        </Link>


        <Link to="/upload">
          Upload
        </Link>


        <Link to="/detection">
          Detection
        </Link>


        <Link to="/results">
          Results
        </Link>


        <button
          type="button"
          onClick={logout}
        >
          Logout
        </button>

      </div>

    </nav>
  );
}

export default Navbar;