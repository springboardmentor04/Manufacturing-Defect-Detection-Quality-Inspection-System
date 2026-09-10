import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Factory, Info, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound, X } from "lucide-react";
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

  const resetMutation = trpc.auth.resetPassword.useMutation();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetState, setResetState] = useState("idle");
  const [resetMsg, setResetMsg] = useState("");

  const forgotPassword = () => {
    setResetEmail(loginForm.email || "");
    setResetPasswordVal("");
    setResetState("idle");
    setResetMsg("");
    setShowResetModal(true);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetPasswordVal || resetPasswordVal.length < 8) {
      setResetState("error");
      setResetMsg("Please enter a valid email and new password (min 8 characters).");
      return;
    }
    setResetState("loading");
    try {
      const res = await resetMutation.mutateAsync({ email: resetEmail, newPassword: resetPasswordVal });
      setResetState("success");
      setResetMsg(res.message || "Password updated! You can now log in.");
      setTimeout(() => {
        setShowResetModal(false);
        setLoginForm(curr => ({ ...curr, email: resetEmail, password: resetPasswordVal }));
      }, 1500);
    } catch (err) {
      setResetState("error");
      setResetMsg(err?.message || "Failed to reset password.");
    }
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

      <section className="vi-auth-main" aria-labelledby={isSignUp ? "signup-auth-title" : "login-auth-title"}>
        <div className="vi-auth-wrap">
          <Link className="vi-back vi-auth-back" href={LANDING_PATH}><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
          <div className="vi-auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" role="tab" aria-selected={!isSignUp} className={!isSignUp ? "active" : ""} onClick={() => switchMode("login")}>Log in</button>
            <button type="button" role="tab" aria-selected={isSignUp} className={isSignUp ? "active" : ""} onClick={() => switchMode("signup")}>Sign up</button>
          </div>

          {!isSignUp ? (
            <div className="vi-auth-panel">
              <p className="vi-eyebrow vi-mono">Inspection access</p>
              <h2 id="login-auth-title">Sign in</h2>
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
              <h2 id="signup-auth-title">Create your account</h2>
              <p className="vi-auth-sub">Start exploring the inspection demonstration today.</p>
              <form noValidate onSubmit={submitSignUp}>
                <div className="vi-auth-field"><label htmlFor="signup-name">Full name</label><div className="vi-auth-input"><UserRound size={17} aria-hidden="true" /><input id="signup-name" value={signUpForm.name} onChange={updateSignUp("name")} placeholder="Your name" autoComplete="name" aria-invalid={Boolean(signUpErrors.name)} /></div>{signUpErrors.name && <span>{signUpErrors.name}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-email">Work email</label><div className="vi-auth-input"><Mail size={17} aria-hidden="true" /><input id="signup-email" type="email" value={signUpForm.email} onChange={updateSignUp("email")} placeholder="you@company.com" autoComplete="email" aria-invalid={Boolean(signUpErrors.email)} /></div>{signUpErrors.email && <span>{signUpErrors.email}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-password">Password</label><div className="vi-auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="signup-password" type={showSignUpPassword ? "text" : "password"} value={signUpForm.password} onChange={updateSignUp("password")} placeholder="At least 8 characters" autoComplete="new-password" aria-invalid={Boolean(signUpErrors.password)} /><button type="button" className="vi-auth-eye" onClick={() => setShowSignUpPassword((visible) => !visible)} aria-label={showSignUpPassword ? "Hide password" : "Show password"}>{showSignUpPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{signUpErrors.password && <span>{signUpErrors.password}</span>}</div>
                <div className="vi-auth-field"><label htmlFor="signup-confirm">Confirm password</label><div className="vi-auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} value={signUpForm.confirmPassword} onChange={updateSignUp("confirmPassword")} placeholder="Repeat your password" autoComplete="new-password" aria-invalid={Boolean(signUpErrors.confirmPassword)} /><button type="button" className="vi-auth-eye" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{signUpErrors.confirmPassword && <span>{signUpErrors.confirmPassword}</span>}</div>
                <fieldset className="vi-role"><legend>I am a</legend><div><button type="button" className={signUpForm.role === "quality-engineer" ? "active" : ""} onClick={() => setSignUpForm((curr) => ({ ...curr, role: "quality-engineer" }))}><ShieldCheck size={18} />Quality Engineer</button><button type="button" className={signUpForm.role === "factory-supervisor" ? "active" : ""} onClick={() => setSignUpForm((curr) => ({ ...curr, role: "factory-supervisor" }))}><Factory size={18} />Factory Supervisor</button></div>{signUpErrors.role && <span>{signUpErrors.role}</span>}</fieldset>
                <AuthMessage state={state} message={message} />
                <button className="vi-auth-submit" type="submit" disabled={state === "loading"}>{state === "loading" ? <><LoaderCircle size={17} className="animate-spin" /> Preparing access</> : <>Create account <ArrowRight size={17} /></>}</button>
              </form>
              <p className="vi-auth-switch">Already have an account? <button type="button" onClick={() => switchMode("login")}>Log in</button></p>
            </div>
          )}
          <p className="vi-auth-note"><Info size={14} aria-hidden="true" /> Your VisionInspect account and role permissions are securely managed.</p>
        </div>
      </section>
      {showResetModal && (
        <div className="vi-modal-overlay" onClick={() => setShowResetModal(false)} role="dialog" aria-modal="true">
          <div className="vi-auth-panel" style={{ width: "100%", maxWidth: "460px", padding: "32px", borderRadius: "16px", background: "var(--bg-surface, #0f172a)", border: "1px solid var(--border-color, rgba(255,255,255,0.1))", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="vi-settings-close-btn" onClick={() => setShowResetModal(false)} style={{ position: "absolute", top: "20px", right: "20px" }} aria-label="Close modal"><X size={18} /></button>
            <p className="vi-eyebrow vi-mono" style={{ color: "#38bdf8", marginBottom: "6px" }}>Account Recovery</p>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>Reset your password</h2>
            <p className="vi-auth-sub" style={{ marginBottom: "24px" }}>Enter your registered work email and choose a new secure password.</p>
            <form onSubmit={submitReset}>
              <div className="vi-auth-field" style={{ marginBottom: "18px" }}>
                <label htmlFor="reset-email">Work email</label>
                <div className="vi-auth-input">
                  <Mail size={17} aria-hidden="true" />
                  <input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
              </div>
              <div className="vi-auth-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="reset-password">New password</label>
                <div className="vi-auth-input">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input id="reset-password" type="password" value={resetPasswordVal} onChange={(e) => setResetPasswordVal(e.target.value)} placeholder="At least 8 characters" required />
                </div>
              </div>
              <AuthMessage state={resetState} message={resetMsg} />
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="vi-auth-submit" onClick={() => setShowResetModal(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-primary, #f8fafc)" }}>Cancel</button>
                <button type="submit" className="vi-auth-submit" disabled={resetState === "loading"}>
                  {resetState === "loading" ? <><LoaderCircle size={17} className="animate-spin" /> Updating...</> : <>Save new password <ArrowRight size={17} /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function AuthMessage({ state, message }) {
  if (!message) return null;
  return <p className={`vi-auth-alert ${state}`} role="status">{state === "success" && <CheckCircle2 size={15} aria-hidden="true" />}{message}</p>;
}
