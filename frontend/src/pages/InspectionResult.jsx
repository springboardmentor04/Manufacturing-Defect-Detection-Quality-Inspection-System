import { useEffect, useState } from "react";

function InspectionResult() {

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // GET LATEST INSPECTION FROM DATABASE
  // --------------------------------------------------

  useEffect(() => {

    const fetchLatestInspection = async () => {

      try {

        const response = await fetch(
          "http://127.0.0.1:8000/inspections"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch inspection result");
        }

        const data = await response.json();

        if (
          data.success &&
          data.inspections &&
          data.inspections.length > 0
        ) {

          // Backend sends newest inspection first
          setInspection(data.inspections[0]);

        } else {

          setError("No inspection result found.");

        }

      } catch (err) {

        console.error("Inspection result error:", err);

        setError(
          "Unable to load inspection result."
        );

      } finally {

        setLoading(false);

      }

    };

    fetchLatestInspection();

  }, []);


  // --------------------------------------------------
  // DOWNLOAD ACTUAL INSPECTION REPORT
  // --------------------------------------------------

  const downloadReport = () => {

    if (!inspection) {
      return;
    }

    const status =
      inspection.result === "GOOD"
        ? "PASSED"
        : "DEFECT DETECTED";


    const report = `
VisionInspect AI - Inspection Report
====================================

Image : ${inspection.filename}
Result : ${inspection.result}
Prediction : ${inspection.prediction}
Confidence : ${inspection.confidence}%
Status : ${status}

Inspection Result:
${inspection.inspection_result}

====================================
VisionInspect AI
Manufacturing Defect Detection & Quality Inspection System
`;


    const blob = new Blob(
      [report],
      { type: "text/plain" }
    );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;


    link.download =
      "VisionInspect_Inspection_Report.txt";


    document.body.appendChild(link);


    link.click();


    document.body.removeChild(link);


    URL.revokeObjectURL(url);

  };


  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {

    return (
      <div className="result-page">

        <h1>🔍 Inspection Result</h1>

        <div className="result-card">

          <h2>
            Loading latest inspection...
          </h2>

        </div>

      </div>
    );

  }


  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {

    return (
      <div className="result-page">

        <h1>🔍 Inspection Result</h1>

        <div className="result-card">

          <h2>{error}</h2>

        </div>

      </div>
    );

  }


  // --------------------------------------------------
  // ACTUAL RESULT
  // --------------------------------------------------

  const passed =
    inspection.result === "GOOD";


  return (

    <div className="result-page">

      <h1>🔍 Inspection Result</h1>


      <div className="result-card">


        {/* STATUS */}

        <div className="result-status">

          {passed
            ? "✅ PASSED"
            : "❌ DEFECT DETECTED"}

        </div>


        <h2>
          AI Inspection Completed
        </h2>


        {/* IMAGE */}

        <p>

          <strong>Image :</strong>{" "}

          {inspection.filename}

        </p>


        {/* RESULT */}

        <p>

          <strong>Result :</strong>{" "}

          {inspection.result}

        </p>


        {/* PREDICTION */}

        <p>

          <strong>Prediction :</strong>{" "}

          {inspection.prediction}

        </p>


        {/* CONFIDENCE */}

        <p>

          <strong>Confidence :</strong>{" "}

          {inspection.confidence}%

        </p>


        {/* INSPECTION RESULT */}

        <p>

          <strong>Inspection :</strong>{" "}

          {inspection.inspection_result}

        </p>


        {/* DOWNLOAD */}

        <button
          className="result-btn"
          onClick={downloadReport}
        >

          📄 Download Report

        </button>


      </div>

    </div>

  );

}


export default InspectionResult;