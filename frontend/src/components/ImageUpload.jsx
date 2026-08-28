import { useState } from "react";

export default function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      alert("Please select an image first.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Please login again.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedImage);

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/inspections/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Image inspection failed");
      }

      console.log("Inspection result:", data);
      setResult(data);

    } catch (error) {
      console.error("Inspection error:", error);
      alert(error.message || "Something went wrong during inspection");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const isDefect = result?.prediction === "DEFECT";
  const isFail = result?.inspection_result === "FAIL";

  const resultColor = isDefect
    ? "border-red-500/40 bg-red-500/10"
    : "border-green-500/40 bg-green-500/10";

  const predictionColor = isDefect
    ? "text-red-400"
    : "text-green-400";

  const resultLabel = isFail ? "❌ FAIL" : "✅ PASS";
  const resultLabelColor = isFail ? "text-red-400" : "text-green-400";

  const formatProb = (v) =>
    v != null ? `${(v * 100).toFixed(2)}%` : "N/A";

  const getSeverityColor = (level) => {
    if (level === "Critical") return "text-red-500";
    if (level === "High") return "text-orange-500";
    if (level === "Medium") return "text-yellow-500";
    return "text-green-500";
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">

      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-cyan-400">AI VISUAL INSPECTION</p>
        <h2 className="mt-2 text-2xl font-semibold">Upload Inspection Image</h2>
        <p className="mt-2 text-sm text-slate-400">
          Upload a product image to analyze it for manufacturing defects.
        </p>
      </div>

      {/* Upload Area */}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] p-10 transition hover:border-cyan-400/50 hover:bg-cyan-400/5">
        <div className="text-5xl">📤</div>
        <p className="mt-4 text-lg font-medium">Select Product Image</p>
        <p className="mt-2 text-sm text-slate-500">JPG, JPEG or PNG</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageChange}
          className="hidden"
        />
      </label>

      {/* Preview */}
      {preview && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-slate-400">Image Preview</p>
          <div className="relative inline-block overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <img
              src={preview}
              alt="Inspection Preview"
              className="max-h-96 w-auto object-contain"
            />
            {/* Draw bounding boxes if available */}
            {result?.boxes?.map((box, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                style={{
                  left: `${box.x1 * 100}%`,
                  top: `${box.y1 * 100}%`,
                  width: `${(box.x2 - box.x1) * 100}%`,
                  height: `${(box.y2 - box.y1) * 100}%`,
                }}
              >
                <span className="absolute bottom-full left-[-2px] bg-red-500 text-white text-[10px] font-bold px-1 whitespace-nowrap">
                  {box.class} {box.conf}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            File: {selectedImage?.name}
          </p>
        </div>
      )}

      {/* Run Inspection Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedImage || loading}
        className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {loading ? "⏳ Analyzing Image..." : "🔍 Run AI Inspection"}
      </button>

      {/* AI RESULT */}
      {result && (
        <div className={`mt-8 rounded-2xl border p-6 ${resultColor}`}>

          <p className="text-sm font-medium text-cyan-400">
            AI INSPECTION RESULT
          </p>

          {/* Top row: Prediction + Result + Confidence */}
          <div className="mt-5 grid gap-4 md:grid-cols-3">

            {/* Prediction */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">AI Prediction</p>
              <p className={`mt-2 text-2xl font-bold ${predictionColor}`}>
                {result.prediction || "N/A"}
              </p>
            </div>

            {/* Inspection Result */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">Inspection Result</p>
              <p className={`mt-2 text-2xl font-bold ${resultLabelColor}`}>
                {resultLabel}
              </p>
            </div>

            {/* Confidence */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">AI Confidence</p>
              <p className="mt-2 text-2xl font-bold text-cyan-400">
                {result.confidence !== undefined
                  ? `${Number(result.confidence).toFixed(2)}%`
                  : "N/A"}
              </p>
            </div>

          </div>

          {/* DETECTION SOURCE & ANOMALY SCORE */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">Detection Source</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-md ${result.detection_source === 'yolo' ? 'bg-blue-500/20 text-blue-400' :
                    result.detection_source === 'cv_fallback' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-slate-500/20 text-slate-400'
                  }`}>
                  {result.detection_source === 'yolo' ? 'YOLOv8 Model' :
                    result.detection_source === 'cv_fallback' ? 'CV Anomaly Fallback' :
                      'None (Good)'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">CV Anomaly Score</p>
              <div className="mt-2 flex items-center justify-between">
                <p className={`text-xl font-bold ${result.anomaly_score >= 45 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.anomaly_score?.toFixed(2) || "0.00"} / 100
                </p>
                {result.cv_flags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {result.cv_flags.map(flag => (
                      <span key={flag} className="px-2 py-1 text-[10px] bg-red-500/20 text-red-300 rounded border border-red-500/30">
                        {flag.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEVERITY SCORING (Only if Defect) */}
          {isDefect && result.severity_score != null && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-sm font-medium text-slate-300">
                Defect Classification & Severity
              </p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-4">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Defect Type (25%)</p>
                  <p className="font-semibold text-sm">{result.defect_type}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Size Score (30%)</p>
                  <p className="font-semibold text-sm">{result.defect_size_score}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Location Score (25%)</p>
                  <p className="font-semibold text-sm">{result.defect_location_score}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Confidence (20%)</p>
                  <p className="font-semibold text-sm">{Number(result.confidence).toFixed(2)}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Overall Severity</p>
                  <p className={`font-bold text-lg ${getSeverityColor(result.severity_level)}`}>
                    {result.severity_score} / 100
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-red-400">Severity Level: {result.severity_level}</span>
                </div>
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-white">Recommended Action:</span> {result.recommended_action}
                </p>
              </div>
            </div>
          )}

          {/* Probability bars */}
          {(result.good_probability != null || result.defect_probability != null) && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <p className="mb-4 text-sm font-medium text-slate-300">
                Class Probabilities
              </p>

              {/* Good probability */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-400">✅ GOOD</span>
                  <span className="text-green-400 font-semibold">
                    {formatProb(result.good_probability)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-700"
                    style={{
                      width: `${(result.good_probability ?? 0) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Defect probability */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-400">⚠️ DEFECT</span>
                  <span className="text-red-400 font-semibold">
                    {formatProb(result.defect_probability)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-red-400 transition-all duration-700"
                    style={{
                      width: `${(result.defect_probability ?? 0) * 100}%`,
                    }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Inspection ID */}
          {result.inspection_id && (
            <div className="mt-5 rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Inspection ID</p>
              <p className="mt-1 font-medium">#{result.inspection_id}</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}