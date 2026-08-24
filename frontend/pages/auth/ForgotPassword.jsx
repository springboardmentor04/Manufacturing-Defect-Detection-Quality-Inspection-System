import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Factory,
  ShieldQuestion,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { authService } from "../../services/authService";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020817]">

      {/* Background */}

      <div className="absolute inset-0">

        <img
          src="/images/factory-bg.jpg"
          alt="Factory"
          className="w-full h-full object-cover opacity-20"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-cyan-950/90" />

      </div>

      {/* Glow */}

      <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute bottom-16 right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">

        <div className="grid w-full max-w-6xl lg:grid-cols-2 gap-10 items-center">

          {/* Left Section */}

          <div className="hidden lg:block">

            <div className="flex items-center gap-3 mb-8">

              <Factory
                size={42}
                className="text-cyan-400"
              />

              <div>

                <h1 className="text-4xl font-bold text-white">
                  VisionInspect AI
                </h1>

                <p className="text-cyan-300">
                  Smart Industrial Defect Detection
                </p>

              </div>

            </div>

            <h2 className="text-5xl font-bold text-white leading-tight">

              Secure Password Recovery

            </h2>

            <p className="mt-6 text-lg text-gray-300 leading-8">

              Enter your registered email address to receive a secure
              password reset link and regain access to your VisionInspect
              AI account.

            </p>

            <div className="mt-10 space-y-5">

              <Feature
                icon={<Mail />}
                text="Email Verification"
              />

              <Feature
                icon={<ShieldCheck />}
                text="Secure Password Reset"
              />

              <Feature
                icon={<Factory />}
                text="Industrial AI Platform"
              />

            </div>

          </div>

          {/* Forgot Password Card */}

          <div className="rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl shadow-2xl p-10">

            <div className="text-center mb-8">

              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">

                <ShieldQuestion
                  size={42}
                  className="text-cyan-400"
                />

              </div>

              <h2 className="mt-5 text-3xl font-bold text-white">
                Forgot Password
              </h2>

              <p className="mt-2 text-gray-400">

                Reset your VisionInspect AI account password

              </p>

            </div>

            {sent ? (

              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center">

                <p className="text-green-400 font-semibold">

                  Reset Link Sent Successfully

                </p>

                <p className="text-gray-300 text-sm mt-3">

                  If an account exists for

                  <span className="font-semibold text-white">

                    {" "}
                    {email}

                  </span>

                  , a password reset link has been sent to your email.

                </p>

              </div>

            ) : (

              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  placeholder="you@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {error && (

                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">

                    <p className="text-red-400 text-sm">

                      {error}

                    </p>

                  </div>

                )}

                <Button
                  type="submit"
                  loading={loading}
                  style={{ width: "100%" }}
                >

                  Send Reset Link

                </Button>

              </form>

            )}

            <div className="mt-8 text-center">

              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 font-semibold"
              >

                ← Back to Sign In

              </Link>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-4">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">

        {icon}

      </div>

      <span className="text-lg text-gray-300">

        {text}

      </span>

    </div>
  );
}