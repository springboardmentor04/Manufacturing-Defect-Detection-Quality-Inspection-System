export default function Footer() {
  return (
    <footer className="relative overflow-hidden mt-8 border-t border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white">

      {/* Background Glow */}
      <div className="absolute -top-10 left-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl"></div>
      <div className="absolute -bottom-10 right-10 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-8 py-6">

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

          {/* Left */}

          <div>

            <div className="flex items-center gap-3">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg text-xl">

                🤖

              </div>

              <div>

                <h2 className="text-xl font-bold tracking-wide">

                  VisionInspect AI

                </h2>

                <p className="text-sm text-cyan-300">

                  Intelligent Quality Inspection Platform

                </p>

              </div>

            </div>

          </div>

          {/* Center */}

          <div className="text-center">

            <p className="text-sm text-slate-300">

              AI Powered Visual Inspection • Real-Time Defect Detection • Manufacturing Analytics

            </p>

            <p className="mt-2 text-xs text-slate-400">

              © {new Date().getFullYear()} VisionInspect AI. All Rights Reserved.

            </p>

          </div>

          {/* Right */}

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2 rounded-full bg-green-500/20 border border-green-400/20 px-4 py-2">

              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>

              <span className="text-sm font-medium text-green-300">

                System Online

              </span>

            </div>

          </div>

        </div>

        {/* Bottom Line */}

        <div className="mt-6 border-t border-white/10 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">

          <p className="text-xs text-slate-500">

            Version 1.0 • Enterprise Edition

          </p>

          <p className="text-xs text-slate-500">

            Built with ❤️ using React, FastAPI & AI

          </p>

        </div>

      </div>

    </footer>
  );
}