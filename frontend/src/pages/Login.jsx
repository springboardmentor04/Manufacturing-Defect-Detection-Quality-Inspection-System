<<<<<<< HEAD
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Factory, Info, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import BrandMark from "@/components/BrandMark";
import { trpc } from "@/lib/trpc";
import { LANDING_PATH, validateLocalSignIn, validateLocalSignUp } from "@/lib/localAuth";

const blankLogin = { email: "", password: "" };
const blankSignUp = { name: "", email: "", password: "", confirmPassword: "", role: "quality-engineer" };

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(blankLogin);
  const [signUpForm, setSignUpForm] = useState(blankSignUp);
  const [loginErrors, setLoginErrors] = useState({});
  const [signUpErrors, setSignUpErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setState("idle");
    setMessage("");
  };

  const updateLogin = (field) => (event) => {
    setLoginForm((current) => ({ ...current, [field]: event.target.value }));
    if (loginErrors[field]) setLoginErrors((current) => ({ ...current, [field]: "" }));
    if (state !== "idle") { setState("idle"); setMessage(""); }
  };

  const updateSignUp = (field) => (event) => {
    setSignUpForm((current) => ({ ...current, [field]: event.target.value }));
    if (signUpErrors[field]) setSignUpErrors((current) => ({ ...current, [field]: "" }));
    if (state !== "idle") { setState("idle"); setMessage(""); }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    const { errors, cleanEmail } = validateLocalSignIn(loginForm);
    setLoginErrors(errors);
    if (Object.keys(errors).length) return;
    setState("loading");
    try {
      await loginMutation.mutateAsync({ email: cleanEmail, password: loginForm.password });
      await utils.auth.me.invalidate();
      setState("success");
      setMessage("Signed in successfully. Opening your protected workspace.");
      window.setTimeout(() => setLocation("/workspace"), 450);
    } catch {
      setState("error");
      setMessage("Email or password is incorrect.");
    }
  };

  const submitSignUp = async (event) => {
    event.preventDefault();
    const { errors, cleanEmail } = validateLocalSignUp(signUpForm);
    setSignUpErrors(errors);
    if (Object.keys(errors).length) return;
    setState("loading");
    try {
      await registerMutation.mutateAsync({
        name: signUpForm.name,
        email: cleanEmail,
        password: signUpForm.password,
        role: signUpForm.role,
      });
      await utils.auth.me.invalidate();
      setState("success");
      setMessage("Account created successfully. Opening your protected workspace.");
      window.setTimeout(() => setLocation("/workspace"), 450);
    } catch (error) {
      setState("error");
      const serverMessage = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : null;
      setMessage(serverMessage || "We could not create this account. Please try again.");
    }
  };

  const forgotPassword = () => {
    setState("info");
    setMessage("Password recovery will be available once database-backed authentication is connected.");
  };

  const isSignUp = mode === "signup";

  return (
    <main className="vi-auth">
      <aside className="vi-auth-side">
        <BrandMark inverse />
        <div className="vi-auth-side-copy">
          <p className="vi-eyebrow vi-mono">Evidence-led inspection</p>
          <h1>Welcome to the <em>quality floor.</em></h1>
          <ul>
            <li><CheckCircle2 size={16} aria-hidden="true" /> YOLO and U-Net inspection context</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Human review at the decision point</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Guided inspection demonstration</li>
          </ul>
        </div>
        <span className="vi-auth-side-note">VisionInspect AI · secure access surface</span>
      </aside>

      <section className="vi-auth-main" aria-labelledby="auth-title">
        <div className="vi-auth-wrap">
          <Link className="vi-back vi-auth-back" href={LANDING_PATH}><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
          <div className="vi-auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" role="tab" aria-selected={!isSignUp} className={!isSignUp ? "active" : ""} onClick={() => switchMode("login")}>Log in</button>
            <button type="button" role="tab" aria-selected={isSignUp} className={isSignUp ? "active" : ""} onClick={() => switchMode("signup")}>Sign up</button>
          </div>

          {!isSignUp ? (
            <div className="vi-auth-panel">
              <p className="vi-eyebrow vi-mono">Inspection access</p>
              <h2 id="auth-title">Sign in</h2>
              <p className="vi-auth-sub">Access your inspection workspace.</p>
              <form noValidate onSubmit={submitLogin}>
                <div className="vi-auth-field"><label htmlFor="login-email">Work email</label><div className="vi-auth-input"><Mail size={17} aria-hidden="true" /><input id="login-email" type="email" value={loginForm.email} onChange={updateLogin("email")} placeholder="you@company.com" autoComplete="email" aria-invalid={Boolean(loginErrors.email)} /></div>{loginErrors.email && <span>{loginErrors.email}</span>}</div>
                <div className="vi-auth-field"><div className="vi-auth-label"><label htmlFor="login-password">Password</label><button type="button" onClick={forgotPassword}>Forgot password?</button></div><div className="vi-auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="login-password" type={showLoginPassword ? "text" : "password"} value={loginForm.password} onChange={updateLogin("password")} placeholder="At least 8 characters" autoComplete="current-password" aria-invalid={Boolean(loginErrors.password)} /><button type="button" className="vi-auth-eye" onClick={() => setShowLoginPassword((visible) => !visible)} aria-label={showLoginPassword ? "Hide password" : "Show password"}>{showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{loginErrors.password && <span>{loginErrors.password}</span>}</div>
                <AuthMessage state={state} message={message} />
                <button className="vi-auth-submit" type="submit" disabled={state === "loading"}>{state === "loading" ? <><LoaderCircle size={17} className="animate-spin" /> Preparing access</> : <>Sign in <ArrowRight size={17} /></>}</button>
              </form>
              <p className="vi-auth-switch">New to VisionInspect? <button type="button" onClick={() => switchMode("signup")}>Create an account</button></p>
            </div>
          ) : (
            <div className="vi-auth-panel">
              <p className="vi-eyebrow vi-mono">Create account access</p>
              <h2 id="auth-title">Create your account</h2>
              <p className="vi-auth-sub">Start exploring the inspection demonstration today.</p>
              <form noValidate onSubmit={submitSignUp}>
                <div className="vi-auth-field"><label htmlFor="signup-name">Full name</label><div className="vi-auth-input"><UserRound size={17} aria-hidden="true" /><input id="signup-name" value={signUpForm.name} onChange={updateSignUp("name")} placeholder="Your name" autoComplete="name" aria-invalid={Boolean(signUpErrors.name)} /></div>{signUpErrors.name && <span>{signUpErrors.name}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-email">Work email</label><div className="vi-auth-input"><Mail size={17} aria-hidden="true" /><input id="signup-email" type="email" value={signUpForm.email} onChange={updateSignUp("email")} placeholder="you@company.com" autoComplete="email" aria-invalid={Boolean(signUpErrors.email)} /></div>{signUpErrors.email && <span>{signUpErrors.email}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-password">Password</label><div className="vi-auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="signup-password" type={showSignUpPassword ? "text" : "password"} value={signUpForm.password} onChange={updateSignUp("password")} placeholder="At least 8 characters" autoComplete="new-password" aria-invalid={Boolean(signUpErrors.password)} /><button type="button" className="vi-auth-eye" onClick={() => setShowSignUpPassword((visible) => !visible)} aria-label={showSignUpPassword ? "Hide password" : "Show password"}>{showSignUpPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{signUpErrors.password && <span>{signUpErrors.password}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-confirm">Confirm password</label><div className="vi-auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} value={signUpForm.confirmPassword} onChange={updateSignUp("confirmPassword")} placeholder="Repeat your password" autoComplete="new-password" aria-invalid={Boolean(signUpErrors.confirmPassword)} /><button type="button" className="vi-auth-eye" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{signUpErrors.confirmPassword && <span>{signUpErrors.confirmPassword}</span>}</div>
                <fieldset className="vi-role"><legend>I am a</legend><div><button type="button" className={signUpForm.role === "quality-engineer" ? "active" : ""} onClick={() => updateSignUp("role")({ target: { value: "quality-engineer" } })}><ShieldCheck size={18} />Quality Engineer</button><button type="button" className={signUpForm.role === "factory-supervisor" ? "active" : ""} onClick={() => updateSignUp("role")({ target: { value: "factory-supervisor" } })}><Factory size={18} />Factory Supervisor</button></div>{signUpErrors.role && <span>{signUpErrors.role}</span>}</fieldset>
                <AuthMessage state={state} message={message} />
                <button className="vi-auth-submit" type="submit" disabled={state === "loading"}>{state === "loading" ? <><LoaderCircle size={17} className="animate-spin" /> Preparing access</> : <>Create account <ArrowRight size={17} /></>}</button>
              </form>
              <p className="vi-auth-switch">Already have an account? <button type="button" onClick={() => switchMode("login")}>Log in</button></p>
            </div>
          )}
          <p className="vi-auth-note"><Info size={14} aria-hidden="true" /> Your VisionInspect account and role permissions are securely managed.</p>
        </div>
      </section>
    </main>
  );
}

