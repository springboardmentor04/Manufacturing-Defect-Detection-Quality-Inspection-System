import { Bell, Search, LogOut, Cpu, CalendarDays } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TITLES = {
  "/qe/dashboard": "Dashboard",
  "/qe/upload": "Upload Image",
  "/qe/history": "Inspection History",
  "/qe/reports": "Reports",
  "/qe/profile": "Profile",

  "/supervisor/dashboard": "Dashboard",
  "/supervisor/analytics": "Analytics",
  "/supervisor/reports": "Reports",
  "/supervisor/users": "Users",
  "/supervisor/profile": "Profile",
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const title =
    TITLES[window.location.pathname] || "Dashboard";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "QE";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200 shadow-sm">

      <div className="flex items-center justify-between px-8 py-4">

        {/* Left */}

        <div>

          <p className="text-xs uppercase tracking-[0.25em] text-cyan-600 font-bold">
            VisionInspect AI
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            {title}
          </h1>

          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">

            <CalendarDays size={16} />

            {today}

          </div>

        </div>

        {/* Right */}

        <div className="flex items-center gap-5">

          {/* Search */}

          <div className="hidden lg:flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3 w-80 hover:bg-slate-200 transition">

            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              type="text"
              placeholder="Search inspections..."
              className="bg-transparent outline-none text-sm w-full"
            />

          </div>

          {/* AI Status */}

          <div className="hidden md:flex items-center gap-3 rounded-2xl bg-green-100 px-4 py-3 border border-green-200">

            <Cpu
              size={18}
              className="text-green-600"
            />

            <div>

              <p className="text-xs text-gray-500">
                AI Engine
              </p>

              <p className="font-semibold text-green-700">
                Online
              </p>

            </div>

            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>

          </div>

          {/* Notification */}

          <button className="relative w-12 h-12 rounded-2xl bg-slate-100 hover:bg-cyan-500 hover:text-white transition">

            <Bell size={20} className="mx-auto" />

            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 animate-ping"></span>

            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500"></span>

          </button>

          {/* User */}

          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 px-3 py-2 hover:shadow-lg transition">

            <div className="text-right">

              <h4 className="font-bold text-slate-900">
                {user?.name || "Quality Engineer"}
              </h4>

              <p className="text-xs text-slate-500">
                {user?.role || "Engineer"}
              </p>

            </div>

            <div className="relative">

              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">

                {initials}

              </div>

              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>

            </div>

          </div>

          {/* Logout */}

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-2xl bg-red-500 hover:bg-red-600 text-white px-5 py-3 shadow-lg transition hover:scale-105"
          >

            <LogOut size={18} />

            Logout

          </button>

        </div>

      </div>

    </header>
  );
}