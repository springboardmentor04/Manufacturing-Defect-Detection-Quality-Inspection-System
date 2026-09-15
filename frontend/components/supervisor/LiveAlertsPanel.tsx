"use client";

import { useState, useEffect } from "react";
import { AlertCircle, BellRing, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
};

export function LiveAlertsPanel() {
  const [alerts, setAlerts] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem("visioninspect_auth_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 flex flex-col h-full">
      <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center justify-between">
        <span className="flex items-center gap-2"><BellRing className="w-5 h-5 text-red-500" /> Live Alerts</span>
        {unreadCount > 0 && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold">{unreadCount} New</span>}
      </h3>
      
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {isLoading ? (
           <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"></div>)}
           </div>
        ) : alerts.length === 0 ? (
           <div className="text-center text-slate-500 py-8 text-sm">No recent alerts</div>
        ) : (
          <AnimatePresence>
            {alerts.map((alert, idx) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 rounded-xl border ${
                  alert.type === 'Critical Defect' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' :
                  alert.type === 'Warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' :
                  'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {alert.type === 'Critical Defect' ? <AlertCircle className="w-5 h-5 text-red-500" /> : 
                     alert.type === 'Warning' ? <AlertCircle className="w-5 h-5 text-amber-500" /> : 
                     <Info className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight mb-1.5">{alert.message}</p>
                    <p className="text-xs text-slate-500 flex justify-between items-center">
                      <span className="font-bold">{alert.type}</span>
                      <span>{new Date(alert.time).toLocaleTimeString()}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
