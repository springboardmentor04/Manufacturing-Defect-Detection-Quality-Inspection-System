import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, Eye, EyeOff, KeyRound, Lock, LogOut, Mail, Settings, Shield, Shuffle, SlidersHorizontal, Trash2, User, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys & People",
    emojis: [
      "😃", "😀", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋",
      "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
      "😴", "😷", "🤒", "🤕", "🤠", "🥳", "😎", "🤓", "🧐", "🤖"
    ]
  },
  {
    name: "Work & Industry",
    emojis: [
      "🏭", "⚙️", "🔬", "🤖", "💻", "🖥️", "📊", "📈", "📦", "💡",
      "⚡", "🎯", "🚀", "🔍", "🔎", "🛡️", "🛠️", "🔧", "🔨", "📐",
      "📏", "📋", "📁", "📂", "📄", "💾", "📡", "🏗️", "🏢", "🧰",
      "🧪", "🧲", "🕹️", "📷", "📹", "🧭", "⏱️", "⏳", "🔋", "🔌"
    ]
  },
  {
    name: "Gestures & Symbols",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤝", "✌️", "🤞", "🤟", "🤘",
      "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚",
      "✨", "⭐", "🌟", "💫", "🔥", "💥", "🏆", "🥇", "🥈", "🥉",
      "🏅", "🎖️", "🎯", "💯", "✅", "✔️", "☑️", "📌", "📍", "💎",
      "🔑", "🗝️", "🔒", "🔓", "🔔", "📢", "📣", "💬", "💭", "♥️"
    ]
  }
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export default function SettingsModal({ isOpen, onClose, user, onSignOut }) {
  const [activeTab, setActiveTab] = useState("account");
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  const cleanUserName = (user?.name || "").trim().replace(/\s*\.$/, "") || "User";
  const userName = cleanUserName;
  const userInitial = userName.slice(0, 1).toUpperCase();
  const userKey = user?.openId || user?.id || user?.email || "default";

  // General & Avatar Emoji state
  const [workspaceName, setWorkspaceName] = useState(() => {
    const saved = localStorage.getItem(`visioninspect_ws_name_${userKey}`);
    if (saved) return saved.replace(/\s*\.'s Workspace$/, "'s Workspace");
    return `${userName}'s Workspace`;
  });
  const [workspaceEmoji, setWorkspaceEmoji] = useState(() => {
    return localStorage.getItem(`visioninspect_ws_emoji_${userKey}`) || "😃";
  });
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(`visioninspect_ws_name_${userKey}`);
    if (saved) {
      const fixed = saved.replace(/\s*\.'s Workspace$/, "'s Workspace");
      if (fixed !== saved) {
        localStorage.setItem(`visioninspect_ws_name_${userKey}`, fixed);
      }
      setWorkspaceName(fixed);
    } else {
      setWorkspaceName(`${userName}'s Workspace`);
    }
    const savedEmoji = localStorage.getItem(`visioninspect_ws_emoji_${userKey}`);
    if (savedEmoji) {
      setWorkspaceEmoji(savedEmoji);
    }
  }, [userKey, userName]);

  // Preferences state
  const { theme, setTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete account confirm & User ID copy state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState("");
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerOpen && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  const handleSelectEmoji = (emoji) => {
    setWorkspaceEmoji(emoji);
    localStorage.setItem(`visioninspect_ws_emoji_${userKey}`, emoji);
    window.dispatchEvent(new CustomEvent("visioninspect_avatar_change", { detail: { emoji, userKey } }));
    setEmojiPickerOpen(false);
  };

  const handleRemoveEmoji = () => {
    setWorkspaceEmoji("");
    localStorage.removeItem(`visioninspect_ws_emoji_${userKey}`);
    window.dispatchEvent(new CustomEvent("visioninspect_avatar_change", { detail: { emoji: "", userKey } }));
    setEmojiPickerOpen(false);
  };

  const handleRandomEmoji = () => {
    const random = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
    handleSelectEmoji(random);
  };

  const handleWorkspaceNameChange = (e) => {
    const next = e.target.value;
    setWorkspaceName(next);
    localStorage.setItem(`visioninspect_ws_name_${userKey}`, next);
    window.dispatchEvent(new CustomEvent("visioninspect_wsname_change", { detail: { name: next, userKey } }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, deleteConfirmOpen]);

  if (!isOpen) return null;

  const userEmail = user?.email || `${userName.toLowerCase().replace(/\s+/g, "")}@visioninspect.ai`;
  const userId = String(user?.openId || user?.id || "134d872b-594c-81d6-8668-0002d9b359b4");
  const userRole = user?.role === "admin"
    ? "Platform Admin"
    : user?.role === "factory_supervisor"
    ? "Factory Supervisor"
    : "Quality Engineer";

  const handleCopyUserId = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(userId);
      }
    } catch { }
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        email: userEmail,
        newPassword: newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }, 1500);
    } catch (err) {
      setPasswordError(err?.message || "Failed to update password. Please try again.");
    }
  };

  const handleDeleteAccount = () => {
    if (deleteInputText.trim().toLowerCase() !== "delete") {
      return;
    }
    setDeleteConfirmOpen(false);
    onClose();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <div className="vi-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vi-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top-right close button */}
        <button
          type="button"
          className="vi-settings-close-btn"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X size={17} />
        </button>

        {/* Left Navigation Sidebar */}
        <aside className="vi-settings-sidebar">
          {/* 1st Header: Account */}
          <div className="vi-settings-group">
            <span className="vi-settings-group-label">Account</span>
            
            {/* Option 1: Account (Shows User Avatar & Name) */}
            <button
              type="button"
              className={`vi-settings-nav-item vi-settings-account-item ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <span className="vi-settings-avatar-badge">{workspaceEmoji || userInitial}</span>
              <span className="vi-settings-nav-name">{userName}</span>
            </button>

            {/* Option 2: Preferences */}
            <button
              type="button"
              className={`vi-settings-nav-item ${activeTab === "preferences" ? "active" : ""}`}
              onClick={() => setActiveTab("preferences")}
            >
              <SlidersHorizontal size={15} />
              <span>Preferences</span>
            </button>
          </div>

          {/* 2nd Header: Workspace */}
          <div className="vi-settings-group">
            <span className="vi-settings-group-label">Workspace</span>

            {/* Option 1: General */}
            <button
              type="button"
              className={`vi-settings-nav-item ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <Settings size={15} />
              <span>General</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="vi-settings-content">
          {activeTab === "account" && (
            <div className="vi-settings-pane">
              <header className="vi-settings-header">
                <h2>Account</h2>
                <p>Manage your profile, login information, and devices</p>
              </header>

              {/* Profile Section */}
              <section className="vi-settings-section">
                <h3>Profile</h3>
                <div className="vi-settings-profile-card">
                  <div className="vi-settings-avatar-large">{workspaceEmoji || userInitial}</div>
                  <div className="vi-settings-profile-field">
                    <label>Preferred name</label>
                    <input
                      type="text"
                      value={userName}
                      readOnly
                      className="vi-settings-input"
                    />
                  </div>
                </div>
              </section>

              {/* Account Security Section */}
              <section className="vi-settings-section">
                <h3>Account security</h3>
                
                {/* Email Row */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Email</label>
                    <span>{userEmail}</span>
                  </div>
                  <button type="button" className="vi-settings-btn-secondary" disabled>
                    Manage emails
                  </button>
                </div>

                {/* Password Row with Change Password Option */}
                <div className="vi-settings-row-stack">
                  <div className="vi-settings-row">
                    <div className="vi-settings-row-info">
                      <label>Password</label>
                      <span>Set or update a secure password for your account</span>
                    </div>
                    <button
                      type="button"
                      className="vi-settings-btn-action"
                      onClick={() => {
                        setShowPasswordForm((prev) => !prev);
                        setPasswordError("");
                        setPasswordSuccess(false);
                      }}
                    >
                      {showPasswordForm ? "Cancel" : "Change password"}
                    </button>
                  </div>

                  {/* Inline Change Password Box */}
                  {showPasswordForm && (
                    <form className="vi-settings-inline-form" onSubmit={handlePasswordSubmit}>
                      <div className="vi-settings-form-row">
                        <label>Current password</label>
                        <div className="vi-settings-pass-input-wrap">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="vi-settings-input"
                          />
                          <button
                            type="button"
                            className="vi-settings-pass-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="vi-settings-form-grid">
                        <div className="vi-settings-form-row">
                          <label>New password</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="vi-settings-input"
                          />
                        </div>
                        <div className="vi-settings-form-row">
                          <label>Confirm new password</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="vi-settings-input"
                          />
                        </div>
                      </div>

                      {passwordError && (
                        <p className="vi-settings-form-err">
                          <AlertTriangle size={13} /> {passwordError}
                        </p>
                      )}

                      {passwordSuccess && (
                        <p className="vi-settings-form-success">
                          <Check size={13} /> Password updated successfully!
                        </p>
                      )}

                      <div className="vi-settings-form-actions">
                        <button type="submit" className="vi-settings-btn-primary">
                          Update password
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Role Row */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Assigned role</label>
                    <span>System permissions level</span>
                  </div>
                  <span className="vi-settings-role-badge">{userRole}</span>
                </div>
              </section>

              {/* Support Section */}
              <section className="vi-settings-section">
                <h3>Support</h3>

                {/* Delete Account Row */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info" style={{ maxWidth: "420px" }}>
                    <label style={{ color: "#c94d52" }}>Delete my account</label>
                    <span>Permanently delete your account. You'll no longer be able to access your workspaces or inspection lines.</span>
                  </div>
                  <button
                    type="button"
                    className="vi-settings-btn-danger"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Delete my account
                  </button>
                </div>
              </section>

              {/* User ID Section under Support */}
              <section className="vi-settings-section">
                <h3>User ID</h3>
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>User ID</label>
                  </div>
                  <div className="vi-settings-userid-wrap">
                    <span className="vi-settings-userid-code">{userId}</span>
                    <button
                      type="button"
                      className="vi-settings-copy-btn"
                      onClick={handleCopyUserId}
                      title={copiedUserId ? "Copied!" : "Copy User ID"}
                      aria-label="Copy User ID"
                    >
                      {copiedUserId ? <Check size={14} className="vi-copied-check" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="vi-settings-pane">
              <header className="vi-settings-header">
                <h2>Preferences</h2>
                <p>Customize your personal workspace and inspection view preferences</p>
              </header>

              {/* Heading 1: Appearance */}
              <section className="vi-settings-section">
                <h3>Appearance</h3>

                {/* Option 1: Theme */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Theme</label>
                    <span>Choose a theme for VisionInspect AI on this device</span>
                  </div>
                  <div className="vi-settings-select-wrap">
                    <select
                      className="vi-settings-select"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <ChevronDown size={14} className="vi-settings-select-arrow" />
                  </div>
                </div>
              </section>

              {/* Heading 2: Language & time */}
              <section className="vi-settings-section">
                <h3>Language & time</h3>

                {/* Option 1: Language */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Language</label>
                    <span>Choose the language you want to use VisionInspect AI in</span>
                  </div>
                  <div className="vi-settings-select-wrap">
                    <select
                      className="vi-settings-select"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      <option value="en-IN">English (India)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                    </select>
                    <ChevronDown size={14} className="vi-settings-select-arrow" />
                  </div>
                </div>

                {/* Option 2: Time zone (unchangeable) */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Time zone</label>
                    <span>Choose your time zone</span>
                  </div>
                  <div className="vi-settings-select-wrap">
                    <select
                      className="vi-settings-select vi-settings-select-disabled"
                      value="gmt-530"
                      disabled
                    >
                      <option value="gmt-530">(GMT+05:30) Calcutta</option>
                    </select>
                    <ChevronDown size={14} className="vi-settings-select-arrow" />
                  </div>
                </div>

                {/* Option 3: Date format (unchangeable) */}
                <div className="vi-settings-row">
                  <div className="vi-settings-row-info">
                    <label>Date format</label>
                    <span>Choose how dates and times are displayed</span>
                  </div>
                  <div className="vi-settings-select-wrap">
                    <select
                      className="vi-settings-select vi-settings-select-disabled"
                      value="dd-mm-yyyy"
                      disabled
                    >
                      <option value="dd-mm-yyyy">DD/MM/YYYY</option>
                    </select>
                    <ChevronDown size={14} className="vi-settings-select-arrow" />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "general" && (
            <div className="vi-settings-pane">
              <header className="vi-settings-header">
                <h2>General</h2>
                <p>Manage your workspace name, domains, and more</p>
              </header>

              {/* Workspace settings Section */}
              <section className="vi-settings-section">
                <h3>Workspace settings</h3>

                {/* Workspace name Row */}
                <div className="vi-settings-row-stack">
                  <div className="vi-settings-field-block">
                    <label className="vi-settings-field-title">Workspace name</label>
                    <span className="vi-settings-field-desc">Your workspace name can be up to 65 characters</span>
                    <input
                      type="text"
                      maxLength={65}
                      value={workspaceName}
                      onChange={handleWorkspaceNameChange}
                      className="vi-settings-input vi-settings-ws-input"
                      placeholder="Enter workspace name"
                    />
                  </div>
                </div>

                {/* Icon Row */}
                <div className="vi-settings-row-stack">
                  <div className="vi-settings-field-block">
                    <label className="vi-settings-field-title">Icon</label>
                    <span className="vi-settings-field-desc">Pick an emoji. This icon will appear in your sidebar and notifications.</span>
                    
                    {/* Emoji trigger button */}
                    <div className="vi-settings-icon-trigger-wrap" ref={emojiPickerRef}>
                      <button
                        type="button"
                        className="vi-settings-emoji-btn"
                        onClick={() => setEmojiPickerOpen((prev) => !prev)}
                        title="Change workspace emoji"
                        aria-label="Change workspace emoji"
                        aria-expanded={emojiPickerOpen}
                      >
                        <span className="vi-settings-emoji-display">{workspaceEmoji || userInitial}</span>
                      </button>

                      {/* Emoji Picker Popover */}
                      {emojiPickerOpen && (
                        <div className="vi-emoji-picker-popover" role="dialog" aria-label="Emoji picker">
                          {/* Popover Header */}
                          <div className="vi-emoji-picker-header">
                            <div className="vi-emoji-picker-tabs">
                              <span className="vi-emoji-tab-active">Emoji</span>
                            </div>
                            <div className="vi-emoji-picker-header-actions">
                              <button
                                type="button"
                                className="vi-emoji-action-btn"
                                onClick={handleRandomEmoji}
                                title="Pick a random emoji"
                              >
                                <Shuffle size={12} />
                                <span>Random</span>
                              </button>
                              <button
                                type="button"
                                className="vi-emoji-action-btn vi-emoji-remove-btn"
                                onClick={handleRemoveEmoji}
                                title="Remove emoji and use default initial"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Popover Body: Scrollable Emojis by Category */}
                          <div className="vi-emoji-picker-body">
                            {EMOJI_CATEGORIES.map((category) => (
                              <div key={category.name} className="vi-emoji-cat-section">
                                <span className="vi-emoji-cat-title">{category.name}</span>
                                <div className="vi-emoji-picker-grid">
                                  {category.emojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      className={`vi-emoji-item-btn ${workspaceEmoji === emoji ? "active" : ""}`}
                                      onClick={() => handleSelectEmoji(emoji)}
                                      title={emoji}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="vi-delete-dialog-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="vi-delete-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="vi-delete-dialog-head">
              <div className="vi-delete-dialog-icon">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3>Delete Account?</h3>
                <p>This action cannot be undone. All your session data and local preferences will be permanently wiped.</p>
              </div>
            </header>
            <div className="vi-delete-dialog-body">
              <label>Type <b>delete</b> to confirm:</label>
              <input
                type="text"
                value={deleteInputText}
                onChange={(e) => setDeleteInputText(e.target.value)}
                placeholder="delete"
                className="vi-settings-input"
                autoFocus
              />
            </div>
            <footer className="vi-delete-dialog-actions">
              <button
                type="button"
                className="vi-settings-btn-secondary"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteInputText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vi-settings-btn-danger-solid"
                disabled={deleteInputText.trim().toLowerCase() !== "delete"}
                onClick={handleDeleteAccount}
              >
                Permanently delete
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
