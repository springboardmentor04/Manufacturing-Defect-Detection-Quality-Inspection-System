import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { 
  Users, 
  Database, 
  HardDrive, 
  Cpu, 
  Server, 
  Activity, 
  UserPlus, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Line Chart Data: Monthly Inspections
const monthlyInspectionsData = [
  { month: 'Jan', inspections: 45000 },
  { month: 'Feb', inspections: 52000 },
  { month: 'Mar', inspections: 61000 },
  { month: 'Apr', inspections: 58000 },
  { month: 'May', inspections: 72000 },
  { month: 'Jun', inspections: 84000 },
];

// Bar Chart Data: Users by Role
const usersByRoleData = [
  { role: 'Admin', count: 6, fill: '#2563EB' },
  { role: 'Supervisor', count: 18, fill: '#22C55E' },
  { role: 'Quality Eng', count: 24, fill: '#FACC15' },
];

// Pie Chart Data: Dataset Distribution
const datasetDistributionData = [
  { name: 'PCB Boards', value: 45, color: '#2563EB' },
  { name: 'Motor Casings', value: 30, color: '#22C55E' },
  { name: 'Gear Shafts', value: 15, color: '#FACC15' },
  { name: 'Valves & Fittings', value: 10, color: '#EF4444' },
];

// User Management Table Data
const userManagementTable = [
  { name: 'Marcus Vance', email: 'm.vance@factory.ai', role: 'Admin', status: 'Active', lastLogin: '2026-07-28 14:22' },
  { name: 'Elena Rostova', email: 'e.rostova@factory.ai', role: 'Factory Supervisor', status: 'Active', lastLogin: '2026-07-28 14:18' },
  { name: 'David Chen', email: 'd.chen@factory.ai', role: 'Quality Engineer', status: 'Active', lastLogin: '2026-07-28 14:05' },
  { name: 'Sarah Jenkins', email: 's.jenkins@factory.ai', role: 'Quality Engineer', status: 'Inactive', lastLogin: '2026-07-25 09:12' },
  { name: 'Viktor Krum', email: 'v.krum@factory.ai', role: 'Factory Supervisor', status: 'Active', lastLogin: '2026-07-28 13:40' },
];

// Activity Logs Data (User Created, Dataset Uploaded, Model Updated, Login Events)
const activityLogsData = [
  { id: 'LOG-1001', type: 'User Created', description: 'Created new user account for Sarah Jenkins (Quality Engineer)', time: '14:22:10' },
  { id: 'LOG-1002', type: 'Dataset Uploaded', description: 'Uploaded PCB Board v4 dataset (120,000 frames)', time: '14:10:45' },
  { id: 'LOG-1003', type: 'Model Updated', description: 'Deployed YOLO-Vision v8.2 model to Cluster Node A', time: '13:45:00' },
  { id: 'LOG-1004', type: 'Login Event', description: 'User Elena Rostova logged in from 192.168.1.112', time: '13:12:30' },
  { id: 'LOG-1005', type: 'Login Event', description: 'User Marcus Vance logged in from 192.168.1.104', time: '12:50:18' },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Welcome back, Operator! System Governance & Global Telemetry"
    >
      <div className="space-y-8">
        
        {/* KPI Cards (4 Mandatory) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Users */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</span>
              <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">48 Users</div>
            <p className="text-xs text-[#22C55E] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> 12 Active Sessions
            </p>
          </div>

          {/* Card 2: Total Datasets */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Datasets</span>
              <div className="p-3 bg-[#22C55E]/10 rounded-xl text-[#22C55E]">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">14 Datasets</div>
            <p className="text-xs text-gray-400">850,000 Annotated Images</p>
          </div>

          {/* Card 3: Storage Used */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storage Used</span>
              <div className="p-3 bg-[#FACC15]/10 rounded-xl text-[#FACC15]">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">1.85 TB</div>
            <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
              <div className="bg-[#FACC15] h-full rounded-full" style={{ width: '74%' }}></div>
            </div>
          </div>

          {/* Card 4: AI Model Accuracy */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Model Accuracy</span>
              <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#22C55E] tracking-tight">99.2%</div>
            <p className="text-xs text-gray-400">Model v8.2-XL Verified</p>
          </div>

        </div>

        {/* System Health Cards Section */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-[#2563EB]" />
              <span>System Health Cards</span>
            </h2>
            <span className="text-xs font-semibold px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-xl">
              Cluster Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Server Status */}
            <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Server Status</span>
                <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
              </div>
              <div className="text-lg font-bold text-white">99.99% Uptime</div>
              <p className="text-[11px] text-[#22C55E]">Nodes A, B, C Active</p>
            </div>

            {/* Card 2: Database Status */}
            <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Database Status</span>
                <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
              </div>
              <div className="text-lg font-bold text-white">Healthy</div>
              <p className="text-[11px] text-gray-400">PostgreSQL Replica Sync 100%</p>
            </div>

            {/* Card 3: AI API Status */}
            <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">AI API Status</span>
                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
              </div>
              <div className="text-lg font-bold text-white">Active (12ms)</div>
              <p className="text-[11px] text-[#2563EB]">Low Latency Inference</p>
            </div>

            {/* Card 4: GPU Usage */}
            <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">GPU Usage</span>
                <span className="w-2 h-2 rounded-full bg-[#FACC15]"></span>
              </div>
              <div className="text-lg font-bold text-white">78% Load</div>
              <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden">
                <div className="bg-[#FACC15] h-full" style={{ width: '78%' }}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Charts Grid (3 Mandatory Charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Line Chart - Monthly Inspections */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Monthly Inspections</h2>
              <p className="text-xs text-gray-400">Line chart of volume growth</p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyInspectionsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                  <Line type="monotone" dataKey="inspections" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} name="Inspections" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Bar Chart - Users by Role */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Users by Role</h2>
              <p className="text-xs text-gray-400">Bar chart of role distribution</p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usersByRoleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="role" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                  <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Pie Chart - Dataset Distribution */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Dataset Distribution</h2>
              <p className="text-xs text-gray-400">Pie chart of trained component datasets</p>
            </div>

            <div className="h-64 w-full pt-2 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={datasetDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {datasetDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                {datasetDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-gray-300 truncate">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* User Management Table & Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* User Management Table */}
          <div className="lg:col-span-6 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2563EB]" />
                  <span>User Management Table</span>
                </h2>
                <p className="text-xs text-gray-400">Manage portal access credentials</p>
              </div>
              <button className="flex items-center space-x-1 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-xs font-semibold text-white rounded-xl cursor-pointer transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                  <tr>
                    <th className="px-3 py-3 rounded-l-xl">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 rounded-r-xl">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {userManagementTable.map((u) => (
                    <tr key={u.email} className="hover:bg-[#1F2937]/50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-white">{u.name}</td>
                      <td className="px-3 py-3 text-gray-400 font-mono text-[11px]">{u.email}</td>
                      <td className="px-3 py-3 text-gray-200 font-medium">{u.role}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'Active'
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-400 font-mono text-[11px]">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="lg:col-span-6 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#FACC15]" />
                  <span>Activity Logs</span>
                </h2>
                <p className="text-xs text-gray-400">User Created, Dataset Uploaded, Model Updated, Login Events</p>
              </div>
            </div>

            <div className="space-y-3">
              {activityLogsData.map((log) => (
                <div key={log.id} className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                      {log.type}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">{log.time}</span>
                  </div>
                  <p className="text-xs text-gray-300 pl-3.5">{log.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
