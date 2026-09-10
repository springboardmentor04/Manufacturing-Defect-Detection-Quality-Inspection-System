import { AlertTriangle, BarChart3, Bell, CalendarClock, Camera, Check, CheckCheck, ChevronDown, ChevronRight, CircleDotDashed, Clock, Download, Eye, FileCheck2, FileImage, Files, Filter, History, Layers, LayoutDashboard, ListFilter, LogOut, Megaphone, Menu, Moon, MoreHorizontal, PanelLeft, RefreshCw, Search, Settings, Sparkles, Trash2, UploadCloud, UserRound, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import DefectDetailsWorkspace from "./DefectDetailsWorkspace.jsx";
import SettingsModal from "./SettingsModal.jsx";
import { useTheme } from "@/contexts/ThemeContext";
import { generateQualityReport } from "../utils/qualityReportGenerator";
import { bytesLabel, dashboardSections, defectMix, filterHistoryRowsByDate, filterInspectionBatches, getBatchOutcome, getHistoryBatchSummary, getHistoryExportRows, getManualReviewProgress, historyDateFilters, historyExportColumns, historyExportFilename, historyRows, inspectionBatches, inspectionDateFilters, inspectionResults, inspectionSummary, readSidebarExpandedPreference, validateBatchFiles, writeSidebarExpandedPreference } from "@/lib/qualityDashboard";

const icons = { upload: Camera, results: LayoutDashboard, details: CircleDotDashed, reports: BarChart3, history: History };

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

// 7 days auto-disappear window in milliseconds
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function Severity({ value }) {
  return <span className={`qe-pill qe-${value.toLowerCase()}`}>{value}</span>;
}

function Notice({ tone = "info", children }) {
  if (!children) return null;
  return <p className={`qe-note qe-note-${tone}`} role="status">{tone === "error" ? <AlertTriangle size={14} /> : <Check size={14} />}{children}</p>;
}

export default function QualityEngineerDashboard({ user, onSignOut, isSigningOut }) {
  const [active, setActive] = useState(() => {
    try {
      return sessionStorage.getItem("vi_active_tab") || "results";
    } catch {
      return "results";
    }
  });
  const [liveBatches, setLiveBatches] = useState(inspectionBatches);
  const [liveResults, setLiveResults] = useState(inspectionResults);
  const [isUploading, setIsUploading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => readSidebarExpandedPreference());
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const defaultSelected = {
    id: "IR-NONE",
    productId: "PRD-NONE",
    product: "NO-BATCH",
    line: "Line 01",
    batch: "BT-NONE",
    defect: "No defects",
    severity: "Low",
    severityScore: 0,
    confidence: 100.0,
    area: "0.0%",
    decision: "Pass",
    mode: "Detection",
    time: "Now",
    image: "/manus-storage/hazelnut_cap_defective.png",
    marker: { left: "58%", top: "38%", width: "23%", height: "28%" }
  };

  const [selectedId, setSelectedId] = useState(liveResults[0]?.id || "IR-NONE");
  const [reportRange, setReportRange] = useState("7 days");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All batches");
  const [historyDateRange, setHistoryDateRange] = useState("Last 7 days");
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [resultFilter, setResultFilter] = useState("All");
  const [resultDateRange, setResultDateRange] = useState("Last 30 days");
  const [resultLine, setResultLine] = useState("All lines");
  const [detailDateRange, setDetailDateRange] = useState("Last 30 days");
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState(null);
  const [selectedDetailBatchId, setSelectedDetailBatchId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(liveBatches[0]?.products?.[0]?.id || "PRD-NONE");
  const userKey = String(user?.id ?? user?.email ?? user?.name ?? "guest");
  const [allReviews, setAllReviews] = useState([]);
  const [reviewedProductIds, setReviewedProductIds] = useState(() => new Set());
  const [actionMessage, setActionMessage] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const [uploadLineNo, setUploadLineNo] = useState("04");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inputRef = useRef(null);
  const notifRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Supervisor Notices state & 7-day auto-disappear (User-scoped read tracking)
  const [noticesModalOpen, setNoticesModalOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Workspace Emoji & Workspace Name state
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

  const [readNoticeIds, setReadNoticeIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`visioninspect_qe_read_notices_${userKey}`) || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`visioninspect_qe_read_notices_${userKey}`);
      setReadNoticeIds(new Set(stored ? JSON.parse(stored) : []));
    } catch {
      setReadNoticeIds(new Set());
    }
  }, [userKey]);

  const detailBatches = useMemo(() => filterInspectionBatches(liveBatches, "All severity", detailDateRange, "All lines"), [liveBatches, detailDateRange]);
  const detailBatch = (selectedDetailBatchId && liveBatches.find((b) => b.id === selectedDetailBatchId)) || (detailBatches.length > 0 ? detailBatches[0] : liveBatches[0]) || { id: "BT-NONE", name: "No Batches", line: "Line 01", products: [] };
  const activeProduct = detailBatch?.products?.find((product) => product.id === selectedProductId) || detailBatch?.products?.[0] || { id: "PRD-NONE", name: "Product Component" };
  const detailFindings = useMemo(() => liveResults.filter((item) => item.batch === detailBatch?.id), [liveResults, detailBatch?.id]);
  const selectedFinding = liveResults.find((item) => item.batch === detailBatch?.id && item.productId === activeProduct?.id) || liveResults.find((item) => item.batch === detailBatch?.id);
  const selected = selectedFinding || {
    id: `IR-${activeProduct?.id || '000'}`,
    productId: activeProduct?.id,
    product: detailBatch.name,
    line: detailBatch.line,
    batch: detailBatch.id,
    defect: activeProduct?.status === "Failed" ? "Defective" : "Not defective",
    severity: activeProduct?.status === "Failed" ? "High" : "Low",
    severityScore: activeProduct?.status === "Failed" ? 75 : 0,
    sizeScore: 0,
    locationScore: 0,
    defectTypeScore: 0,
    confidence: activeProduct?.confidence || detailBatch.confidence || 99.8,
    area: "0.0%",
    decision: activeProduct?.status === "Failed" ? "Fail" : "Pass",
    mode: detailBatch.mode || "Detection + segmentation",
    time: detailBatch.captured || "Recently",
    image: activeProduct?.imageUrl || detailBatch.image || "/manus-storage/hazelnut_cap_defective.png",
    scannedBy: detailBatch.scannedBy || detailBatch.createdBy,
    captured: detailBatch.captured
  };

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(clockTimer);
  }, []);

  const activeNotices = useMemo(() => {
    return notices.filter(n => {
      if (!n.createdAt) return false;
      const createdMs = new Date(n.createdAt).getTime();
      return !isNaN(createdMs) && (currentTime - createdMs <= SEVEN_DAYS_MS);
    });
  }, [notices, currentTime]);

  const unreadNoticesCount = useMemo(() => {
    return activeNotices.filter(n => !readNoticeIds.has(n._id || n.id)).length;
  }, [activeNotices, readNoticeIds]);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/pyapi/api/announcements");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.announcements)) {
          setNotices(data.announcements);
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
          const valid = parsed.filter(a => Date.now() - new Date(a.createdAt).getTime() <= SEVEN_DAYS_MS);
          setNotices(valid);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchNotices();
    const annTimer = setInterval(fetchNotices, 45000);
    return () => clearInterval(annTimer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && noticesModalOpen) {
        setNoticesModalOpen(false);
      }
      if (e.key === "Escape" && profileMenuOpen) {
        setProfileMenuOpen(false);
      }
    };
    const handleClickOutside = () => {
      if (profileMenuOpen) setProfileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [noticesModalOpen, profileMenuOpen]);

  const handleMarkAsRead = async (id) => {
    setReadNoticeIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`visioninspect_qe_read_notices_${userKey}`, JSON.stringify([...next]));
      } catch { }
      return next;
    });
    try {
      await fetch(`/pyapi/api/announcements/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerId: userKey,
          engineerName: user?.name || "Quality Engineer"
        })
      });
    } catch (err) {
      console.warn("Could not sync notice read status with MongoDB:", err);
    }
    notify("Notice marked as read.");
  };

  const handleMarkAllAsRead = async () => {
    const allIds = activeNotices.map(n => n._id || n.id);
    setReadNoticeIds(prev => {
      const next = new Set([...prev, ...allIds]);
      try {
        localStorage.setItem(`visioninspect_qe_read_notices_${userKey}`, JSON.stringify([...next]));
      } catch { }
      return next;
    });
    try {
      await fetch("/pyapi/api/announcements/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerId: userKey,
          engineerName: user?.name || "Quality Engineer",
          announcementIds: allIds
        })
      });
    } catch (err) {
      console.warn("Could not sync bulk notice read status with MongoDB:", err);
    }
    notify("All notices marked as read.");
  };

  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(`visioninspect_qe_notifications_${userKey}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: "init-1",
        message: `Welcome, ${user?.name || "Quality Engineer"}. Quality inspection pipeline connected to MongoDB.`,
        tone: "info",
        time: "Just now",
        read: true
      }
    ];
  });
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`visioninspect_qe_notifications_${userKey}`, JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications, userKey]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const manualHistoryRows = useMemo(() => {
    const combinedHistory = [...liveBatches.map(b => {
      const failedCount = b.flagCount ?? (b.products?.filter(p => p.status === "Failed").length || 0);
      return {
        id: b.id,
        name: b.name,
        product: b.name,
        line: b.line,
        status: b.status || "In review",
        completed: b.captured,
        captured: b.captured,
        capturedAt: b.capturedAt,
        createdAt: b.createdAt || b.capturedAt,
        ageDays: b.ageDays ?? 0,
        result: b.severity === "High" || b.severity === "Critical" ? "Hold" : b.severity === "Medium" ? "Review" : "Pass",
        itemCount: b.products?.length || b.itemCount || 1,
        flags: failedCount,
        severity: b.severity,
        failureReason: b.failureReason,
        scannedBy: b.scannedBy,
        reviewedBy: b.reviewedBy
      };
    }), ...historyRows.filter(h => !liveBatches.some(b => b.id === h.id))];

    return combinedHistory.map((row) => {
      const batch = liveBatches.find((item) => item.id === row.id);
      const outcome = batch ? getBatchOutcome(batch.products) : { itemCount: row.itemCount || 0, flags: row.flags || 0 };
      const failedCount = batch ? (batch.flagCount ?? (outcome.flags > 0 ? outcome.flags : (batch.products?.filter(p => p.status === "Failed").length || 0))) : (row.flags || 0);
      const isFailed = failedCount > 0 || row.result === "Hold" || row.result === "Fail" || batch?.severity === "Critical" || batch?.severity === "High" || batch?.severity === "Medium";
      const verdict = isFailed ? "Fail" : "Pass";
      const flags = failedCount;

      // Match reviews for this batch
      const batchReviews = allReviews.filter(r => r.batchId === row.id || (batch && batch.products?.some(p => p.id === r.productId)));
      const reviewerNames = [...new Set(batchReviews.map(r => r.reviewerName || r.reviewerId).filter(Boolean))];
      const hasManualReviews = reviewerNames.length > 0 || Boolean(batch?.reviewedBy && String(batch.reviewedBy).trim().length > 0) || Boolean(row.reviewedBy && String(row.reviewedBy).trim().length > 0);
      const reviewer = reviewerNames.length > 0 ? reviewerNames.join(", ") : (batch?.reviewedBy || row.reviewedBy || null);

      const isBatchComplete = hasManualReviews || batch?.status === "Complete" || row.status === "Complete";
      const reviewCompletedTime = batchReviews[0]?.reviewedAt ? formatCapturedTime(batchReviews[0].reviewedAt) : (batch?.captured || row.captured);

      return {
        ...row,
        ...outcome,
        flags,
        verdict,
        severity: batch?.severity || row.severity,
        status: isBatchComplete ? "Complete" : "In review",
        completed: isBatchComplete ? `Manual review complete · ${reviewCompletedTime}` : "In review",
        reviewer: reviewer,
        reviewedBy: reviewer
      };
    });
  }, [liveBatches, reviewedProductIds, allReviews]);

  const stagedSize = files.reduce((total, file) => total + file.size, 0);
  const filteredHistory = useMemo(() => filterHistoryRowsByDate(manualHistoryRows, historyDateRange).filter((row) => {
    const matchSearch = `${row.id} ${row.product} ${row.line}`.toLowerCase().includes(historySearch.trim().toLowerCase());
    const matchFilter = historyFilter === "All batches" || row.status === historyFilter;
    return matchSearch && matchFilter;
  }), [historyDateRange, historyFilter, historySearch, manualHistoryRows]);

  const resultLines = useMemo(() => ["All lines", ...new Set(liveBatches.map((batch) => batch.line))], [liveBatches]);
  
  const personalInspectedCount = useMemo(() => {
    const currentUserId = String(user?.id ?? user?.email ?? user?.name ?? "usr_qe_admin").toLowerCase();
    const currentUserName = String(user?.name ?? "").trim().toLowerCase();
    const currentUserEmail = String(user?.email ?? "").trim().toLowerCase();

    const userReviewedProductIds = new Set(
      (allReviews || [])
        .filter(r => {
          const revId = String(r.reviewerId ?? "").trim().toLowerCase();
          const revName = String(r.reviewerName ?? "").trim().toLowerCase();
          const note = String(r.note ?? "").toLowerCase();
          return (
            revId === currentUserId ||
            (currentUserEmail && (revId === currentUserEmail || revName === currentUserEmail)) ||
            (currentUserName && (revId.includes(currentUserName) || revName.includes(currentUserName) || note.includes(currentUserName)))
          );
        })
        .map(r => r.productId)
    );

    (liveBatches || []).forEach(b => {
      const scanned = String(b.scannedBy || b.createdBy || "").trim().toLowerCase();
      const scannedId = String(b.scannedById || b.createdById || "").trim().toLowerCase();
      if (
        (scanned && (scanned === currentUserId || (currentUserName && scanned.includes(currentUserName)) || (currentUserEmail && scanned === currentUserEmail))) ||
        (scannedId && (scannedId === currentUserId || (currentUserEmail && scannedId === currentUserEmail)))
      ) {
        (b.products || []).forEach(p => userReviewedProductIds.add(p.id));
      }
    });

    return userReviewedProductIds.size;
  }, [allReviews, liveBatches, user]);

  const filteredBatches = useMemo(() => {
    let result = filterInspectionBatches(liveBatches, resultFilter === "Mine" ? "All" : resultFilter, resultDateRange, resultLine);
    if (resultFilter === "Mine") {
      const currentUserId = String(user?.id ?? user?.email ?? user?.name ?? "usr_qe_admin").toLowerCase();
      const currentUserName = String(user?.name ?? "").trim().toLowerCase();
      const currentUserEmail = String(user?.email ?? "").trim().toLowerCase();
      const myProductIds = new Set(
        (allReviews || [])
          .filter(r => {
            const revId = String(r.reviewerId ?? "").trim().toLowerCase();
            const revName = String(r.reviewerName ?? "").trim().toLowerCase();
            return (
              revId === currentUserId ||
              (currentUserEmail && (revId === currentUserEmail || revName === currentUserEmail)) ||
              (currentUserName && (revId.includes(currentUserName) || revName.includes(currentUserName)))
            );
          })
          .map(r => r.productId)
      );
      result = result.filter(b => {
        const scanned = String(b.scannedBy || b.createdBy || "").trim().toLowerCase();
        const scannedId = String(b.scannedById || b.createdById || "").trim().toLowerCase();
        const isMyBatch = (
          (scanned && (scanned === currentUserId || (currentUserName && scanned.includes(currentUserName)) || (currentUserEmail && scanned === currentUserEmail))) ||
          (scannedId && (scannedId === currentUserId || (currentUserEmail && scannedId === currentUserEmail)))
        );
        return isMyBatch || (b.products || []).some(p => myProductIds.has(p.id));
      });
    }
    return result;
  }, [liveBatches, resultDateRange, resultFilter, resultLine, allReviews, user]);

  const selectedBatch = liveBatches.find((batch) => batch.id === selectedBatchId) || null;

  useEffect(() => {
    writeSidebarExpandedPreference(sidebarExpanded);
  }, [sidebarExpanded]);

  function formatCapturedTime(isoString) {
    if (!isoString) return "Just now";
    try {
      let dateStr = String(isoString).trim();
      if (dateStr.includes("T") && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
        dateStr += "Z";
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  const fetchLiveData = async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/pyapi/api/batches");
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.batches?.length > 0) {
          const loadedBatches = [];
          const loadedResults = [];

          resData.batches.forEach(b => {
            const formattedTime = formatCapturedTime(b.capturedAt);
            const capturedDateObj = b.capturedAt ? new Date(b.capturedAt) : new Date();
            const diffMs = Date.now() - capturedDateObj.getTime();
            const calculatedAgeDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));

            loadedBatches.push({
              id: b._id,
              name: b.name,
              line: b.line,
              captured: formattedTime,
              capturedAt: b.capturedAt,
              completedAt: b.completedAt,
              createdAt: b.createdAt || b.capturedAt,
              ageDays: calculatedAgeDays,
              sortOrder: b.sortOrder || 1,
              severity: b.overallSeverity || "Low",
              confidence: b.overallConfidence || 95.0,
              status: b.status,
              mode: b.mode || "Detection",
              scannedBy: b.scannedBy || b.createdBy || null,
              scannedById: b.scannedById || b.createdById || null,
              reviewedBy: b.reviewedBy || null,
              reviewedById: b.reviewedById || null,
              createdBy: b.createdBy || b.scannedBy || null,
              image: b.image ? (b.image.startsWith("http") ? b.image : `/pyapi${b.image}`) : "/manus-storage/hazelnut_cap_defective.png",
              products: (b.products || []).map(p => ({
                id: p._id,
                name: p.name,
                status: p.status,
                confidence: p.confidence,
                imageUrl: p.imageUrl ? (p.imageUrl.startsWith("http") ? p.imageUrl : `/pyapi${p.imageUrl}`) : b.image,
                captured: formatCapturedTime(p.capturedAt || b.capturedAt),
                capturedAt: p.capturedAt || b.capturedAt,
                createdAt: p.createdAt || b.createdAt || b.capturedAt
              }))
            });

            (b.products || []).forEach((prod, idx) => {
              const f = (b.findings || []).find(finding => finding.productId === prod._id) || (b.findings || [])[idx];
              const gUrl = f?.gradcamUrl || (f?.rawOutput && f.rawOutput.gradcamUrl);
              const sUrl = f?.segmentationUrl || (f?.rawOutput && f.rawOutput.segmentationUrl);
              const bUrl = f?.bboxUrl || (f?.rawOutput && f.rawOutput.bboxUrl);
              const gradcamImg = gUrl ? (gUrl.startsWith("http") ? gUrl : `/pyapi${gUrl}`) : null;
              const segImg = sUrl ? (sUrl.startsWith("http") ? sUrl : `/pyapi${sUrl}`) : null;
              const bboxImg = bUrl ? (bUrl.startsWith("http") ? bUrl : `/pyapi${bUrl}`) : null;
              const itemImg = f?.imageUrl || prod.imageUrl || b.image;
              const finalImg = itemImg ? (itemImg.startsWith("http") ? itemImg : `/pyapi${itemImg}`) : "/manus-storage/hazelnut_cap_defective.png";

              loadedResults.push({
                id: f?.findingCode || f?._id || `IR-${prod._id}`,
                productId: prod._id,
                product: b.name,
                line: b.line,
                batch: b._id,
                defect: f?.defectType || (prod.status === "Failed" ? "Defective" : "Not defective"),
                severity: f?.severity || (prod.status === "Failed" ? "High" : "Low"),
                severityScore: f?.severityScore ?? (prod.status === "Failed" ? 75 : 0),
                sizeScore: f?.sizeScore ?? f?.defects?.[0]?.size_score ?? 0,
                locationScore: f?.locationScore ?? f?.defects?.[0]?.location_score ?? 0,
                defectTypeScore: f?.defectTypeScore ?? f?.defects?.[0]?.type_score ?? 0,
                confidence: f?.confidence || prod.confidence || b.overallConfidence || 99.8,
                area: f?.defectArea || "0.0%",
                decision: f?.decision || (prod.status === "Failed" ? "Fail" : "Pass"),
                mode: b.mode || "Detection",
                time: "Recently",
                image: finalImg,
                gradcamImage: gradcamImg,
                segmentationImage: segImg,
                bboxImage: bboxImg,
                defects: f?.defects || [],
                marker: f?.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" },
                scannedBy: b.scannedBy || b.createdBy,
                captured: formattedTime
              });
            });
          });

          setLiveBatches(loadedBatches);
          if (loadedResults.length > 0) {
            setLiveResults(loadedResults);
            setSelectedId(prev => prev || loadedResults[0].id);
            setSelectedProductId(prev => prev || loadedResults[0].productId);
          }
        }
      }

      // Fetch stored manual reviews from MongoDB
      const revRes = await fetch("/pyapi/api/reviews/list");
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.success && revData.reviews?.length > 0) {
          setAllReviews(revData.reviews);
          const savedReviewedIds = new Set(revData.reviews.map((r) => r.productId));
          setReviewedProductIds(savedReviewedIds);
        }
      }
      if (showNotification) {
        notify("Quality Dashboard synced with latest MongoDB inspections.");
      }
    } catch (err) {
      console.warn("FastAPI backend live fetch:", err);
      if (showNotification) {
        notify("Unable to sync: backend server is offline.", "error");
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchLiveData(false);
    // Continuous 1-minute auto-poll interval to sync new batches without re-logging in
    const interval = setInterval(() => {
      fetchLiveData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const chooseFiles = (fileList) => {
    const { accepted, rejected } = validateBatchFiles(fileList, files.map((file) => file.name));
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    if (rejected.length) {
      setMessage(rejected[0]);
      setMessageTone("error");
    } else if (accepted.length) {
      setMessage(`${accepted.length} image${accepted.length === 1 ? "" : "s"} staged for this review batch.`);
      setMessageTone("info");
    }
  };

  const selectSection = (id) => {
    setActive(id);
    try {
      sessionStorage.setItem("vi_active_tab", id);
    } catch { }
    setMobileNav(false);
  };

  const expandFromRail = (event) => {
    if (!sidebarExpanded && event.target === event.currentTarget) setSidebarExpanded(true);
  };

  const queueBatch = async (overrideFiles = null, overrideLine = null) => {
    const targetFiles = overrideFiles || files;
    if (!targetFiles.length) {
      setMessage("Stage at least one image before creating a review batch.");
      setMessageTone("error");
      return;
    }
    setIsUploading(true);
    setMessage(`Uploading batch of ${targetFiles.length} items and executing AI model inference...`);
    setMessageTone("info");

    try {
      const formData = new FormData();
      targetFiles.forEach((file) => formData.append("files", file));
      const rawLine = (overrideLine || uploadLineNo).trim() || "04";
      const formattedLine = rawLine.toLowerCase().startsWith("line") ? rawLine : `Line ${rawLine.padStart(2, "0")}`;
      formData.append("line", formattedLine);
      formData.append("scanned_by", user?.name || "Quality Engineer");
      formData.append("scanned_by_id", String(user?.id ?? user?.email ?? user?.name ?? ""));

      const response = await fetch("/pyapi/api/batches/create", {
        method: "POST",
        body: formData,
      });
      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.detail || "Failed to create inspection batch.");
      }

      const { batch, products, findings, images } = resData.data;

      const formattedTime = formatCapturedTime(batch.capturedAt);
      const newUIBatch = {
        id: batch._id,
        name: batch.name,
        line: batch.line,
        captured: formattedTime,
        ageDays: 0,
        sortOrder: batch.sortOrder || 10,
        severity: batch.overallSeverity || "Low",
        confidence: batch.overallConfidence || 95.0,
        status: batch.status,
        mode: batch.mode || "Detection + segmentation",
        scannedBy: user?.name || "Quality Engineer",
        createdBy: user?.name || "Quality Engineer",
        scannedById: String(user?.id ?? user?.email ?? user?.name ?? ""),
        image: images[0]?.url ? `/pyapi${images[0].url}` : "/manus-storage/hazelnut_cap_defective.png",
        marker: findings[0]?.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" },
        products: products.map((p) => ({
          id: p._id,
          name: p.name,
          status: p.status,
          confidence: p.confidence,
          captured: formatCapturedTime(p.capturedAt || batch.capturedAt)
        }))
      };

      const newUIResults = findings.map((f, idx) => {
        const prod = products[idx] || products[0] || {};
        const img = images[idx] || images[0] || {};
        const gUrl = f.gradcamUrl;
        const sUrl = f.segmentationUrl;
        const bUrl = f.bboxUrl;
        const gradcamImg = gUrl ? (gUrl.startsWith("http") ? gUrl : `/pyapi${gUrl}`) : null;
        const segImg = sUrl ? (sUrl.startsWith("http") ? sUrl : `/pyapi${sUrl}`) : null;
        const bboxImg = bUrl ? (bUrl.startsWith("http") ? bUrl : `/pyapi${bUrl}`) : null;
        const itemImg = f.imageUrl || prod.imageUrl || img.url;
        const finalImg = itemImg ? (itemImg.startsWith("http") ? itemImg : `/pyapi${itemImg}`) : "/manus-storage/hazelnut_cap_defective.png";

        return {
          id: f.findingCode || f._id,
          productId: prod._id,
          product: batch.name,
          line: batch.line,
          batch: batch._id,
          defect: f.defectType,
          severity: f.severity,
          severityScore: f.severityScore,
          sizeScore: f.sizeScore ?? f.defects?.[0]?.size_score,
          locationScore: f.locationScore ?? f.defects?.[0]?.location_score,
          defectTypeScore: f.defectTypeScore ?? f.defects?.[0]?.type_score,
          confidence: f.confidence,
          area: f.defectArea,
          decision: f.decision,
          mode: batch.mode || "Detection + segmentation",
          time: "Just now",
          image: finalImg,
          gradcamImage: gradcamImg,
          segmentationImage: segImg,
          bboxImage: bboxImg,
          defects: f.defects || [],
          marker: f.boundingBox || { left: "58%", top: "38%", width: "23%", height: "28%" }
        };
      });

      setLiveBatches((prev) => [newUIBatch, ...prev]);
      setLiveResults((prev) => [...newUIResults, ...prev]);
      if (!overrideFiles) {
        setFiles([]);
      }
      setMessage(`Batch ${batch.name} (${targetFiles.length} items) processed successfully! Inspection results ready.`);
      setMessageTone("info");
      notify(`Batch ${batch._id} (${targetFiles.length} items) created and processed by AI models!`);
      setActive("results");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to process batch with AI server.");
      setMessageTone("error");
    } finally {
      setIsUploading(false);
    }
  };

  const notify = (nextMessage, tone = "success") => {
    if (!nextMessage) return;
    setActionMessage(nextMessage);

    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setNotifications((prev) => [
      {
        id: newId,
        message: nextMessage,
        tone,
        time: "Just now",
        timestamp: Date.now(),
        read: false
      },
      ...prev.slice(0, 49)
    ]);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setActionMessage("");
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setActionMessage("");
  };
  const exportHistory = async () => {
    if (!filteredHistory.length || isExportingHistory) return;
    setIsExportingHistory(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setTextColor(21, 62, 66);
      document.setFontSize(18);
      document.text("VisionInspect AI — Inspection History", 40, 42);
      document.setTextColor(99, 119, 121);
      document.setFontSize(9);
      document.text(`Date range: ${historyDateRange}   •   Status: ${historyFilter}   •   Search: ${historySearch.trim() || "All records"}`, 40, 60);
      autoTable(document, {
        head: [historyExportColumns],
        body: getHistoryExportRows(filteredHistory),
        startY: 78,
        margin: { left: 40, right: 40 },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 6, textColor: [21, 62, 66], lineColor: [218, 226, 220], lineWidth: 0.4 },
        headStyles: { fillColor: [21, 62, 66], textColor: [250, 249, 240], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 247, 242] },
        columnStyles: { 0: { cellWidth: 74 }, 1: { cellWidth: 135 }, 2: { cellWidth: 72 }, 3: { halign: "center", cellWidth: 58 }, 4: { halign: "center", cellWidth: 45 }, 5: { halign: "center", cellWidth: 55 }, 6: { cellWidth: 120 } },
      });
      document.save(historyExportFilename(historyDateRange));
      notify(`Downloaded ${filteredHistory.length} filtered history record${filteredHistory.length === 1 ? "" : "s"} as a PDF.`);
    } catch {
      notify("The history PDF could not be generated. Please try again.");
    } finally {
      setIsExportingHistory(false);
    }
  };
  const selectDetailBatch = (batchId) => {
    setSelectedDetailBatchId(batchId);
    const firstFinding = liveResults.find((item) => item.batch === batchId);
    const batch = liveBatches.find((item) => item.id === batchId);
    if (firstFinding) setSelectedId(firstFinding.id);
    if (batch?.products?.[0]) setSelectedProductId(batch.products[0].id);
  };
  const selectDetailDateRange = (range) => {
    const availableBatches = filterInspectionBatches(liveBatches, "All severity", range, "All lines");
    setDetailDateRange(range);
    if (!availableBatches.some((batch) => batch.id === selected.batch)) selectDetailBatch(availableBatches[0]?.id);
  };
  const openDetailedReview = (batchId) => {
    setDetailDateRange("Last 30 days");
    selectDetailBatch(batchId);
    setSelectedBatchId(null);
    setActive("details");
  };
  const handleReviewDecision = async (decision = "Pass") => {
    if (!activeProduct) return;
    const isGood = decision.toLowerCase() === "pass" || decision.toLowerCase() === "good" || decision.toLowerCase() === "accept";
    const newStatus = isGood ? "Passed" : "Failed";

    const targetBatchId = detailBatch?.id || selected?.batch;
    const targetProductId = activeProduct?.id;
    const targetFindingId = selected?.id;
    const reviewerName = user?.name || "Quality Engineer";
    const reviewerId = String(user?.id ?? user?.email ?? user?.name ?? "usr_qe");

    let savedReviewedAt = new Date().toISOString();

    try {
      const resp = await fetch("/pyapi/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: targetBatchId,
          productId: targetProductId,
          findingId: targetFindingId,
          reviewerId: reviewerId,
          reviewerName: reviewerName,
          decision: isGood ? "Pass" : "Fail",
          note: isGood ? `Marked as Good by ${reviewerName} (Manual Override)` : `Confirmed Defective by ${reviewerName} (Manual Review)`
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        if (data.review?.reviewedAt) {
          savedReviewedAt = data.review.reviewedAt;
        }
        console.log(`[ManualReview] Saved review document for product ${targetProductId} in MongoDB by ${reviewerName}!`);
      } else {
        console.error("Manual review submission error:", data);
      }
    } catch (err) {
      console.warn("Failed to persist manual review to MongoDB:", err);
    }

    const nextReviewed = new Set(reviewedProductIds);
    nextReviewed.add(targetProductId);
    setReviewedProductIds(nextReviewed);

    const newReview = {
      _id: `REV-${targetBatchId}-${targetProductId}`,
      batchId: targetBatchId,
      productId: targetProductId,
      findingId: targetFindingId,
      reviewerId: reviewerId,
      reviewerName: reviewerName,
      decision: isGood ? "Pass" : "Fail",
      note: isGood ? `Marked as Good by ${reviewerName} (Manual Override)` : `Confirmed Defective by ${reviewerName} (Manual Review)`,
      reviewedAt: savedReviewedAt
    };
    setAllReviews(prev => [newReview, ...prev.filter(r => r.productId !== targetProductId)]);

    // Update liveBatches state so product status, batch flags, reviewedBy and batch verdict are updated everywhere immediately
    setLiveBatches((prev) => {
      return prev.map((b) => {
        if (b.id !== targetBatchId) return b;
        const updatedProducts = (b.products || []).map((p) => {
          if (p.id === targetProductId) {
            return { ...p, status: newStatus, reviewStatus: "Reviewed", reviewDecision: isGood ? "Pass" : "Fail" };
          }
          return p;
        });
        const failedCount = updatedProducts.filter((p) => p.status === "Failed").length;
        return {
          ...b,
          products: updatedProducts,
          flagCount: failedCount,
          severity: failedCount > 0 ? (b.severity === "Low" ? "High" : b.severity) : "Low",
          verdict: failedCount === 0 ? "Pass" : "Hold",
          status: "Complete",
          reviewedBy: reviewerName,
          completedAt: savedReviewedAt
        };
      });
    });

    // Update liveResults so the finding card immediately reflects the human decision
    setLiveResults((prev) => {
      return prev.map((r) => {
        if (r.batch === targetBatchId && r.productId === targetProductId) {
          return {
            ...r,
            decision: isGood ? "Pass" : "Fail",
            defect: isGood ? "Not defective" : (r.defect === "Not defective" ? "Defective" : r.defect),
            severity: isGood ? "Low" : (r.severity === "Low" ? "High" : r.severity),
            severityScore: isGood ? 0 : (r.severityScore || 75)
          };
        }
        return r;
      });
    });

    notify(
      isGood
        ? `Product ${targetProductId} marked as GOOD (Passed) by ${reviewerName}. Batch status updated to Complete.`
        : `Product ${targetProductId} marked as DEFECTIVE (Failed) by ${reviewerName}. Batch status updated to Complete.`
    );
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      const res = await fetch(`/pyapi/api/batches/${batchId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setLiveBatches((prev) => prev.filter((b) => b.id !== batchId));
        setLiveResults((prev) => prev.filter((r) => r.batch !== batchId));
        setActionMessage(`Batch ${batchId} deleted successfully from MongoDB.`);
      } else {
        const err = await res.json();
        setActionMessage(err.detail || "Failed to delete batch.");
      }
    } catch (err) {
      setActionMessage("Network error while deleting batch.");
    }
  };

  return (
    <main className={`qe-app ${sidebarExpanded ? "side-expanded" : ""} ${active === "details" ? "qe-detail-app" : ""}`}>
      <aside className={`qe-side ${mobileNav ? "open" : ""} ${sidebarExpanded ? "expanded" : "collapsed"}`} onClick={expandFromRail} aria-label="Quality Engineer dashboard navigation">
        <div className="qe-side-top"><div className="qe-side-brand"><BrandMark interactive={false} /><button className="qe-side-toggle" type="button" onClick={(event) => { event.stopPropagation(); setSidebarExpanded((value) => !value); }} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-pressed={sidebarExpanded} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}><PanelLeft size={17} strokeWidth={1.8} /></button></div></div>
        <nav className="qe-nav">
          {dashboardSections.map((section) => {
            const Icon = icons[section.icon];
            return <button type="button" key={section.id} onClick={() => selectSection(section.id)} className={active === section.id ? "active" : ""} data-label={section.label} aria-label={sidebarExpanded ? undefined : section.label}><Icon size={17} /><span><b>{section.label}</b></span></button>;
          })}
        </nav>
        <div className="qe-side-bottom">
          <button
            type="button"
            className="qe-side-announcement-btn"
            onClick={() => setNoticesModalOpen(true)}
            data-label="Notice"
            aria-label={sidebarExpanded ? undefined : "Supervisor Notices"}
            title={sidebarExpanded ? undefined : "Supervisor Notices"}
          >
            <Megaphone size={16} />
            <span><b>Notice</b></span>
            {unreadNoticesCount > 0 && (
              <span className="qe-side-ann-badge" title={`${unreadNoticesCount} unread notice${unreadNoticesCount === 1 ? "" : "s"}`}>
                {unreadNoticesCount}
              </span>
            )}
          </button>
          <div className="qe-side-profile-wrap">
            <button
              className="qe-side-profile"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setProfileMenuOpen((value) => !value);
              }}
              aria-label="Open account menu"
              aria-expanded={profileMenuOpen}
            >
              <span>{workspaceEmoji || (user.name || "QE").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <div>
                <b>{user.name || "Quality Engineer"}</b>
                <small>{user.role === "admin" ? "Platform Admin preview" : "Quality Engineer"}</small>
              </div>
            </button>
            {profileMenuOpen && (
              <div className="qe-profile-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                {/* 1. Profile Logo & User's Workspace Header */}
                <div className="qe-profile-menu-header">
                  <span className="qe-profile-menu-avatar">
                    {workspaceEmoji || (user.name || "P").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="qe-profile-menu-info">
                    <b>{workspaceName}</b>
                    <small>{user.role === "admin" ? "Platform Admin" : "Quality Engineer"}</small>
                  </div>
                </div>

                {/* Divider 1 */}
                <div className="qe-profile-menu-divider" />

                {/* 2. Email of the user */}
                <div className="qe-profile-menu-email" title={user.email || `${(user.name || "user").toLowerCase().replace(/\s+/g, "")}@visioninspect.ai`}>
                  <span>{user.email || `${(user.name || "user").toLowerCase().replace(/\s+/g, "")}@visioninspect.ai`}</span>
                </div>

                {/* Divider 2 */}
                <div className="qe-profile-menu-divider" />

                {/* Dark mode toggle option */}
                <div className="qe-profile-menu-item qe-profile-menu-toggle-row">
                  <div className="qe-profile-menu-toggle-left">
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
                <div className="qe-profile-menu-divider" />

                {/* 3. Settings option */}
                <button
                  type="button"
                  className="qe-profile-menu-item"
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
                <div className="qe-profile-menu-divider" />

                {/* 4. Log out option */}
                <button
                  type="button"
                  className="qe-profile-menu-item qe-profile-menu-signout"
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

      <section className="qe-main">
        <header className="qe-head">
          <button className="qe-menu" type="button" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle dashboard navigation"><Menu size={20} /></button>
          <div className="qe-head-title"><span className="qe-kicker">Quality engineering</span><h1>{dashboardSections.find((section) => section.id === active)?.label}</h1></div>
          <div className="qe-head-actions">
            {/* Manual Refresh & Sync Button */}
            <button
              type="button"
              className={`qe-notif-btn ${isRefreshing ? "active" : ""}`}
              onClick={() => fetchLiveData(true)}
              disabled={isRefreshing}
              aria-label="Refresh dashboard data"
              title="Sync with latest MongoDB inspections"
            >
              <RefreshCw size={16} className={isRefreshing ? "qe-spin" : ""} />
            </button>

            {/* Total Inspected Pill (Personal to the logged-in engineer) */}
            <div className="qe-inspected-pill" title={`Personal total: ${personalInspectedCount} product(s) personally inspected by ${user?.name || 'you'}`}>
              <span className="qe-inspected-label">INSPECTED</span>
              <strong className="qe-inspected-value">{personalInspectedCount.toLocaleString()}</strong>
            </div>

            {/* Notification Center */}
            <div className="qe-notif-container" ref={notifRef}>
              <button
                type="button"
                className={`qe-notif-btn ${notifOpen ? "active" : ""}`}
                onClick={() => {
                  const nextState = !notifOpen;
                  setNotifOpen(nextState);
                  if (nextState) {
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  }
                }}
                aria-label="Notifications and alerts"
                title="Notifications & System Alerts"
              >
                <Bell size={17} />
                {notifications.some((n) => !n.read) && (
                  <span className="qe-notif-badge">{notifications.filter((n) => !n.read).length}</span>
                )}
              </button>

              {notifOpen && (
                <div className="qe-notif-dropdown" role="dialog" aria-label="Notifications panel">
                  <div className="qe-notif-header">
                    <div>
                      <b>Notifications</b>
                      <small>{notifications.length} {notifications.length === 1 ? "alert" : "alerts"}</small>
                    </div>
                    {notifications.length > 0 && (
                      <button type="button" className="qe-notif-clear-all" onClick={clearAllNotifications} title="Clear all notifications">
                        <Trash2 size={13} /> Clear all
                      </button>
                    )}
                  </div>

                  <div className="qe-notif-list">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className={`qe-notif-item ${n.tone || "info"} ${n.read ? "read" : "unread"}`}>
                          <div className="qe-notif-item-icon">
                            {n.tone === "error" || n.tone === "warning" ? (
                              <AlertTriangle size={13} />
                            ) : n.tone === "info" ? (
                              <FileCheck2 size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                          </div>
                          <div className="qe-notif-item-content">
                            <p>{n.message}</p>
                            <span>{n.time || "Just now"}</span>
                          </div>
                          <button
                            type="button"
                            className="qe-notif-item-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(n.id);
                            }}
                            aria-label="Dismiss notification"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="qe-notif-empty">
                        <CheckCheck size={24} />
                        <b>All caught up!</b>
                        <p>No active quality alerts or notifications.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="qe-user">
              <span>{(user.name || "QE").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <div><b>{user.name || "Quality Engineer"}</b><small>{user.role === "admin" ? "Platform Admin preview" : "Quality Engineer"}</small></div>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {actionMessage && <div className="qe-action-feedback" role="status"><Check size={15} /><span>{actionMessage}</span><button type="button" onClick={() => setActionMessage("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        <div className={`qe-content ${active === "details" ? "qe-detail-content" : ""}`}>
          <section className={`qe-stage ${active === "details" ? "qe-detail-stage" : ""}`}>
            {active === "results" && <ResultsContext batches={liveBatches} allReviews={allReviews} user={user} dateRange={resultDateRange} />}
            {active === "upload" && <CaptureAndStageSection files={files} stagedSize={stagedSize} inputRef={inputRef} chooseFiles={chooseFiles} removeFile={(name) => setFiles((current) => current.filter((file) => file.name !== name))} clearFiles={() => { setFiles([]); setMessage("Batch staging cleared."); setMessageTone("info"); }} queueBatch={queueBatch} message={message} messageTone={messageTone} uploadLineNo={uploadLineNo} setUploadLineNo={setUploadLineNo} isUploading={isUploading} notify={notify} />}
            {active === "results" && <ResultsSection filter={resultFilter} setFilter={setResultFilter} dateRange={resultDateRange} setDateRange={setResultDateRange} line={resultLine} setLine={setResultLine} lines={resultLines} batches={filteredBatches} openBatch={setSelectedBatchId} onDeleteBatch={handleDeleteBatch} allReviews={allReviews} />}
            {active === "details" && <DefectDetailsWorkspace batch={detailBatch} selected={selected} findings={detailFindings} products={detailBatch.products} activeProduct={activeProduct} reviewedProductIds={reviewedProductIds} allReviews={allReviews} batches={detailBatches} dateRange={detailDateRange} onChangeDateRange={selectDetailDateRange} onSelectBatch={selectDetailBatch} onSelectProduct={setSelectedProductId} onReviewDecision={handleReviewDecision} onMarkReviewed={handleReviewDecision} />}
            {active === "reports" && <ReportsSection reportRange={reportRange} setReportRange={setReportRange} notify={notify} batches={liveBatches} liveResults={liveResults} user={user} />}
            {active === "history" && <HistorySection search={historySearch} setSearch={setHistorySearch} filter={historyFilter} setFilter={setHistoryFilter} dateRange={historyDateRange} setDateRange={setHistoryDateRange} rows={filteredHistory} onExport={exportHistory} isExporting={isExportingHistory} openBatch={setSelectedHistoryRow} />}
          </section>
        </div>
        {selectedBatch && <BatchResultsDialog batch={selectedBatch} onClose={() => setSelectedBatchId(null)} onDetailedReview={openDetailedReview} />}
        {selectedHistoryRow && <HistoryBatchSummaryDialog row={selectedHistoryRow} onClose={() => setSelectedHistoryRow(null)} currentUser={user} />}

        {/* ─── Quality Engineer Notices Modal (Centered pop-up, 7-day auto-disappear, mark-as-read) ─── */}
        {noticesModalOpen && (
          <div className="qe-modal-backdrop" onClick={() => setNoticesModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="qe-notices-title">
            <div className="qe-notices-modal" onClick={e => e.stopPropagation()}>
              <div className="qe-notices-modal-head">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="qe-notices-modal-icon-wrap">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h2 id="qe-notices-title">Supervisor Notices</h2>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {unreadNoticesCount > 0 && (
                    <button
                      type="button"
                      className="qe-notices-mark-all-btn"
                      onClick={handleMarkAllAsRead}
                    >
                      <CheckCheck size={14} />
                      Mark all as read
                    </button>
                  )}
                  <button
                    type="button"
                    className="fs-alerts-modal-close"
                    onClick={() => setNoticesModalOpen(false)}
                    aria-label="Close notices modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="qe-notices-modal-body">
                <div className="qe-notices-section-head">
                  <h3>Active Notices <span>(Last 7 Days · {activeNotices.length})</span></h3>
                  <span className="fs-ann-badge-pill">7d Auto-Expire</span>
                </div>

                {activeNotices.length === 0 ? (
                  <div className="fs-ann-empty">
                    <Megaphone size={26} style={{ color: "var(--muted)", opacity: 0.6 }} />
                    <p>No active notices from supervisors in the last 7 days.</p>
                    <small>Important announcements broadcast by supervisors will appear here.</small>
                  </div>
                ) : (
                  <div className="qe-notices-list">
                    {activeNotices.map(n => {
                      const nId = n._id || n.id;
                      const isRead = readNoticeIds.has(nId);
                      const catObj = ANNOUNCEMENT_CATEGORIES.find(c => c.id === n.category) || { color: "#27837f" };
                      return (
                        <div key={nId} className={`qe-notice-card ${isRead ? "read" : "unread"}`}>
                          <div className="qe-notice-card-head">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span
                                className="fs-ann-card-cat"
                                style={{ color: catObj.color, borderColor: `${catObj.color}40`, background: `${catObj.color}15` }}
                              >
                                {n.category || "General Notice"}
                              </span>
                              <span className="qe-notice-author">
                                <UserRound size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                                {n.author || "Factory Supervisor"}
                              </span>
                              {!isRead && <span className="qe-notice-unread-dot" title="Unread notice" />}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <time className="fs-ann-card-time">
                                <Clock size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                                {formatRelativeTime(n.createdAt)}
                              </time>
                              {!isRead ? (
                                <button
                                  type="button"
                                  className="qe-notice-mark-read-btn"
                                  onClick={() => handleMarkAsRead(nId)}
                                  title="Mark as read"
                                >
                                  <Check size={13} />
                                  Mark as read
                                </button>
                              ) : (
                                <span className="qe-notice-read-badge">
                                  <Check size={12} /> Read
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="qe-notice-card-msg">{n.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="fs-alerts-modal-foot">
                <span>Press <kbd style={{ padding: "2px 5px", background: "#eaece0", borderRadius: "4px", fontSize: "10px", border: "1px solid var(--line)" }}>Esc</kbd> or click outside to dismiss.</span>
                <button type="button" className="fs-alerts-modal-done-btn" onClick={() => setNoticesModalOpen(false)}>
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
      </section>
    </main>
  );
}

function ResultsContext({ batches, allReviews = [], user, dateRange = "Last 7 days" }) {
  const summaryIcons = { total: FileCheck2, passed: Check, failed: X, personal: UserRound };

  const total = (batches || []).length;
  const passed = (batches || []).filter(b => {
    const flags = b.flagCount ?? (b.products?.filter(p => p.status === "Failed").length || 0);
    return flags === 0 && (b.status === "Passed" || b.status === "Complete" || b.verdict === "Pass" || b.severity === "Low");
  }).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;

  // 4th cell: Personal batch inspections for the logged-in engineer
  const currentUserId = String(user?.id ?? user?.email ?? user?.name ?? "usr_qe_admin").toLowerCase();
  const currentUserName = String(user?.name ?? "").trim().toLowerCase();
  const currentUserEmail = String(user?.email ?? "").trim().toLowerCase();

  const myProductIds = new Set(
    (allReviews || [])
      .filter(r => {
        const revId = String(r.reviewerId ?? "").trim().toLowerCase();
        const revName = String(r.reviewerName ?? "").trim().toLowerCase();
        const note = String(r.note ?? "").toLowerCase();
        return (
          revId === currentUserId ||
          (currentUserEmail && (revId === currentUserEmail || revName === currentUserEmail)) ||
          (currentUserName && (revId.includes(currentUserName) || revName.includes(currentUserName) || note.includes(currentUserName)))
        );
      })
      .map(r => r.productId)
  );

  const myBatches = (batches || []).filter(b => {
    const scanned = String(b.scannedBy || b.createdBy || "").trim().toLowerCase();
    const scannedId = String(b.scannedById || b.createdById || "").trim().toLowerCase();
    const hasMyProductReview = (b.products || []).some(p => myProductIds.has(p.id));
    const isMyBatch = (
      (scanned && (scanned === currentUserId || (currentUserName && scanned.includes(currentUserName)) || (currentUserEmail && scanned === currentUserEmail))) ||
      (scannedId && (scannedId === currentUserId || (currentUserEmail && scannedId === currentUserEmail)))
    );
    return isMyBatch || hasMyProductReview;
  });

  const myBatchCount = myBatches.length;
  const myPassedBatches = myBatches.filter(b => {
    const flags = b.flagCount ?? (b.products?.filter(p => p.status === "Failed").length || 0);
    return flags === 0 && (b.status === "Passed" || b.status === "Complete" || b.verdict === "Pass" || b.severity === "Low");
  }).length;
  const myFailedBatches = myBatchCount - myPassedBatches;
  const myPassRate = myBatchCount > 0 ? Math.round((myPassedBatches / myBatchCount) * 100) : 0;
  const myFailRate = myBatchCount > 0 ? Math.round((myFailedBatches / myBatchCount) * 100) : 0;

  const dynamicSummary = [
    { id: "total", label: "Total inspections", value: total, detail: dateRange || "Last 7 days" },
    { id: "passed", label: "Passed", value: passed, detail: `${passRate}% pass rate` },
    { id: "failed", label: "Failed", value: failed, detail: `${failRate}% fail rate` },
    {
      id: "personal",
      label: "My inspection",
      value: myBatchCount,
      detail: myBatchCount > 0 ? `${myPassRate}% pass rate · ${myFailRate}% fail rate` : "0% pass · 0% fail",
      isPersonal: true,
      passRate: myPassRate,
      failRate: myFailRate
    }
  ];

  return (
    <div className="qe-context qe-results-context">
      {dynamicSummary.map((metric) => {
        const MetricIcon = summaryIcons[metric.id] || FileCheck2;
        return (
          <article className={`qe-inspection-summary qe-summary-${metric.id}`} key={metric.id}>
            <span><MetricIcon size={16} /> {metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.isPersonal ? (
              <p className="qe-personal-metrics">
                <span className="pass-part">{metric.passRate}% pass rate</span>
                {" · "}
                <span className="fail-part">{metric.failRate}% fail rate</span>
              </p>
            ) : (
              <p>{metric.detail}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function CaptureAndStageSection({
  files,
  stagedSize,
  inputRef,
  chooseFiles,
  removeFile,
  clearFiles,
  queueBatch,
  message,
  messageTone,
  uploadLineNo,
  setUploadLineNo,
  isUploading,
  notify
}) {
  const [activeTab, setActiveTab] = useState("manual"); // default to "manual"
  const [selectedLine, setSelectedLine] = useState("Line 02");
  const [autoCapture, setAutoCapture] = useState(false); // default to PAUSED
  const [captureInterval, setCaptureInterval] = useState(1.5);
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraStaged, setCameraStaged] = useState([]);
  const [isCapturingFlash, setIsCapturingFlash] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const captureTimerRef = useRef(null);
  const sampleIndexRef = useRef(0);
  const isAutoDispatchingRef = useRef(false);

  // Sample factory product textures for simulated optical line feed
  const sampleProducts = [
    { name: "Cable Core Inspection", url: "/manus-storage/hazelnut_cap_defective.png", type: "Cable" },
    { name: "Zipper Teeth Alignment", url: "/manus-storage/hazelnut_cap_defective.png", type: "Zipper" },
    { name: "Pill Surface Integrity", url: "/manus-storage/hazelnut_cap_defective.png", type: "Pill" },
    { name: "Hazelnut Cap Sealing", url: "/manus-storage/hazelnut_cap_defective.png", type: "Nut" }
  ];

  // Try physical camera or fallback to optical line simulator
  useEffect(() => {
    let stream = null;
    let isMounted = true;

    async function initCamera() {
      if (!cameraActive || activeTab !== "camera") return;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
          if (videoRef.current && isMounted) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            };
          }
        }
      } catch (err) {
        console.warn("Webcam access:", err);
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraActive, activeTab]);

  // Optical Inspection Canvas Render Loop (Completely Still & Live Feed Prioritized)
  useEffect(() => {
    if (activeTab !== "camera" || !cameraActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let isRunning = true;

    const loadedImgs = sampleProducts.map((p) => {
      const img = new Image();
      img.src = p.url;
      return img;
    });

    const render = () => {
      if (!isRunning || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const video = videoRef.current;
      const hasLiveVideo = video && video.readyState >= 2 && !video.paused && !video.ended && video.videoWidth > 0;

      if (hasLiveVideo) {
        // Draw live webcam feed directly onto canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Still background for standby/fallback
        ctx.fillStyle = "#0c1322";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Still (non-moving) grid lines
        ctx.strokeStyle = "rgba(39, 131, 127, 0.15)";
        ctx.lineWidth = 1;
        const gridSize = 36;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Static sample product in standby mode
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const boxW = 260;
        const boxH = 260;

        const curImg = loadedImgs[sampleIndexRef.current % loadedImgs.length];
        if (curImg && curImg.complete && curImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(cx - boxW / 2 + 10, cy - boxH / 2 + 10, boxW - 20, boxH - 20, 10);
          ctx.clip();
          ctx.drawImage(curImg, cx - boxW / 2 + 10, cy - boxH / 2 + 10, boxW - 20, boxH - 20);
          ctx.restore();
        }
      }

      // Static Optical Reticle Corners (Clean & Still)
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const boxW = 320;
      const boxH = 280;

      ctx.strokeStyle = "#27837f";
      ctx.lineWidth = 3;
      const cLen = 26;

      ctx.beginPath();
      ctx.moveTo(cx - boxW / 2, cy - boxH / 2 + cLen);
      ctx.lineTo(cx - boxW / 2, cy - boxH / 2);
      ctx.lineTo(cx - boxW / 2 + cLen, cy - boxH / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + boxW / 2 - cLen, cy - boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy - boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy - boxH / 2 + cLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - boxW / 2, cy + boxH / 2 - cLen);
      ctx.lineTo(cx - boxW / 2, cy + boxH / 2);
      ctx.lineTo(cx - boxW / 2 + cLen, cy + boxH / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + boxW / 2 - cLen, cy + boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy + boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy + boxH / 2 - cLen);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, cameraActive]);

  // Capture frame function
  const triggerSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || isUploading || isAutoDispatchingRef.current) return;

    setIsCapturingFlash(true);
    setTimeout(() => setIsCapturingFlash(false), 180);

    sampleIndexRef.current = (sampleIndexRef.current + 1) % sampleProducts.length;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const indexNum = cameraStaged.length + 1;
      const timeStr = Date.now().toString(36).toUpperCase();
      const fileName = `CAM-PRD-${String(indexNum).padStart(3, "0")}-${timeStr}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const itemUrl = URL.createObjectURL(blob);

      const newItem = {
        id: `CAP-${indexNum}-${Date.now()}`,
        file,
        name: fileName,
        url: itemUrl,
        size: blob.size,
        line: selectedLine,
        capturedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      };

      setCameraStaged((prev) => {
        const nextList = [...prev, newItem];
        // 50 ITEMS AUTO-BATCH CREATION THRESHOLD!
        if (nextList.length >= 50 && !isAutoDispatchingRef.current) {
          isAutoDispatchingRef.current = true;
          const batchFiles = nextList.map((item) => item.file);
          if (notify) {
            notify(`50 items staged! Auto-creating and running AI model batch for ${selectedLine}...`);
          }
          queueBatch(batchFiles, selectedLine).finally(() => {
            isAutoDispatchingRef.current = false;
          });
          return [];
        }
        return nextList;
      });
    }, "image/png");
  };

  // Auto-capture interval timer
  useEffect(() => {
    if (activeTab !== "camera" || !cameraActive || !autoCapture || isUploading) {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      return;
    }

    captureTimerRef.current = setInterval(() => {
      triggerSnapshot();
    }, captureInterval * 1000);

    return () => {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    };
  }, [activeTab, cameraActive, autoCapture, captureInterval, cameraStaged.length, selectedLine, isUploading]);

  // Force dispatch before 50 items
  const handleForceProcessBatch = () => {
    if (!cameraStaged.length || isUploading) return;
    const batchFiles = cameraStaged.map((item) => item.file);
    if (notify) {
      notify(`Creating inspection batch with ${batchFiles.length} items for ${selectedLine}...`);
    }
    queueBatch(batchFiles, selectedLine);
    setCameraStaged([]);
  };

  const removeCameraStagedItem = (id) => {
    setCameraStaged((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCameraStaged = () => {
    setCameraStaged([]);
  };

  const onDrop = (event) => {
    event.preventDefault();
    chooseFiles(event.dataTransfer.files);
  };

  const percentStaged = Math.min(100, Math.round((cameraStaged.length / 50) * 100));

  return (
    <section className="qe-section qe-upload">
      <div className="qe-section-head">
        <div>
          <h2>Capture & <em>Stage Batches.</em></h2>
          <p>Automated optical line camera streaming with 50-item auto-batching and manual file staging.</p>
        </div>
        <div className="qe-capture-mode-toggle" role="tablist">
          <button
            type="button"
            className={`qe-capture-tab-btn ${activeTab === "camera" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("camera");
              setAutoCapture(false);
            }}
          >
            <Camera size={15} />
            Live Line Camera (Auto)
          </button>
          <button
            type="button"
            className={`qe-capture-tab-btn ${activeTab === "manual" ? "active" : ""}`}
            onClick={() => setActiveTab("manual")}
          >
            <UploadCloud size={15} />
            Manual File Staging
          </button>
        </div>
      </div>

      {activeTab === "camera" ? (
        /* Mode A: Live Industrial Line Camera Feed & 50-Item Auto-Batching Pipeline */
        <div className="qe-camera-staging-layout">
          {/* Left Column: Live Optical Stream Viewfinder */}
          <div className="qe-camera-stream-card">
            <div className="qe-cam-viewport-wrap">
              <canvas ref={canvasRef} width={640} height={420} className="qe-cam-canvas" />
              <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

              {/* Shutter flash overlay */}
              {isCapturingFlash && <div className="qe-cam-shutter-flash" />}

              {/* Viewport Live HUD Overlays */}
              <div className="qe-cam-hud-top">
                <span className={`qe-cam-live-badge ${cameraActive ? "live" : "paused"}`}>
                  <span className="qe-cam-live-dot" />
                  {cameraActive ? "LIVE 60 FPS" : "PAUSED"}
                </span>
                <span className="qe-cam-sensor-badge">
                  <Eye size={12} /> Optical Sensor · {selectedLine}
                </span>
              </div>

              <div className="qe-cam-hud-bottom">
                <span>Conveyor: 1.2 m/s</span>
                <span>Auto-Exposure 1080p</span>
                <span>Focal: 24mm f/1.8</span>
              </div>
            </div>

            {/* Stream Telemetry & Control Strip */}
            <div className="qe-cam-controls-bar">
              <div className="qe-cam-control-group">
                <label className="qe-cam-line-select">
                  <span>Line</span>
                  <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
                    <option value="Line 01">Line 01 (Conveyor Cam)</option>
                    <option value="Line 02">Line 02 (Top-Down Lens)</option>
                    <option value="Line 03">Line 03 (High-Speed Sensor)</option>
                    <option value="Line 04">Line 04 (End-of-Line QA)</option>
                  </select>
                  <ChevronDown size={13} />
                </label>

                <label className="qe-cam-interval-select" title="Auto-capture interval">
                  <span>Interval</span>
                  <select value={captureInterval} onChange={(e) => setCaptureInterval(parseFloat(e.target.value))}>
                    <option value="1.0">1.0s / product</option>
                    <option value="1.5">1.5s / product</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              </div>

              <div className="qe-cam-control-actions">
                <button
                  type="button"
                  className={`qe-cam-auto-toggle ${autoCapture ? "active" : ""}`}
                  onClick={() => setAutoCapture(!autoCapture)}
                  title="Toggle automatic conveyor optical capture"
                >
                  <Zap size={14} />
                  {autoCapture ? "Auto-Capture ON" : "Auto-Capture PAUSED"}
                </button>

                <button
                  type="button"
                  className="qe-cam-snap-btn"
                  onClick={triggerSnapshot}
                  title="Take manual snapshot (Spacebar)"
                >
                  <Camera size={14} />
                  Capture Snapshot
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Auto-Staging Buffer (0 to 50 Items Threshold) */}
          <div className="qe-camera-buffer-card">
            <div className="qe-buffer-header">
              <div className="qe-buffer-header-text">
                <span className="qe-kicker">Automated Batching Buffer</span>
                <h3>
                  Staging: <b>{cameraStaged.length} / 50</b> Products
                </h3>
              </div>
              <span className="qe-buffer-pct-badge">{percentStaged}%</span>
            </div>

            {/* 50-Item Live Progress Bar */}
            <div className="qe-buffer-progress-track">
              <div
                className="qe-buffer-progress-fill"
                style={{ width: `${percentStaged}%` }}
              />
            </div>

            <p className="qe-buffer-hint">
              <Sparkles size={13} style={{ color: "var(--teal-2, #27837f)", flexShrink: 0 }} />
              Auto-dispatches AI model inference and creates batch once <b>50 items</b> are staged.
            </p>

            {/* Buffer Action Strip */}
            <div className="qe-buffer-actions-row">
              <button
                type="button"
                className="qe-btn-force-batch"
                onClick={handleForceProcessBatch}
                disabled={!cameraStaged.length || isUploading}
              >
                <Layers size={14} />
                {isUploading ? "Running AI Models..." : `Force Process Batch (${cameraStaged.length} items)`}
              </button>
              {cameraStaged.length > 0 && (
                <button
                  type="button"
                  className="qe-btn-clear-buffer"
                  onClick={clearCameraStaged}
                  disabled={isUploading}
                >
                  Clear Queue
                </button>
              )}
            </div>

            {/* Live Captured Items Scroll Grid */}
            <div className="qe-buffer-grid-wrap">
              <div className="qe-buffer-grid-head">
                <span>Live Staged Frames</span>
                <small>{cameraStaged.length} captured</small>
              </div>

              {cameraStaged.length === 0 ? (
                <div className="qe-buffer-empty">
                  <Camera size={26} style={{ color: "var(--muted)", opacity: 0.5 }} />
                  <b>Optical stream waiting for captures</b>
                  <p>Frames captured automatically from the conveyor camera stream will stage here.</p>
                </div>
              ) : (
                <div className="qe-buffer-thumbnails">
                  {cameraStaged.map((item, idx) => (
                    <div key={item.id} className="qe-buffer-thumb-card">
                      <img src={item.url} alt={`Capture ${idx + 1}`} />
                      <div className="qe-buffer-thumb-info">
                        <b>#{String(idx + 1).padStart(2, "0")}</b>
                        <small>{item.capturedAt}</small>
                      </div>
                      <button
                        type="button"
                        className="qe-buffer-thumb-del"
                        onClick={() => removeCameraStagedItem(item.id)}
                        title="Remove capture"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mode B: Manual File Staging (Dropzone & Multi-file Upload) */
        <>
          <div className="qe-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                chooseFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <UploadCloud size={31} />
            <h3>Drop a batch of images here</h3>
            <p>JPG, PNG, WEBP · up to 8 MB per image · maximum 50 images per batch</p>
            <button type="button" onClick={() => inputRef.current?.click()}>
              Choose images <Files size={15} />
            </button>
          </div>
          <Notice tone={messageTone}>{message}</Notice>
          <div className="qe-batch">
            <div className="qe-batch-head">
              <div>
                <span className="qe-kicker">Staged manual batch</span>
                <h3>{files.length ? `${files.length} images ready for review` : "No images staged yet"}</h3>
              </div>
              <div>
                <div className="qe-line-input-wrap" title="Specify production line number for this batch">
                  <span>Line No.</span>
                  <input
                    type="text"
                    className="qe-line-input"
                    value={uploadLineNo}
                    onChange={(e) => setUploadLineNo(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    placeholder="04"
                    maxLength={5}
                  />
                </div>
                <span>{bytesLabel(stagedSize)} total</span>
                {Boolean(files.length) && <button type="button" onClick={clearFiles}>Clear batch</button>}
              </div>
            </div>
            {files.length ? (
              <ul className="qe-file-list">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <span className="qe-file-icon"><FileImage size={18} /></span>
                    <div>
                      <b>{file.name}</b>
                      <small>{bytesLabel(file.size)} · image {String(index + 1).padStart(2, "0")}</small>
                    </div>
                    <span className="qe-file-ready"><Check size={14} /> Ready</span>
                    <button type="button" onClick={() => removeFile(file.name)} aria-label={`Remove ${file.name}`}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="qe-empty-batch">
                <FileCheck2 size={22} />
                <p>Batch composition and validation feedback will appear here once images are added.</p>
              </div>
            )}
            <div className="qe-batch-foot">
              <button type="button" onClick={() => queueBatch()} disabled={isUploading}>
                {isUploading ? "Uploading batch..." : "Create review batch"} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ResultsSection({ filter, setFilter, dateRange, setDateRange, line, setLine, lines, batches, openBatch, onDeleteBatch, allReviews = [] }) {
  const [menuOpenBatchId, setMenuOpenBatchId] = useState(null);
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState(null);

  useEffect(() => {
    const closeMenu = () => setMenuOpenBatchId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  return <section className="qe-section qe-results-section">
    <div className="qe-queue-bar">
      <span>Review queue</span>
      <div className="qe-result-filters">
        <label className="qe-filter-btn qe-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter batches by date">{inspectionDateFilters.map((range) => <option key={range}>{range}</option>)}</select><ChevronDown size={14} /></label>
        <label className="qe-filter-btn qe-result-filter"><Filter size={15} /><select value={line} onChange={(event) => setLine(event.target.value)} aria-label="Filter batches by line">{lines.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></label>
        <div className="qe-status-segmented-toggle" role="group" aria-label="Filter batches by status">
          <button
            type="button"
            className={`qe-status-toggle-btn ${(!filter || filter === "All" || filter === "All severity") ? "active" : ""}`}
            onClick={() => setFilter("All")}
          >
            All
          </button>
          <button
            type="button"
            className={`qe-status-toggle-btn ${filter === "Pass" ? "active" : ""}`}
            onClick={() => setFilter("Pass")}
          >
            PASS
          </button>
          <button
            type="button"
            className={`qe-status-toggle-btn ${filter === "Fail" ? "active" : ""}`}
            onClick={() => setFilter("Fail")}
          >
            FAIL
          </button>
          <button
            type="button"
            className={`qe-status-toggle-btn ${filter === "Mine" ? "active" : ""}`}
            onClick={() => setFilter("Mine")}
            title="Filter batches containing items personally reviewed by you"
          >
            My Reviews
          </button>
        </div>
      </div>
    </div>
    {batches.length ? <div className="qe-result-grid">
      {batches.map((batch) => {
        const flags = batch.flagCount ?? (batch.products?.filter(p => p.status === "Failed").length || 0);
        const isFail = flags > 0 || batch.verdict === "Hold" || batch.verdict === "Fail";
        const batchReviews = (allReviews || []).filter(r => r.batchId === batch.id || (batch.products?.some(p => p.id === r.productId)));
        const reviewerNames = [...new Set(batchReviews.map(r => r.reviewerName || r.reviewerId).filter(Boolean))];
        const reviewerName = reviewerNames.length > 0 ? reviewerNames.join(", ") : (batch.reviewedBy || null);
        const isReviewed = batch.status === "Complete" || Boolean(reviewerName);
        const scannerName = batch.scannedBy || batch.createdBy || "Quality Engineer";

        return (
          <article className="qe-result qe-batch-result" key={batch.id}>
            <div className="qe-result-img">
              <img src={batch.image} alt={`${batch.name} batch evidence`} />
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start", maxWidth: "70%" }}>
                  <span className="qe-scanned-by-badge">
                    Scanned by: {scannerName}
                  </span>
                  {isReviewed && reviewerName && (
                    <span className="qe-reviewed-by-badge">
                      Reviewed by: {reviewerName}
                    </span>
                  )}
                </div>
                <span className={`qe-verdict-badge ${isFail ? "fail" : "pass"}`}>
                  {isFail ? "FAIL" : "PASS"}
                </span>
              </div>
            </div>
            <div className="qe-result-copy">
              <div><span>{batch.id} · {batch.line}</span><button type="button" onClick={() => openBatch(batch.id)}>Open <ChevronRight size={14} /></button></div>
              <h3>{batch.name}</h3>
              <p>{batch.captured}</p>
              <footer>
                <b>{batch.confidence}% confidence</b>
                {/* 3. Three-dot menu for batch deletion */}
                <div className="qe-batch-menu-container" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="qe-three-dots-btn" onClick={() => setMenuOpenBatchId(menuOpenBatchId === batch.id ? null : batch.id)} aria-label="Batch actions">
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenBatchId === batch.id && (
                    <div className="qe-batch-dropdown">
                      <button type="button" onClick={() => { setMenuOpenBatchId(null); setConfirmDeleteBatchId(batch.id); }}>
                        Delete batch
                      </button>
                    </div>
                  )}
                </div>
              </footer>
            </div>
          </article>
        );
      })}
    </div> : <div className="qe-result-empty"><ListFilter size={22} /><h3>No matching batches</h3><p>Try another date, production line, or severity filter.</p></div>}

    {/* Center Popup Confirmation Dialog */}
    {confirmDeleteBatchId && (
      <div className="qe-batch-dialog-backdrop" role="presentation">
        <section className="qe-delete-confirm-dialog" role="dialog" aria-modal="true">
          <h3>Delete Batch?</h3>
          <p>Are you sure you want to delete batch <b>{confirmDeleteBatchId}</b>? This action will remove all associated inspection records and evidence from MongoDB.</p>
          <div className="qe-delete-confirm-actions">
            <button type="button" className="qe-btn-cancel" onClick={() => setConfirmDeleteBatchId(null)}>Cancel</button>
            <button type="button" className="qe-btn-delete" onClick={() => { const id = confirmDeleteBatchId; setConfirmDeleteBatchId(null); onDeleteBatch(id); }}>Delete</button>
          </div>
        </section>
      </div>
    )}
  </section>;
}

function BatchResultsDialog({ batch, onClose, onDetailedReview }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const scannerName = batch.scannedBy || batch.createdBy || "Quality Engineer";
  const reviewerName = batch.reviewedBy || null;

  return (
    <div className="qe-batch-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="qe-batch-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-dialog-title">
        <header>
          <div>
            <span>{batch.id} · {batch.line}</span>
            <h2 id="batch-dialog-title">{batch.name}</h2>
            <p className="qe-history-summary-reviewer" style={{ margin: "5px 0 0", fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
              (Scanned by: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{scannerName}</strong>{reviewerName ? <> · Reviewed by: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{reviewerName}</strong></> : null})
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close batch results"><X size={19} /></button>
        </header>
        <div className="qe-batch-dialog-meta">
          <span><Severity value={batch.severity} /> Overall severity</span>
          <span>{batch.confidence}% overall confidence</span>
          <span>{batch.products.length} products inspected</span>
          <button className="qe-batch-detailed-review" type="button" onClick={() => onDetailedReview(batch.id)}>
            Detailed review <ChevronRight size={14} />
          </button>
        </div>
        <div className="qe-batch-dialog-table">
          <div className="qe-batch-dialog-head">
            <span>Product no.</span>
            <span>Status</span>
            <span>Confidence</span>
            <span>Captured</span>
          </div>
          {batch.products.map((product) => (
            <div className="qe-batch-dialog-row" key={product.id}>
              <b>{product.id}</b>
              <span className={`qe-batch-product-status ${product.status.toLowerCase()}`}>{product.status}</span>
              <span>{product.confidence}%</span>
              <span>{product.captured}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getISTDateWindow(offsetDays = 0) {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istMs = utcMs + (5.5 * 60 * 60 * 1000);
  const todayIST = new Date(istMs);

  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayIST);
    d.setDate(todayIST.getDate() - offsetDays - i);
    const day = String(d.getDate()).padStart(2, "0");
    const monthShort = d.toLocaleString("en-US", { month: "short" });
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const isoDateStr = `${d.getFullYear()}-${monthNum}-${day}`;

    dates.push({
      isoDate: isoDateStr,
      label: `${day} ${monthShort}`,
      shortLabel: `${monthNum}/${day}`,
      dateObj: d,
    });
  }
  return dates;
}

function ReportsSection({ reportRange, setReportRange, notify, batches = [], liveResults = [], user = null }) {
  const [reportData, setReportData] = useState(null);
  const [trendRangeOffset, setTrendRangeOffset] = useState("0");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/pyapi/api/reports/summary?offset=${trendRangeOffset}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReportData(data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch report summary:", err);
      }
    }
    fetchReport();
  }, [reportRange, trendRangeOffset]);

  const totalBatches = reportData?.metrics?.totalBatches ?? (batches.length || 0);
  const defectedBatches = reportData?.metrics?.defectedBatches ?? batches.filter((b) => {
    const flags = b.flagCount ?? (b.products?.filter((p) => p.status === "Failed").length || 0);
    return flags > 0 || b.verdict === "Hold" || b.verdict === "Fail";
  }).length;
  const batchesPassRate = reportData?.metrics?.batchesPassRate ?? (totalBatches > 0 ? Math.round(((totalBatches - defectedBatches) / totalBatches) * 100) : 100);

  const totalProducts = reportData?.metrics?.totalProducts ?? batches.reduce((acc, b) => acc + (b.products?.length || 1), 0);
  const defectedProducts = reportData?.metrics?.defectedProducts ?? (reportData?.metrics?.totalDefects ?? batches.reduce((acc, b) => acc + (b.products?.filter((p) => p.status === "Failed").length || 0), 0));
  const productsPassRate = reportData?.metrics?.productsPassRate ?? (totalProducts > 0 ? Math.round(((totalProducts - defectedProducts) / totalProducts) * 100) : 100);

  const topDefect = reportData?.metrics?.topDefect ?? "None";
  const topDefectPct = reportData?.metrics?.topDefectPct ?? 0.0;

  const metrics = reportData?.metrics || {
    totalInspections: totalBatches,
    totalBatches,
    defectedBatches,
    batchesPassRate,
    totalProducts,
    defectedProducts,
    productsPassRate,
    totalDefects: defectedProducts,
    passRate: batchesPassRate,
    topDefect,
    topDefectPct
  };

  const trendOffset = parseInt(trendRangeOffset, 10) || 0;
  const istDateWindow = getISTDateWindow(trendOffset);

  const trendBars = reportData?.trendBars || istDateWindow.map(({ isoDate, label }, idx) => {
    const dayBatches = (batches || []).filter((b) => {
      if (!b.captured) return false;
      try {
        const bDate = new Date(b.capturedAt || b.captured);
        const bUtc = bDate.getTime() + (bDate.getTimezoneOffset() * 60000);
        const bIST = new Date(bUtc + (5.5 * 60 * 60 * 1000));
        const bIsoStr = `${bIST.getFullYear()}-${String(bIST.getMonth() + 1).padStart(2, "0")}-${String(bIST.getDate()).padStart(2, "0")}`;
        return bIsoStr === isoDate;
      } catch {
        return false;
      }
    });

    let passRateVal = 0;
    if (dayBatches.length > 0) {
      const passedCount = dayBatches.filter(b => b.status === "Passed" || b.severity === "Low" || b.verdict === "Pass").length;
      passRateVal = Math.round((passedCount / dayBatches.length) * 100);
    } else {
      passRateVal = 0;
    }

    return { label, value: passRateVal };
  });

  const activeTrendDays = trendBars.filter((b) => b.value > 0 || (b.batchCount && b.batchCount > 0));
  const avgTrendPassRate = activeTrendDays.length > 0
    ? Math.round(activeTrendDays.reduce((acc, b) => acc + b.value, 0) / activeTrendDays.length)
    : (batchesPassRate ?? 100);

  const mix = reportData?.defectMix || [
    { label: "Passed (Defect-free)", value: 100, color: "#27837f" }
  ];
  const summaryText = reportData?.summary || `Over the selected period, ${totalBatches} inspection batches were evaluated. Batches pass rate stands at ${batchesPassRate}%.`;

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filename = await generateQualityReport({
        reportData,
        batches,
        reportRange,
        liveResults,
        inspector: user?.name || "usr_qe_admin"
      });
      notify(`Quality Assurance report downloaded successfully (${filename}).`);
    } catch (err) {
      console.error("PDF Export error:", err);
      notify("Failed to generate quality report PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return <section className="qe-section">
    <div className="qe-section-head">
      <div><h2>Report &amp; Charts</h2><p>Review live trends, defect mix, and quality report breakdown from MongoDB.</p></div>
      <div className="qe-range">{["7 days", "30 days", "Today"].map((range) => <button key={range} type="button" className={range === reportRange ? "active" : ""} onClick={() => setReportRange(range)}>{range}</button>)}</div>
    </div>
    <div className="qe-report-kpis">
      <article><span>Total Batches Inspected</span><b>{totalBatches}</b><p><i className="up">↑ Live</i> stored in MongoDB</p></article>
      <article><span>Total Defected Batches</span><b>{defectedBatches}</b><p><i className="down">↓ Flagged</i> batches with defects</p></article>
      <article><span>Batches Pass Rate</span><b>{batchesPassRate}<em>%</em></b><p><i className="up">↑ Real-time</i> calculation</p></article>

      <article className="qe-kpi-tall">
        <div>
          <span>Top Defect</span>
          <b className="qe-top-defect-name">{topDefect}</b>
        </div>
        <div className="qe-top-defect-body">
          <span className="qe-top-defect-badge">{topDefectPct}% of findings</span>
          <p>Dominant quality finding observed across evaluated units</p>
        </div>
      </article>

      <article><span>Total Products Inspected</span><b>{totalProducts}</b><p><i className="up">↑ Live</i> images evaluated</p></article>
      <article><span>Total Defected Products</span><b>{defectedProducts}</b><p><i className="down">↓ Active</i> defect units</p></article>
      <article><span>Products Pass Rate</span><b>{productsPassRate}<em>%</em></b><p><i className="up">↑ Real-time</i> quality rate</p></article>
    </div>
    <div className="qe-report-grid">
      <article className="qe-chart">
        <div className="qe-card-top">
          <div><span className="qe-kicker">Review completion</span><h3>Batch coverage trend</h3></div>
          <label className="qe-filter-btn qe-result-filter" style={{ minHeight: "28px", padding: "0 8px" }} title="Filter trend date window up to previous 30 days">
            <CalendarClock size={13} />
            <select value={trendRangeOffset} onChange={(e) => setTrendRangeOffset(e.target.value)} aria-label="Filter trend date range window">
              <option value="0">Last 7 days</option>
              <option value="7">7–14 days ago</option>
              <option value="14">15–21 days ago</option>
              <option value="21">22–28 days ago</option>
              <option value="23">Previous 30 days window</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <div className="qe-chart-layout" style={{ display: "flex", gap: "10px", margin: "22px 0 0", alignItems: "stretch" }}>
          <div className="qe-y-axis-title" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", paddingBottom: "21px" }}>Pass Rate (%)</div>
          <div className="qe-y-axis-ticks" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", paddingBottom: "21px", fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", paddingRight: "6px", textAlign: "right" }}><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div>
          <div className="qe-bars" style={{ flex: 1, margin: 0 }}>
            {trendBars.map((item, index) => (
              <div key={index} style={{ flex: 1 }}>
                <i style={{ height: `${item.value}%` }} title={`${item.label} (IST): ${item.value}% Pass Rate`} />
                <span style={{ fontSize: "8px", textTransform: "none", whiteSpace: "nowrap" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <footer><p><span className="qe-live-dot" /> Goal threshold: 90%</p><b>{avgTrendPassRate}%</b></footer>
      </article>
      <article className="qe-mix">
        <div className="qe-card-top"><div><span className="qe-kicker">Finding mix</span><h3>Defect categories</h3></div><button type="button" onClick={() => notify("Live defect categories aggregated from MongoDB findings.")} aria-label="More report options"><MoreHorizontal size={17} /></button></div>
        <div className="qe-donut"><div><b>{metrics.totalDefects}</b><span>findings</span></div></div>
        <ul>{mix.map((item) => <li key={item.label}><span style={{ background: item.color }} /><b>{item.label}</b><em>{item.value}%</em></li>)}</ul>
      </article>
      <article className="qe-report-note">
        <span><FileCheck2 size={18} /> Quality Summary</span>
        <h3>Findings report for <em>{reportRange}.</em></h3>
        <p>{summaryText}</p>
        <button type="button" onClick={handleExportReport} disabled={isExporting}><Download size={15} /> {isExporting ? "Generating PDF..." : "Export report"}</button>
      </article>
    </div>

    <div className="qe-table-wrap" style={{ marginTop: "24px" }}>
      <div className="qe-card-top" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <div><span className="qe-kicker">Report breakdown</span><h3>Quality Reports Table</h3></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Batch Name</th>
            <th>Line</th>
            <th>Items Inspected</th>
            <th>Defects Found</th>
            <th>Status</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          {(batches || []).map((batch) => {
            const flags = batch.products?.filter(p => p.status === "Failed").length || 0;
            const total = batch.products?.length || 1;
            const passPct = Math.round(((total - flags) / total) * 100);
            return (
              <tr key={batch.id}>
                <td><b>{batch.id}</b></td>
                <td><b>{batch.name}</b></td>
                <td>{batch.line}</td>
                <td><b className="qe-history-count">{total}</b></td>
                <td><span className={`qe-history-flags ${flags ? "flagged" : "clear"}`}>{flags}</span></td>
                <td><span className={`qe-verdict ${flags ? "hold" : "pass"}`}>{flags ? "FAIL" : "PASS"}</span></td>
                <td><b>{passPct}%</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(!batches || !batches.length) && <div className="qe-history-empty" style={{ padding: "30px", textAlign: "center" }}><Search size={20} /><p>No inspection report records stored yet.</p></div>}
    </div>
  </section>;
}

function HistorySection({ search, setSearch, filter, setFilter, dateRange, setDateRange, rows, onExport, isExporting, openBatch }) {
  return <section className="qe-section"><div className="qe-history-heading"><h2>History records</h2><label className="qe-filter-btn qe-result-filter"><CalendarClock size={15} /><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter Inspection History records by date">{historyDateFilters.map((range) => <option key={range}>{range}</option>)}</select><ChevronDown size={14} /></label></div><div className="qe-history-tools"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, line, or product" /></label><div>{["All batches", "In review", "Complete"].map((status) => <button type="button" key={status} onClick={() => setFilter(status)} className={status === filter ? "active" : ""}>{status}</button>)}</div><button type="button" onClick={onExport} disabled={!rows.length || isExporting}><Download size={15} /> {isExporting ? "Exporting…" : "Export"}</button></div><div className="qe-table-wrap"><table><thead><tr><th>Batch</th><th>Product and line</th><th>Status</th><th>Item count</th><th>Flags</th><th>Verdict</th><th>Completed</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.id}</b><small>{row.result}</small></td><td><b>{row.product}</b><small>{row.line}</small></td><td><span className={`qe-status ${row.status === "Complete" ? "complete" : "review"}`}>{row.status}</span></td><td><b className="qe-history-count">{row.itemCount}</b></td><td><span className={`qe-history-flags ${row.flags ? "flagged" : "clear"}`}>{row.flags}</span></td><td><span className={`qe-verdict ${row.verdict.toLowerCase()}`}>{row.verdict}</span></td><td><span className="qe-date">{row.completed}</span></td><td><button type="button" onClick={() => openBatch(row)} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!rows.length && <div className="qe-history-empty"><Search size={20} /><p>No batches match the current filters.</p></div>}</div></section>;
}

function HistoryBatchSummaryDialog({ row, onClose, currentUser }) {
  const summary = getHistoryBatchSummary(row);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const isFail = summary.tone === "fail";
  const isReview = summary.tone === "review";

  const scannerName = row.scannedBy || row.createdBy || "Quality Engineer";
  const reviewerName = (row.status === "Complete" || row.reviewedBy || row.reviewer) ? (row.reviewedBy || row.reviewer) : null;

  return (
    <div className="qe-batch-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="qe-history-summary-dialog" role="dialog" aria-modal="true" aria-labelledby={`history-summary-${row.id}`}>
        <header>
          <div>
            <span>{row.id} · {row.line}</span>
            <h2 id={`history-summary-${row.id}`}>{row.product}</h2>
            <p className="qe-history-summary-reviewer" style={{ margin: "5px 0 0", fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
              (Scanned by: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{scannerName}</strong>{reviewerName ? <> · Reviewed by: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{reviewerName}</strong></> : null})
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close batch summary"><X size={19} /></button>
        </header>

        <div className={`qe-history-summary-state ${summary.tone}`}>
          <span>{summary.label}</span>
          <b>{summary.flaggedLabel}</b>
          <p>{summary.reason}</p>
        </div>

        {summary.recommendation && (
          <div className={`qe-history-summary-rec ${summary.tone}`}>
            <span>Batch Recommendation</span>
            <p>{summary.recommendation}</p>
          </div>
        )}

        <dl className="qe-history-summary-metrics">
          <div><dt>Items inspected</dt><dd>{row.itemCount}</dd></div>
          <div><dt>Failed items</dt><dd>{row.flags}</dd></div>
          <div><dt>Verdict</dt><dd>{row.verdict}</dd></div>
        </dl>
        <footer>
          <span>{row.status}</span>
          <span>{row.completed}</span>
        </footer>
      </section>
    </div>
  );
}
