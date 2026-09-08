import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Settings.css";

import {
    User,
    Shield,
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

    const [password, setPassword] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState("");

    const [loadingProfile, setLoadingProfile] = useState(true);

    const [savingProfile, setSavingProfile] = useState(false);


    /* =====================================================
       LOAD PROFILE FROM DATABASE
    ===================================================== */

    


    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            try {
                setLoadingProfile(true);

                const response = await api.get("/settings/profile");
                const data = response.data;

                if (!isMounted) return;

                setProfile({
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    employeeId: data.employeeId || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    department: data.department || "",
                    role: data.role || ""
                });
            } catch (error) {
                console.error(
                    "Error loading profile:",
                    error
                );

                if (!isMounted) return;

                setMessage(
                    error.response?.data?.detail ||
                    "Failed to load profile information."
                );
            } finally {
                if (isMounted) {
                    setLoadingProfile(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);


    /* =====================================================
       PROFILE INPUT CHANGE
    ===================================================== */

    const handleProfileChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setProfile((prev) => ({
            ...prev,
            [name]: value
        }));

    };


    /* =====================================================
       PASSWORD INPUT CHANGE
    ===================================================== */

    const handlePasswordChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setPassword((prev) => ({
            ...prev,
            [name]: value
        }));

    };


    /* =====================================================
       SAVE PROFILE
    ===================================================== */

    const handleSave = async () => {

        try {

            setSavingProfile(true);

            setMessage("");

            await api.put(
                "/settings/profile",
                {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    employeeId: profile.employeeId,
                    email: profile.email,
                    phone: profile.phone,
                    department: profile.department
                }
            );

            setMessage(
                "Settings saved successfully."
            );

            setTimeout(() => {
                setMessage("");
            }, 3000);

        } catch (error) {

            console.error(
                "Error updating profile:",
                error
            );

            setMessage(
                error.response?.data?.detail ||
                "Failed to update profile."
            );

        } finally {

            setSavingProfile(false);

        }
    };


    /* =====================================================
       UPDATE PASSWORD
    ===================================================== */

    const handlePasswordUpdate = () => {

        if (
            
            !password.newPassword ||
            !password.confirmPassword
        ) {

            setMessage(
                "Please fill in all password fields."
            );

            return;
        }


        if (
            password.newPassword !==
            password.confirmPassword
        ) {

            setMessage(
                "New password and confirmation do not match."
            );

            return;
        }


        setMessage(
            "Password updated successfully."
        );


        setPassword({
            
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


                    {/* =====================================================
                        SETTINGS HEADER
                    ===================================================== */}

                    <div className="settings-header">

                        <div>

                            <h1>
                                Settings
                            </h1>

                            <p>
                                Manage your account and security settings
                            </p>

                        </div>

                    </div>


                    {/* =====================================================
                        MESSAGE
                    ===================================================== */}

                    {message && (

                        <div className="settings-message">

                            <CheckCircle size={18} />

                            <span>
                                {message}
                            </span>

                        </div>

                    )}


                    <div className="settings-container">


                        {/* =====================================================
                            SETTINGS NAVIGATION
                        ===================================================== */}

                        <div className="settings-navigation">


                            {/* PROFILE */}

                            <button
                                className={
                                    activeSection === "profile"
                                        ? "settings-nav-item active"
                                        : "settings-nav-item"
                                }
                                onClick={() =>
                                    setActiveSection("profile")
                                }
                            >

                                <User size={19} />

                                <span>
                                    Profile
                                </span>

                            </button>


                            {/* SECURITY */}

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

                                <span>
                                    Security
                                </span>

                            </button>


                        </div>


                        {/* =====================================================
                            SETTINGS CONTENT
                        ===================================================== */}

                        <div className="settings-content">


                            {/* =================================================
                                PROFILE INFORMATION
                            ================================================= */}

                            {activeSection === "profile" && (

                                <div className="settings-card">


                                    {/* CARD HEADER */}

                                    <div className="settings-card-header">

                                        <div className="settings-card-icon">

                                            <User size={21} />

                                        </div>


                                        <div>

                                            <h2>
                                                Profile Information
                                            </h2>

                                            <p>
                                                Manage your personal and employee information
                                            </p>

                                        </div>

                                    </div>


                                    {/* PROFILE FORM */}

                                    <div className="settings-form">


                                        {loadingProfile ? (

                                            <div className="settings-loading">

                                                Loading profile information...

                                            </div>

                                        ) : (

                                            <>


                                                {/* FIRST NAME + LAST NAME */}

                                                <div className="settings-form-row">


                                                    <div className="settings-field">

                                                        <label>
                                                            First Name
                                                        </label>

                                                        <input
                                                            type="text"
                                                            name="firstName"
                                                            value={profile.firstName}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter first name"
                                                        />

                                                    </div>


                                                    <div className="settings-field">

                                                        <label>
                                                            Last Name
                                                        </label>

                                                        <input
                                                            type="text"
                                                            name="lastName"
                                                            value={profile.lastName}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter last name"
                                                        />

                                                    </div>


                                                </div>


                                                {/* EMPLOYEE ID + DEPARTMENT */}

                                                <div className="settings-form-row">


                                                    <div className="settings-field">

                                                        <label>
                                                            Employee ID
                                                        </label>

                                                        <input
                                                            type="text"
                                                            name="employeeId"
                                                            value={profile.employeeId}
                                                            onChange={handleProfileChange}
                                                            placeholder="Employee ID"
                                                        />

                                                    </div>


                                                    <div className="settings-field">

                                                        <label>
                                                            Department
                                                        </label>

                                                        <input
                                                            type="text"
                                                            name="department"
                                                            value={profile.department}
                                                            onChange={handleProfileChange}
                                                            placeholder="Department"
                                                        />

                                                    </div>


                                                </div>


                                                {/* EMAIL + PHONE */}

                                                <div className="settings-form-row">


                                                    <div className="settings-field">

                                                        <label>
                                                            Email Address
                                                        </label>


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

                                                        <label>
                                                            Phone Number
                                                        </label>

                                                        <input
                                                            type="text"
                                                            name="phone"
                                                            value={profile.phone}
                                                            onChange={handleProfileChange}
                                                            placeholder="Enter phone number"
                                                        />

                                                    </div>


                                                </div>


                                                {/* ROLE */}

                                                <div className="settings-field">

                                                    <label>
                                                        Role
                                                    </label>

                                                    <input
                                                        type="text"
                                                        name="role"
                                                        value={profile.role}
                                                        placeholder="Role"
                                                        readOnly
                                                    />

                                                </div>


                                            </>

                                        )}

                                    </div>


                                    {/* SAVE BUTTON */}

                                    <div className="settings-card-footer">

                                        <button
                                            className="settings-save-btn"
                                            onClick={handleSave}
                                            disabled={
                                                loadingProfile ||
                                                savingProfile
                                            }
                                        >

                                            <Save size={17} />

                                            {savingProfile
                                                ? "Saving..."
                                                : "Save Changes"
                                            }

                                        </button>

                                    </div>


                                </div>

                            )}


                            {/* =================================================
                                SECURITY
                            ================================================= */}

                            {activeSection === "security" && (

                                <div className="settings-card">


                                    {/* CARD HEADER */}

                                    <div className="settings-card-header">


                                        <div className="settings-card-icon">

                                            <Lock size={21} />

                                        </div>


                                        <div>

                                            <h2>
                                                Security
                                            </h2>

                                            <p>
                                                Update your password and account security
                                            </p>

                                        </div>


                                    </div>


                                    {/* PASSWORD FORM */}

                                    <div className="settings-form">


                                        


                                        {/* NEW PASSWORD */}

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


                                        {/* CONFIRM PASSWORD */}

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


                                    {/* PASSWORD BUTTON */}

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


                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

};


export default Settings;