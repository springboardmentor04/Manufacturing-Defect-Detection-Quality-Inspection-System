import { useEffect, useState } from "react";

export default function Sidebar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const role = user?.role;

  const isSupervisor = role === "FACTORY_SUPERVISOR";

  const qualityItems = [
    {
      label: "Dashboard",
      icon: "📊",
      target: "dashboard",
    },
    {
      label: "Inspections",
      icon: "🔍",
      target: "inspections",
    },
    {
      label: "Defect Trends",
      icon: "📈",
      target: "defect-trends",
    },
    {
      label: "Reports",
      icon: "📋",
      target: "reports",
    },
  ];

  const supervisorItems = [
    {
      label: "Production Overview",
      icon: "📊",
      target: "production-overview",
    },
    {
      label: "Production Monitoring",
      icon: "🏭",
      target: "production-monitoring",
    },
    {
      label: "Inspection Overview",
      icon: "🔍",
      target: "inspection-overview",
    },
    {
      label: "Defect Analytics",
      icon: "📈",
      target: "defect-analytics",
    },
    {
      label: "Factory Status",
      icon: "⚙️",
      target: "factory-status",
    },
  ];

  const menuItems = isSupervisor
    ? supervisorItems
    : qualityItems;

  // ==========================================
  // SCROLL TO SECTION
  // ==========================================

  const scrollToSection = (target) => {
    const element = document.getElementById(target);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      console.warn(`Section not found: ${target}`);
    }
  };

  // ==========================================
  // SCROLL PAGE UP
  // ==========================================

  const scrollUp = () => {
    window.scrollBy({
      top: -600,
      behavior: "smooth",
    });
  };

  // ==========================================
  // SCROLL PAGE DOWN
  // ==========================================

  const scrollDown = () => {
    window.scrollBy({
      top: 600,
      behavior: "smooth",
    });
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#050816] p-6 text-white">

      {/* ======================================
          LOGO
      ====================================== */}

      <div className="mb-8">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
            👁️
          </div>

          <div>

            <h1 className="text-xl font-bold">
              VisionInspect
              <span className="text-cyan-400">
                AI
              </span>
            </h1>

            <p className="text-xs text-slate-500">
              AI Visual Inspection
            </p>

          </div>

        </div>

      </div>


      {/* ======================================
          USER
      ====================================== */}

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

        <p className="font-semibold">
          {user?.full_name || "User"}
        </p>

        <p className="mt-1 truncate text-sm text-slate-500">
          {user?.email || ""}
        </p>

        <span className="mt-3 inline-block rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-400">

          {isSupervisor
            ? "FACTORY SUPERVISOR"
            : "QUALITY ENGINEER"}

        </span>

      </div>


      {/* ======================================
          NAVIGATION
      ====================================== */}

      <nav className="flex-1 overflow-y-auto pr-1">

        <div className="space-y-2">

          {menuItems.map((item) => (

            <button
              key={item.target}
              onClick={() =>
                scrollToSection(item.target)
              }
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-slate-400 transition duration-200 hover:bg-cyan-400/10 hover:text-cyan-400"
            >

              <span className="text-lg">
                {item.icon}
              </span>

              <span className="text-sm font-medium">
                {item.label}
              </span>

            </button>

          ))}

        </div>

      </nav>


      {/* ======================================
          SCROLL BUTTONS
      ====================================== */}

      <div className="mt-4 flex gap-2">

        <button
          onClick={scrollUp}
          className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-2 text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-400"
          title="Scroll Up"
        >
          ↑
        </button>

        <button
          onClick={scrollDown}
          className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-2 text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-400"
          title="Scroll Down"
        >
          ↓
        </button>

      </div>


      {/* ======================================
          LOGOUT
      ====================================== */}

      <button
        onClick={logout}
        className="mt-4 flex items-center gap-4 border-t border-white/10 pt-5 text-red-400 transition hover:text-red-300"
      >

        <span>
          🚪
        </span>

        <span className="font-medium">
          Logout
        </span>

      </button>

    </aside>
  );
}