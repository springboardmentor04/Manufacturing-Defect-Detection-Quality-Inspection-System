import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { inspectionAPI, datasetAPI } from '../api';
import Navbar from '../components/Navbar';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

const STATUS_COLORS = {
  pass: '#22C55E',
  fail: '#EF4444',
  'manual review': '#F59E0B',
  'pending/processing': '#3B82F6',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [dataset, setDataset] = useState(null);
  const [recentImages, setRecentImages] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [trendChartData, setTrendChartData] = useState([]);

  useEffect(() => {
    inspectionAPI.stats().then(({ data }) => setStats(data)).catch(() => {});
    inspectionAPI.list(0, 5).then(({ data }) => setRecentImages(data.images)).catch(() => {});
    inspectionAPI.categoryStats().then(({ data }) => setCategoryChartData(data.slice(0, 10))).catch(() => {});
    inspectionAPI.trendStats().then(({ data }) => setTrendChartData(data)).catch(() => {});
    datasetAPI.mvtecInfo().then(({ data }) => setDataset(data)).catch(() => {});
  }, []);

  // Donut chart data — inspection status breakdown
  const statusChartData = [
    { name: 'Pass', value: stats.pass_count ?? 0 },
    { name: 'Fail', value: stats.fail_count ?? 0 },
    { name: 'Manual Review', value: stats.review_count ?? 0 },
    { name: 'Pending/Processing', value: (stats.pending ?? 0) + (stats.processing ?? 0) },
  ].filter(d => d.value > 0);

  // Generate automated operational insights
  const getOperationalInsights = () => {
    const defectRate = stats.defect_rate ?? 0;
    const pendingCount = (stats.pending ?? 0) + (stats.processing ?? 0);
    const topCategory = categoryChartData[0]?.name || 'N/A';

    let severity = 'success'; // success, warning, danger
    let title = 'Quality Operations: Normal';
    let description = 'Product defect rates are within normal manufacturing baselines (< 10%).';

    if (defectRate >= 30) {
      severity = 'danger';
      title = 'Quality Alert: Action Required';
      description = `Critical defect rate detected at ${defectRate}%. Immediately review machine calibration parameters.`;
    } else if (defectRate >= 10) {
      severity = 'warning';
      title = 'Quality Warning: Elevated Defects';
      description = `Defect rate is at ${defectRate}%. Monitor anomaly frequencies on the main assembly line.`;
    }

    return {
      severity,
      title,
      description,
      pendingCount,
      topCategory,
      defectRate
    };
  };

  const insights = getOperationalInsights();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Welcome, {user?.full_name}</h2>
            <p className="text-gray-500 text-sm">Manufacturing Quality Inspection Dashboard</p>
          </div>
          <div className="flex gap-2">
            <Link to="/upload" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Inspect Product
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Inspections" value={stats.total} color="border-indigo-500" />
          <StatCard label="Passed" value={stats.pass_count ?? 0} color="border-green-500" />
          <StatCard label="Failed" value={stats.fail_count ?? 0} color="border-red-500" />
          <StatCard label="Manual Review" value={stats.review_count ?? 0} color="border-yellow-500" />
          <StatCard label="Defect Rate" value={`${stats.defect_rate ?? 0}%`} color="border-orange-500" />
        </div>

        {/* Operational Insights Card */}
        <div className={`mb-8 p-5 rounded-xl border ${
          insights.severity === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
          insights.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {insights.severity === 'danger' && (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {insights.severity === 'warning' && (
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {insights.severity === 'success' && (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-snug">{insights.title}</h3>
              <p className="text-xs mt-1 opacity-90">{insights.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold">
                <span>· Most Active Line: <span className="underline capitalize">{insights.topCategory}</span></span>
                {insights.pendingCount > 0 && <span>· Pending Inspections: <span className="underline">{insights.pendingCount}</span></span>}
                <span>· Overall Defect Rate: <span className="underline">{insights.defectRate}%</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 — Status and Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Defect Trend Analysis Chart */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Defect Rate & Inspection Trend (7 Days)
            </h3>
            {trendChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No trend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#6366F1" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#EF4444" unit="%" />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="total" name="Total Inspections" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="defect_rate" name="Defect Rate (%)" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Chart — Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Inspection Status Breakdown</h3>
            {statusChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} inspections`]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row 2 — Categories */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Bar Chart — Inspections per Category */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Inspections by Category</h3>
            {categoryChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryChartData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="#9CA3AF" />
                  <Tooltip formatter={(value) => [`${value} inspections`]} />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Inspections + MVTec Dataset */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Inspections</h3>
              <Link to="/inspections" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            {recentImages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No inspections yet.</p>
                <Link to="/upload" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Upload your first image</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentImages.map((img) => (
                  <li key={img.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 truncate max-w-xs">{img.original_filename}</p>
                      <p className="text-xs text-gray-400">{img.product_category || 'Uncategorized'} · {new Date(img.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      img.status === 'completed' 
                        ? (img.decision === 'Pass' ? 'bg-green-100 text-green-700' :
                           img.decision === 'Fail' ? 'bg-red-100 text-red-700' :
                           'bg-yellow-100 text-yellow-700')
                        : img.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        img.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>{img.status === 'completed' ? img.decision : img.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">MVTec AD Dataset</h3>
            {dataset ? (
              <>
                <p className="text-sm text-gray-500 mb-3">{dataset.description}</p>
                <div className="flex flex-wrap gap-2">
                  {dataset.categories.map((cat) => (
                    <span key={cat} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full capitalize">{cat}</span>
                  ))}
                </div>
                <a href={dataset.source} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
                  View Dataset →
                </a>
              </>
            ) : (
              <p className="text-sm text-gray-400">Loading dataset info...</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
