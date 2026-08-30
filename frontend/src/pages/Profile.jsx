import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function Profile() {

  const navigate = useNavigate();

  const getUser = () => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  };

  const currentUser = getUser();

  const [name, setName] = useState(
    currentUser.name || "B.Sravani"
  );

  const [email, setEmail] = useState(
    currentUser.email || ""
  );

  const role =
    currentUser.role || "Quality Engineer";


  const handleSave = () => {

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      email: email.trim(),
      role: role
    };

    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );

    alert("Profile updated successfully!");

    navigate("/dashboard");
  };


  return (
    <>
      <Navbar />

      <main className="page">

        <div className="card">

          <h2>Edit Profile</h2>

          <p style={{ color: "#64748b" }}>
            Update your Quality Engineer profile information.
          </p>


          <div
            style={{
              marginTop: "30px",
              maxWidth: "500px"
            }}
          >

            {/* NAME */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600"
              }}
            >
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              style={{
                width: "100%",
                padding: "13px",
                border: "1px solid #dbe3ef",
                borderRadius: "8px",
                marginBottom: "20px",
                boxSizing: "border-box"
              }}
            />


            {/* EMAIL */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600"
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={{
                width: "100%",
                padding: "13px",
                border: "1px solid #dbe3ef",
                borderRadius: "8px",
                marginBottom: "20px",
                boxSizing: "border-box"
              }}
            />


            {/* ROLE */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600"
              }}
            >
              Role
            </label>

            <input
              type="text"
              value={role}
              disabled
              style={{
                width: "100%",
                padding: "13px",
                border: "1px solid #dbe3ef",
                borderRadius: "8px",
                marginBottom: "25px",
                boxSizing: "border-box",
                background: "#f5f7fa",
                color: "#64748b"
              }}
            />


            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "12px"
              }}
            >

              <button
                onClick={handleSave}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Save Changes
              </button>


              <button
                onClick={() =>
                  navigate("/dashboard")
                }
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      </main>
    </>
  );
}

export default Profile;