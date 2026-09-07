import { useState } from "react";
import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Settings.css";

import {
    User,
    Bell,
    Shield,
    Monitor,
    Save,
    Lock,
    Mail,
    CheckCircle
} from "lucide-react";

const Settings = () => {

    const [activeSection, setActiveSection] = useState("profile");

    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        employeeId: "",
        email: "",
        phone: "",
        department: "",
        role: ""
    });

    const [notifications, setNotifications] = useState({
        inspectionComplete: true,
        defectDetected: true,
        qualityReport: true,
        systemUpdates: false
    });

    const [preferences, setPreferences] = useState({
        autoRefresh: true,
        darkMode: true,
        confidenceThreshold: 50
    });

    const [password, setPassword] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState("");

    const handleProfileChange = (e) => {
        const { name, value } = e.target;

        setProfile((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;

        setPassword((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        setMessage("Settings saved successfully.");

        setTimeout(() => {
            setMessage("");
        }, 3000);
    };

    const handlePasswordUpdate = () => {

        if (
            !password.currentPassword ||
            !password.newPassword ||
            !password.confirmPassword
        ) {
            setMessage("Please fill in all password fields.");
            return;
        }

        if (password.newPassword !== password.confirmPassword) {
            setMessage("New password and confirmation do not match.");
            return;
        }

        setMessage("Password updated successfully.");

        setPassword({
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        });

        setTimeout(() => {
            setMessage("");
        }, 3000);
    };

    return (
        <div className="dashboard-layout">

            <Sidebar />

            <div className="dashboard-main">

                <DashboardHeader />

                <div className="settings-page">

                    <div className="settings-header">
                        <div>
                            <h1>Settings</h1>
                            <p>
                                Manage your account and VisionInspectAI preferences
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className="settings-message">
                            <CheckCircle size={18} />
                            <span>{message}</span>
                        </div>
                    )}

                    <div className="settings-container">

                        {/* SETTINGS SIDEBAR */}

                        <div className="settings-navigation">

                            <button
                                className={
                                    activeSection === "profile"
                                        ? "settings-nav-item active"
                                        : "settings-nav-item"
                                }
                                onClick={() => setActiveSection("profile")}
                            >
                                <User size={19} />
                                <span>Profile</span>
                            </button>

                            <button
                                className={
                                    activeSection === "notifications"
                                        ? "settings-nav-item active"
                                        : "settings-nav-item"
                                }
                                onClick={() =>
                                    setActiveSection("notifications")
                                }
                            >
                                <Bell size={19} />
                                <span>Notifications</span>
                            </button>

                            <button
                                className={
                                    activeSection === "security"
                                        ? "settings-nav-item active"
                                        : "settings-nav-item"
                                }
                                onClick={() =>
                                    setActiveSection("security")
                                }
                            >
                                <Shield size={19} />
                                <span>Security</span>
                            </button>

                            <button
                                className={
                                    activeSection === "preferences"
                                        ? "settings-nav-item active"
                                        : "settings-nav-item"
                                }
                                onClick={() =>
                                    setActiveSection("preferences")
                                }
                            >
                                <Monitor size={19} />
                                <span>Preferences</span>
                            </button>

                        </div>

                        {/* SETTINGS CONTENT */}

                        <div className="settings-content">

                            {/* PROFILE */}

                            {activeSection === "profile" && (
                                <div className="settings-card">

                                    <div className="settings-card-header">
                                        <div className="settings-card-icon">
                                            <User size={21} />
                                        </div>

                                        <div>
                                            <h2>Profile Information</h2>
                                            <p>
                                                Manage your personal and employee information
                                            </p>
                                        </div>
                                    </div>

                                    <div className="settings-form">

                                        <div className="settings-form-row">

                                            <div className="settings-field">
                                                <label>First Name</label>

                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={profile.firstName}
                                                    onChange={handleProfileChange}
                                                    placeholder="Enter first name"
                                                />
                                            </div>

                                            <div className="settings-field">
                                                <label>Last Name</label>

                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={profile.lastName}
                                                    onChange={handleProfileChange}
                                                    placeholder="Enter last name"
                                                />
                                            </div>

                                        </div>

                                        <div className="settings-form-row">

                                            <div className="settings-field">
                                                <label>Employee ID</label>

                                                <input
                                                    type="text"
                                                    name="employeeId"
                                                    value={profile.employeeId}
                                                    onChange={handleProfileChange}
                                                    placeholder="Employee ID"
                                                />
                                            </div>

                                            <div className="settings-field">
                                                <label>Department</label>

                                                <input
                                                    type="text"
                                                    name="department"
                                                    value={profile.department}
                                                    onChange={handleProfileChange}
                                                    placeholder="Department"
                                                />
                                            </div>

                                        </div>

                                        <div className="settings-form-row">

                                            <div className="settings-field">

                                                <label>Email Address</label>

                                                <div className="settings-input-icon">

                                                    <Mail size={17} />

                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={profile.email}
                                                        onChange={handleProfileChange}
                                                        placeholder="Enter email address"
                                                    />

                                                </div>

                                            </div>

                                            <div className="settings-field">
                                                <label>Phone Number</label>

                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={profile.phone}
                                                    onChange={handleProfileChange}
                                                    placeholder="Enter phone number"
                                                />
                                            </div>

                                        </div>

                                        <div className="settings-field">

                                            <label>Role</label>

                                            <input
                                                type="text"
                                                name="role"
                                                value={profile.role}
                                                onChange={handleProfileChange}
                                                placeholder="Role"
                                            />

                                        </div>

                                    </div>

                                    <div className="settings-card-footer">

                                        <button
                                            className="settings-save-btn"
                                            onClick={handleSave}
                                        >
                                            <Save size={17} />
                                            Save Changes
                                        </button>

                                    </div>

                                </div>
                            )}

                            {/* NOTIFICATIONS */}

                            {activeSection === "notifications" && (
                                <div className="settings-card">

                                    <div className="settings-card-header">

                                        <div className="settings-card-icon">
                                            <Bell size={21} />
                                        </div>

                                        <div>
                                            <h2>Notifications</h2>
                                            <p>
                                                Choose which notifications you want to receive
                                            </p>
                                        </div>

                                    </div>

                                    <div className="settings-options">

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    Inspection Completed
                                                </strong>

                                                <p>
                                                    Receive a notification when an inspection is completed.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        notifications.inspectionComplete
                                                    }
                                                    onChange={(e) =>
                                                        setNotifications({
                                                            ...notifications,
                                                            inspectionComplete:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    Defect Detected
                                                </strong>

                                                <p>
                                                    Receive alerts when defects are detected.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        notifications.defectDetected
                                                    }
                                                    onChange={(e) =>
                                                        setNotifications({
                                                            ...notifications,
                                                            defectDetected:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    Quality Reports
                                                </strong>

                                                <p>
                                                    Receive notifications for generated quality reports.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        notifications.qualityReport
                                                    }
                                                    onChange={(e) =>
                                                        setNotifications({
                                                            ...notifications,
                                                            qualityReport:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    System Updates
                                                </strong>

                                                <p>
                                                    Receive notifications about system updates.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        notifications.systemUpdates
                                                    }
                                                    onChange={(e) =>
                                                        setNotifications({
                                                            ...notifications,
                                                            systemUpdates:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                    </div>

                                    <div className="settings-card-footer">

                                        <button
                                            className="settings-save-btn"
                                            onClick={handleSave}
                                        >
                                            <Save size={17} />
                                            Save Preferences
                                        </button>

                                    </div>

                                </div>
                            )}

                            {/* SECURITY */}

                            {activeSection === "security" && (
                                <div className="settings-card">

                                    <div className="settings-card-header">

                                        <div className="settings-card-icon">
                                            <Lock size={21} />
                                        </div>

                                        <div>
                                            <h2>Security</h2>
                                            <p>
                                                Update your password and account security
                                            </p>
                                        </div>

                                    </div>

                                    <div className="settings-form">

                                        <div className="settings-field">

                                            <label>
                                                Current Password
                                            </label>

                                            <input
                                                type="password"
                                                name="currentPassword"
                                                value={
                                                    password.currentPassword
                                                }
                                                onChange={
                                                    handlePasswordChange
                                                }
                                                placeholder="Enter current password"
                                            />

                                        </div>

                                        <div className="settings-field">

                                            <label>
                                                New Password
                                            </label>

                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={
                                                    password.newPassword
                                                }
                                                onChange={
                                                    handlePasswordChange
                                                }
                                                placeholder="Enter new password"
                                            />

                                        </div>

                                        <div className="settings-field">

                                            <label>
                                                Confirm New Password
                                            </label>

                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={
                                                    password.confirmPassword
                                                }
                                                onChange={
                                                    handlePasswordChange
                                                }
                                                placeholder="Confirm new password"
                                            />

                                        </div>

                                    </div>

                                    <div className="settings-card-footer">

                                        <button
                                            className="settings-save-btn"
                                            onClick={
                                                handlePasswordUpdate
                                            }
                                        >
                                            <Shield size={17} />
                                            Update Password
                                        </button>

                                    </div>

                                </div>
                            )}

                            {/* PREFERENCES */}

                            {activeSection === "preferences" && (
                                <div className="settings-card">

                                    <div className="settings-card-header">

                                        <div className="settings-card-icon">
                                            <Monitor size={21} />
                                        </div>

                                        <div>
                                            <h2>Application Preferences</h2>
                                            <p>
                                                Configure VisionInspectAI application behavior
                                            </p>
                                        </div>

                                    </div>

                                    <div className="settings-options">

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    Automatic Dashboard Refresh
                                                </strong>

                                                <p>
                                                    Automatically refresh inspection and analytics data.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        preferences.autoRefresh
                                                    }
                                                    onChange={(e) =>
                                                        setPreferences({
                                                            ...preferences,
                                                            autoRefresh:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                        <div className="settings-option">

                                            <div>
                                                <strong>
                                                    Dark Mode
                                                </strong>

                                                <p>
                                                    Use the dark interface throughout VisionInspectAI.
                                                </p>
                                            </div>

                                            <label className="settings-switch">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        preferences.darkMode
                                                    }
                                                    onChange={(e) =>
                                                        setPreferences({
                                                            ...preferences,
                                                            darkMode:
                                                                e.target.checked
                                                        })
                                                    }
                                                />

                                                <span></span>

                                            </label>

                                        </div>

                                        <div className="settings-threshold">

                                            <div>
                                                <strong>
                                                    Defect Detection Confidence Threshold
                                                </strong>

                                                <p>
                                                    Minimum confidence required for YOLO defect detection.
                                                </p>
                                            </div>

                                            <div className="threshold-control">

                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={
                                                        preferences.confidenceThreshold
                                                    }
                                                    onChange={(e) =>
                                                        setPreferences({
                                                            ...preferences,
                                                            confidenceThreshold:
                                                                Number(
                                                                    e.target.value
                                                                )
                                                        })
                                                    }
                                                />

                                                <span>
                                                    {preferences.confidenceThreshold}%
                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="settings-card-footer">

                                        <button
                                            className="settings-save-btn"
                                            onClick={handleSave}
                                        >
                                            <Save size={17} />
                                            Save Preferences
                                        </button>

                                    </div>

                                </div>
                            )}

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default Settings;