function AuthMessage({ state, message }) {
  if (!message) return null;
  return <p className={`vi-auth-alert ${state}`} role="status">{state === "success" && <CheckCircle2 size={15} aria-hidden="true" />}{message}</p>;
}
=======
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();

    if (!email || !password || !role) {
      alert("Please enter email, password and select your role.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email,
        password: password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      const user = response.data.user;

      // Check that selected role matches registered role
      if (user.role !== role) {
        alert(
          `Role mismatch.\n\nThis account is registered as: ${user.role}`
        );
        setLoading(false);
        return;
      }

      // Save login information
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(user));

      alert(`Welcome ${user.name}!`);

      // ROLE-BASED REDIRECTION
      if (user.role === "Factory Supervisor") {
        navigate("/supervisor");
      } else if (user.role === "Quality Engineer") {
        navigate("/dashboard");
      } else {
        alert("Unknown user role.");
      }

    } catch (error) {
      console.error("Login Error:", error);

      if (error.response) {
        console.log("STATUS:", error.response.status);
        console.log("BACKEND ERROR:", error.response.data);

        alert(
          "Login failed:\n\n" +
          JSON.stringify(error.response.data, null, 2)
        );
      } else {
        alert("Cannot connect to backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* LEFT SIDE */}
        <div className="login-left">

          <div className="brand-icon">🔍</div>

          <h1>VisionInspectAI</h1>

          <h2>
            Smart Manufacturing
            <br />
            Quality Inspection
          </h2>

          <p>
            AI-powered visual inspection for reliable and efficient
            manufacturing quality control.
          </p>

          <div className="login-features">
            <p>✓ Automated Defect Detection</p>
            <p>✓ Quality Monitoring</p>
            <p>✓ Production Analytics</p>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="login-card">

          <h2>Welcome Back</h2>

          <p className="login-subtitle">
            Sign in to access your inspection workspace
          </p>

          <form onSubmit={loginUser}>

            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Select Role</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select your role</option>

              <option value="Quality Engineer">
                Quality Engineer
              </option>

              <option value="Factory Supervisor">
                Factory Supervisor
              </option>
            </select>

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <p className="register-link">
            Don't have an account?{" "}
            <Link to="/register">
              Create Account
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;
>>>>>>> 7a7edc6c580fd78aa1ce9b852e36bf113c983807
