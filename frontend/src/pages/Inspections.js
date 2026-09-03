import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inspectionAPI } from '../api';
import Navbar from '../components/Navbar';

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const MVTEC_CATEGORIES = [
  'bottle', 'cable', 'capsule', 'carpet', 'grid',
  'hazelnut', 'leather', 'metal_nut', 'pill', 'screw',
  'tile', 'toothbrush', 'transistor', 'wood', 'zipper',
];

export default function Inspections() {
  const navigate = useNavigate();
  const [data, setData] = useState({ total: 0, images: [] });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    inspectionAPI.list(page * limit, limit, statusFilter, categoryFilter)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter, categoryFilter]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Inspections ({data.total})</h2>
          <Link to="/upload" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + New Inspection
          </Link>
        </div>

        <div className="flex gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={handleFilterChange(setCategoryFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {MVTEC_CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>
          {(statusFilter || categoryFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setCategoryFilter(''); setPage(0); }}
              className="text-sm text-gray-500 hover:text-red-500 px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : data.images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No inspections found.</p>
              <Link to="/upload" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Upload an image</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Image</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Dimensions</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">System Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">QC Decision</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.images.map((img) => (
                  <tr
                    key={img.id}
                    onClick={() => navigate(`/inspections/${img.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 truncate max-w-xs">{img.original_filename}</p>
                        <p className="text-xs text-gray-400">{img.file_size ? `${(img.file_size / 1024).toFixed(1)} KB` : ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{img.product_category || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {img.image_width && img.image_height ? `${img.image_width}×${img.image_height}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[img.status]}`}>
                        {img.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {img.status === 'completed' ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          img.decision === 'Pass' ? 'bg-green-100 text-green-700' :
                          img.decision === 'Fail' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {img.decision}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(img.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-600">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100">Next</button>
          </div>
        )}
      </main>
    </div>
  );
}
