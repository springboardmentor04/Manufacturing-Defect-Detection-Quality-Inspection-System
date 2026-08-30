import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DefectResultCard from "../../components/DefectResultCard";
import QualityReportPanel from "../../components/QualityReportPanel";
import api from "../../api/axios";
import { Link } from "react-router-dom";

export default function UploadImage() {
  const [form, setForm] = useState({ product_name: "", batch_number: "", notes: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  const resetForm = () => {
    setForm({ product_name: "", batch_number: "", notes: "" });
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select a product image to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("product_name", form.product_name);
    formData.append("batch_number", form.batch_number);
    formData.append("notes", form.notes);
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/api/inspections/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Upload Product Image</h2>
      <p className="text-slate-500 text-sm mb-6">
        Submit a product image for AI-powered defect inspection. It's run through image
        preprocessing, a quality analysis report, and the defect detection engine automatically.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Product Name</label>
              <input
                required
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Aluminum Bracket - Model A2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Batch Number (optional)</label>
              <input
                value={form.batch_number}
                onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. BATCH-2026-07-25"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Any additional context for this inspection..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium hover:file:bg-brand-100"
              />
              <p className="text-xs text-slate-400 mt-1">Supported formats: JPG, PNG, BMP, TIFF, WebP (max 15MB)</p>
            </div>

            {preview && (
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-slate-200" />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Submit for Inspection"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {result ? (
            <>
              <DefectResultCard inspection={result} />
              <QualityReportPanel report={result.quality_report} />
              <Link
                to="/inspections"
                className="block text-center text-sm font-medium text-brand-600 hover:underline"
              >
                View in Inspection History →
              </Link>
            </>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
              Upload an image to see the quality report and defect prediction here.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}