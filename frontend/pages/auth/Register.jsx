import { Link } from "react-router-dom";
import { Factory, UserPlus, ShieldCheck } from "lucide-react";
import RegisterForm from "../../components/auth/RegisterForm";

export default function Register() {
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

      {/* Glow Effects */}
      <div className="absolute top-24 left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute bottom-20 right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />

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

              Join Our AI Manufacturing Platform

            </h2>

            <p className="mt-6 text-lg text-gray-300 leading-8">

              Create your account to access intelligent defect detection,
              production analytics, inspection reports, and factory
              monitoring powered by Computer Vision and YOLO AI.

            </p>

            <div className="mt-10 space-y-5">

              <Feature
                icon={<ShieldCheck />}
                text="Secure User Registration"
              />

              <Feature
                icon={<Factory />}
                text="Factory Monitoring Dashboard"
              />

              <Feature
                icon={<UserPlus />}
                text="Engineer & Supervisor Access"
              />

            </div>

          </div>

          {/* Register Card */}

          <div className="rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl shadow-2xl p-10">

            <div className="text-center mb-8">

              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">

                <UserPlus
                  size={42}
                  className="text-cyan-400"
                />

              </div>

              <h2 className="mt-5 text-3xl font-bold text-white">
                Create Account
              </h2>

              <p className="mt-2 text-gray-400">
                Register to access VisionInspect AI
              </p>

            </div>

            <RegisterForm />

            <div className="mt-8 text-center text-gray-400">

              Already have an account?

              <Link
                to="/login"
                className="ml-2 font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Sign In
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