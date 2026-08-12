function Profile() {
  return (
    <div className="profile-page">

      <div className="profile-card">

        <div className="profile-avatar">
          👩‍💻
        </div>

        <h2>Admin User</h2>

        <p className="profile-role">
          Quality Inspector
        </p>

        <div className="profile-info">

          <div className="info-row">
            <span>📧 Email</span>
            <span>admin@visioninspect.com</span>
          </div>

          <div className="info-row">
            <span>🏢 Department</span>
            <span>Manufacturing</span>
          </div>

          <div className="info-row">
            <span>🛡 Role</span>
            <span>Administrator</span>
          </div>

          <div className="info-row">
            <span>📅 Joined</span>
            <span>July 2025</span>
          </div>

        </div>

        <button className="profile-btn">
          ✏️ Edit Profile
        </button>

      </div>

    </div>
  );
}

export default Profile;