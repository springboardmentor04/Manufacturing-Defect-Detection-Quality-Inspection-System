"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type AnalyticsData = {
  kpis: {
    total_inspections: number;
    pass_rate: number;
    critical_defects: number;
    processing: number;
  };
  defects_by_severity: { name: string; value: number; color: string }[];
  daily_stats: { date: string; total: number; passed: number; failed: number }[];
  shift_performance: { shift: string; inspections: number; defects: number; efficiency: number }[];
  production_lines: { id: string; name: string; status: string; output: number; defects: number; efficiency: number }[];
};

type AnalyticsContextType = {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const AnalyticsContext = createContext<AnalyticsContextType>({
  data: null,
  isLoading: true,
  error: null,
  refresh: () => {},
});

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/analytics/dashboard?timeframe=7d`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while fetching analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return (
    <AnalyticsContext.Provider value={{ data, isLoading, error, refresh: fetchAnalytics }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
