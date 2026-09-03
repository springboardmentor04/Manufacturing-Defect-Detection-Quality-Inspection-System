import { useEffect, useState } from 'react';
import { datasetAPI } from '../api';
import Navbar from '../components/Navbar';

const USE_CASE_COLOR = {
  'Anomaly Detection': 'bg-purple-100 text-purple-700',
};

function DatasetCard({ dataset, onClick, selected }) {
  return (
    <div
      onClick={() => onClick(dataset)}
      className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer border-2 transition-all hover:shadow-md ${
        selected ? 'border-indigo-500' : 'border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">{dataset.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${USE_CASE_COLOR[dataset.use_case] || 'bg-gray-100 text-gray-600'}`}>
          {dataset.use_case}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{dataset.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-indigo-600">{dataset.total_images.toLocaleString()} images</span>
        <span>{dataset.categories.length} classes</span>
      </div>
    </div>
  );
}

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    datasetAPI.all()
      .then(({ data }) => {
        setDatasets(data.datasets);
        setSelected(data.datasets[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Datasets</h2>
          <p className="text-sm text-gray-500 mt-1">All manufacturing defect datasets integrated into the platform</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading datasets...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dataset Cards */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              {datasets.map((ds) => (
                <DatasetCard
                  key={ds.id}
                  dataset={ds}
                  onClick={setSelected}
                  selected={selected?.id === ds.id}
                />
              ))}
            </div>

            {/* Dataset Detail */}
            {selected && (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{selected.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${USE_CASE_COLOR[selected.use_case] || 'bg-gray-100 text-gray-600'}`}>
                    {selected.use_case}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-6">{selected.description}</p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{selected.total_images.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Images</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{selected.categories.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Classes</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{selected.splits.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Splits</p>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Categories / Classes</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.categories.map((cat) => (
                      <span key={cat} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize">
                        {cat.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Defect Types */}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Defect Types</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.defect_types.map((d) => (
                      <span key={d} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full capitalize">
                        {d.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Splits */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Dataset Splits</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.splits.map((s) => (
                      <span key={s} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={selected.source}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm text-indigo-600 hover:underline"
                >
                  View Source →
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
