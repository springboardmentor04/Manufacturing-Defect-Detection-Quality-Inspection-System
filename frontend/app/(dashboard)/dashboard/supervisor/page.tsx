"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";

// Modals / Common
import { DateFilterPanel } from "@/components/supervisor/DateFilterPanel";
import { ExportCenter } from "@/components/supervisor/ExportCenter";
import { AnalyticsProvider } from "@/lib/analytics-context";

// Overview Tab
import { SupervisorKPIs } from "@/components/supervisor/SupervisorKPIs";
import { ProductionOverview } from "@/components/supervisor/ProductionOverview";
import { ShiftPerformance } from "@/components/supervisor/ShiftPerformance";
import { LiveAlertsPanel } from "@/components/supervisor/LiveAlertsPanel";

// Reports Tab
import { ReportsTable } from "@/components/supervisor/ReportsTable";

// Trends & Quality Tabs
import { DefectAnalyticsCharts } from "@/components/supervisor/DefectAnalyticsCharts";
import { QualityAnalyticsCharts } from "@/components/supervisor/QualityAnalyticsCharts";
import { SupervisorCharts } from "@/components/supervisor/SupervisorCharts";

// Monitoring Tab
import { EnhancedProductionLines } from "@/components/supervisor/EnhancedProductionLines";

// Users Tab
import { UserManagementTable } from "@/components/supervisor/UserManagementTable";

function DashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'Overview';

  return (
    <>
      <DateFilterPanel />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 space-y-6 mt-6"
        >
          {activeTab === "Overview" && (
            <>
              <SupervisorKPIs />
              <div className="grid lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                  <ProductionOverview />
                </div>
                <div>
                  <LiveAlertsPanel />
                </div>
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <ShiftPerformance />
                </div>
              </div>
            </>
          )}

          {activeTab === "Reports" && (
            <>
              <ExportCenter />
              <ReportsTable />
            </>
          )}

          {activeTab === "Defect Trends" && (
            <>
              <SupervisorCharts />
              <DefectAnalyticsCharts />
            </>
          )}

          {activeTab === "Quality" && (
            <>
              <QualityAnalyticsCharts />
            </>
          )}

          {activeTab === "Monitoring" && (
            <>
              <EnhancedProductionLines />
            </>
          )}

          {activeTab === "Users" && (
            <>
              <UserManagementTable />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default function SupervisorDashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1600px] mx-auto pb-10 flex flex-col min-h-screen"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Factory Supervisor Dashboard</h1>
          <p className="text-slate-500 mt-1">Enterprise manufacturing monitoring and quality analytics.</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-32 flex items-center justify-center">Loading dashboard data...</div>}>
        <AnalyticsProvider>
          <ClientOnly>
            <DashboardContent />
          </ClientOnly>
        </AnalyticsProvider>
      </Suspense>
    </motion.div>
  );
}
