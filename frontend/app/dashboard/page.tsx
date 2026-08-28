'use client';

import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Analytics {
  total_scans: number;
  defect_rate: number;
  first_pass_yield: number;
  quality_index_score: number;
  avg_latency_ms: number;
  critical_defects: number;
}

interface InspectionItem {
  id: string;
  timestamp: string;
  defects_found: number;
  max_severity: string;
  overall_status: string;
  source: string;
  severity_score?: number;
  confidence?: number;
  defect_types?: string[];
}

interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  severity: string;
  severity_score: number;
  area_percent: number;
}

interface QualityAssessment {
  decision: string;
  quality_score: number;
  quality_grade: string;
  primary_defect: string;
  risk_level: string;
  summary: string;
  recommended_action: string;
}

interface AnalysisResult {
  scanId: string;
  filename?: string;
  image_url?: string;
  overall_status: string;
  confidence: number;
  defects_detected?: number;
  severity?: string;
  severity_score?: number;
  quality_score?: number;
  quality_grade?: string;
  details?: string;
  timestamp?: string;
  bounding_box?: { x: number; y: number; width: number; height: number; label: string };
  detections?: Detection[];
  assessment?: QualityAssessment;
  report?: { report_id: string; generated_at: string; inspection_method: string; model_name: string };
}

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'];

