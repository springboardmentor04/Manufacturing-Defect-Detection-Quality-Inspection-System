import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import ThreeDBackground from "../components/3DBackground";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // Save JWT token
      localStorage.setItem("access_token", data.access_token);

      // Save user information
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Login successful!");
      console.log("User:", data.user);
      console.log("Role:", data.user.role);

      if (data.user.role === "QUALITY_ENGINEER") {
        navigate("/quality-dashboard");
      } else if (data.user.role === "FACTORY_SUPERVISOR") {
        navigate("/supervisor-dashboard");
      }
    } catch (error) {
      console.error("Login Error:", error.message);
      alert(error.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* 3D Background */}
      <ThreeDBackground />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/70" />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              VisionInspect<span className="text-cyan-400">AI</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Intelligent Manufacturing Inspection Platform
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to access your inspection dashboard
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" autoComplete="off">
              {/* Email */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-12 pr-4 outline-none transition focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-12 pr-12 outline-none transition focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-slate-400">
                Don't have an account?
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="ml-2 font-medium text-cyan-400 hover:underline"
                >
                  Register
                </button>
              </div>

              {/* Login Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                Sign In
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}