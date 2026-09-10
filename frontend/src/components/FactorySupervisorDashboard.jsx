import { Activity, AlertTriangle, BarChart3, Bell, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, Eye, Factory, Filter, Gauge, LayoutDashboard, LogOut, Megaphone, Menu, Moon, PanelLeft, RefreshCw, Search, Send, Settings, Tag, Trash2, TrendingUp, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import SettingsModal from "./SettingsModal.jsx";
import { useTheme } from "@/contexts/ThemeContext";
import { generateInspectionsReport } from "../utils/inspectionsreportsgenerator";
import {
  supervisorSections, readFSSidebarExpandedPreference, writeFSSidebarExpandedPreference,
  productionLines, shiftPerformance, overviewKPIs,
  inspectionDateFilters, defectTrendRanges, defectTypeFilters, lineFilters, statusFilters, shiftFilters, severityFilters,
  dailyDefects, defectCategories, defectHeatmap, defectRateTrend, defectRateThreshold,
  paretoDefects, statisticalMetrics, passRateSparkline, confidenceSparkline, yieldSparkline,
  hourlyThroughput, productionAlerts, shiftHandoff,
  formatNumber, getSeverityClass, getHeatmapIntensity,
  getLineOperatingStatus, LINE_IDLE_TIMEOUT_MS
} from "@/lib/factorySupervisorDashboard";

const icons = {
  overview: LayoutDashboard,
  inspections: BarChart3,
  defects: TrendingUp,
  analytics: Gauge,
  monitoring: Activity,
};

const ANNOUNCEMENT_CATEGORIES = [
  { id: "General Notice", label: "General Notice", color: "#27837f" },
  { id: "Maintenance", label: "Maintenance", color: "#fcbe5a" },
  { id: "Line Shutdown", label: "Line Shutdown", color: "#ba4a31" },
  { id: "Shift Notice", label: "Shift Notice", color: "#3b82f6" },
  { id: "Calibration", label: "Calibration", color: "#8b5cf6" },
];

function formatRelativeTime(dateInput) {
  if (!dateInput) return "Just now";
  const d = new Date(dateInput);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60000) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// 48 hours (2 days) lifetime in milliseconds
const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

// Helper for Indian Standard Time (IST - UTC+5:30) date evaluation
function getISTDate(dateInput) {
  if (!dateInput) return new Date();
  const d = new Date(dateInput);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (5.5 * 60 * 60 * 1000));
}

