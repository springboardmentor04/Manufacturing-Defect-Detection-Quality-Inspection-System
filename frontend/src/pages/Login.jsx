import "../styles/Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Cpu,
    Eye,
    EyeOff,
    Factory,
    LockKeyhole,
    ScanLine,
    ShieldCheck,
} from "lucide-react";
import api from "../utils/api";

function Login() {
    const navigate = useNavigate();

    const [mode, setMode] = useState("login");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [role, setRole] = useState("Quality Engineer");

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    function normalizeRole(value) {
        const normalized = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        if (
            normalized === "quality_engineer" ||
            normalized === "qualityengineer"
        ) {
            return "quality_engineer";
        }

        if (
            normalized === "factory_supervisor" ||
            normalized === "factorysupervisor"
        ) {
            return "factory_supervisor";
        }

        return null;
    }

    function clearMessages() {
        setError("");
        setSuccess("");
    }

    function switchMode(nextMode) {
        setMode(nextMode);
        clearMessages();
        setShowPassword(false);
        setShowNewPassword(false);
    }

    async function handleLogin() {
        clearMessages();

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/login", {
                email: email.trim(),
                password,
                role,
            });

            const data = response.data;

            if (!data?.success) {
                setError(
                    data?.message ||
                        data?.detail ||
                        "Invalid email or password."
                );
                return;
            }

            const token = data.access_token;

            if (!token) {
                setError(
                    "Login succeeded but no authentication token was received."
                );
                return;
            }

            localStorage.setItem("visioninspect_access_token", token);

            const user = data.user || {};
            const normalizedRole = normalizeRole(user.role);

            if (!normalizedRole) {
                localStorage.removeItem("visioninspect_access_token");
                setError("Invalid workspace role.");
                return;
            }

            const normalizedUser = {
                ...user,
                role: normalizedRole,
            };

            localStorage.setItem(
                "visioninspect_user",
                JSON.stringify(normalizedUser)
            );
            localStorage.setItem("visioninspect_role", normalizedRole);

            if (normalizedRole === "quality_engineer") {
                navigate("/quality-engineer/dashboard", { replace: true });
                return;
            }

            if (normalizedRole === "factory_supervisor") {
                navigate("/factory-supervisor/dashboard", { replace: true });
                return;
            }

            setError("Invalid workspace role.");
        } catch (err) {
            console.error("Login error:", err);

            setError(
                err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword() {
        clearMessages();

        if (!email) {
            setError("Please enter your registered email.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/forgot-password", {
                email: email.trim(),
            });

            const data = response.data;

            if (!data?.success) {
                setError(
                    data?.message ||
                        data?.detail ||
                        "Account verification failed."
                );
                return;
            }

            setSuccess("Account verified. Create a new password.");
            setMode("reset");
        } catch (err) {
            console.error("Forgot password error:", err);

            setError(
                err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword() {
        clearMessages();

        if (!newPassword) {
            setError("Please enter a new password.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/reset-password", {
                email: email.trim(),
                new_password: newPassword,
            });

            const data = response.data;

            if (!data?.success) {
                setError(
                    data?.message ||
                        data?.detail ||
                        "Password reset failed."
                );
                return;
            }

            setSuccess("Password reset successfully. You can now login.");
            setPassword("");
            setNewPassword("");
            setShowNewPassword(false);

            setTimeout(() => {
                setMode("login");
                setSuccess("");
            }, 1800);
        } catch (err) {
            console.error("Reset password error:", err);

            setError(
                err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(event, action) {
        if (event.key === "Enter" && !loading) {
            action();
        }
    }

    const isLogin = mode === "login";
    const isForgot = mode === "forgot";
    const isReset = mode === "reset";

    return (
        <main className="login-container">
            <div className="login-grid"></div>
            <div className="login-orb login-orb-one"></div>
            <div className="login-orb login-orb-two"></div>

            <button
                type="button"
                className="login-home-button"
                onClick={() => navigate("/")}
                aria-label="Back to VisionInspect home"
            >
                <ArrowLeft size={16} />
                <span>Back to home</span>
            </button>

            <section className="login-shell">
                <div className="login-showcase">
                    <div className="showcase-topline">
                        <div className="brand-mark">
                            <ShieldCheck size={23} strokeWidth={2.1} />
                        </div>

                        <div>
                            <div className="brand-name">VisionInspect</div>
                            <div className="brand-tagline">
                                AI POWERED INSPECTION
                            </div>
                        </div>
                    </div>

                    <div className="showcase-copy">
                        <span className="showcase-label">
                            <span className="live-dot"></span>
                            INTELLIGENT QUALITY PLATFORM
                        </span>

                        <h1>
                            Inspect smarter.
                            <br />
                            <span>Decide faster.</span>
                        </h1>

                        <p>
                            A secure AI workspace for automated product
                            inspection, defect detection, quality decisions,
                            and inspection reporting.
                        </p>
                    </div>

                    <div className="showcase-panel">
                        <div className="panel-header">
                            <div>
                                <span className="panel-kicker">
                                    INSPECTION ENGINE
                                </span>
                                <strong>System operational</strong>
                            </div>

                            <div className="panel-status">
                                <Activity size={15} />
                                ONLINE
                            </div>
                        </div>

                        <div className="inspection-visual">
                            <div className="scan-frame">
                                <span className="corner top-left"></span>
                                <span className="corner top-right"></span>
                                <span className="corner bottom-left"></span>
                                <span className="corner bottom-right"></span>

                                <div className="scan-target">
                                    <ScanLine size={30} />
                                </div>

                                <div className="scan-line"></div>
                            </div>

                            <div className="visual-chip chip-one">
                                <Cpu size={14} />
                                <span>ResNet18 AI</span>
                            </div>

                            <div className="visual-chip chip-two">
                                <CheckCircle2 size={14} />
                                <span>Quality check</span>
                            </div>
                        </div>

                        <div className="showcase-stats">
                            <div>
                                <strong>15+</strong>
                                <span>Categories</span>
                            </div>
                            <div>
                                <strong>AI</strong>
                                <span>Auto classification</span>
                            </div>
                            <div>
                                <strong>PDF</strong>
                                <span>Instant reports</span>
                            </div>
                        </div>
                    </div>

                    <div className="showcase-features">
                        <div>
                            <CheckCircle2 size={15} />
                            <span>Category-aware AI inspection</span>
                        </div>
                        <div>
                            <CheckCircle2 size={15} />
                            <span>Secure role-based workspaces</span>
                        </div>
                        <div>
                            <CheckCircle2 size={15} />
                            <span>Centralized inspection history</span>
                        </div>
                    </div>
                </div>

                <div className="login-card">
                    <div className="login-card-header">
                        <div className="secure-icon">
                            <LockKeyhole size={18} />
                        </div>

                        <div>
                            <span className="secure-eyebrow">
                                SECURE WORKSPACE
                            </span>
                            <span className="secure-status">
                                Protected access
                            </span>
                        </div>
                    </div>

                    {isLogin && (
                        <>
                            <div className="login-heading">
                                <span className="login-label">WELCOME BACK</span>

                                <h2>
                                    Sign in to your
                                    <span> workspace.</span>
                                </h2>

                                <p>
                                    Access your inspection dashboard and
                                    quality intelligence tools.
                                </p>
                            </div>

                            <div className="login-form">
                                <div className="input-group">
                                    <label htmlFor="login-email">EMAIL</label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        autoComplete="email"
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        onKeyDown={(event) =>
                                            handleKeyDown(
                                                event,
                                                handleLogin
                                            )
                                        }
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="login-password">
                                        PASSWORD
                                    </label>

                                    <div className="password-field">
                                        <input
                                            id="login-password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter your password"
                                            value={password}
                                            autoComplete="current-password"
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            onKeyDown={(event) =>
                                                handleKeyDown(
                                                    event,
                                                    handleLogin
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowPassword(
                                                    (visible) => !visible
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-meta">
                                    <span className="field-hint">
                                        <LockKeyhole size={12} />
                                        Secure authentication
                                    </span>

                                    <button
                                        type="button"
                                        className="forgot-password"
                                        onClick={() => switchMode("forgot")}
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <div className="input-group">
                                    <label htmlFor="workspace-role">
                                        WORKSPACE ROLE
                                    </label>

                                    <div className="select-field">
                                        <Factory size={16} />

                                        <select
                                            id="workspace-role"
                                            value={role}
                                            onChange={(event) =>
                                                setRole(event.target.value)
                                            }
                                        >
                                            <option>
                                                Quality Engineer
                                            </option>
                                            <option>
                                                Factory Supervisor
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {error && (
                                    <div
                                        className="login-error"
                                        role="alert"
                                    >
                                        <span>!</span>
                                        <p>{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="login-success">
                                        <CheckCircle2 size={16} />
                                        <p>{success}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="login-button"
                                    onClick={handleLogin}
                                    disabled={loading}
                                >
                                    <span>
                                        {loading
                                            ? "Signing in..."
                                            : "Enter Workspace"}
                                    </span>
                                    <span className="login-arrow">
                                        <ArrowRight size={20} />
                                    </span>
                                </button>
                            </div>
                        </>
                    )}

                    {isForgot && (
                        <>
                            <div className="login-heading">
                                <span className="login-label">
                                    ACCOUNT RECOVERY
                                </span>

                                <h2>
                                    Verify your
                                    <span> account.</span>
                                </h2>

                                <p>
                                    Enter your registered email to continue
                                    with password recovery.
                                </p>
                            </div>

                            <div className="login-form">
                                <div className="input-group">
                                    <label htmlFor="recovery-email">
                                        REGISTERED EMAIL
                                    </label>
                                    <input
                                        id="recovery-email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        autoComplete="email"
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        onKeyDown={(event) =>
                                            handleKeyDown(
                                                event,
                                                handleForgotPassword
                                            )
                                        }
                                    />
                                </div>

                                {error && (
                                    <div
                                        className="login-error"
                                        role="alert"
                                    >
                                        <span>!</span>
                                        <p>{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="login-success">
                                        <CheckCircle2 size={16} />
                                        <p>{success}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="login-button"
                                    onClick={handleForgotPassword}
                                    disabled={loading}
                                >
                                    <span>
                                        {loading
                                            ? "Verifying..."
                                            : "Verify Account"}
                                    </span>
                                    <span className="login-arrow">
                                        <ArrowRight size={20} />
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="back-login-button"
                                    onClick={() => switchMode("login")}
                                >
                                    <ArrowLeft size={15} />
                                    Back to login
                                </button>
                            </div>
                        </>
                    )}

                    {isReset && (
                        <>
                            <div className="login-heading">
                                <span className="login-label">
                                    PASSWORD RECOVERY
                                </span>

                                <h2>
                                    Create a new
                                    <span> password.</span>
                                </h2>

                                <p>
                                    Choose a new password for your VisionInspect
                                    account.
                                </p>
                            </div>

                            <div className="login-form">
                                <div className="input-group">
                                    <label htmlFor="new-password">
                                        NEW PASSWORD
                                    </label>

                                    <div className="password-field">
                                        <input
                                            id="new-password"
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            autoComplete="new-password"
                                            onChange={(event) =>
                                                setNewPassword(
                                                    event.target.value
                                                )
                                            }
                                            onKeyDown={(event) =>
                                                handleKeyDown(
                                                    event,
                                                    handleResetPassword
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowNewPassword(
                                                    (visible) => !visible
                                                )
                                            }
                                            aria-label={
                                                showNewPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showNewPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="password-rule">
                                    <span className="rule-dot"></span>
                                    Minimum 6 characters
                                </div>

                                {error && (
                                    <div
                                        className="login-error"
                                        role="alert"
                                    >
                                        <span>!</span>
                                        <p>{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="login-success">
                                        <CheckCircle2 size={16} />
                                        <p>{success}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="login-button"
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                >
                                    <span>
                                        {loading
                                            ? "Resetting..."
                                            : "Reset Password"}
                                    </span>
                                    <span className="login-arrow">
                                        <ArrowRight size={20} />
                                    </span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="login-footer">
                        <span className="status-dot"></span>
                        <span>VISIONINSPECT AI</span>
                        <span className="footer-divider">•</span>
                        <span>SECURE ACCESS</span>
                    </div>
                </div>
            </section>

            <div className="login-bottom-note">
                <span>
                    <ShieldCheck size={13} />
                    Protected industrial quality workspace
                </span>
                <span className="bottom-separator">/</span>
                <span>AI INSPECTION PLATFORM</span>
            </div>
        </main>
    );
}

export default Login;