export default function DashboardPage() {
  const router = useRouter();

  // Role Management: 'SUPERVISOR' or 'QUALITY_ENGINEER'
  const [userRole, setUserRole] = useState<'SUPERVISOR' | 'QUALITY_ENGINEER'>('SUPERVISOR');
  const [userName, setUserName] = useState('Operator User');

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('Quality Analytics');

  // Shared Realtime Data States
  const [analytics, setAnalytics] = useState<Analytics>({
    total_scans: 1240,
    defect_rate: 4.33,
    first_pass_yield: 94.2,
    quality_index_score: 98.4,
    avg_latency_ms: 14.2,
    critical_defects: 12,
  });

  const [confidenceData, setConfidenceData] = useState([
    { range: '99-100%', count: 8500 },
    { range: '95-98%', count: 2100 },
    { range: '90-94%', count: 450 },
    { range: '<90%', count: 120 },
  ]);

  const [passRateData, setPassRateData] = useState([
    { day: 'Mon', passRate: 95.2, baseline: 94.8 },
    { day: 'Tue', passRate: 94.6, baseline: 94.8 },
    { day: 'Wed', passRate: 96.1, baseline: 94.8 },
    { day: 'Thu', passRate: 95.8, baseline: 94.8 },
    { day: 'Fri', passRate: 94.2, baseline: 94.8 },
  ]);

  const [inspections, setInspections] = useState<InspectionItem[]>([
    { id: 'SCAN-8091', source: 'Optical Line A', timestamp: '10:42:01 AM', defects_found: 0, max_severity: 'NONE', overall_status: 'PASSED' },
    { id: 'SCAN-8092', source: 'Optical Line B', timestamp: '10:41:45 AM', defects_found: 2, max_severity: 'HIGH', overall_status: 'REJECTED' },
    { id: 'SCAN-8093', source: 'Optical Line A', timestamp: '10:41:12 AM', defects_found: 0, max_severity: 'NONE', overall_status: 'PASSED' },
    { id: 'SCAN-8094', source: 'Optical Line C', timestamp: '10:40:30 AM', defects_found: 1, max_severity: 'LOW', overall_status: 'PASSED' },
  ]);

  // Inspection Filters
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');

  const [error, setError] = useState('');
  const [loadingScan, setLoadingScan] = useState(false);
  const [csvStatus, setCsvStatus] = useState('');

  // Image Upload & Inspection States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUserName('Alex Rivers');
    } else {
      const storedRole = (localStorage.getItem('user_role') as 'SUPERVISOR' | 'QUALITY_ENGINEER') || 'SUPERVISOR';
      setUserRole(storedRole);
      setUserName(localStorage.getItem('user_name') || 'Alex Rivers');
      loadDashboardData();
    }
  }, []);

  useEffect(() => {
    if (userRole === 'SUPERVISOR') {
      setActiveTab('Quality Analytics');
    } else {
      setActiveTab('Upload Image');
    }
  }, [userRole]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [analyticsRes, confRes, passRes, inspRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/telemetry/analytics', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/analytics/confidence-distribution', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/analytics/pass-rate-benchmark', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/telemetry/inspections', { headers }),
      ]);

      if (analyticsRes.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (confRes.ok) setConfidenceData(await confRes.json());
      if (passRes.ok) setPassRateData(await passRes.json());
      if (inspRes.ok) setInspections(await inspRes.json());
    } catch {
      setError('Telemetry stream offline. Active local buffer running.');
    }
  };

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(inspections.map((item) => item.source)));
  }, [inspections]);

  const productionLineSummary = useMemo(() => {
    const summary = inspections.reduce((acc, item) => {
      const source = item.source || 'Unknown Line';
      const metrics = acc.get(source) ?? { source, inspected: 0, rejects: 0, highSeverity: 0 };
      metrics.inspected += 1;
      if (item.overall_status === 'REJECTED') metrics.rejects += 1;
      if (item.max_severity === 'HIGH') metrics.highSeverity += 1;
      acc.set(source, metrics);
      return acc;
    }, new Map<string, { source: string; inspected: number; rejects: number; highSeverity: number }>());

    return Array.from(summary.values()).sort((a, b) => b.rejects - a.rejects).slice(0, 4);
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchesStatus = selectedStatus === 'ALL' || item.overall_status === selectedStatus;
      const matchesSource = selectedSource === 'ALL' || item.source === selectedSource;
      return matchesStatus && matchesSource;
    });
  }, [inspections, selectedStatus, selectedSource]);

  const defectSummary = useMemo(() => {
    const summary = {
      totalInspections: inspections.length,
      passed: 0,
      rejected: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
      noneSeverity: 0,
    };

    inspections.forEach((item) => {
      if (item.overall_status === 'PASSED') summary.passed += 1;
      if (item.overall_status === 'REJECTED') summary.rejected += 1;
      if (item.max_severity === 'HIGH') summary.highSeverity += 1;
      if (item.max_severity === 'MEDIUM') summary.mediumSeverity += 1;
      if (item.max_severity === 'LOW') summary.lowSeverity += 1;
      if (item.max_severity === 'NONE') summary.noneSeverity += 1;
    });

    return summary;
  }, [inspections]);

  const liveDefectAnalytics = useMemo(() => {
    const counts = new Map<string, number>();
    inspections.forEach((inspection) => {
      inspection.defect_types?.forEach((type) => counts.set(type, (counts.get(type) || 0) + 1));
    });
    const defectTypes = Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const averageSeverity = inspections.length
      ? inspections.reduce((sum, item) => sum + (item.severity_score || 0), 0) / inspections.length
      : 0;
    const averageConfidence = inspections.length
      ? inspections.reduce((sum, item) => sum + (item.confidence || 0), 0) / inspections.length
      : 0;
    return { defectTypes, averageSeverity, averageConfidence };
  }, [inspections]);

  const liveTrendData = useMemo(() => (
    inspections.slice(0, 12).reverse().map((item) => ({
      scan: item.id.replace('SCAN-', ''),
      defects: item.defects_found,
      severity: item.severity_score || 0,
      confidence: Math.round((item.confidence || 0) * 100),
    }))
  ), [inspections]);

  const updateChartsRealtime = (newInspectionStatus: string, confidenceScore?: number) => {
    if (confidenceScore) {
      setConfidenceData((prev) =>
        prev.map((item) => {
          if (confidenceScore >= 0.99 && item.range === '99-100%') return { ...item, count: item.count + 1 };
          if (confidenceScore >= 0.95 && confidenceScore < 0.99 && item.range === '95-98%') return { ...item, count: item.count + 1 };
          if (confidenceScore >= 0.90 && confidenceScore < 0.95 && item.range === '90-94%') return { ...item, count: item.count + 1 };
          if (confidenceScore < 0.90 && item.range === '<90%') return { ...item, count: item.count + 1 };
          return item;
        })
      );
    }

    setPassRateData((prev) => {
      const updated = [...prev];
      const todayIndex = updated.length - 1;
      const currentRate = updated[todayIndex].passRate;
      const shift = newInspectionStatus === 'PASSED' ? 0.3 : -0.5;
      updated[todayIndex] = {
        ...updated[todayIndex],
        passRate: parseFloat(Math.min(100, Math.max(80, currentRate + shift)).toFixed(1)),
      };
      return updated;
    });

    setAnalytics((prev) => ({
      ...prev,
      total_scans: prev.total_scans + 1,
      critical_defects: newInspectionStatus === 'REJECTED' ? prev.critical_defects + 1 : prev.critical_defects,
    }));
  };

  const handleCsvFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvStatus('Ingesting batch CSV inspection records...');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const newInspections: InspectionItem[] = [];
        const startIdx = lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('status') ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const id = cols[0] || `SCAN-${Math.floor(8000 + Math.random() * 1000)}`;
          const source = cols[1] || 'Batch CSV Source';
          const defects = parseInt(cols[2], 10) || Math.floor(Math.random() * 2);
          const status = cols[3] ? cols[3].toUpperCase() : defects === 0 ? 'PASSED' : 'REJECTED';
          const severity = cols[4] || (status === 'PASSED' ? 'NONE' : 'HIGH');

          newInspections.push({
            id,
            source,
            timestamp: new Date().toLocaleTimeString(),
            defects_found: defects,
            max_severity: severity,
            overall_status: status,
          });
        }

        setInspections((prev) => [...newInspections, ...prev]);
        setCsvStatus(`Successfully added ${newInspections.length} inspection logs!`);
        setTimeout(() => setCsvStatus(''), 5000);
      } catch {
        setCsvStatus('Failed to process CSV file. Verify headers and format.');
      }
    };

    reader.readAsText(file);
  };

  const handleRunScan = async () => {
    setLoadingScan(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/v1/telemetry/inspections/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const newScan = await res.json();
        updateChartsRealtime(newScan.overall_status, Math.random() * 0.1 + 0.89);
      } else {
        const simulatedStatus = Math.random() > 0.3 ? 'PASSED' : 'REJECTED';
        const newScan: InspectionItem = {
          id: `SCAN-${Math.floor(8000 + Math.random() * 1000)}`,
          source: 'Optical Line A',
          timestamp: new Date().toLocaleTimeString(),
          defects_found: simulatedStatus === 'PASSED' ? 0 : 2,
          max_severity: simulatedStatus === 'PASSED' ? 'NONE' : 'HIGH',
          overall_status: simulatedStatus,
        };
        setInspections((prev) => [newScan, ...prev]);
        updateChartsRealtime(simulatedStatus, 0.97);
      }
    } catch {
      setError('Scan executed locally on active buffer.');
    } finally {
      setLoadingScan(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setLatestAnalysis(null);
    }
  };

  const handleProcessImageInference = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('http://127.0.0.1:8000/api/v1/inspection/analyze-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail || `Inspection failed (${res.status})`);
      }

      const result: AnalysisResult = await res.json();
      setLatestAnalysis(result);
      setInspections((prev) => [
        {
          id: result.scanId,
          source: 'Manual QE Upload',
          timestamp: result.timestamp || new Date().toLocaleTimeString(),
          defects_found: result.defects_detected ?? result.detections?.length ?? 0,
          max_severity: result.severity || 'UNKNOWN',
          severity_score: result.severity_score,
          confidence: result.confidence,
          defect_types: Array.from(new Set(result.detections?.map((item) => item.class) || [])),
          overall_status: result.overall_status,
        },
        ...prev.filter((item) => item.id !== result.scanId),
      ]);
      updateChartsRealtime(result.overall_status, result.confidence);
      setActiveTab('Severity & Assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inference service connection error.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const downloadProductionReport = async () => {
    if (!latestAnalysis) return;
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/inspection/report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestAnalysis),
      });
      if (!response.ok) throw new Error(`PDF generation failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${latestAnalysis.report?.report_id || latestAnalysis.scanId}-quality-report.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate the PDF report.');
    }
  };

  const supervisorNav = [
    { name: 'Production Overview', icon: '📊' },
    { name: 'Inspection Reports', icon: '📋' },
    { name: 'Defect Trends', icon: '📈' },
    { name: 'Quality Analytics', icon: '⚡' },
    { name: 'Production Monitoring', icon: '🏭' },
  ];

  const qualityEngineerNav = [
    { name: 'Upload Image', icon: '☁️' },
    { name: 'Severity & Assessment', icon: '🎯' },
    { name: 'Defect Classification', icon: '⚠️' },
    { name: 'Production Quality Report', icon: '📄' },
    { name: 'Inspection History', icon: '📜' },
  ];

  qualityEngineerNav.splice(4, 0,
    { name: 'Defect Analytics', icon: 'DA' },
    { name: 'Defect Trends', icon: 'DT' },
  );

  const activeNavItems = userRole === 'SUPERVISOR' ? supervisorNav : qualityEngineerNav;

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0F172A]/80 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-500/20 border border-blue-400 flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
                </div>
                <h1 className="font-bold text-base tracking-tight text-white">VisionInspect AI</h1>
              </div>
              <p className="text-[11px] text-blue-400 font-semibold pl-8 mt-0.5">
                {userRole === 'SUPERVISOR' ? 'Supervisor Portal' : 'Quality Engineer'}
              </p>
            </div>
          </div>

          {/* DYNAMIC ROLE SWITCHER */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 space-y-1">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">Switch View</p>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setUserRole('SUPERVISOR')}
                className={`py-1 rounded-lg text-[10px] font-bold transition ${
                  userRole === 'SUPERVISOR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Supervisor
              </button>
              <button
                onClick={() => setUserRole('QUALITY_ENGINEER')}
                className={`py-1 rounded-lg text-[10px] font-bold transition ${
                  userRole === 'QUALITY_ENGINEER' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quality Eng.
              </button>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Navigation Menu
            </p>
            {activeNavItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
        >
          <span>🚪</span> Logout
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* TOP HEADER & LIVE TRIGGER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">{activeTab}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {userRole}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {userRole === 'SUPERVISOR'
                ? 'First Pass Yield (FPY), Statistical Process Control & Precision Telemetry'
                : 'Quality Engineer Workspace & Precision Diagnostics'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* LIVE TRIGGER BUTTON */}
            <button
              onClick={handleRunScan}
              disabled={loadingScan}
              className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
            >
              {loadingScan ? 'Scanning...' : '⚡ Trigger Live Scan'}
            </button>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 flex items-center gap-1.5">
              <span>📅</span> Wed Jul 29, 2026
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs">
              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px]">
                {userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <p className="font-semibold text-slate-200 leading-none">{userName}</p>
                <span className="text-[9px] text-emerald-400 font-medium">● Active Session</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-400">
            {error}
          </div>
        )}

        {/* LIVE ANALYTICS VIEW */}
        {userRole === 'SUPERVISOR' && activeTab === 'Quality Analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">FIRST PASS YIELD (FPY)</p>
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">🛡️</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{analytics.first_pass_yield}%</p>
                <p className="text-[11px] text-slate-400">Direct Pass without rework</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">QUALITY INDEX SCORE</p>
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm">🔒</span>
                </div>
                <p className="text-3xl font-extrabold text-white tracking-tight">
                  {analytics.quality_index_score} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">Grade A Operational Standard</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">AVG INSPECTION LATENCY</p>
                  <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm">⏱️</span>
                </div>
                <p className="text-3xl font-extrabold text-white tracking-tight">{analytics.avg_latency_ms} ms</p>
                <p className="text-[11px] text-slate-400">Sub-15ms Optical Inference</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">REJECT RATE %</p>
                  <span className="p-2 bg-red-500/10 text-red-400 rounded-lg text-sm">🎯</span>
                </div>
                <p className="text-3xl font-extrabold text-red-400 tracking-tight">{analytics.defect_rate}%</p>
                <p className="text-[11px] text-slate-400">Within Nominal Limits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">AI Confidence Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceData}>
                      <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Daily Pass Rate vs Weekly Benchmark</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={passRateData}>
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis domain={[80, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="baseline" stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTION OVERVIEW VIEW */}
        {userRole === 'SUPERVISOR' && activeTab === 'Production Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Scans</p>
                <p className="text-3xl font-extrabold text-white tracking-tight">{analytics.total_scans}</p>
                <p className="text-[11px] text-slate-500">Across all monitored production lines</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Quality Index</p>
                <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{analytics.quality_index_score}%</p>
                <p className="text-[11px] text-slate-500">Operational compliance score</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Pass Rate</p>
                <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{analytics.first_pass_yield}%</p>
                <p className="text-[11px] text-slate-500">First-pass yield performance</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Reject Rate</p>
                <p className="text-3xl font-extrabold text-red-400 tracking-tight">{analytics.defect_rate}%</p>
                <p className="text-[11px] text-slate-500">Defective scans requiring intervention</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Line Performance Summary</h3>
                  <p className="text-xs text-slate-400">Top production sources ranked by reject frequency.</p>
                </div>
                <span className="text-xs text-slate-500">{inspections.length} recent inspections</span>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {productionLineSummary.map((line) => (
                  <div key={line.source} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{line.source}</p>
                    <p className="text-2xl font-bold text-white mt-3">{line.inspected}</p>
                    <p className="text-[11px] text-slate-400 mt-2">{line.rejects} rejects · {line.highSeverity} high-severity</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INSPECTION REPORTS VIEW */}
        {userRole === 'SUPERVISOR' && activeTab === 'Inspection Reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Inspection Reports</h3>
                <p className="text-xs text-slate-400">View recent inspection logs, export reports, and review defects by scan.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.open('http://127.0.0.1:8000/api/v1/telemetry/reports/export-csv', '_blank')}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setSelectedStatus('ALL')}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Latest Inspections</p>
                <p className="text-3xl font-bold text-white mt-3">{inspections.length}</p>
                <p className="text-[11px] text-slate-400 mt-2">Active scans over the current session.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Passed Today</p>
                <p className="text-3xl font-bold text-emerald-400 mt-3">{inspections.filter((item) => item.overall_status === 'PASSED').length}</p>
                <p className="text-[11px] text-slate-400 mt-2">Successful production picks.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Rejected Today</p>
                <p className="text-3xl font-bold text-red-400 mt-3">{inspections.filter((item) => item.overall_status === 'REJECTED').length}</p>
                <p className="text-[11px] text-slate-400 mt-2">Units flagged for review.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0F172A]/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Scan ID</th>
                    <th className="px-4 py-3">Line</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Defects</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredInspections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">{item.id}</td>
                      <td className="px-4 py-3 text-slate-300">{item.source}</td>
                      <td className="px-4 py-3 text-slate-400">{item.timestamp}</td>
                      <td className="px-4 py-3 text-slate-200">{item.defects_found}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${item.max_severity === 'HIGH' ? 'text-red-400' : 'text-slate-400'}`}>
                          {item.max_severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.overall_status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.overall_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTION MONITORING VIEW */}
        {userRole === 'SUPERVISOR' && activeTab === 'Production Monitoring' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Production Monitoring</h3>
                  <p className="text-xs text-slate-400">Real-time throughput, confidence stability, and line health.</p>
                </div>
                <span className="text-xs text-slate-500">Live metrics update every scan</span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Current Line Health</p>
                  <p className="text-3xl font-bold text-white mt-3">{Math.max(0, 100 - analytics.defect_rate).toFixed(1)}%</p>
                  <p className="text-[11px] text-slate-400 mt-2">Higher values mean fewer rejects.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Average Confidence</p>
                  <p className="text-3xl font-bold text-blue-400 mt-3">{((confidenceData.reduce((sum, item) => sum + item.count * (item.range.includes('99') ? 0.995 : item.range.includes('95') ? 0.965 : item.range.includes('90') ? 0.925 : 0.88), 0) / Math.max(confidenceData.reduce((sum, item) => sum + item.count, 0), 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[11px] text-slate-400 mt-2">Estimated model score from confidence bands.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Throughput Trend</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-3">{passRateData[passRateData.length - 1]?.passRate}%</p>
                  <p className="text-[11px] text-slate-400 mt-2">Latest daily pass rate.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <h4 className="text-sm font-semibold text-white">Pass Rate Trend</h4>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={passRateData}>
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis domain={[80, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <h4 className="text-sm font-semibold text-white">Confidence Distribution</h4>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceData}>
                      <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEFECT TRENDS VIEW */}
        {userRole === 'SUPERVISOR' && activeTab === 'Defect Trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Defect Category Breakdown</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Surface Scratch', value: 45 },
                        { name: 'Alignment Variance', value: 25 },
                        { name: 'Crack / Fracture', value: 18 },
                        { name: 'Color Discoloration', value: 12 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Weekly Reject Frequency Trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { day: 'Mon', rejects: 14 },
                      { day: 'Tue', rejects: 22 },
                      { day: 'Wed', rejects: 8 },
                      { day: 'Thu', rejects: 19 },
                      { day: 'Fri', rejects: 12 },
                    ]}
                  >
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="rejects" stroke="#ef4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* QUALITY ENGINEER - UPLOAD IMAGE VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Upload Image' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>☁️</span> Component Optical Frame Ingestion
                </h3>
                <p className="text-xs text-slate-400">
                  Select or drag a raw high-resolution image captured from line inspection cameras.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center bg-slate-950/40 hover:border-blue-500 transition cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-4 pointer-events-none">
                  <div className="h-16 w-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition">
                    ☁️
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">
                      {selectedFile ? selectedFile.name : 'Drag & Drop Optical Image Here'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, BMP up to 25MB</p>
                  </div>
                  <button type="button" className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-5 py-2 rounded-xl">
                    Browse Image Button
                  </button>
                </div>
              </div>

              {previewUrl && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-300">Selected Frame Preview:</p>
                    <span className="text-[11px] font-mono text-slate-500">
                      {(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Upload Preview" className="h-full w-full object-contain" />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleProcessImageInference}
                      disabled={uploading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Executing Neural Scan...
                        </>
                      ) : (
                        '⚡ Process & View Diagnostic Results'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUALITY ENGINEER - INSPECTION RESULT VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Severity & Assessment' && (
          <div className="space-y-6">
            {latestAnalysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎯</span> Optical Diagnostic Inspection Display
                    </h3>
                    <span className="font-mono text-xs text-blue-400 font-bold">{latestAnalysis.scanId}</span>
                  </div>

                  <div className="h-96 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {previewUrl ? (
                      <div className="relative inline-block max-h-full max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Inspection Result" className="block max-h-96 max-w-full object-contain" />

                        {latestAnalysis.bounding_box && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${latestAnalysis.bounding_box.x}%`,
                              top: `${latestAnalysis.bounding_box.y}%`,
                              width: `${latestAnalysis.bounding_box.width}%`,
                              height: `${latestAnalysis.bounding_box.height}%`,
                            }}
                            className="border-2 border-red-500 bg-red-500/20 rounded-lg flex items-start p-2"
                          >
                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              {latestAnalysis.bounding_box.label}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-600 text-xs font-mono">Simulated Camera Frame</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-6">
                  <h3 className="text-sm font-bold text-white">Diagnostic Telemetry Summary</h3>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Overall Status</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          latestAnalysis.overall_status === 'PASSED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : latestAnalysis.overall_status === 'INCONCLUSIVE'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {latestAnalysis.overall_status}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Model Confidence</span>
                      <span className="font-bold text-blue-400">
                        {(latestAnalysis.confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Defects Count</span>
                      <span className="font-bold text-slate-200">{latestAnalysis.defects_detected ?? 0}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Severity Score</span>
                      <span className="font-bold text-red-400">{(latestAnalysis.severity_score ?? 0).toFixed(1)} / 100</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Quality Grade</span>
                      <span className="font-bold text-amber-400">{latestAnalysis.quality_grade || 'N/A'} ({(latestAnalysis.quality_score ?? 0).toFixed(1)})</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">Detailed Analysis Notes:</span>
                      <p className="text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {latestAnalysis.details || 'Inspection complete. Component verified against optical quality standards.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-12 text-center space-y-3">
                <p className="text-sm text-slate-400">No active inspection loaded.</p>
                <button
                  onClick={() => setActiveTab('Upload Image')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Go to Upload Frame
                </button>
              </div>
            )}
          </div>
        )}

        {/* DEFECT DETAILS VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Defect Classification' && (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Defect Classification</h3>
                <p className="text-xs text-slate-400">Live classifications and bounding-box measurements from the most recent upload.</p>
              </div>
            </div>

            {latestAnalysis ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Scan ID</p>
                    <p className="mt-3 font-mono font-bold text-blue-400">{latestAnalysis.scanId}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Detected Defects</p>
                    <p className="text-3xl font-bold text-white mt-3">{latestAnalysis.detections?.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Maximum Severity</p>
                    <p className="text-xl font-bold text-red-400 mt-3">{latestAnalysis.severity || 'UNKNOWN'}</p>
                  </div>
                </div>

                {(latestAnalysis.detections?.length ?? 0) > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Defect</th>
                          <th className="px-4 py-3">Confidence</th>
                          <th className="px-4 py-3">Severity</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Area</th>
                          <th className="px-4 py-3">Bounding Box (x1, y1, x2, y2)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {latestAnalysis.detections?.map((defect, index) => (
                          <tr key={`${defect.class}-${index}`}>
                            <td className="px-4 py-3 font-semibold text-white">{defect.class}</td>
                            <td className="px-4 py-3 text-blue-400">{(defect.confidence * 100).toFixed(1)}%</td>
                            <td className="px-4 py-3 text-red-400">{defect.severity}</td>
                            <td className="px-4 py-3 text-amber-400">{defect.severity_score.toFixed(1)}</td>
                            <td className="px-4 py-3 text-slate-300">{defect.area_percent.toFixed(2)}%</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{defect.bbox.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                    No defect reached the review threshold. This inspection remains inconclusive and requires manual review.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
                Upload and process an image to populate defect details.
              </div>
            )}
          </div>
        )}

        {/* QUALITY REPORT VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Production Quality Report' && (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Production Quality Report</h3>
                <p className="text-xs text-slate-400">Live report generated from the most recently processed image.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadProductionReport}
                  disabled={!latestAnalysis}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  Download PDF Report
                </button>
                <button
                  onClick={() => window.print()}
                  disabled={!latestAnalysis}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  Print Report
                </button>
              </div>
            </div>

            {latestAnalysis ? <><div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Inspection Status</p>
                <p className={`text-2xl font-bold mt-3 ${latestAnalysis.overall_status === 'PASSED' ? 'text-emerald-400' : latestAnalysis.overall_status === 'INCONCLUSIVE' ? 'text-amber-400' : 'text-red-400'}`}>{latestAnalysis.overall_status}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Model Confidence</p>
                <p className="text-3xl font-bold text-blue-400 mt-3">{(latestAnalysis.confidence * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Quality Score / Grade</p>
                <p className="text-3xl font-bold text-amber-400 mt-3">{(latestAnalysis.quality_score ?? 0).toFixed(1)} / {latestAnalysis.quality_grade || 'N/A'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <h4 className="text-sm font-semibold text-white">Inspection Summary</h4>
                <span className="font-mono text-xs text-blue-400">{latestAnalysis.scanId} · {latestAnalysis.timestamp}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {latestAnalysis.assessment?.summary || latestAnalysis.details}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                <li className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-300">
                  <span className="block text-slate-500">Recommended Action</span>
                  <strong className="block mt-2 text-white">{latestAnalysis.assessment?.recommended_action || 'Perform manual review before approval.'}</strong>
                </li>
                <li className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-300">
                  <span className="block text-slate-500">Primary Finding</span>
                  <strong className="block mt-2 text-white">{latestAnalysis.assessment?.primary_defect || latestAnalysis.bounding_box?.label || 'No confirmed defect'}</strong>
                </li>
              </ul>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div><span className="block text-slate-500">Decision</span><strong className="text-white">{latestAnalysis.assessment?.decision || 'REVIEW'}</strong></div>
                <div><span className="block text-slate-500">Report ID</span><strong className="font-mono text-blue-400">{latestAnalysis.report?.report_id || 'Pending'}</strong></div>
                <div><span className="block text-slate-500">Inspection Method</span><strong className="text-white">{latestAnalysis.report?.inspection_method || 'Optical AI inspection'}</strong></div>
              </div>
            </div>
            </> : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
                Upload and process an image to generate its quality report.
              </div>
            )}
          </div>
        )}

        {/* LIVE DEFECT ANALYTICS VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Defect Analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Total Inspections</p>
                <p className="mt-3 text-3xl font-bold text-white">{inspections.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Average Severity</p>
                <p className="mt-3 text-3xl font-bold text-red-400">{liveDefectAnalytics.averageSeverity.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Average Confidence</p>
                <p className="mt-3 text-3xl font-bold text-blue-400">{(liveDefectAnalytics.averageConfidence * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <h3 className="text-sm font-bold text-white mb-4">Defect Classification Distribution</h3>
                {liveDefectAnalytics.defectTypes.length ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={liveDefectAnalytics.defectTypes}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="44%"
                        outerRadius={92}
                        labelLine={{ stroke: '#94A3B8' }}
                        label={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 600 }}
                      >
                        {liveDefectAnalytics.defectTypes.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155' }} />
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value, entry) => (
                          <span className="text-xs text-slate-200">
                            {value}: {String(entry.payload?.value ?? 0)}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-24 text-center text-sm text-slate-500">No classified defects yet.</p>}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5">
                <h3 className="text-sm font-bold text-white mb-4">Severity by Recent Scan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={liveTrendData}>
                    <XAxis dataKey="scan" stroke="#64748B" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155' }} />
                    <Bar dataKey="severity" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* LIVE DEFECT TREND MONITOR */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Defect Trends' && (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Defect Trend Monitor</h3>
              <p className="text-xs text-slate-400">Tracks defect count, severity, and confidence across the latest production scans.</p>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={liveTrendData}>
                <XAxis dataKey="scan" stroke="#64748B" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="severity" stroke="#EF4444" strokeWidth={3} name="Severity score" />
                <Line type="monotone" dataKey="confidence" stroke="#3B82F6" strokeWidth={2} name="Confidence %" />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-950 p-3"><span className="text-slate-500">Latest defect count</span><strong className="block mt-1 text-white">{liveTrendData.at(-1)?.defects ?? 0}</strong></div>
              <div className="rounded-xl bg-slate-950 p-3"><span className="text-slate-500">Latest severity</span><strong className="block mt-1 text-red-400">{liveTrendData.at(-1)?.severity.toFixed(1) ?? '0.0'}</strong></div>
              <div className="rounded-xl bg-slate-950 p-3"><span className="text-slate-500">Trend condition</span><strong className="block mt-1 text-amber-400">{(liveTrendData.at(-1)?.severity ?? 0) >= 60 ? 'Action required' : 'Stable / review'}</strong></div>
            </div>
          </div>
        )}

        {/* INSPECTION HISTORY VIEW */}
        {userRole === 'QUALITY_ENGINEER' && activeTab === 'Inspection History' && (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Inspection History</h3>
                <p className="text-xs text-slate-400">Review past inspection records, search by scan ID, and monitor long-term trends.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20">
                  📁 Ingest Batch CSV
                  <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Filter Status</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PASSED">PASSED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="FLAGGED">FLAGGED</option>
                  <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Filter Source</span>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  <option value="ALL">All Sources</option>
                  {uniqueSources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Scan ID</th>
                    <th className="px-4 py-3">Source Line</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Defects</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredInspections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">{item.id}</td>
                      <td className="px-4 py-3 text-slate-300">{item.source}</td>
                      <td className="px-4 py-3 text-slate-400">{item.timestamp}</td>
                      <td className="px-4 py-3 text-slate-200">{item.defects_found}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            item.max_severity === 'HIGH' ? 'text-red-400' : 'text-slate-400'
                          }`}
                        >
                          {item.max_severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.overall_status === 'PASSED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.overall_status === 'INCONCLUSIVE'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {item.overall_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