function isBatchInISTDateRange(capturedAt, range = "Last 30 days") {
  if (!capturedAt) return true;
  try {
    const batchIST = getISTDate(capturedAt);
    const nowIST = getISTDate(new Date());

    const batchIso = `${batchIST.getFullYear()}-${String(batchIST.getMonth() + 1).padStart(2, "0")}-${String(batchIST.getDate()).padStart(2, "0")}`;
    const nowIso = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}-${String(nowIST.getDate()).padStart(2, "0")}`;

    if (range === "Today") {
      return batchIso === nowIso;
    }

    const batchMidnight = new Date(batchIST.getFullYear(), batchIST.getMonth(), batchIST.getDate()).getTime();
    const nowMidnight = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate()).getTime();
    const diffDays = Math.floor((nowMidnight - batchMidnight) / (24 * 60 * 60 * 1000));

    if (range === "Last 7 days") {
      return diffDays >= 0 && diffDays < 7;
    }
    if (range === "Last 30 days") {
      return diffDays >= 0 && diffDays < 30;
    }
    return true;
  } catch {
    return true;
  }
}

export default function FactorySupervisorDashboard({ user, onSignOut, isSigningOut }) {
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem("fs_active_tab") || "overview"; } catch { return "overview"; }
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => readFSSidebarExpandedPreference());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const [actionMessage, setActionMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Workspace Emoji & Workspace Name state
  const userKey = user?.openId || user?.id || user?.email || "default";
  const [workspaceEmoji, setWorkspaceEmoji] = useState(() => {
    return localStorage.getItem(`visioninspect_ws_emoji_${userKey}`) || "😃";
  });
  const [workspaceName, setWorkspaceName] = useState(() => {
    const saved = localStorage.getItem(`visioninspect_ws_name_${userKey}`);
    if (saved) return saved.replace(/\s*\.'s Workspace$/, "'s Workspace");
    const cleanName = (user?.name || "").trim().replace(/\s*\.$/, "");
    return cleanName ? `${cleanName}'s Workspace` : "User's Workspace";
  });

  useEffect(() => {
    const handleAvatarChange = (e) => {
      if (e.detail?.emoji !== undefined) {
        setWorkspaceEmoji(e.detail.emoji);
      }
    };
    const handleWsNameChange = (e) => {
      if (e.detail?.name) {
        setWorkspaceName(e.detail.name.replace(/\s*\.'s Workspace$/, "'s Workspace"));
      }
    };
    window.addEventListener("visioninspect_avatar_change", handleAvatarChange);
    window.addEventListener("visioninspect_wsname_change", handleWsNameChange);
    return () => {
      window.removeEventListener("visioninspect_avatar_change", handleAvatarChange);
      window.removeEventListener("visioninspect_wsname_change", handleWsNameChange);
    };
  }, [userKey]);

  useEffect(() => {
    const saved = localStorage.getItem(`visioninspect_ws_name_${userKey}`);
    if (saved) {
      const fixed = saved.replace(/\s*\.'s Workspace$/, "'s Workspace");
      if (fixed !== saved) {
        localStorage.setItem(`visioninspect_ws_name_${userKey}`, fixed);
      }
      setWorkspaceName(fixed);
    } else {
      const cleanName = (user?.name || "").trim().replace(/\s*\.$/, "");
      setWorkspaceName(cleanName ? `${cleanName}'s Workspace` : "User's Workspace");
    }
    const savedEmoji = localStorage.getItem(`visioninspect_ws_emoji_${userKey}`);
    if (savedEmoji) {
      setWorkspaceEmoji(savedEmoji);
    }
  }, [userKey, user?.name]);

  // Filters state
  const [overviewDateRange, setOverviewDateRange] = useState("Last 7 days");
  const [overviewLine, setOverviewLine] = useState("All lines");
  const [inspDateRange, setInspDateRange] = useState("Last 30 days");
  const [inspLine, setInspLine] = useState("All lines");
  const [inspStatus, setInspStatus] = useState("All");
  const [inspSearch, setInspSearch] = useState("");
  const [defectRange, setDefectRange] = useState("7 days");
  const [defectType, setDefectType] = useState("All types");
  const [defectLine, setDefectLine] = useState("All lines");
  const [analyticsRange, setAnalyticsRange] = useState("Last 30 days");
  const [analyticsLine, setAnalyticsLine] = useState("All lines");
  const [monitorDay, setMonitorDay] = useState("Today");
  const [monitorLine, setMonitorLine] = useState("All lines");

  // Live Batches & Refresh State (Manual + Continuous 1-min polling + 15s real-time clock tick)
  const [liveBatches, setLiveBatches] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Production Alerts derived from live MongoDB batch data & line status
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(() => new Set());
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [alertsFilterTab, setAlertsFilterTab] = useState("all");

  // Announcement broadcast state & 48-hour history
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementModalTab, setAnnouncementModalTab] = useState("make"); // "make" | "history"
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementCategory, setAnnouncementCategory] = useState("General Notice");
  const [announcementTargetLine, setAnnouncementTargetLine] = useState("All lines");
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);

  const currentSupervisorId = String(user?.id ?? user?.email ?? user?.name ?? "supervisor").toLowerCase();
  const currentSupervisorName = String(user?.name ?? "").trim().toLowerCase();
  const currentSupervisorEmail = String(user?.email ?? "").trim().toLowerCase();

  // Active announcements strictly within the 48-hour (2-day) window AND sent by this supervisor
  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      if (!a.createdAt) return false;
      const createdMs = new Date(a.createdAt).getTime();
      const isWithin48h = !isNaN(createdMs) && (currentTime - createdMs <= TWO_DAYS_MS);
      if (!isWithin48h) return false;

      // Filter to only announcements authored by this supervisor
      const aAuthId = String(a.authorId ?? "").trim().toLowerCase();
      const aAuthName = String(a.author ?? "").trim().toLowerCase();
      const aAuthEmail = String(a.authorEmail ?? "").trim().toLowerCase();

      const isMyBroadcast =
        !currentSupervisorName ||
        currentSupervisorName === "admin" ||
        aAuthId === currentSupervisorId ||
        (currentSupervisorEmail && aAuthEmail === currentSupervisorEmail) ||
        (currentSupervisorName && (aAuthName.includes(currentSupervisorName) || aAuthId.includes(currentSupervisorName))) ||
        (aAuthName === "factory supervisor" && (currentSupervisorName.includes("supervisor") || currentSupervisorName === "admin"));

      return isMyBroadcast;
    });
  }, [announcements, currentTime, currentSupervisorId, currentSupervisorName, currentSupervisorEmail]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/pyapi/api/announcements");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
          try {
            localStorage.setItem("visioninspect_announcements", JSON.stringify(data.announcements));
          } catch { }
          return;
        }
      }
    } catch { }
    try {
      const cached = localStorage.getItem("visioninspect_announcements");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(a => Date.now() - new Date(a.createdAt).getTime() <= TWO_DAYS_MS);
          setAnnouncements(valid);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchAnnouncements();
    const annTimer = setInterval(fetchAnnouncements, 45000);
    return () => clearInterval(annTimer);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = () => setProfileMenuOpen(false);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handleSendAnnouncement = async (e) => {
    e?.preventDefault();
    if (!announcementText.trim()) return;

    setIsSendingAnnouncement(true);
    const authorName = user?.name || "Factory Supervisor";
    const authorEmail = user?.email || (user?.name ? `${user.name.toLowerCase().replace(/\s+/g, '.')}@visioninspect.ai` : "supervisor@visioninspect.ai");
    const newDoc = {
      id: `ANN-${Date.now().toString(36).toUpperCase()}`,
      message: announcementText.trim(),
      category: announcementCategory,
      targetLine: announcementTargetLine,
      author: authorName,
      authorId: String(user?.id ?? user?.email ?? user?.name ?? "supervisor"),
      authorEmail: authorEmail,
      readCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/pyapi/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newDoc.message,
          category: newDoc.category,
          targetLine: newDoc.targetLine,
          author: newDoc.author,
          authorId: newDoc.authorId,
          authorEmail: newDoc.authorEmail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.announcement) {
          setAnnouncements(prev => [data.announcement, ...prev]);
        } else {
          setAnnouncements(prev => [newDoc, ...prev]);
        }
      } else {
        setAnnouncements(prev => [newDoc, ...prev]);
      }
    } catch {
      setAnnouncements(prev => [newDoc, ...prev]);
    }

    try {
      const existing = JSON.parse(localStorage.getItem("visioninspect_announcements") || "[]");
      localStorage.setItem("visioninspect_announcements", JSON.stringify([newDoc, ...existing]));
    } catch { }

    setAnnouncementText("");
    setIsSendingAnnouncement(false);
    setAnnouncementModalTab("history");
    notify("Announcement broadcast sent successfully!");
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await fetch(`/pyapi/api/announcements/${id}`, { method: "DELETE" });
    } catch { }
    setAnnouncements(prev => prev.filter(a => (a._id || a.id) !== id));
    try {
      const existing = JSON.parse(localStorage.getItem("visioninspect_announcements") || "[]");
      const updated = existing.filter(a => (a._id || a.id) !== id);
      localStorage.setItem("visioninspect_announcements", JSON.stringify(updated));
    } catch { }
    notify("Announcement removed.");
  };

  // Keyboard escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (announcementModalOpen) setAnnouncementModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announcementModalOpen]);

  const refreshData = async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/pyapi/api/batches");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.batches) {
          setLiveBatches(data.batches.map(b => ({
            id: b._id,
            name: b.name,
            line: b.line,
            captured: b.capturedAt,
            severity: b.overallSeverity || "Low",
            confidence: b.overallConfidence || 95.0,
            status: b.status,
            products: b.products || [],
            findings: b.findings || [],
          })));
          if (showNotification) {
            notify("Dashboard synced with latest MongoDB inspections.");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch batches for supervisor dashboard:", err);
      if (showNotification) {
        notify("Unable to sync: backend server is offline.");
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    refreshData(false);
    // Continuous 1-minute auto-poll interval
    const interval = setInterval(() => {
      refreshData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { writeFSSidebarExpandedPreference(sidebarExpanded); }, [sidebarExpanded]);

  const selectSection = (id) => {
    setActive(id);
    try { sessionStorage.setItem("fs_active_tab", id); } catch { }
    setMobileNav(false);
  };

  const expandFromRail = (event) => {
    if (!sidebarExpanded && event.target === event.currentTarget) setSidebarExpanded(true);
  };

  const notify = (msg) => setActionMessage(msg);

  // Filtered inspection data with live IST date range filtering
  const filteredBatches = useMemo(() => {
    return liveBatches.filter(b => {
      // Date range filter in IST
      if (!isBatchInISTDateRange(b.captured, inspDateRange)) return false;

      // Line filter
      if (inspLine !== "All lines" && b.line !== inspLine) return false;

      // Status filter
      const hasDefects = (b.products?.some(p => p.status === "Failed" || p.status === "FAIL")) || (b.severity === "High" || b.severity === "Medium");
      if (inspStatus === "PASS" && hasDefects) return false;
      if (inspStatus === "FAIL" && !hasDefects) return false;

      // Search query filter
      if (inspSearch.trim()) {
        const q = inspSearch.toLowerCase();
        if (!`${b.id} ${b.name} ${b.line}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [liveBatches, inspDateRange, inspLine, inspStatus, inspSearch]);


  // Dynamic computation of Production Lines from liveBatches scoped to IST date range
  // Line status strictly follows the 15-minute inactivity rule regardless of date filter
  const computedLines = useMemo(() => {
    const lineNames = [
      { id: "L01", name: "Line 01" },
      { id: "L02", name: "Line 02" },
      { id: "L03", name: "Line 03" },
      { id: "L04", name: "Line 04" },
    ];

    // Filter live batches by selected date range in IST for metric calculations
    const dateScopedBatches = liveBatches.filter(b => isBatchInISTDateRange(b.captured, overviewDateRange));

    return lineNames.map(lineDef => {
      // 1. Real-time operating status based on latest scan anywhere in liveBatches (15 min inactivity rule)
      const { isRunning, status, idleMinutes } = getLineOperatingStatus(lineDef.name, liveBatches, currentTime);

      // 2. Metrics in the selected date range
      const lineBatches = dateScopedBatches.filter(b => b.line === lineDef.name);
      const batchCount = lineBatches.length;
      let unitsToday = 0;
      let defects = 0;
      let morningCount = 0;
      let afternoonCount = 0;
      let nightCount = 0;

      lineBatches.forEach(b => {
        const prods = b.products || [];
        const count = prods.length || 1;
        unitsToday += count;
        const failed = prods.filter(p => p.status === "Failed" || p.status === "FAIL").length;
        defects += failed;

        // Classify shift by capturedAt in IST
        const date = getISTDate(b.captured);
        const hour = date.getHours();
        if (hour >= 6 && hour < 14) morningCount += count;
        else if (hour >= 14 && hour < 22) afternoonCount += count;
        else nightCount += count;
      });

      const yieldRate = unitsToday > 0 ? Number((((unitsToday - defects) / unitsToday) * 100).toFixed(1)) : 0;

      // Downtime: 480 min for idle lines with 0 batches, or dynamic based on idle elapsed / operating defect repairs
      const downtime = isRunning
        ? Math.max(4, Math.min(60, Math.round(defects * 3.5 + 4)))
        : (batchCount === 0 ? 480 : Math.min(480, Math.max(15, (idleMinutes ?? 480))));

      // OEE = Availability * Performance * Quality
      const availability = isRunning
        ? (480 - downtime) / 480
        : (batchCount > 0 ? Math.max(0, (480 - downtime) / 480) : 0);
      const quality = unitsToday > 0 ? yieldRate / 100 : 0;
      const performance = 0.94;
      const oee = (unitsToday > 0 && availability > 0)
        ? Number((availability * performance * quality * 100).toFixed(1))
        : 0;

      // Primary active shift
      let primaryShift = "Morning";
      if (afternoonCount > morningCount && afternoonCount > nightCount) primaryShift = "Afternoon";
      else if (nightCount > morningCount && nightCount > afternoonCount) primaryShift = "Night";
      else if (batchCount === 0 && !isRunning) primaryShift = "—";

      return {
        id: lineDef.id,
        name: lineDef.name,
        batchCount,
        status,
        isRunning,
        oee,
        unitsToday,
        yield: yieldRate,
        shift: primaryShift,
        downtime,
      };
    });
  }, [liveBatches, overviewDateRange, currentTime]);

  const alertsList = useMemo(() => {
    const list = [];

    // 1. Line-level live alerts from computedLines
    computedLines.forEach(l => {
      // Defect rate threshold alert (> 5% defect rate on running line)
      if (l.status === "Running" && l.yield < 95 && l.unitsToday > 0) {
        const defectRate = Number((100 - l.yield).toFixed(1));
        const defectCount = l.unitsToday - Math.round(l.unitsToday * (l.yield / 100));
        list.push({
          id: `ALT-DEF-${l.id}`,
          severity: defectRate > 10 ? "high" : "medium",
          line: l.name,
          category: "Defect Threshold",
          message: `Defect rate on ${l.name} is ${defectRate}% (exceeds 5.0% target with ${defectCount} defect units flagged)`,
          time: "Live trigger",
        });
      }

      // OEE alert (< 85% on running line)
      if (l.status === "Running" && l.oee < 85 && l.oee > 0) {
        list.push({
          id: `ALT-OEE-${l.id}`,
          severity: l.oee < 70 ? "high" : "medium",
          line: l.name,
          category: "OEE Warning",
          message: `${l.name} OEE dropped to ${l.oee}% (below 85.0% plant target)`,
          time: "Live trigger",
        });
      }

      // Line stoppage alert (idle line)
      if (l.status === "Idle") {
        list.push({
          id: `ALT-IDLE-${l.id}`,
          severity: "medium",
          line: l.name,
          category: "Line Stoppage",
          message: `${l.name} is currently idle — 0 batch scans recorded in active period`,
          time: "Live status",
        });
      }
    });

    // 2. Batch-level AI health & Critical defect alerts from liveBatches
    const defectBatches = liveBatches.filter(b => (b.products?.some(p => p.status === "Failed" || p.status === "FAIL")) || (b.severity === "High" || b.severity === "Critical"));
    defectBatches.slice(0, 3).forEach(b => {
      const topDefectType = b.findings?.[0]?.defectType || "Flagged Defects";
      list.push({
        id: `ALT-BATCH-${b.id}`,
        severity: "high",
        line: b.line,
        category: "Critical Inspection",
        message: `Defective batch flagged on ${b.line} (${b.name || b.id}): ${topDefectType}`,
        time: "Live inspection",
      });
    });

    const lowConfBatches = liveBatches.filter(b => b.confidence && b.confidence < 92);
    lowConfBatches.slice(0, 2).forEach(b => {
      list.push({
        id: `ALT-AI-${b.id}`,
        severity: "high",
        line: b.line,
        category: "AI Health",
        message: `Vision camera inference confidence dip (${b.confidence}% on Batch #${b.name || b.id})`,
        time: "Live telemetry",
      });
    });

    // Map acknowledged states
    return list.map(a => ({
      ...a,
      acknowledged: acknowledgedAlertIds.has(a.id),
    }));
  }, [computedLines, liveBatches, acknowledgedAlertIds]);

  const acknowledgeAlert = (id) => {
    setAcknowledgedAlertIds(prev => new Set([...prev, id]));
    notify(`Alert ${id} acknowledged.`);
  };

  const acknowledgeAllAlerts = () => {
    setAcknowledgedAlertIds(new Set(alertsList.map(a => a.id)));
    notify("All production alerts acknowledged.");
  };

  const filteredModalAlerts = useMemo(() => {
    if (alertsFilterTab === "active") return alertsList.filter(a => !a.acknowledged);
    if (alertsFilterTab === "acknowledged") return alertsList.filter(a => a.acknowledged);
    return alertsList;
  }, [alertsList, alertsFilterTab]);

  // Keyboard escape listener for alerts modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && alertsModalOpen) {
        setAlertsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [alertsModalOpen]);

  // Dynamic Shift Performance summary from liveBatches scoped to IST date range
  const computedShiftPerformance = useMemo(() => {
    const shifts = [
      { key: "Morning", shift: "Morning (06:00–14:00)", start: 6, end: 14 },
      { key: "Afternoon", shift: "Afternoon (14:00–22:00)", start: 14, end: 22 },
      { key: "Night", shift: "Night (22:00–06:00)", start: 22, end: 6 },
    ];

    const dateScopedBatches = liveBatches.filter(b => isBatchInISTDateRange(b.captured, overviewDateRange));

    return shifts.map(s => {
      let units = 0;
      let defects = 0;

      dateScopedBatches.forEach(b => {
        const date = getISTDate(b.captured);
        const hour = date.getHours();
        const inShift = s.key === "Night" ? (hour >= 22 || hour < 6) : (hour >= s.start && hour < s.end);

        if (inShift) {
          const prods = b.products || [];
          units += prods.length || 1;
          defects += prods.filter(p => p.status === "Failed" || p.status === "FAIL").length;
        }
      });

      const hasUnits = units > 0;
      const yieldRate = hasUnits ? Number((((units - defects) / units) * 100).toFixed(1)) : (dateScopedBatches.length > 0 ? 100 : 97.5);
      const shiftDowntime = hasUnits ? Math.max(10, Math.round(defects * 4 + 8)) : 30;
      const availability = (480 - shiftDowntime) / 480;
      const quality = yieldRate / 100;
      const performance = 0.93;
      const oee = Number((availability * performance * quality * 100).toFixed(1));

      return {
        shift: s.shift,
        units: units,
        defects: defects,
        yield: yieldRate,
        oee: oee,
      };
    });
  }, [liveBatches, overviewDateRange]);

  // Dynamic Overview KPIs scoped to IST date range
  const computedOverviewKPIs = useMemo(() => {
    const totalUnits = computedLines.reduce((acc, l) => acc + l.unitsToday, 0);
    const runningLines = computedLines.filter(l => l.status === "Running").length;
    const dateScopedBatches = liveBatches.filter(b => isBatchInISTDateRange(b.captured, overviewDateRange));
    const totalDefects = dateScopedBatches.reduce((acc, b) => acc + (b.products?.filter(p => p.status === "Failed" || p.status === "FAIL").length || 0), 0);
    const overallYield = totalUnits > 0 ? `${(((totalUnits - totalDefects) / totalUnits) * 100).toFixed(1)}%` : "100%";

    return [
      { id: "units", label: "Total units", value: totalUnits, detail: `For ${overviewDateRange.toLowerCase()} (IST)`, trend: "up" },
      { id: "yield", label: "Overall yield", value: overallYield, detail: "Target: 95.0%", trend: "up" },
      { id: "defects", label: "Active defects", value: totalDefects, detail: "From live inspections", trend: totalDefects > 0 ? "down" : "up" },
      { id: "lines", label: "Active lines", value: `${runningLines} / ${computedLines.length}`, detail: `${computedLines.length - runningLines} idle`, trend: "neutral" },
    ];
  }, [computedLines, liveBatches, overviewDateRange]);

  // Filtered production lines
  const filteredLines = useMemo(() => {
    return computedLines.filter(l => {
      if (overviewLine !== "All lines" && l.name !== overviewLine) return false;
      return true;
    });
  }, [computedLines, overviewLine]);

  // Filtered monitoring lines
  const monitoredLines = useMemo(() => {
    return computedLines.filter(l => {
      if (monitorLine !== "All lines" && l.name !== monitorLine) return false;
      return true;
    });
  }, [computedLines, monitorLine]);

  return (
    <main className={`fs-app ${sidebarExpanded ? "side-expanded" : ""}`}>
      {/* ─── Sidebar ─── */}
      <aside className={`fs-side ${mobileNav ? "open" : ""} ${sidebarExpanded ? "expanded" : "collapsed"}`} onClick={expandFromRail} aria-label="Factory Supervisor dashboard navigation">
        <div className="fs-side-top"><div className="fs-side-brand"><BrandMark interactive={false} /><button className="fs-side-toggle" type="button" onClick={(e) => { e.stopPropagation(); setSidebarExpanded(v => !v); }} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-pressed={sidebarExpanded} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}><PanelLeft size={17} strokeWidth={1.8} /></button></div></div>
        <nav className="fs-nav">
          {supervisorSections.map((section) => {
            const Icon = icons[section.icon];
            return <button type="button" key={section.id} onClick={() => selectSection(section.id)} className={active === section.id ? "active" : ""} data-label={section.label} aria-label={sidebarExpanded ? undefined : section.label}><Icon size={17} /><span><b>{section.label}</b></span></button>;
          })}
        </nav>
        <div className="fs-side-bottom">
          <button
            type="button"
            className="fs-side-announcement-btn"
            onClick={() => setAnnouncementModalOpen(true)}
            data-label="Announcement"
            aria-label={sidebarExpanded ? undefined : "Broadcast Announcement"}
            title={sidebarExpanded ? undefined : "Broadcast Announcement"}
          >
            <Megaphone size={16} />
            <span><b>Announcement</b></span>
          </button>
          <div className="fs-side-profile-wrap">
            <button
              className="fs-side-profile"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProfileMenuOpen((v) => !v);
              }}
              aria-label="Open account menu"
              aria-expanded={profileMenuOpen}
            >
              <span>{workspaceEmoji || (user.name || "FS").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
              <div>
                <b>{user.name || "Factory Supervisor"}</b>
                <small>{user.role === "admin" ? "Platform Admin preview" : "Factory Supervisor"}</small>
              </div>
            </button>
            {profileMenuOpen && (
              <div className="fs-profile-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                {/* 1. Profile Logo & User's Workspace Header */}
                <div className="fs-profile-menu-header">
                  <span className="fs-profile-menu-avatar">
                    {workspaceEmoji || (user.name || "P").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="fs-profile-menu-info">
                    <b>{workspaceName}</b>
                    <small>{user.role === "admin" ? "Platform Admin" : "Factory Supervisor"}</small>
                  </div>
                </div>

                {/* Divider 1 */}
                <div className="fs-profile-menu-divider" />

                {/* 2. Email of the user */}
                <div className="fs-profile-menu-email" title={user.email || `${(user.name || "supervisor").toLowerCase().replace(/\s+/g, "")}@visioninspect.ai`}>
                  <span>{user.email || `${(user.name || "supervisor").toLowerCase().replace(/\s+/g, "")}@visioninspect.ai`}</span>
                </div>

                {/* Divider 2 */}
                <div className="fs-profile-menu-divider" />

                {/* Dark mode toggle option */}
                <div className="fs-profile-menu-item fs-profile-menu-toggle-row">
                  <div className="fs-profile-menu-toggle-left">
                    <Moon size={15} />
                    <span>Dark mode</span>
                  </div>
                  <button
                    type="button"
                    className={`vi-menu-toggle-switch ${isDarkMode ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                    }}
                    aria-label="Toggle dark mode"
                  >
                    <span className="vi-menu-toggle-dot" />
                  </button>
                </div>

                {/* Divider 3 */}
                <div className="fs-profile-menu-divider" />

                {/* 3. Settings option */}
                <button
                  type="button"
                  className="fs-profile-menu-item"
                  onClick={() => {
                    setSettingsModalOpen(true);
                    setProfileMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>

                {/* Divider 3 */}
                <div className="fs-profile-menu-divider" />

                {/* 4. Log out option */}
                <button
                  type="button"
                  className="fs-profile-menu-item fs-profile-menu-signout"
                  onClick={onSignOut}
                  disabled={isSigningOut}
                  role="menuitem"
                >
                  <LogOut size={15} />
                  <span>{isSigningOut ? "Logging out…" : "Log out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <section className="fs-main">
        <header className="fs-head">
          <button className="fs-menu" type="button" onClick={() => setMobileNav(v => !v)} aria-label="Toggle dashboard navigation"><Menu size={20} /></button>
          <div className="fs-head-title"><span className="fs-kicker">Factory supervision</span><h1>{supervisorSections.find(s => s.id === active)?.label}</h1></div>
          <div className="fs-head-actions">
            {/* Manual Refresh & Sync Button */}
            <button
              type="button"
              className={`fs-notif-btn ${isRefreshing ? "active" : ""}`}
              onClick={() => refreshData(true)}
              disabled={isRefreshing}
              aria-label="Refresh dashboard data"
              title="Sync with latest MongoDB inspections"
            >
              <RefreshCw size={16} className={isRefreshing ? "fs-spin" : ""} />
            </button>

            {/* Top-Right Alerts Button */}
            <button
              type="button"
              className={`fs-notif-btn ${alertsModalOpen ? "active" : ""}`}
              onClick={() => setAlertsModalOpen(true)}
              aria-label="Production alerts"
              title="View Production Alerts"
            >
              <Bell size={17} />
              {alertsList.some(a => !a.acknowledged) && (
                <span className="fs-notif-badge">
                  {alertsList.filter(a => !a.acknowledged).length}
                </span>
              )}
            </button>

            <div className="fs-user">
              <span>{(user.name || "FS").split(" ").map(p => p[0]).slice(0, 2).join("")}</span>
              <div><b>{user.name || "Factory Supervisor"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Factory Supervisor"}</small></div>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {actionMessage && <div className="fs-action-feedback" role="status"><Check size={15} /><span>{actionMessage}</span><button type="button" onClick={() => setActionMessage("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        <div className="fs-content">
          <section className="fs-stage">
            {active === "overview" && <ProductionOverview lines={filteredLines} kpis={computedOverviewKPIs} shiftSummary={computedShiftPerformance} dateRange={overviewDateRange} setDateRange={setOverviewDateRange} line={overviewLine} setLine={setOverviewLine} />}
            {active === "inspections" && <InspectionReports batches={filteredBatches} liveBatches={liveBatches} dateRange={inspDateRange} setDateRange={setInspDateRange} line={inspLine} setLine={setInspLine} status={inspStatus} setStatus={setInspStatus} search={inspSearch} setSearch={setInspSearch} notify={notify} user={user} />}
            {active === "defects" && <DefectTrends range={defectRange} setRange={setDefectRange} type={defectType} setType={setDefectType} line={defectLine} setLine={setDefectLine} liveBatches={liveBatches} />}
            {active === "analytics" && <QualityAnalytics dateRange={analyticsRange} setDateRange={setAnalyticsRange} line={analyticsLine} setLine={setAnalyticsLine} liveBatches={liveBatches} />}
            {active === "monitoring" && <ProductionMonitoring day={monitorDay} setDay={setMonitorDay} line={monitorLine} setLine={setMonitorLine} notify={notify} lines={monitoredLines} liveBatches={liveBatches} />}
          </section>
        </div>
      </section>

      {/* ─── Production Alerts Center Modal ─── */}
      {alertsModalOpen && (
        <div className="fs-modal-backdrop" onClick={() => setAlertsModalOpen(false)}>
          <div className="fs-alerts-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Production Alerts">
            <div className="fs-alerts-modal-head">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="fs-kicker" style={{ margin: 0 }}><Bell size={13} /> Plant Telemetry & Incidents</span>
                  {alertsList.some(a => !a.acknowledged) && (
                    <span className="fs-alert-count">
                      {alertsList.filter(a => !a.acknowledged).length} active
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: "19px", margin: "4px 0 0", color: "var(--ink)", letterSpacing: "-0.3px" }}>Production Alerts</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {alertsList.some(a => !a.acknowledged) && (
                  <button
                    type="button"
                    className="fs-alerts-ack-all-btn"
                    onClick={acknowledgeAllAlerts}
                    title="Acknowledge all active alerts"
                  >
                    <Check size={14} /> Acknowledge all
                  </button>
                )}
                <button
                  type="button"
                  className="fs-alerts-modal-close"
                  onClick={() => setAlertsModalOpen(false)}
                  aria-label="Close alerts modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="fs-alerts-modal-tabs">
              <button
                type="button"
                className={alertsFilterTab === "all" ? "active" : ""}
                onClick={() => setAlertsFilterTab("all")}
              >
                All ({alertsList.length})
              </button>
              <button
                type="button"
                className={alertsFilterTab === "active" ? "active" : ""}
                onClick={() => setAlertsFilterTab("active")}
              >
                Active ({alertsList.filter(a => !a.acknowledged).length})
              </button>
              <button
                type="button"
                className={alertsFilterTab === "acknowledged" ? "active" : ""}
                onClick={() => setAlertsFilterTab("acknowledged")}
              >
                Acknowledged ({alertsList.filter(a => a.acknowledged).length})
              </button>
            </div>

            <div className="fs-alerts-modal-body">
              {filteredModalAlerts.length === 0 ? (
                <div className="fs-alerts-empty">
                  <Check size={28} style={{ color: "var(--pass)" }} />
                  <p>No alerts in this category.</p>
                </div>
              ) : (
                filteredModalAlerts.map(a => (
                  <div key={a.id} className={`fs-alerts-modal-card ${a.severity} ${a.acknowledged ? "ack" : ""}`}>
                    <div className="fs-alerts-card-left">
                      <span className={`fs-alert-dot ${a.severity}`} />
                      <div className="fs-alerts-card-info">
                        <div className="fs-alerts-card-meta">
                          <b>{a.line}</b>
                          {a.category && <span className="fs-alert-cat-badge">{a.category}</span>}
                          <span className={`fs-alert-sev-tag ${a.severity}`}>{a.severity}</span>
                          <small>{a.time}</small>
                        </div>
                        <p className="fs-alerts-card-msg">{a.message}</p>
                      </div>
                    </div>
                    <div className="fs-alerts-card-action">
                      {!a.acknowledged ? (
                        <button
                          type="button"
                          className="fs-alert-ack-action-btn"
                          onClick={() => acknowledgeAlert(a.id)}
                          title="Acknowledge this alert"
                        >
                          <Check size={14} /> Acknowledge
                        </button>
                      ) : (
                        <span className="fs-alert-ack-badge">✓ Acknowledged</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="fs-alerts-modal-foot">
              <span>Press <kbd style={{ padding: "2px 5px", background: "#eaece0", borderRadius: "4px", fontSize: "10px", border: "1px solid var(--line)" }}>Esc</kbd> or click outside to dismiss.</span>
              <button type="button" className="fs-alerts-modal-done-btn" onClick={() => setAlertsModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Broadcast Announcement Modal (Centered pop-up with 48h auto-clearing history) ─── */}
      {announcementModalOpen && (
        <div className="fs-modal-backdrop" onClick={() => setAnnouncementModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="fs-ann-title">
          <div className="fs-ann-modal" onClick={e => e.stopPropagation()}>
            <div className="fs-ann-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="fs-ann-modal-icon-wrap">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 id="fs-ann-title">Broadcast Announcement</h2>
                </div>
              </div>
              <button
                type="button"
                className="fs-alerts-modal-close"
                onClick={() => setAnnouncementModalOpen(false)}
                aria-label="Close announcement modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subheader Tab Selector: Make announcement vs History */}
            <div className="fs-ann-tab-bar">
              <button
                type="button"
                className={`fs-ann-tab-btn ${announcementModalTab === "make" ? "active" : ""}`}
                onClick={() => setAnnouncementModalTab("make")}
              >
                <Megaphone size={13} />
                Make announcement
              </button>
              <button
                type="button"
                className={`fs-ann-tab-btn ${announcementModalTab === "history" ? "active" : ""}`}
                onClick={() => setAnnouncementModalTab("history")}
              >
                <Clock size={13} />
                History
                {activeAnnouncements.length > 0 && (
                  <span className="fs-ann-tab-badge">{activeAnnouncements.length}</span>
                )}
              </button>
            </div>

            <div className="fs-ann-modal-body">
              {announcementModalTab === "make" ? (
                /* New Announcement Form */
                <form onSubmit={handleSendAnnouncement} className="fs-ann-form">
                  <div className="fs-ann-form-field">
                    <label><Tag size={13} /> Notice Category</label>
                    <div className="fs-ann-category-pills">
                      {ANNOUNCEMENT_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`fs-ann-cat-pill ${announcementCategory === cat.id ? "active" : ""}`}
                          onClick={() => setAnnouncementCategory(cat.id)}
                          style={{
                            "--pill-color": cat.color,
                          }}
                        >
                          <span className="fs-ann-cat-dot" />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="fs-ann-form-field" style={{ marginTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label htmlFor="fs-ann-msg" style={{ margin: 0 }}>Announcement Message</label>
                      <small className="fs-ann-char-count">{announcementText.length} / 300</small>
                    </div>
                    <textarea
                      id="fs-ann-msg"
                      value={announcementText}
                      onChange={e => setAnnouncementText(e.target.value.slice(0, 300))}
                      placeholder="e.g. Line 03 sensor maintenance scheduled from 3:00 PM to 5:00 PM today. Please route batches accordingly."
                      rows={3}
                      className="fs-ann-textarea"
                      required
                    />
                  </div>

                  <div className="fs-ann-form-actions">
                    <span className="fs-ann-auto-expire-tip">
                      <Clock size={12} /> Auto-clears after 48 hours (2 days)
                    </span>
                    <button
                      type="submit"
                      className="fs-ann-send-btn"
                      disabled={!announcementText.trim() || isSendingAnnouncement}
                    >
                      <Send size={14} />
                      {isSendingAnnouncement ? "Broadcasting…" : "Send Announcement"}
                    </button>
                  </div>
                </form>
              ) : (
                /* 48-Hour Live Announcements History Section */
                <div className="fs-ann-history-section">
                  <div className="fs-ann-history-head">
                    <h3>Announcements History <span>(Last 2 Days · {activeAnnouncements.length})</span></h3>
                    <span className="fs-ann-badge-pill">48h Auto-Purge</span>
                  </div>

                  {activeAnnouncements.length === 0 ? (
                    <div className="fs-ann-empty">
                      <Megaphone size={26} style={{ color: "var(--muted)", opacity: 0.6 }} />
                      <p>No announcements in history for the last 48 hours.</p>
                      <small>Broadcast messages sent by factory supervisors will appear here and automatically clear after 2 days.</small>
                    </div>
                  ) : (
                    <div className="fs-ann-list">
                      {activeAnnouncements.map(a => {
                        const catObj = ANNOUNCEMENT_CATEGORIES.find(c => c.id === a.category) || { color: "#27837f" };
                        const aId = a._id || a.id;
                        return (
                          <div key={aId} className="fs-ann-card">
                            <div className="fs-ann-card-head">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span
                                  className="fs-ann-card-cat"
                                  style={{ color: catObj.color, borderColor: `${catObj.color}40`, background: `${catObj.color}15` }}
                                >
                                  {a.category}
                                </span>
                                <span className="fs-ann-card-line">{a.targetLine || "All lines"}</span>
                                <span className="fs-ann-card-author">by {a.author || "Factory Supervisor"}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <time className="fs-ann-card-time">{formatRelativeTime(a.createdAt)}</time>
                                <button
                                  type="button"
                                  className="fs-ann-card-del-btn"
                                  onClick={() => handleDeleteAnnouncement(aId)}
                                  title="Delete announcement"
                                  aria-label="Delete announcement"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <p className="fs-ann-card-msg">{a.message}</p>
                            <div className="fs-ann-card-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "9px", paddingTop: "8px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                              <span
                                className="fs-ann-read-pill"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "11px",
                                  padding: "3px 9px",
                                  borderRadius: "12px",
                                  background: a.readCount ? "rgba(22, 163, 74, 0.12)" : "rgba(100, 116, 139, 0.1)",
                                  color: a.readCount ? "#15803d" : "#64748b",
                                  fontWeight: "600"
                                }}
                              >
                                <Eye size={12} />
                                {`Read by ${a.readCount || 0} Quality Engineer${a.readCount === 1 ? "" : "s"}`}
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                48h active broadcast
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="fs-alerts-modal-foot">
              <span>Press <kbd style={{ padding: "2px 5px", background: "#eaece0", borderRadius: "4px", fontSize: "10px", border: "1px solid var(--line)" }}>Esc</kbd> or click outside to dismiss.</span>
              <button type="button" className="fs-alerts-modal-done-btn" onClick={() => setAnnouncementModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Popup */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        user={user}
        onSignOut={onSignOut}
      />
    </main>
  );
}

/* ═══════════════════════════════════════════════════
   Section 1: Production Overview
   ═══════════════════════════════════════════════════ */
function ProductionOverview({ lines, kpis, shiftSummary, dateRange, setDateRange, line, setLine }) {
  return (
    <section className="fs-section">
      <div className="fs-section-head">
        <div>
          <h2>Plant <em>Performance Summary.</em></h2>
          <p>Real-time manufacturing line performance, live yield metrics, and shift analytics from MongoDB.</p>
        </div>
        <div className="fs-result-filters">
          <label className="fs-filter-btn fs-result-filter">
            <CalendarClock size={15} />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">
              {inspectionDateFilters.map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="fs-filter-btn fs-result-filter">
            <Filter size={15} />
            <select value={line} onChange={e => setLine(e.target.value)} aria-label="Production line">
              {lineFilters.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      {/* KPI summary row */}
      <div className="fs-context fs-overview-context" style={{ marginBottom: "22px" }}>
        {kpis.map(kpi => (
          <article className={`fs-kpi-card fs-kpi-${kpi.id}`} key={kpi.id}>
            <span>{kpi.id === "units" && <Factory size={14} />}{kpi.id === "yield" && <TrendingUp size={14} />}{kpi.id === "defects" && <AlertTriangle size={14} />}{kpi.id === "lines" && <Activity size={14} />}{kpi.label}</span>
            <strong>{typeof kpi.value === "number" ? formatNumber(kpi.value) : kpi.value}</strong>
            <p>{kpi.trend === "up" && <i className="up">↑</i>}{kpi.trend === "down" && <i className="down">↓</i>}{kpi.detail}</p>
          </article>
        ))}
      </div>

      {/* Production line status table */}
      <div className="fs-table-wrap">
        <div className="fs-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div><span className="fs-kicker">Line status</span><h3>Production Line Performance</h3></div>
        </div>
        <table>
          <thead><tr><th>Line</th><th>Batch Count</th><th>Status</th><th>OEE</th><th>Units {dateRange === "Today" ? "Today" : `(${dateRange})`}</th><th>Yield</th><th>Downtime</th></tr></thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id}>
                <td><b>{l.name}</b><small>{l.id}</small></td>
                <td><b>{l.batchCount} {l.batchCount === 1 ? "batch" : "batches"}</b></td>
                <td><span className={`fs-line-status-badge ${l.status.toLowerCase()}`}>{l.status}</span></td>
                <td><b>{l.oee}%</b></td>
                <td><b className="fs-history-count">{formatNumber(l.unitsToday)}</b></td>
                <td><span className={`fs-yield-badge ${l.yield >= 95 ? "good" : l.yield >= 90 ? "warn" : "bad"}`}>{l.yield}%</span></td>
                <td><span className="fs-date">{l.downtime} min</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <div className="fs-history-empty"><Search size={20} /><p>No lines match the current filters.</p></div>}
      </div>

      {/* Shift performance */}
      <div style={{ marginTop: "24px" }}>
        <div className="fs-card-top" style={{ marginBottom: "16px" }}>
          <div><span className="fs-kicker">Shift comparison</span><h3>Shift Performance Summary</h3></div>
        </div>
        <div className="fs-shift-grid">
          {shiftSummary.map(s => (
            <article className="fs-shift-card" key={s.shift}>
              <span className="fs-kicker"><Clock size={13} />{s.shift}</span>
              <div className="fs-shift-metrics">
                <div><dt>Units</dt><dd>{formatNumber(s.units)}</dd></div>
                <div><dt>Defects</dt><dd>{s.defects}</dd></div>
                <div><dt>Yield</dt><dd>{s.yield}%</dd></div>
                <div><dt>OEE</dt><dd>{s.oee}%</dd></div>
              </div>
              <div className="fs-shift-bar"><i style={{ width: `${s.oee}%` }} /><span>{s.oee}% OEE</span></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Section 2: Inspection Reports
   ═══════════════════════════════════════════════════ */
function InspectionReports({ batches, liveBatches, dateRange, setDateRange, line, setLine, status, setStatus, search, setSearch, notify, user = null }) {
  const [isExporting, setIsExporting] = useState(false);

  const dateScopedBatches = useMemo(() => {
    return liveBatches.filter(b => isBatchInISTDateRange(b.captured, dateRange));
  }, [liveBatches, dateRange]);

  const totalBatches = dateScopedBatches.length;
  const defectedBatches = dateScopedBatches.filter(b => (b.products?.some(p => p.status === "Failed" || p.status === "FAIL")) || (b.severity === "High" || b.severity === "Medium")).length;
  const batchesPassRate = totalBatches > 0 ? Math.round(((totalBatches - defectedBatches) / totalBatches) * 100) : 100;

  const totalProducts = dateScopedBatches.reduce((acc, b) => acc + (b.products?.length || 1), 0);
  const defectedProducts = dateScopedBatches.reduce((acc, b) => acc + (b.products?.filter(p => p.status === "Failed" || p.status === "FAIL").length || 0), 0);
  const productsPassRate = totalProducts > 0 ? Number((((totalProducts - defectedProducts) / totalProducts) * 100).toFixed(1)) : 100;

  const avgConfidence = dateScopedBatches.length > 0 ? (dateScopedBatches.reduce((a, b) => a + (b.confidence || 0), 0) / dateScopedBatches.length).toFixed(1) : "0.0";

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      notify("Generating Batch Inspection Records PDF report...");
      const fileName = await generateInspectionsReport({
        batches,
        allBatches: dateScopedBatches,
        metrics: {
          totalBatches,
          defectedBatches,
          batchesPassRate,
          totalProducts,
          defectedProducts,
          productsPassRate,
          avgConfidence
        },
        dateRange,
        lineFilter: line,
        statusFilter: status,
        searchQuery: search,
        supervisor: user?.name || "Factory Supervisor"
      });
      notify(`Exported ${fileName} (${batches.length} batch record${batches.length === 1 ? "" : "s"}).`);
    } catch (err) {
      console.error("PDF export failed:", err);
      notify("Failed to export inspection report PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="fs-section">
      <div className="fs-section-head">
        <div>
          <h2>Batch <em>Inspection Records.</em></h2>
          <p>Review live batch inspection records, AI confidence ratings, and quality verdicts from MongoDB.</p>
        </div>
        <div className="fs-result-filters">
          <label className="fs-filter-btn fs-result-filter">
            <CalendarClock size={15} />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">
              {inspectionDateFilters.map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      {/* 7-Card Executive KPI Grid */}
      <div className="fs-report-kpis">
        <article><span>Total Batches Inspected</span><b>{totalBatches}</b><p><i className="up">↑ Live</i> stored in MongoDB</p></article>
        <article><span>Total Defected Batches</span><b>{defectedBatches}</b><p><i className="down">↓ Flagged</i> batches with defects</p></article>
        <article><span>Batches Pass Rate</span><b>{batchesPassRate}<em>%</em></b><p><i className="up">↑ Real-time</i> calculation</p></article>

        <article className="fs-kpi-tall">
          <div>
            <span>Avg. Confidence</span>
            <b className="fs-top-defect-name">{avgConfidence}<em>%</em></b>
          </div>
          <div className="fs-top-defect-body">
            <span className="fs-top-defect-badge">AI Model Certainty</span>
            <p>Overall mean neural network inference confidence across all inspected items</p>
          </div>
        </article>

        <article><span>Total Products Inspected</span><b>{totalProducts}</b><p><i className="up">↑ Live</i> images evaluated</p></article>
        <article><span>Total Defected Products</span><b>{defectedProducts}</b><p><i className="down">↓ Active</i> defect units</p></article>
        <article><span>Products Pass Rate</span><b>{productsPassRate}<em>%</em></b><p><i className="up">↑ Real-time</i> quality rate</p></article>
      </div>

      {/* Tools */}
      <div className="fs-history-tools" style={{ marginTop: "24px" }}>
        <label><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch, line, or product" /></label>
        <div className="fs-result-filters" style={{ gap: "7px" }}>
          <label className="fs-filter-btn fs-result-filter"><Filter size={15} /><select value={line} onChange={e => setLine(e.target.value)} aria-label="Line">{lineFilters.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={14} /></label>
        </div>
        <div>{statusFilters.map(s => <button key={s} type="button" className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>)}</div>
        <button type="button" onClick={handleExportPDF} disabled={isExporting} title="Export Batch Inspection Records to PDF">
          <Download size={15} /> {isExporting ? "Exporting…" : "Export"}
        </button>
      </div>

      {/* Table */}
      <div className="fs-table-wrap">
        <table>
          <thead><tr><th>Batch Code</th><th>Batch Name</th><th>Line</th><th>Items</th><th>Defects</th><th>Status</th><th>Pass Rate</th><th>Confidence</th></tr></thead>
          <tbody>
            {batches.map(batch => {
              const flags = batch.products?.filter(p => p.status === "Failed").length || 0;
              const total = batch.products?.length || 1;
              const pRate = Math.round(((total - flags) / total) * 100);
              return (
                <tr key={batch.id}>
                  <td><b>{batch.id}</b></td>
                  <td><b>{batch.name}</b></td>
                  <td>{batch.line}</td>
                  <td><b className="fs-history-count">{total}</b></td>
                  <td><span className={`fs-history-flags ${flags ? "flagged" : "clear"}`}>{flags}</span></td>
                  <td><span className={`fs-verdict ${flags ? "fail" : "pass"}`}>{flags ? "FAIL" : "PASS"}</span></td>
                  <td><b>{pRate}%</b></td>
                  <td><b>{batch.confidence}%</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {batches.length === 0 && <div className="fs-history-empty"><Search size={20} /><p>No inspection records match the current filters.</p></div>}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Section 3: Defect Trends
   ═══════════════════════════════════════════════════ */
function isActualDefect(f) {
  if (!f) return false;
  const name = (f.defectType || "").trim().toLowerCase();
  if (!name || name === "not defective" || name === "good" || name === "none" || name === "normal" || name === "pass") {
    return false;
  }
  return true;
}

function getDefectCategory(defectType = "") {
  const d = defectType.toLowerCase();
  if (d.includes("surface") || d.includes("scratch") || d.includes("blemish") || d.includes("stain")) return "Surface";
  if (d.includes("contam") || d.includes("oil") || d.includes("dirt") || d.includes("foreign")) return "Contamination";
  if (d.includes("crack") || d.includes("fracture") || d.includes("fabric") || d.includes("tear") || d.includes("border")) return "Structural";
  if (d.includes("align") || d.includes("assembly") || d.includes("position") || d.includes("fit")) return "Assembly";
  if (d.includes("dimension") || d.includes("size") || d.includes("width") || d.includes("length") || d.includes("warp")) return "Dimensional";
  if (d.includes("pack") || d.includes("seal") || d.includes("label") || d.includes("box")) return "Packaging";
  return "General";
}

function DefectTrends({ liveBatches = [] }) {
  const [dailyTrendWindow, setDailyTrendWindow] = useState("7"); // "7", "14", "30"
  const [weekOffset, setWeekOffset] = useState(0); // 0 = present week, 1..4 = previous weeks

  // 1. Daily frequency bar chart data over selected rolling window (7, 14, 30 days) in IST
  const dailyTrendData = useMemo(() => {
    const numDays = parseInt(dailyTrendWindow, 10) || 7;
    const nowIST = getISTDate(new Date());
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(nowIST.getTime() - i * 24 * 60 * 60 * 1000);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const isoKey = `${d.getFullYear()}-${month}-${day}`;
      const dateLabel = `${day} ${months[d.getMonth()]}`;

      let count = 0;
      liveBatches.forEach(b => {
        const bIST = getISTDate(b.captured);
        const bIso = `${bIST.getFullYear()}-${String(bIST.getMonth() + 1).padStart(2, "0")}-${String(bIST.getDate()).padStart(2, "0")}`;
        if (bIso === isoKey) {
          if (b.findings && b.findings.length > 0) {
            b.findings.forEach(f => {
              if (!isActualDefect(f)) return;
              count++;
            });
          } else if (b.products) {
            count += b.products.filter(p => p.status === "Failed" || p.status === "FAIL").length;
          }
        }
      });

      buckets.push({ dateLabel, isoKey, count });
    }

    return buckets;
  }, [liveBatches, dailyTrendWindow]);

  const totalDailyDefects = useMemo(() => dailyTrendData.reduce((acc, d) => acc + d.count, 0), [dailyTrendData]);
  const maxDailyCount = useMemo(() => {
    const max = Math.max(...dailyTrendData.map(d => d.count), 0);
    return max > 0 ? max : 1;
  }, [dailyTrendData]);

  // 2. Defect Categories & Classifications (aggregated 100% live from MongoDB)
  const { defectCategoriesList, top3Categories, donutTotal } = useMemo(() => {
    const classificationMap = {};
    const categoryColors = {
      "Surface": "#27837f",
      "Contamination": "#ba4a31",
      "Structural": "#d9534f",
      "Assembly": "#fcbe5a",
      "Dimensional": "#e07b61",
      "Packaging": "#799a98",
      "General": "#3b82f6",
    };

    liveBatches.forEach(b => {
      if (b.findings && b.findings.length > 0) {
        b.findings.forEach(f => {
          if (!isActualDefect(f)) return;

          const typeName = f.defectType || "Unclassified defect";
          let rawScore = f.severityScore ?? (f.severity === "Critical" ? 88.0 : f.severity === "High" ? 75.0 : f.severity === "Medium" ? 50.0 : 25.0);
          const normScore = rawScore > 10 ? rawScore / 10 : rawScore;

          if (!classificationMap[typeName]) {
            const category = getDefectCategory(typeName);
            classificationMap[typeName] = {
              category,
              count: 0,
              totalScore: 0,
              color: categoryColors[category] || "#27837f",
            };
          }
          classificationMap[typeName].count += 1;
          classificationMap[typeName].totalScore += normScore;
        });
      } else if (b.products) {
        const failedProds = b.products.filter(p => p.status === "Failed" || p.status === "FAIL");
        failedProds.forEach(p => {
          const typeName = p.defectType || "Defective";
          const category = getDefectCategory(typeName);
          if (!classificationMap[typeName]) {
            classificationMap[typeName] = {
              category,
              count: 0,
              totalScore: 0,
              color: categoryColors[category] || "#27837f",
            };
          }
          classificationMap[typeName].count += 1;
          classificationMap[typeName].totalScore += 7.5;
        });
      }
    });

    const classList = Object.entries(classificationMap)
      .map(([name, data]) => {
        const avgScore = data.count > 0 ? data.totalScore / data.count : 5.0;
        return {
          name,
          category: data.category,
          count: data.count,
          severityScore: Number(avgScore.toFixed(1)),
          color: data.color,
        };
      })
      .sort((a, b) => b.count - a.count);

    const totalCount = classList.reduce((sum, c) => sum + c.count, 0);
    const listWithPct = classList.map(c => ({
      ...c,
      percentage: totalCount > 0 ? Number(((c.count / totalCount) * 100).toFixed(1)) : 0,
    }));

    // Group by category for Top 3 Donut list
    const categoryTotals = {};
    listWithPct.forEach(item => {
      const cat = item.category || "General";
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { label: cat, count: 0, color: categoryColors[cat] || "#27837f" };
      }
      categoryTotals[cat].count += item.count;
    });

    const categoriesArray = Object.values(categoryTotals)
      .map(c => ({
        label: c.label,
        count: c.count,
        value: totalCount > 0 ? Math.round((c.count / totalCount) * 100) : 0,
        color: c.color,
      }))
      .sort((a, b) => b.count - a.count);

    // Strictly Top 3 categories for balanced card height
    const top3 = categoriesArray.slice(0, 3);

    return {
      defectCategoriesList: listWithPct,
      top3Categories: top3,
      donutTotal: totalCount,
    };
  }, [liveBatches]);

  // Donut conic gradient
  const donutConicGradient = useMemo(() => {
    if (top3Categories.length === 0 || donutTotal === 0) {
      return "conic-gradient(rgba(21, 62, 66, 0.12) 0 100%)";
    }
    let currentPct = 0;
    const gradientSegments = top3Categories.map(c => {
      const start = currentPct;
      currentPct += c.value;
      return `${c.color} ${start}% ${currentPct}%`;
    });
    if (currentPct < 100) {
      gradientSegments.push(`rgba(21, 62, 66, 0.12) ${currentPct}% 100%`);
    }
    return `conic-gradient(${gradientSegments.join(", ")})`;
  }, [top3Categories, donutTotal]);

  // 3. Weekly pattern analysis Heatmap (Starts on Sunday in IST, navigates up to 4 weeks back)
  const { weekDays, heatmapRows, dayTotals, weekLabel } = useMemo(() => {
    const nowIST = getISTDate(new Date());
    const currentDayOfWeek = nowIST.getDay(); // 0 for Sun, 1 for Mon, etc.
    const thisWeekSunday = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate() - currentDayOfWeek);
    const targetSunday = new Date(thisWeekSunday.getTime() - (weekOffset * 7 * 24 * 60 * 60 * 1000));

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(targetSunday.getTime() + i * 24 * 60 * 60 * 1000);
      const dayNum = String(d.getDate()).padStart(2, "0");
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const dateStr = `${dayNum}/${monthNum}`;
      const isoKey = `${d.getFullYear()}-${monthNum}-${dayNum}`;
      days.push({ dayName: dayNames[i], dateStr, isoKey, dateObj: d });
    }

    const sundayLabel = days[0].dateStr;
    const saturdayLabel = days[6].dateStr;
    const label = weekOffset === 0 ? `This week (${sundayLabel} – ${saturdayLabel})` : `${weekOffset}w ago (${sundayLabel} – ${saturdayLabel})`;

    const lines = ["Line 01", "Line 02", "Line 03", "Line 04"];

    const rows = lines.map((lineName) => {
      const values = days.map((day) => {
        let count = 0;
        liveBatches.forEach(b => {
          if (b.line === lineName) {
            const bIST = getISTDate(b.captured);
            const bIso = `${bIST.getFullYear()}-${String(bIST.getMonth() + 1).padStart(2, "0")}-${String(bIST.getDate()).padStart(2, "0")}`;
            if (bIso === day.isoKey) {
              if (b.findings && b.findings.length > 0) {
                b.findings.forEach(f => {
                  if (!isActualDefect(f)) return;
                  count++;
                });
              } else if (b.products) {
                const failed = b.products.filter(p => p.status === "Failed" || p.status === "FAIL").length;
                count += failed;
              }
            }
          }
        });
        return count;
      });
      return { line: lineName, values };
    });

    const totals = days.map((_, dayIdx) => {
      return rows.reduce((sum, row) => sum + row.values[dayIdx], 0);
    });

    return {
      weekDays: days,
      heatmapRows: rows,
      dayTotals: totals,
      weekLabel: label,
    };
  }, [liveBatches, weekOffset]);

  return (
    <section className="fs-section">
      <div className="fs-section-head">
        <div>
          <h2>Defect <em>Pattern Analysis.</em></h2>
          <p>Visualize defect frequency, distribution, and weekly patterns across production lines in IST.</p>
        </div>
      </div>

      <div className="fs-report-grid">
        {/* Bar chart: daily defect count */}
        <article className="fs-chart">
          <div className="fs-card-top">
            <div>
              <span className="fs-kicker">Daily frequency</span>
              <h3>Defect count by day</h3>
            </div>
            <label className="fs-filter-btn fs-result-filter" style={{ minHeight: "26px", padding: "0 8px", fontSize: "11px" }}>
              <CalendarClock size={12} />
              <select value={dailyTrendWindow} onChange={e => setDailyTrendWindow(e.target.value)} aria-label="Defect count date range">
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          <div className="fs-chart-layout" style={{ display: "flex", gap: "10px", margin: "22px 0 0", alignItems: "stretch" }}>
            <div className="fs-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>
              Count
            </div>
            <div className="fs-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", paddingBottom: "21px", fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "6px", textAlign: "right" }}>
              <span>{maxDailyCount}</span>
              <span>{Math.round(maxDailyCount * 0.75)}</span>
              <span>{Math.round(maxDailyCount * 0.5)}</span>
              <span>{Math.round(maxDailyCount * 0.25)}</span>
              <span>0</span>
            </div>
            <div className="fs-bars" style={{ flex: 1, margin: 0, gap: dailyTrendWindow === "30" ? "2px" : dailyTrendWindow === "14" ? "4px" : "7px" }}>
              {dailyTrendData.map((d, i) => (
                <div key={i} title={`${d.dateLabel} (IST): ${d.count} defects`}>
                  <i style={{ height: `${maxDailyCount > 0 ? (d.count / maxDailyCount) * 100 : 0}%` }} />
                  <span style={{ fontSize: dailyTrendWindow === "30" ? "6px" : "7px" }}>{d.dateLabel}</span>
                </div>
              ))}
            </div>
          </div>
          <footer>
            <p><span className="fs-live-dot" />Total: {totalDailyDefects} defects</p>
            <b title="Peak single-day defect count">Peak: {maxDailyCount}</b>
          </footer>
        </article>

        {/* Donut: defect category distribution (Top 3) */}
        <article className="fs-mix">
          <div className="fs-card-top">
            <div>
              <span className="fs-kicker">Distribution</span>
              <h3>Defect categories</h3>
            </div>
            <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>Top 3</span>
          </div>
          <div className="fs-donut" style={{ background: donutConicGradient }}>
            <div>
              <b>{donutTotal}</b>
              <span>defects</span>
            </div>
          </div>
          <ul>
            {top3Categories.length === 0 ? (
              <li style={{ color: "var(--muted)", fontSize: "11px", justifyContent: "center", textAlign: "center" }}>No active defects</li>
            ) : (
              top3Categories.map(c => (
                <li key={c.label}>
                  <span style={{ background: c.color }} />
                  <b>{c.label}</b>
                  <em>{c.value}%</em>
                </li>
              ))
            )}
          </ul>
        </article>

        {/* 3-column Defect Classification, Frequency & Severity Score Table */}
        <article className="fs-chart" style={{ gridColumn: "1 / -1", padding: "16px" }}>
          <div className="fs-card-top" style={{ marginBottom: "14px" }}>
            <div>
              <span className="fs-kicker">Classification analysis</span>
              <h3>Defect Classification Breakdown</h3>
            </div>
            <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              {defectCategoriesList.length} classification{defectCategoriesList.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="fs-table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "8px" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Defect Classification</th>
                  <th style={{ width: "30%", textAlign: "center" }}>Frequency</th>
                  <th style={{ width: "30%", textAlign: "right", paddingRight: "16px" }}>Severity Score</th>
                </tr>
              </thead>
              <tbody>
                {defectCategoriesList.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "28px", color: "var(--muted)" }}>
                      No active defects recorded in the database.
                    </td>
                  </tr>
                ) : (
                  defectCategoriesList.map((item) => (
                    <tr key={item.name}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color || "var(--teal)", flexShrink: 0 }} />
                          <div>
                            <b style={{ fontSize: "12px", color: "var(--ink)" }}>{item.name}</b>
                            <small style={{ color: "var(--muted)", fontSize: "10px" }}>{item.category}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <b style={{ fontSize: "12px" }}>{item.count}</b>
                            <small style={{ fontSize: "11px", color: "var(--muted)" }}>({item.percentage}%)</small>
                          </div>
                          <div style={{ width: "100%", maxWidth: "90px", height: "4px", background: "rgba(21,62,66,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${item.percentage}%`, height: "100%", background: item.color || "var(--teal)", borderRadius: "2px" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <span className={`fs-capability ${item.severityScore >= 7.5 ? "poor" : item.severityScore >= 4.5 ? "adequate" : "excellent"}`} style={{ padding: "3px 8px", fontSize: "10px" }}>
                            {item.severityScore >= 7.5 ? "Critical" : item.severityScore >= 4.5 ? "Moderate" : "Minor"} ({item.severityScore.toFixed(1)})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* Heatmap: Weekly Pattern Analysis starting on Sunday with 4-week navigation */}
      <div style={{ marginTop: "24px" }}>
        <div className="fs-card-top" style={{ marginBottom: "16px", alignItems: "center" }}>
          <div>
            <span className="fs-kicker">Weekly pattern analysis</span>
            <h3 style={{ margin: "4px 0 0" }}>Defect Heatmap · Line × Day</h3>
          </div>
          {/* Week Navigation Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setWeekOffset(v => Math.min(v + 1, 4))}
              disabled={weekOffset >= 4}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: weekOffset >= 4 ? "rgba(21,62,66,0.03)" : "rgba(250,249,240,0.9)",
                color: weekOffset >= 4 ? "var(--muted)" : "var(--ink)",
                cursor: weekOffset >= 4 ? "not-allowed" : "pointer",
                opacity: weekOffset >= 4 ? 0.35 : 1,
                transition: "all 150ms ease",
              }}
              aria-label="Previous week"
              title="Previous week (up to 4 weeks back)"
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--teal-2)", minWidth: "150px", textAlign: "center", letterSpacing: "0.2px" }}>
              {weekLabel}
            </span>

            <button
              type="button"
              onClick={() => setWeekOffset(v => Math.max(v - 1, 0))}
              disabled={weekOffset <= 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: weekOffset <= 0 ? "rgba(21,62,66,0.03)" : "rgba(250,249,240,0.9)",
                color: weekOffset <= 0 ? "var(--muted)" : "var(--ink)",
                cursor: weekOffset <= 0 ? "not-allowed" : "pointer",
                opacity: weekOffset <= 0 ? 0.35 : 1,
                transition: "all 150ms ease",
              }}
              aria-label="Next week"
              title={weekOffset <= 0 ? "Present week" : "Next week"}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="fs-heatmap">
          <div className="fs-heatmap-header">
            <span />
            {weekDays.map(d => (
              <span key={d.isoKey} style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center", lineHeight: 1.15 }}>
                <b style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>{d.dayName}</b>
                <small style={{ fontSize: "9px", color: "var(--ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{d.dateStr}</small>
              </span>
            ))}
          </div>
          {heatmapRows.map(row => (
            <div className="fs-heatmap-row" key={row.line}>
              <span className="fs-heatmap-label">{row.line}</span>
              {row.values.map((v, i) => (
                <span key={i} className={`fs-heatmap-cell ${getHeatmapIntensity(v)}`} title={`${row.line} - ${weekDays[i]?.dayName} ${weekDays[i]?.dateStr} (IST): ${v} defects`}>
                  {v}
                </span>
              ))}
            </div>
          ))}
          {/* Total count row at the bottom */}
          <div className="fs-heatmap-row fs-heatmap-total-row">
            <span className="fs-heatmap-label">Total count</span>
            {dayTotals.map((tot, i) => (
              <span key={i} className={`fs-heatmap-cell fs-heatmap-total-cell ${getHeatmapIntensity(tot)}`} title={`All Lines - ${weekDays[i]?.dayName} ${weekDays[i]?.dateStr} (IST) Total: ${tot} defects`}>
                {tot}
              </span>
            ))}
          </div>
          <div className="fs-heatmap-legend">
            <span>Low</span>
            <span className="fs-heatmap-cell none" />
            <span className="fs-heatmap-cell low" />
            <span className="fs-heatmap-cell medium" />
            <span className="fs-heatmap-cell high" />
            <span className="fs-heatmap-cell critical" />
            <span>High</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Section 4: Quality Analytics
   ═══════════════════════════════════════════════════ */
function QualityAnalytics({ dateRange, setDateRange, line, setLine, liveBatches = [] }) {
  // 1. Filter live batches by dateRange in IST and line
  const filteredBatches = useMemo(() => {
    return liveBatches.filter(b => {
      if (!isBatchInISTDateRange(b.captured, dateRange)) return false;
      if (line !== "All lines" && b.line !== line) return false;
      return true;
    });
  }, [liveBatches, dateRange, line]);

  // 2. Compute Overall Quality Score & Index Metrics
  const { qualityScore, qualityStatus, totalInspected, totalDefects, overallYield, avgConfidence } = useMemo(() => {
    let units = 0;
    let defects = 0;
    let confSum = 0;
    let confCount = 0;

    filteredBatches.forEach(b => {
      const pList = b.products || [];
      const pCount = pList.length || 1;
      units += pCount;

      if (b.findings && b.findings.length > 0) {
        b.findings.forEach(f => {
          if (isActualDefect(f)) defects++;
        });
      } else if (pList.length > 0) {
        defects += pList.filter(p => p.status === "Failed" || p.status === "FAIL").length;
      }

      if (b.confidence) {
        confSum += b.confidence;
        confCount++;
      }
    });

    const hasData = units > 0;
    const yieldRate = hasData ? ((units - defects) / units) * 100 : (filteredBatches.length > 0 ? 100 : 96.8);
    const passRate = hasData ? ((units - defects) / units) * 100 : 96.4;
    const meanConf = confCount > 0 ? confSum / confCount : 95.0;

    const score = Number(((yieldRate * 0.55) + (passRate * 0.30) + (meanConf * 0.15)).toFixed(1));
    const status = score >= 95 ? "Excellent" : score >= 85 ? "Good" : "Needs Improvement";

    return {
      qualityScore: score,
      qualityStatus: status,
      totalInspected: units,
      totalDefects: defects,
      overallYield: Number(yieldRate.toFixed(1)),
      avgConfidence: Number(meanConf.toFixed(1)),
    };
  }, [filteredBatches]);

  // 3. Option B: Line Performance & Severity Impact Matrix
  const lineMatrixData = useMemo(() => {
    const lines = ["Line 01", "Line 02", "Line 03", "Line 04"];
    return lines.map(lineName => {
      const { isRunning } = getLineOperatingStatus(lineName, liveBatches);
      const lineBatches = filteredBatches.filter(b => b.line === lineName);
      let units = 0;
      let defects = 0;
      let criticalDefects = 0;

      lineBatches.forEach(b => {
        const pList = b.products || [];
        const pCount = pList.length || 1;
        units += pCount;

        if (b.findings && b.findings.length > 0) {
          b.findings.forEach(f => {
            if (isActualDefect(f)) {
              defects++;
              if (f.severity === "Critical" || f.severity === "High" || (f.severityScore && f.severityScore >= 70)) {
                criticalDefects++;
              }
            }
          });
        } else if (pList.length > 0) {
          const failed = pList.filter(p => p.status === "Failed" || p.status === "FAIL");
          defects += failed.length;
          if (b.severity === "High" || b.severity === "Critical") criticalDefects += failed.length;
        }
      });

      const fpy = units > 0 ? Number((((units - defects) / units) * 100).toFixed(1)) : 0;
      const stability = !isRunning ? "Standby" : fpy >= 95 ? "High Stability" : fpy >= 85 ? "Moderate" : "Needs Review";

      return {
        line: lineName,
        isRunning,
        units,
        defects,
        criticalDefects,
        fpy,
        stability,
      };
    });
  }, [filteredBatches, liveBatches]);

  // 4. Live Pareto Analysis (80/20 Rule)
  const paretoData = useMemo(() => {
    const defectTypeCounts = {};

    filteredBatches.forEach(b => {
      if (b.findings && b.findings.length > 0) {
        b.findings.forEach(f => {
          if (!isActualDefect(f)) return;
          const typeName = f.defectType || "Unclassified defect";
          defectTypeCounts[typeName] = (defectTypeCounts[typeName] || 0) + 1;
        });
      } else if (b.products) {
        const failed = b.products.filter(p => p.status === "Failed" || p.status === "FAIL");
        failed.forEach(p => {
          const typeName = p.defectType || "Defective";
          defectTypeCounts[typeName] = (defectTypeCounts[typeName] || 0) + 1;
        });
      }
    });

    const entries = Object.entries(defectTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const total = entries.reduce((sum, e) => sum + e.count, 0);

    let cum = 0;
    const items = entries.map(e => {
      cum += e.count;
      return {
        type: e.type,
        count: e.count,
        cumPct: total > 0 ? Number(((cum / total) * 100).toFixed(1)) : 0,
      };
    });

    const maxCount = items.length > 0 ? Math.max(...items.map(i => i.count)) : 1;

    return {
      items,
      total,
      maxCount,
    };
  }, [filteredBatches]);

  // 5. Statistical Process Control (SPC) & Capability Metrics Table
  const spcMetrics = useMemo(() => {
    const lines = ["Line 01", "Line 02", "Line 03", "Line 04"];

    return lines.map(lineName => {
      const { isRunning } = getLineOperatingStatus(lineName, liveBatches);
      const lineBatches = filteredBatches.filter(b => b.line === lineName);
      let units = 0;

      const batchYields = lineBatches.map(b => {
        const pList = b.products || [];
        const pCount = pList.length || 1;
        units += pCount;

        let dCount = 0;
        if (b.findings && b.findings.length > 0) {
          b.findings.forEach(f => { if (isActualDefect(f)) dCount++; });
        } else {
          dCount = pList.filter(p => p.status === "Failed" || p.status === "FAIL").length;
        }
        return ((pCount - dCount) / pCount) * 100;
      });

      if (units === 0) {
        return {
          line: lineName,
          isRunning,
          units: 0,
          mean: 0,
          stdDev: "—",
          cp: "—",
          cpk: "—",
          status: isRunning ? "Active (No Batches)" : "Idle (Standby)",
          statusClass: "idle",
        };
      }

      const mean = batchYields.length > 0 ? batchYields.reduce((a, b) => a + b, 0) / batchYields.length : 100;
      const variance = batchYields.length > 1
        ? batchYields.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (batchYields.length - 1)
        : 1.2;
      const stdDev = Math.max(0.4, Number(Math.sqrt(variance).toFixed(2)));

      const cp = Number((10 / (6 * stdDev)).toFixed(2));
      const cpkUpper = (100 - mean) / (3 * stdDev);
      const cpkLower = (mean - 90) / (3 * stdDev);
      const cpk = Number(Math.max(0, Math.min(cpkUpper, cpkLower)).toFixed(2));

      let status = "Capable (Six Sigma)";
      let statusClass = "excellent";
      if (cpk < 1.0) {
        status = "Critical Drift";
        statusClass = "poor";
      } else if (cpk < 1.33) {
        status = "Adequate Control";
        statusClass = "adequate";
      }

      return {
        line: lineName,
        isRunning: true,
        units,
        mean: Number(mean.toFixed(1)),
        stdDev,
        cp,
        cpk,
        status,
        statusClass,
      };
    });
  }, [filteredBatches]);

  return (
    <section className="fs-section">
      <div className="fs-section-head">
        <div>
          <h2>Statistical <em>Process Control.</em></h2>
          <p>Statistical process control, Pareto analysis, and first pass capability metrics for data-driven quality improvement.</p>
        </div>
        <div className="fs-result-filters">
          <label className="fs-filter-btn fs-result-filter">
            <CalendarClock size={15} />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Date range">
              {inspectionDateFilters.map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="fs-filter-btn fs-result-filter">
            <Filter size={15} />
            <select value={line} onChange={e => setLine(e.target.value)} aria-label="Line">
              {lineFilters.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      {/* Quality Score gauge + Line Matrix (Option B) */}
      <div className="fs-analytics-top">
        <article className="fs-gauge-card">
          <span className="fs-kicker"><Gauge size={14} />Overall quality score</span>
          <div className="fs-gauge-ring">
            <svg viewBox="0 0 120 120" className="fs-gauge-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(21,62,66,0.1)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={qualityScore >= 95 ? "var(--pass)" : qualityScore >= 85 ? "var(--warn)" : "var(--fail)"}
                strokeWidth="8"
                strokeDasharray={`${(qualityScore / 100) * 326.7} 326.7`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="fs-gauge-value">
              <b>{qualityScore}</b>
              <span>%</span>
            </div>
          </div>
          <p className="fs-gauge-status">{qualityStatus}</p>
          <span style={{ fontSize: "10px", color: "var(--muted)", textAlign: "center", marginTop: "4px" }}>
            Yield: {overallYield}% · Conf: {avgConfidence}%
          </span>
        </article>

        {/* Option B: First Pass Yield (FPY) & Severity Impact Matrix by Line */}
        <div className="fs-line-matrix-grid">
          {lineMatrixData.map(l => (
            <div key={l.line} className="fs-line-matrix-card">
              <div className="fs-line-matrix-head">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Factory size={14} style={{ color: "var(--teal-2)" }} />
                  <b>{l.line}</b>
                </div>
                <span className={`fs-line-matrix-status ${l.isRunning ? "running" : "idle"}`}>
                  {l.isRunning ? "Running" : "Idle"}
                </span>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>First Pass Yield</span>
                  <b style={{ color: l.fpy >= 95 ? "var(--pass)" : l.fpy >= 85 ? "var(--warn)" : l.isRunning ? "var(--fail)" : "var(--muted)" }}>
                    {l.isRunning ? `${l.fpy}%` : "—"}
                  </b>
                </div>
                <div className="fs-line-matrix-bar-wrap">
                  <div
                    className="fs-line-matrix-bar"
                    style={{
                      width: l.isRunning ? `${l.fpy}%` : "0%",
                      background: l.fpy >= 95 ? "var(--pass)" : l.fpy >= 85 ? "var(--warn)" : "var(--fail)",
                    }}
                  />
                </div>
              </div>

              <div className="fs-line-matrix-metrics">
                <span>Units: <b>{l.units}</b></span>
                <span>Critical Flags: <b style={{ color: l.criticalDefects > 0 ? "var(--fail)" : "var(--pass)" }}>{l.criticalDefects}</b></span>
                <span>Status: <b style={{ color: "var(--teal-2)" }}>{l.stability}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pareto chart */}
      <div style={{ marginTop: "24px" }}>
        <div className="fs-card-top" style={{ marginBottom: "16px" }}>
          <div>
            <span className="fs-kicker">Pareto analysis</span>
            <h3>Top Defect Types by Frequency</h3>
          </div>
          <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
            80/20 Vital Few Rule
          </span>
        </div>

        {paretoData.items.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", background: "#f3f5ec", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--muted)", fontSize: "12px" }}>
            No defects recorded in the selected period. Quality metrics are at 100% first pass yield.
          </div>
        ) : (
          <div className="fs-pareto" style={{ position: "relative" }}>
            <div className="fs-pareto-bars" style={{ position: "relative" }}>
              {/* 80% reference dashed line */}
              <div className="fs-pareto-ref-80" style={{ bottom: "80%" }}>
                <span>80% Threshold (Vital Few)</span>
              </div>

              {paretoData.items.map((d, i) => (
                <div key={i} className="fs-pareto-item">
                  <div className="fs-pareto-bar-wrap">
                    <div
                      className="fs-pareto-bar"
                      style={{ height: `${(d.count / paretoData.maxCount) * 100}%` }}
                      title={`${d.type}: ${d.count} defects (${d.cumPct}% cumulative)`}
                    />
                    <div
                      className="fs-pareto-cum"
                      style={{ bottom: `${d.cumPct}%` }}
                      title={`${d.type} Cumulative: ${d.cumPct}%`}
                    />
                  </div>
                  <span className="fs-pareto-label" title={d.type}>{d.type}</span>
                  <span className="fs-pareto-count">{d.count}</span>
                </div>
              ))}
            </div>

            <div className="fs-pareto-legend">
              <span><i style={{ background: "var(--teal)" }} /> Defect Count (Bars)</span>
              <span><i style={{ background: "var(--warn)" }} /> Cumulative % (80/20 Curve)</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink)" }}>
                Total Defects Analyzed: <b>{paretoData.total}</b>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Statistical Process Control (SPC) Table */}
      <div style={{ marginTop: "24px" }}>
        <div className="fs-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <span className="fs-kicker">SPC & Capability</span>
            <h3>Statistical Process Control (Cp / Cpk)</h3>
          </div>
          <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
            USL: 100% · LSL: 90%
          </span>
        </div>
        <div className="fs-table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "8px" }}>
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th>Units Scanned</th>
                <th>Mean Yield (%)</th>
                <th>Std Dev (σ)</th>
                <th>Cp</th>
                <th>Cpk</th>
                <th>Capability Status</th>
              </tr>
            </thead>
            <tbody>
              {spcMetrics.map(m => (
                <tr key={m.line}>
                  <td><b>{m.line}</b></td>
                  <td><b>{m.units}</b></td>
                  <td><b>{m.isRunning ? `${m.mean}%` : "—"}</b></td>
                  <td>{m.stdDev}</td>
                  <td><b>{m.cp}</b></td>
                  <td><b>{m.cpk}</b></td>
                  <td>
                    <span className={`fs-capability ${m.statusClass}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Section 5: Production Monitoring
   ═══════════════════════════════════════════════════ */
function ProductionMonitoring({ day, setDay, line, setLine, notify, lines, liveBatches = [] }) {
  // Full 24-hour throughput (00:00 to 23:00) filtered by Today/Yesterday and line in IST
  const { hourlyData, peakHourly, totalOutput } = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

    const nowIST = getISTDate(new Date());
    const targetDateIso = day === "Yesterday"
      ? (() => {
        const y = new Date(nowIST.getTime() - 24 * 60 * 60 * 1000);
        return `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      })()
      : `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}-${String(nowIST.getDate()).padStart(2, "0")}`;

    const filtered = liveBatches.filter(b => {
      // Date filter (Today vs Yesterday)
      const bIST = getISTDate(b.captured);
      const bIso = `${bIST.getFullYear()}-${String(bIST.getMonth() + 1).padStart(2, "0")}-${String(bIST.getDate()).padStart(2, "0")}`;
      if (bIso !== targetDateIso) return false;

      // Line filter
      if (line !== "All lines" && b.line !== line) return false;

      return true;
    });

    const liveHourCounts = {};
    filtered.forEach(b => {
      const d = getISTDate(b.captured);
      const hrStr = `${String(d.getHours()).padStart(2, "0")}:00`;
      const count = b.products?.length || 1;
      liveHourCounts[hrStr] = (liveHourCounts[hrStr] || 0) + count;
    });

    const data = hours.map(hr => {
      const units = liveHourCounts[hr] || 0;
      return { hour: hr, units };
    });

    const total = data.reduce((sum, h) => sum + h.units, 0);
    const peak = Math.max(...data.map(h => h.units), 0);

    return {
      hourlyData: data,
      peakHourly: peak,
      totalOutput: total,
    };
  }, [liveBatches, day, line]);

  const maxHourlyScale = peakHourly > 0 ? peakHourly : 10;

  return (
    <section className="fs-section">
      <div className="fs-section-head">
        <div>
          <h2>Real-Time <em>Floor Telemetry.</em></h2>
          <p>Real-time production floor telemetry, 24-hour hourly throughput pacing, and shift handoff operations.</p>
        </div>
        <div className="fs-result-filters" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Side-by-side Today / Yesterday toggle placed on top-right above card */}
          <div className="fs-day-toggle-group">
            <button
              type="button"
              className={day === "Today" ? "active" : ""}
              onClick={() => setDay("Today")}
            >
              Today
            </button>
            <button
              type="button"
              className={day === "Yesterday" ? "active" : ""}
              onClick={() => setDay("Yesterday")}
            >
              Yesterday
            </button>
          </div>

          <label className="fs-filter-btn fs-result-filter">
            <Filter size={15} />
            <select value={line} onChange={e => setLine(e.target.value)} aria-label="Production line">
              {lineFilters.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      {/* Full-width 24-Hour Hourly Throughput Chart */}
      <article className="fs-chart fs-monitor-full-chart" style={{ padding: "20px" }}>
        <div className="fs-card-top" style={{ marginBottom: "8px", alignItems: "center" }}>
          <div>
            <span className="fs-kicker">Throughput pacing</span>
            <h3>Hourly Output</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              {day} · {line}
            </span>
            <span className="fs-badge-pill" style={{ background: "#e8f5f2", color: "var(--teal)", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
              Live Telemetry
            </span>
          </div>
        </div>

        <div className="fs-chart-layout" style={{ display: "flex", gap: "12px", margin: "22px 0 0", alignItems: "stretch" }}>
          <div className="fs-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>
            Units / Hour
          </div>
          <div className="fs-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "200px", paddingBottom: "21px", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "8px", textAlign: "right", minWidth: "30px" }}>
            <span>{maxHourlyScale}</span>
            <span>{Math.round(maxHourlyScale * 0.75)}</span>
            <span>{Math.round(maxHourlyScale * 0.5)}</span>
            <span>{Math.round(maxHourlyScale * 0.25)}</span>
            <span>0</span>
          </div>
          <div className="fs-bars" style={{ flex: 1, margin: 0, gap: "4px" }}>
            {hourlyData.map((h, i) => {
              const heightPct = maxHourlyScale > 0 ? (h.units / maxHourlyScale) * 100 : 0;
              return (
                <div key={i} title={`${h.hour}: ${h.units} units scanned`}>
                  <i style={{ height: `${heightPct}%`, minHeight: h.units > 0 ? "4px" : "0px", transition: "height 300ms ease" }} />
                  <span style={{ fontSize: "7.5px", letterSpacing: "-0.2px" }}>{h.hour.split(":")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <footer style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
            <span className="fs-live-dot" /> Peak Pacing: <b style={{ color: "var(--ink)", fontWeight: 700 }}>{peakHourly} units/hr</b>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Total Units ({day}):</span>
            <b style={{ fontSize: "18px", color: "var(--ink)", fontFamily: "var(--font-mono)", letterSpacing: "-0.5px" }}>
              {formatNumber(totalOutput)}
            </b>
          </div>
        </footer>
      </article>
    </section>
  );
}
