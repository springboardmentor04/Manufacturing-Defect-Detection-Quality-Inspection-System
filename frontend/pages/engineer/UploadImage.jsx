import { useState } from "react";

import {
  CheckCircle,
  AlertTriangle,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Image as ImageIcon,
  Sun,
  Contrast,
  ScanSearch,
} from "lucide-react";

import UploadCard from "../../components/dashboard/UploadCard";
import Card from "../../components/common/Card";

import { uploadService } from "../../services/uploadService";


export default function UploadImage() {

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");


  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  async function handleUpload(file) {

    setError("");
    setResult(null);

    try {

      const response =
        await uploadService.uploadImage(file);

      console.log(
        "Inspection Response:",
        response
      );

      console.log(
        "Image Quality:",
        response.image_quality
      );

      console.log(
        "Risk Assessment:",
        {
          risk_level: response.risk_level,
          risk_description:
            response.risk_description,
        }
      );

      setResult(response);

    } catch (err) {

      setError(
        typeof err.message === "string"
          ? err.message
          : JSON.stringify(err.message)
      );

    }
  }


  // =====================================================
  // RISK COLOR HELPERS
  // =====================================================

  const getRiskColor = (riskLevel) => {

    switch (riskLevel) {

      case "Critical":
        return "text-red-500";

      case "High":
        return "text-orange-500";

      case "Medium":
        return "text-yellow-500";

      case "Low":
        return "text-green-500";

      default:
        return "text-slate-300";
    }
  };


  const getRiskBackground = (riskLevel) => {

    switch (riskLevel) {

      case "Critical":
        return "border-red-500/30 bg-red-500/5";

      case "High":
        return "border-orange-500/30 bg-orange-500/5";

      case "Medium":
        return "border-yellow-500/30 bg-yellow-500/5";

      case "Low":
        return "border-green-500/30 bg-green-500/5";

      default:
        return "border-slate-700 bg-slate-900/60";
    }
  };


  const getRiskBarColor = (riskLevel) => {

    switch (riskLevel) {

      case "Critical":
        return "bg-red-500";

      case "High":
        return "bg-orange-500";

      case "Medium":
        return "bg-yellow-500";

      case "Low":
        return "bg-green-500";

      default:
        return "bg-slate-500";
    }
  };


  // =====================================================
  // IMAGE QUALITY STATUS COLOR
  // =====================================================

  const getQualityStatusStyle = (status) => {

    switch (status) {

      case "Good":
        return "bg-emerald-500/10 text-emerald-400";

      case "Acceptable":
        return "bg-yellow-500/10 text-yellow-400";

      case "Poor":
        return "bg-red-500/10 text-red-400";

      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };


  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-8 shadow-lg">

        <div className="flex items-center gap-3">

          <Cpu size={34} />

          <div>

            <h1 className="text-3xl font-bold">
              VisionInspect AI
            </h1>

            <p className="mt-2 text-cyan-100">
              Upload an image to detect manufacturing
              defects using AI.
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          UPLOAD CARD
      ================================================= */}

      <UploadCard
        onUpload={handleUpload}
      />


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <Card className="border border-red-300 bg-red-50">

          <div className="flex items-center gap-3 text-red-600">

            <AlertTriangle />

            <span>
              {error}
            </span>

          </div>

        </Card>

      )}


      {/* =================================================
          INSPECTION RESULT
      ================================================= */}

      {result && (

        <Card className="p-8">

          {/* ===============================================
              RESULT HEADER
          =============================================== */}

          <div className="flex items-center gap-4 mb-8">

            {result.status === "pass" ? (

              <CheckCircle
                size={50}
                className="text-green-600"
              />

            ) : (

              <AlertTriangle
                size={50}
                className="text-red-600"
              />

            )}

            <div>

              <h2 className="text-2xl font-bold">
                Inspection Result
              </h2>

              <p className="text-slate-500">
                AI has completed the inspection.
              </p>

            </div>

          </div>


          {/* ===============================================
              BASIC AI RESULT
          =============================================== */}

          <div className="grid md:grid-cols-2 gap-6">


            {/* STATUS */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Status
              </p>

              <h3
                className={`text-2xl font-bold mt-2 ${
                  result.status === "pass"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {result.status?.toUpperCase()}
              </h3>

            </div>


            {/* CONFIDENCE */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Confidence
              </p>

              <h3 className="text-2xl font-bold mt-2">

                {result.confidence != null
                  ? `${(
                      result.confidence * 100
                    ).toFixed(2)}%`
                  : "N/A"}

              </h3>

            </div>


            {/* PRODUCT CATEGORY */}

            {result.product_category && (

              <div className="rounded-xl border p-5">

                <p className="text-slate-500">
                  Product Category
                </p>

                <h3 className="text-xl font-semibold mt-2">
                  {result.product_category}
                </h3>

              </div>

            )}


            {/* DEFECT TYPE */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Defect Type
              </p>

              <h3 className="text-xl font-semibold mt-2">

                {result.defect_type ||
                  "No Defect"}

              </h3>

            </div>


            {/* SEVERITY */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Severity Level
              </p>

              <h3
                className={`text-xl font-bold mt-2 ${
                  result.severity === "Critical"
                    ? "text-red-600"
                    : result.severity === "High"
                    ? "text-orange-500"
                    : result.severity === "Medium"
                    ? "text-yellow-500"
                    : "text-green-600"
                }`}
              >
                {result.severity || "None"}
              </h3>

            </div>


            {/* SEVERITY SCORE */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Severity Score
              </p>

              <h3 className="text-2xl font-bold mt-2">

                {result.severity_score ?? 0}
                {" / 100"}

              </h3>


              <div className="w-full bg-slate-200 rounded-full h-3 mt-4">

                <div
                  className={`h-3 rounded-full ${
                    result.severity === "Critical"
                      ? "bg-red-600"
                      : result.severity === "High"
                      ? "bg-orange-500"
                      : result.severity === "Medium"
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{
                    width: `${
                      result.severity_score ?? 0
                    }%`,
                  }}
                />

              </div>

            </div>


            {/* PROCESSING TIME */}

            <div className="rounded-xl border p-5">

              <p className="text-slate-500">
                Processing Time
              </p>

              <h3 className="text-xl font-semibold mt-2">

                {result.processing_time != null
                  ? `${Number(
                      result.processing_time
                    ).toFixed(3)} sec`
                  : "N/A"}

              </h3>

            </div>


            {/* RECOMMENDATION */}

            <div className="rounded-xl border p-5 md:col-span-2">

              <p className="text-slate-500">
                Recommended Action
              </p>

              <h3 className="text-xl font-semibold mt-2">

                {result.recommendation ||
                  "N/A"}

              </h3>

            </div>

          </div>


          {/* =================================================
              QUALITY RISK ASSESSMENT
          ================================================= */}

          <div className="mt-10">

            <div
              className={`rounded-2xl border p-6 ${
                getRiskBackground(
                  result.risk_level
                )
              }`}
            >

              {/* ---------------------------------------------
                  HEADER
              --------------------------------------------- */}

              <div className="flex items-center gap-4 mb-6">

                {result.risk_level ===
                "Critical" ? (

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">

                    <ShieldAlert
                      size={28}
                      className="text-red-500"
                    />

                  </div>

                ) : result.risk_level ===
                  "High" ? (

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">

                    <ShieldAlert
                      size={28}
                      className="text-orange-500"
                    />

                  </div>

                ) : result.risk_level ===
                  "Medium" ? (

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">

                    <Shield
                      size={28}
                      className="text-yellow-500"
                    />

                  </div>

                ) : (

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">

                    <ShieldCheck
                      size={28}
                      className="text-green-500"
                    />

                  </div>

                )}


                <div>

                  <h3 className="text-2xl font-bold text-white">

                    Quality Risk Assessment

                  </h3>

                  <p className="mt-1 text-slate-400">

                    AI-based assessment of product
                    quality risk.

                  </p>

                </div>

              </div>


              {/* ---------------------------------------------
                  RISK INFORMATION
              --------------------------------------------- */}

              <div className="grid md:grid-cols-2 gap-6">


                {/* RISK LEVEL */}

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">

                  <p className="text-sm text-slate-400">
                    Risk Level
                  </p>

                  <h3
                    className={`mt-2 text-2xl font-bold ${
                      getRiskColor(
                        result.risk_level
                      )
                    }`}
                  >
                    {result.risk_level ||
                      "N/A"}
                  </h3>

                </div>


                {/* RISK SCORE */}

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">

                  <div className="flex items-center justify-between">

                    <p className="text-sm text-slate-400">
                      Risk Score
                    </p>

                    <span className="text-lg font-bold text-white">

                      {result.severity_score ??
                        0}
                      /100

                    </span>

                  </div>


                  <div className="mt-4 h-3 w-full rounded-full bg-slate-700">

                    <div
                      className={`h-3 rounded-full ${
                        getRiskBarColor(
                          result.risk_level
                        )
                      }`}
                      style={{
                        width: `${
                          result.severity_score ??
                          0
                        }%`,
                      }}
                    />

                  </div>

                </div>


                {/* RISK DESCRIPTION */}

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 md:col-span-2">

                  <p className="text-sm text-slate-400">
                    Risk Assessment
                  </p>

                  <p className="mt-2 text-base leading-7 text-slate-200">

                    {result.risk_description ||
                      "Risk assessment information is not available."}

                  </p>

                </div>


                {/* RECOMMENDED ACTION */}

                <div
                  className={`rounded-xl border p-5 md:col-span-2 ${
                    getRiskBackground(
                      result.risk_level
                    )
                  }`}
                >

                  <p className="text-sm text-slate-400">
                    Recommended Action
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-white">

                    {result.recommendation ||
                      "N/A"}

                  </h3>

                </div>

              </div>

            </div>

          </div>


          {/* =================================================
              IMAGE QUALITY ANALYSIS
          ================================================= */}

          {result.image_quality && (

            <div className="mt-10">

              <div className="rounded-2xl border border-cyan-900/50 bg-slate-900/60 p-6">


                {/* HEADER */}

                <div className="flex items-center gap-4 mb-6">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">

                    <ImageIcon
                      size={28}
                      className="text-cyan-400"
                    />

                  </div>

                  <div>

                    <h3 className="text-2xl font-bold text-white">

                      Image Quality Analysis

                    </h3>

                    <p className="mt-1 text-slate-400">

                      Automated quality assessment
                      of the uploaded inspection image.

                    </p>

                  </div>

                </div>


                {/* OVERALL QUALITY */}

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-5 mb-6">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-slate-400">
                        Overall Image Quality
                      </p>

                      <p className="mt-1 text-3xl font-bold text-white">

                        {result.image_quality.quality_score ??
                          0}

                        <span className="text-lg text-slate-500">
                          /100
                        </span>

                      </p>

                    </div>


                    <div
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        getQualityStatusStyle(
                          result.image_quality
                            .quality_status
                        )
                      }`}
                    >

                      {result.image_quality
                        .quality_status ||
                        "Unknown"}

                    </div>

                  </div>


                  {/* QUALITY BAR */}

                  <div className="mt-5">

                    <div className="flex justify-between text-xs text-slate-400 mb-2">

                      <span>
                        Quality Score
                      </span>

                      <span>

                        {result.image_quality
                          .quality_score ??
                          0}
                        /100

                      </span>

                    </div>


                    <div className="w-full h-3 rounded-full bg-slate-700">

                      <div
                        className={`h-3 rounded-full ${
                          result.image_quality
                            .quality_status ===
                          "Good"
                            ? "bg-emerald-500"
                            : result.image_quality
                                .quality_status ===
                              "Acceptable"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${
                            result.image_quality
                              .quality_score ??
                            0
                          }%`,
                        }}
                      />

                    </div>

                  </div>

                </div>


                {/* IMAGE INFORMATION */}

                <h3 className="text-lg font-semibold text-white mb-4">

                  Image Information

                </h3>


                <div className="grid md:grid-cols-3 gap-4">


                  {/* RESOLUTION */}

                  <QualityDetail
                    icon={<ScanSearch size={20} />}
                    label="Resolution"
                    value={
                      result.image_quality
                        .resolution ||
                      "N/A"
                    }
                  />


                  {/* WIDTH */}

                  <QualityDetail
                    label="Width"
                    value={
                      result.image_quality
                        .width != null
                        ? `${result.image_quality.width} px`
                        : "N/A"
                    }
                  />


                  {/* HEIGHT */}

                  <QualityDetail
                    label="Height"
                    value={
                      result.image_quality
                        .height != null
                        ? `${result.image_quality.height} px`
                        : "N/A"
                    }
                  />


                  {/* BRIGHTNESS */}

                  <QualityDetail
                    icon={
                      <Sun size={20} />
                    }
                    label="Brightness"
                    value={
                      result.image_quality
                        .brightness != null
                        ? Number(
                            result.image_quality
                              .brightness
                          ).toFixed(2)
                        : "N/A"
                    }
                  />


                  {/* CONTRAST */}

                  <QualityDetail
                    icon={
                      <Contrast size={20} />
                    }
                    label="Contrast"
                    value={
                      result.image_quality
                        .contrast != null
                        ? Number(
                            result.image_quality
                              .contrast
                          ).toFixed(2)
                        : "N/A"
                    }
                  />


                  {/* BLUR */}

                  <QualityDetail
                    icon={
                      <ScanSearch size={20} />
                    }
                    label="Blur Score"
                    value={
                      result.image_quality
                        .blur_score != null
                        ? Number(
                            result.image_quality
                              .blur_score
                          ).toFixed(2)
                        : "N/A"
                    }
                  />

                </div>


                {/* QUALITY ASSESSMENT */}

                <h3 className="text-lg font-semibold text-white mt-8 mb-4">

                  Quality Assessment

                </h3>


                <div className="grid md:grid-cols-3 gap-4">


                  {/* BRIGHTNESS */}

                  <QualityAssessment
                    label="Brightness"
                    value={
                      result.image_quality
                        .brightness != null
                        ? Number(
                            result.image_quality
                              .brightness
                          ).toFixed(2)
                        : "N/A"
                    }
                    status={
                      getBrightnessStatus(
                        result.image_quality
                          .brightness
                      )
                    }
                  />


                  {/* CONTRAST */}

                  <QualityAssessment
                    label="Contrast"
                    value={
                      result.image_quality
                        .contrast != null
                        ? Number(
                            result.image_quality
                              .contrast
                          ).toFixed(2)
                        : "N/A"
                    }
                    status={
                      getContrastStatus(
                        result.image_quality
                          .contrast
                      )
                    }
                  />


                  {/* SHARPNESS */}

                  <QualityAssessment
                    label="Sharpness"
                    value={
                      result.image_quality
                        .blur_score != null
                        ? Number(
                            result.image_quality
                              .blur_score
                          ).toFixed(2)
                        : "N/A"
                    }
                    status={
                      getSharpnessStatus(
                        result.image_quality
                          .blur_score
                      )
                    }
                  />

                </div>


                {/* RECOMMENDATION */}

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-5 mt-6">

                  <p className="text-sm text-slate-400">

                    Quality Recommendation

                  </p>

                  <p className="mt-2 text-base font-medium text-slate-200">

                    {result.image_quality
                      .recommendation ||
                      "No recommendation available."}

                  </p>

                </div>

              </div>

            </div>

          )}


          {/* =================================================
              INSPECTION IMAGES
          ================================================= */}

          <div className="mt-10">

            <h3 className="text-2xl font-bold mb-6">

              Inspection Images

            </h3>


            <div className="grid md:grid-cols-2 gap-6">


              {/* UPLOADED IMAGE */}

              <div className="rounded-xl border p-5">

                <p className="text-slate-500 mb-4">

                  Uploaded Image

                </p>

                <img
                  src={result.image_url}
                  alt="Uploaded inspection"
                  className="w-full rounded-lg border shadow-lg object-contain max-h-96"
                />

              </div>


              {/* AI RESULT */}

              <div className="rounded-xl border p-5">

                <p className="text-slate-500 mb-4">

                  AI Detection Result

                </p>

                {result.result_image_url ? (

                  <img
                    src={result.result_image_url}
                    alt="AI detection result"
                    className="w-full rounded-lg border shadow-lg object-contain max-h-96"
                  />

                ) : (

                  <div className="flex items-center justify-center min-h-64 rounded-lg border text-slate-500">

                    No AI result image available.

                  </div>

                )}

              </div>

            </div>

          </div>


          {/* =================================================
              NEW INSPECTION
          ================================================= */}

          <div className="mt-8">

            <button
              onClick={() => {
                setResult(null);
                setError("");
              }}
              className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white py-3 font-semibold transition"
            >

              New Inspection

            </button>

          </div>

        </Card>

      )}

    </div>
  );
}


/* =========================================================
   QUALITY DETAIL COMPONENT
========================================================= */

function QualityDetail({
  icon,
  label,
  value,
}) {

  return (

    <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-5">

      <div className="flex items-center gap-2 text-cyan-400">

        {icon}

        <p className="text-sm text-slate-400">
          {label}
        </p>

      </div>

      <p className="mt-3 text-xl font-semibold text-white">

        {value}

      </p>

    </div>
  );
}


/* =========================================================
   QUALITY ASSESSMENT COMPONENT
========================================================= */

function QualityAssessment({
  label,
  value,
  status,
}) {

  const isGood =
    status === "Good";

  return (

    <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        {isGood ? (

          <CheckCircle
            size={20}
            className="text-green-500"
          />

        ) : (

          <AlertTriangle
            size={20}
            className="text-red-500"
          />

        )}

      </div>


      <p className="mt-3 text-lg font-semibold text-white">

        {value}

      </p>


      <p
        className={`mt-1 text-sm ${
          isGood
            ? "text-green-500"
            : "text-red-500"
        }`}
      >

        {status}

      </p>

    </div>
  );
}


/* =========================================================
   BRIGHTNESS STATUS
========================================================= */

function getBrightnessStatus(value) {

  if (value == null) {
    return "N/A";
  }

  const brightness = Number(value);

  if (
    brightness >= 40 &&
    brightness <= 210
  ) {
    return "Good";
  }

  return "Needs Improvement";
}


/* =========================================================
   CONTRAST STATUS
========================================================= */

function getContrastStatus(value) {

  if (value == null) {
    return "N/A";
  }

  const contrast = Number(value);

  if (contrast >= 30) {
    return "Good";
  }

  return "Needs Improvement";
}


/* =========================================================
   SHARPNESS STATUS
========================================================= */

function getSharpnessStatus(value) {

  if (value == null) {
    return "N/A";
  }

  const blurScore = Number(value);

  if (blurScore >= 30) {
    return "Good";
  }

  return "Needs Improvement";
}