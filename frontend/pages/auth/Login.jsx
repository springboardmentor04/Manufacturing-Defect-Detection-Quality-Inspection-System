import { Link } from "react-router-dom";
import { ShieldCheck, Factory, Cpu } from "lucide-react";
import LoginForm from "../../components/auth/LoginForm";

export default function Login() {
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

      {/* Floating Blur */}

      <div className="absolute top-24 left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute bottom-16 right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">

        <div className="grid w-full max-w-6xl lg:grid-cols-2 gap-10 items-center">

          {/* Left Side */}

          <div className="hidden lg:block">

            <div className="mb-8 flex items-center gap-3">

              <Factory className="text-cyan-400" size={42} />

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
              AI Powered Quality Inspection Platform
            </h2>

            <p className="mt-6 text-gray-300 text-lg leading-8">
              Detect scratches, cracks, dents and manufacturing defects
              using Computer Vision and YOLO AI models in real time.
            </p>

            <div className="mt-10 space-y-5">

              <Feature icon={<ShieldCheck />} text="Secure Authentication" />

              <Feature icon={<Cpu />} text="YOLO AI Detection Engine" />

              <Feature icon={<Factory />} text="Factory Production Monitoring" />

            </div>

          </div>

          {/* Login Card */}

          <div className="rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl shadow-2xl p-10">

            <div className="text-center mb-8">

              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">

                <ShieldCheck
                  className="text-cyan-400"
                  size={42}
                />

              </div>

              <h2 className="mt-5 text-3xl font-bold text-white">
                Welcome Back
              </h2>

              <p className="mt-2 text-gray-400">
                Login to your VisionInspect AI account
              </p>

            </div>

            <LoginForm />

            <div className="mt-8 text-center text-gray-400">

              Don't have an account?

              <Link
                to="/register"
                className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Register
              </Link>

            </div>

            <div className="mt-3 text-center">

              <Link
                to="/forgot-password"
                className="text-sm text-gray-500 hover:text-cyan-300"
              >
                Forgot Password?
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