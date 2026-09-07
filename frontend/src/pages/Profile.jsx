import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Profile.css";

function Profile() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpdatePassword = (event) => {
    event.preventDefault();
    setMessage("Password update is ready to connect to your authentication API.");
  };

  const handleLogout = () => {
    setMessage("Logout action is ready to connect to your authentication flow.");
  };

  return (
    <>
      <Sidebar />

      <div className="dashboard">
        <Navbar title="Profile" />

        <main className="profile-container">
          <section className="profile-card">
            <div className="profile-card-top">
              <div className="profile-avatar" aria-hidden="true">👤</div>

              <div className="profile-heading">
                <span className="profile-eyebrow">ACCOUNT PROFILE</span>
                <h1>John Doe</h1>
                <p>Quality Engineer</p>
              </div>
            </div>

            <div className="profile-status">
              <span className="status-dot" />
              Active account
            </div>

            <div className="profile-details">
              <div className="profile-detail">
                <span>Role</span>
                <strong>Quality Engineer</strong>
              </div>
              <div className="profile-detail">
                <span>Email</span>
                <strong>john@example.com</strong>
              </div>
              <div className="profile-detail">
                <span>Employee ID</span>
                <strong>QE001</strong>
              </div>
              <div className="profile-detail">
                <span>Department</span>
                <strong>Quality Control</strong>
              </div>
            </div>

            <div className="profile-note">
              <span className="note-icon">✓</span>
              <div>
                <strong>Inspection access</strong>
                <p>Authorized to review quality inspection records and reports.</p>
              </div>
            </div>
          </section>

          <section className="password-card">
            <div className="section-heading">
              <div>
                <span className="profile-eyebrow">ACCOUNT SECURITY</span>
                <h2>Change Password</h2>
                <p>Keep your VisionInspect AI account secure with a strong password.</p>
              </div>
              <span className="security-icon">🔒</span>
            </div>

            <form onSubmit={handleUpdatePassword} className="password-form">
              <label>
                Current Password
                <div className="password-input">
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} aria-label="Toggle current password visibility">
                    {showCurrent ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label>
                New Password
                <div className="password-input">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} aria-label="Toggle new password visibility">
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label>
                Confirm Password
                <div className="password-input">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password visibility">
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <div className="password-hint">
                <span>Tip</span>
                Use a unique password with a mix of letters, numbers, and symbols.
              </div>

              {message && <div className="profile-message" role="status">{message}</div>}

              <div className="profile-buttons">
                <button type="submit" className="update-btn">Update Password</button>
                <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </>
  );
}

export default Profile;
