import { useState, useRef } from "react";

import {
    Camera,
    Upload,
    Package,
    CheckCircle,
    AlertTriangle,
    ScanSearch
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";

import api from "../services/api";

import "../styles/UploadProduct.css";
import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";


function UploadProduct() {

    // =========================================================
    // PRODUCT DETAILS
    // =========================================================

    const [productCode, setProductCode] = useState("");
    const [productName, setProductName] = useState("");
    const [category, setCategory] = useState("");
    const [batchNumber, setBatchNumber] = useState("");
    const [productionLine, setProductionLine] = useState("");
    const [manufacturingDate, setManufacturingDate] = useState("");


    // =========================================================
    // IMAGE
    // =========================================================

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const imageRef = useRef(null);

    const [imageDimensions, setImageDimensions] = useState({
        width: 0,
        height: 0
    });


    // =========================================================
    // UPLOAD / INSPECTION STATE
    // =========================================================

    const [uploading, setUploading] = useState(false);

    const [message, setMessage] = useState("");

    const [inspectionResult, setInspectionResult] = useState(null);


    // =========================================================
    // IMAGE SELECTION
    // =========================================================

    function handleImageChange(event) {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        setSelectedFile(file);

        setPreview(
            URL.createObjectURL(file)
        );

        // Clear previous inspection
        setInspectionResult(null);

        setMessage("");

        setImageDimensions({
            width: 0,
            height: 0
        });
    }


    // =========================================================
    // IMAGE LOADED
    // =========================================================

    function handleImageLoad(event) {

        const image = event.currentTarget;

        setImageDimensions({
            width: image.naturalWidth,
            height: image.naturalHeight
        });
    }


    // =========================================================
    // UPLOAD + AI INSPECTION
    // =========================================================

    async function uploadImage() {

        // -----------------------------------------------------
        // Validate product details
        // -----------------------------------------------------

        if (
            !productCode ||
            !productName ||
            !category ||
            !batchNumber ||
            !productionLine ||
            !manufacturingDate
        ) {

            alert(
                "Please complete all product details."
            );

            return;
        }


        // -----------------------------------------------------
        // Validate image
        // -----------------------------------------------------

        if (!selectedFile) {

            alert(
                "Please select a product image."
            );

            return;
        }


        try {

            setUploading(true);

            setMessage(
                "Uploading image and running AI inspection..."
            );

            setInspectionResult(null);


            // -------------------------------------------------
            // Create multipart form
            // -------------------------------------------------

            const formData = new FormData();

            formData.append(
                "product_code",
                productCode
            );

            formData.append(
                "product_name",
                productName
            );

            formData.append(
                "category",
                category
            );

            formData.append(
                "batch_number",
                batchNumber
            );

            formData.append(
                "production_line",
                productionLine
            );

            formData.append(
                "manufacturing_date",
                manufacturingDate
            );

            formData.append(
                "file",
                selectedFile
            );


            // -------------------------------------------------
            // Send request
            //
            // inspected_by is NOT sent from frontend.
            //
            // Backend obtains the logged-in user's UUID
            // from the authenticated JWT.
            // -------------------------------------------------

            const response = await api.post(
                "/upload-product",
                formData
            );


            const data = response.data;


            // -------------------------------------------------
            // Store inspection response
            // -------------------------------------------------

            setInspectionResult(data);

            setMessage(
                "AI inspection completed successfully."
            );


        }
        catch (error) {

            console.error(
                "Upload / inspection error:",
                error
            );


            // ---------------------------------------------
            // Better error message
            // ---------------------------------------------

            if (
                error.response &&
                error.response.data &&
                error.response.data.detail
            ) {

                setMessage(
                    error.response.data.detail
                );

            }
            else {

                setMessage(
                    "Upload or AI inspection failed."
                );

            }

            setInspectionResult(null);

        }
        finally {

            setUploading(false);

        }

    }


    // =========================================================
    // RESULT HELPERS
    // =========================================================

    const isFail =
        inspectionResult &&
        inspectionResult.prediction === "FAIL";


    const isPass =
        inspectionResult &&
        inspectionResult.prediction === "PASS";


    // =========================================================
    // YOLO DATA
    // =========================================================

    const yolo =
        inspectionResult?.yolo || null;


    const detections =
        yolo?.detections || [];


    const defectsDetected =
        yolo?.defects_detected ??
        detections.length;


    const maxConfidence =
        yolo?.max_confidence ??
        0;


    // =========================================================
    // SEVERITY CALCULATION
    //
    // Formula:
    //
    // Size              = 30%
    // Location          = 25%
    // Defect Type       = 25%
    // Confidence        = 20%
    //
    // Total             = 100%
    // =========================================================




    const severity =
    inspectionResult?.severity || null;


    // =========================================================
    // SEVERITY LABEL
    // =========================================================



    // =========================================================
    // SEVERITY CLASS
    // =========================================================

    function getSeverityClass(score) {

        if (score >= 75) {
            return "severity-critical";
        }

        if (score >= 50) {
            return "severity-high";
        }

        if (score >= 25) {
            return "severity-medium";
        }

        return "severity-low";

    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="dashboard-container">

            <Sidebar />


            <div className="dashboard-main">

                <DashboardHeader />


                <div className="upload-product-panel">


                    {/* =================================================
                        PAGE TITLE
                    ================================================= */}

                    <h2>

                        <Package size={24} />

                        &nbsp;

                        Upload Product Image

                    </h2>


                    {/* =================================================
                        PRODUCT FORM
                    ================================================= */}

                    <div className="product-form">

                        <input
                            type="text"
                            placeholder="Product Code"
                            value={productCode}
                            onChange={(e) =>
                                setProductCode(
                                    e.target.value
                                )
                            }
                        />


                        <input
                            type="text"
                            placeholder="Product Name"
                            value={productName}
                            onChange={(e) =>
                                setProductName(
                                    e.target.value
                                )
                            }
                        />


                        <input
                            type="text"
                            placeholder="Category"
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target.value
                                )
                            }
                        />


                        <input
                            type="text"
                            placeholder="Batch Number"
                            value={batchNumber}
                            onChange={(e) =>
                                setBatchNumber(
                                    e.target.value
                                )
                            }
                        />


                        <input
                            type="text"
                            placeholder="Production Line"
                            value={productionLine}
                            onChange={(e) =>
                                setProductionLine(
                                    e.target.value
                                )
                            }
                        />


                        <input
                            type="date"
                            value={manufacturingDate}
                            onChange={(e) =>
                                setManufacturingDate(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    {/* =================================================
                        IMAGE UPLOAD
                    ================================================= */}

                    <div className="upload-box">


                        {
                            preview ?

                                <img
                                    src={preview}
                                    alt="Product Preview"
                                    className="preview-image"
                                />

                                :

                                <Camera size={80} />

                        }


                        <h3>

                            Select Product Image

                        </h3>


                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploading}
                        />


                        {/* =================================================
                            AI INSPECTION BUTTON
                        ================================================= */}

                        <button
                            onClick={uploadImage}
                            disabled={uploading}
                        >

                            {
                                uploading ?

                                    <>

                                        <ScanSearch
                                            size={18}
                                        />

                                        &nbsp;

                                        Inspecting...

                                    </>

                                    :

                                    <>

                                        <Upload
                                            size={18}
                                        />

                                        &nbsp;

                                        Run AI Inspection

                                    </>
                            }

                        </button>


                    </div>


                    {/* =================================================
                        STATUS MESSAGE
                    ================================================= */}

                    {
                        message &&
                        !inspectionResult &&

                        <div className="inspection-result">

                            <p>
                                {message}
                            </p>

                        </div>
                    }


                    {/* =================================================
                        AI INSPECTION RESULT
                    ================================================= */}

                    {
                        inspectionResult &&

                        <div
                            className={
                                `inspection-result ${
                                    isFail
                                        ? "inspection-fail"
                                        : isPass
                                            ? "inspection-pass"
                                            : ""
                                }`
                            }
                        >


                            {/* =========================================
                                RESULT HEADER
                            ========================================= */}

                            <div className="result-header">

                                {
                                    isPass ?

                                        <CheckCircle
                                            size={32}
                                        />

                                        :

                                        <AlertTriangle
                                            size={32}
                                        />

                                }


                                <h3>

                                    AI Inspection Completed

                                </h3>

                            </div>


                            {/* =========================================
                                FINAL RESULT
                            ========================================= */}

                            <div className="ai-result-summary">

                                <h2>

                                    Final Result:

                                    {" "}

                                    <strong>

                                        {
                                            inspectionResult.prediction
                                        }

                                    </strong>

                                </h2>


                                <p>

                                    Final Confidence:

                                    {" "}

                                    <b>

                                        {
                                            inspectionResult.confidence
                                        }%

                                    </b>

                                </p>

                            </div>


                            {/* =========================================
                                INSPECTION INFORMATION
                            ========================================= */}

                            <div className="inspection-details">

                                {
                                    inspectionResult.inspection_id &&

                                    <p>

                                        Inspection ID:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult.inspection_id
                                            }

                                        </b>

                                    </p>
                                }


                                {
                                    inspectionResult.image_id &&

                                    <p>

                                        Image ID:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult.image_id
                                            }

                                        </b>

                                    </p>
                                }


                                {
                                    inspectionResult.inspection_time !==
                                    undefined &&

                                    <p>

                                        Processing Time:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult
                                                    .inspection_time
                                            }

                                            {" "}seconds

                                        </b>

                                    </p>
                                }


                                {
                                    inspectionResult.model &&

                                    <p>

                                        AI Model:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult.model
                                            }

                                        </b>

                                    </p>
                                }

                            </div>


                            {/* =========================================
                                RESNET18 RESULT
                            ========================================= */}

                            {
                                inspectionResult.resnet &&

                                <div className="ai-model-result">

                                    <h4>

                                        ResNet18 Classification

                                    </h4>


                                    <p>

                                        Prediction:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult
                                                    .resnet
                                                    .prediction
                                            }

                                        </b>

                                    </p>


                                    <p>

                                        Confidence:

                                        {" "}

                                        <b>

                                            {
                                                inspectionResult
                                                    .resnet
                                                    .confidence
                                            }%

                                        </b>

                                    </p>

                                </div>
                            }


                            {/* =========================================
                                YOLO RESULT
                            ========================================= */}

                            {
                                yolo &&

                                <div className="ai-model-result">

                                    <h4>

                                        YOLOv8s Defect Detection

                                    </h4>


                                    {/* =================================
                                        NUMBER OF DEFECTS
                                    ================================= */}

                                    <p>

                                        Number of Defects Detected:

                                        {" "}

                                        <b>

                                            {defectsDetected}

                                        </b>

                                    </p>


                                    {/* =================================
                                        MAX CONFIDENCE
                                    ================================= */}

                                    <p>

                                        Maximum Defect Confidence:

                                        {" "}

                                        <b>

                                            {maxConfidence}%

                                        </b>

                                    </p>


                                    {/* =================================
                                        DEFECT TYPES
                                    ================================= */}

                                    {
                                        detections.length > 0 &&

                                        <div className="defect-detections">

                                            <h4>

                                                Detected Defects

                                            </h4>


                                            {
                                                detections.map(
                                                    (
                                                        detection,
                                                        index
                                                    ) => (

                                                        <div
                                                            className="defect-item"
                                                            key={index}
                                                        >

                                                            <h5>

                                                                Defect {
                                                                    index + 1
                                                                }

                                                            </h5>


                                                            {/* DEFECT TYPE */}

                                                            <p>

                                                                <b>
                                                                    Defect Type:
                                                                </b>

                                                                {" "}

                                                                {
                                                                    detection.class_name
                                                                }

                                                            </p>


                                                            {/* CONFIDENCE */}

                                                            <p>

                                                                <b>
                                                                    Confidence:
                                                                </b>

                                                                {" "}

                                                                {
                                                                    detection.confidence
                                                                }%

                                                            </p>


                                                            {/* BOUNDING BOX */}

                                                            {
                                                                detection.bbox &&

                                                                <p>

                                                                    <b>
                                                                        Bounding Box:
                                                                    </b>

                                                                    {" "}

                                                                    X:

                                                                    {
                                                                        detection
                                                                            .bbox
                                                                            .x
                                                                    }

                                                                    {" "}

                                                                    Y:

                                                                    {
                                                                        detection
                                                                            .bbox
                                                                            .y
                                                                    }

                                                                    {" "}

                                                                    W:

                                                                    {
                                                                        detection
                                                                            .bbox
                                                                            .width
                                                                    }

                                                                    {" "}

                                                                    H:

                                                                    {
                                                                        detection
                                                                            .bbox
                                                                            .height
                                                                    }

                                                                </p>

                                                            }

                                                        </div>

                                                    )
                                                )}

                                        </div>
                                    }


                                    {/* =================================
                                        BOUNDING BOX IMAGE
                                    ================================= */}

                                    {
                                        preview &&
                                        detections.length > 0 &&

                                        <div className="result-image-section">

                                            <h4>

                                                Defect Detection Image

                                            </h4>


                                            <p>

                                                YOLOv8s detected
                                                bounding boxes are
                                                displayed below.

                                            </p>


                                            <div
                                                className="yolo-image-wrapper"
                                                style={{
                                                    position: "relative",
                                                    display: "inline-block",
                                                    maxWidth: "100%"
                                                }}
                                            >

                                                <img
                                                    ref={imageRef}
                                                    src={preview}
                                                    alt="YOLO Defect Detection"
                                                    className="yolo-result-image"
                                                    onLoad={handleImageLoad}
                                                    style={{
                                                        display: "block",
                                                        maxWidth: "100%",
                                                        height: "auto"
                                                    }}
                                                />


                                                {/* =================================
                                                    YOLO BOUNDING BOX OVERLAYS
                                                ================================= */}

                                                {
                                                    imageDimensions.width > 0 &&
                                                    imageDimensions.height > 0 &&

                                                    detections.map(
                                                        (
                                                            detection,
                                                            index
                                                        ) => {

                                                            if (
                                                                !detection.bbox
                                                            ) {
                                                                return null;
                                                            }


                                                            const bbox =
                                                                detection.bbox;


                                                            const left =
                                                                (
                                                                    Number(
                                                                        bbox.x
                                                                    ) /
                                                                    imageDimensions.width
                                                                ) *
                                                                100;


                                                            const top =
                                                                (
                                                                    Number(
                                                                        bbox.y
                                                                    ) /
                                                                    imageDimensions.height
                                                                ) *
                                                                100;


                                                            const width =
                                                                (
                                                                    Number(
                                                                        bbox.width
                                                                    ) /
                                                                    imageDimensions.width
                                                                ) *
                                                                100;


                                                            const height =
                                                                (
                                                                    Number(
                                                                        bbox.height
                                                                    ) /
                                                                    imageDimensions.height
                                                                ) *
                                                                100;


                                                            return (

                                                                <div
                                                                    key={
                                                                        `bbox-${index}`
                                                                    }

                                                                    style={{
                                                                        position:
                                                                            "absolute",

                                                                        left:
                                                                            `${left}%`,

                                                                        top:
                                                                            `${top}%`,

                                                                        width:
                                                                            `${width}%`,

                                                                        height:
                                                                            `${height}%`,

                                                                        border:
                                                                            "3px solid #ff3b30",

                                                                        boxSizing:
                                                                            "border-box",

                                                                        pointerEvents:
                                                                            "none",

                                                                        zIndex:
                                                                            2
                                                                    }}
                                                                >

                                                                    <span
                                                                        style={{
                                                                            position:
                                                                                "absolute",

                                                                            top:
                                                                                "-26px",

                                                                            left:
                                                                                "0",

                                                                            background:
                                                                                "#ff3b30",

                                                                            color:
                                                                                "#ffffff",

                                                                            padding:
                                                                                "4px 8px",

                                                                            borderRadius:
                                                                                "5px",

                                                                            fontSize:
                                                                                "12px",

                                                                            fontWeight:
                                                                                "700",

                                                                            whiteSpace:
                                                                                "nowrap"
                                                                        }}
                                                                    >

                                                                        {
                                                                            detection
                                                                                .class_name
                                                                        }

                                                                        {" "}

                                                                        (
                                                                        {
                                                                            detection
                                                                                .confidence
                                                                        }%
                                                                        )

                                                                    </span>

                                                                </div>

                                                            );

                                                        }
                                                    )
                                                }

                                            </div>

                                        </div>
                                    }

                                </div>
                            }


                            {/* =========================================
                                OVERALL SEVERITY
                            ========================================= */}

                            {
                                severity &&

                                <div className="severity-section">

                                    <h3>

                                        Overall Severity

                                    </h3>


                                    <div
                                        className={
                                            `severity-score ${
                                                getSeverityClass(
                                                    severity.overall
                                                )
                                            }`
                                        }
                                    >

                                        <span>

                                            {
                                                severity.overall
                                            }

                                        </span>

                                        <small>

                                            / 100

                                        </small>

                                    </div>


                                    <h4
                                        className={
                                            getSeverityClass(
                                                severity.overall
                                            )
                                        }
                                    >

                                        {severity.level}

                                    </h4>


                                    {/* =====================================
                                        SEVERITY FORMULA
                                    ===================================== */}

                                    <p className="severity-formula">

                                        Severity Score =

                                        {" "}

                                        (Size × 30%)

                                        {" + "}

                                        (Location × 25%)

                                        {" + "}

                                        (Defect Type × 25%)

                                        {" + "}

                                        (Confidence × 20%)

                                    </p>


                                    {/* =====================================
                                        SEVERITY BREAKDOWN
                                    ===================================== */}

                                    <div className="severity-breakdown">


                                        <div className="severity-card">

                                            <span>

                                                Defect Size

                                            </span>

                                            <strong>

                                                {
                                                    severity.size
                                                }%

                                            </strong>

                                            <small>

                                                Weight: 30%

                                            </small>

                                        </div>


                                        <div className="severity-card">

                                            <span>

                                                Defect Location

                                            </span>

                                            <strong>

                                                {
                                                    severity.location
                                                }%

                                            </strong>

                                            <small>

                                                Weight: 25%

                                            </small>

                                        </div>


                                        <div className="severity-card">

                                            <span>

                                                Defect Type

                                            </span>

                                            <strong>

                                                {
                                                    severity.type
                                                }%

                                            </strong>

                                            <small>

                                                Weight: 25%

                                            </small>

                                        </div>


                                        <div className="severity-card">

                                            <span>

                                                Detection Confidence

                                            </span>

                                            <strong>

                                                {
                                                    severity.confidence
                                                }%

                                            </strong>

                                            <small>

                                                Weight: 20%

                                            </small>

                                        </div>


                                    </div>
                                    <div className="severity-recommendation">

    <h4>
        Recommended Action
    </h4>

    <p>
        {severity.recommended_action}
    </p>

</div>

                                </div>

                            }


                            {/* =========================================
                                PASS MESSAGE
                            ========================================= */}

                            {
                                isPass &&

                                <div className="inspection-pass-message">

                                    <CheckCircle
                                        size={24}
                                    />

                                    <div>

                                        <h4>

                                            Product Passed Inspection

                                        </h4>

                                        <p>

                                            No significant defect was
                                            detected by the AI inspection
                                            pipeline.

                                        </p>

                                    </div>

                                </div>
                            }


                            {/* =========================================
                                FAIL MESSAGE
                            ========================================= */}

                            {
                                isFail &&

                                <div className="inspection-fail-message">

                                    <AlertTriangle
                                        size={24}
                                    />

                                    <div>

                                        <h4>

                                            Defect Detected

                                        </h4>

                                        <p>

                                            The AI inspection identified
                                            one or more defects in the
                                            uploaded product image.

                                        </p>

                                    </div>

                                </div>
                            }


                        </div>

                    }


                </div>

            </div>

        </div>

    );

}


export default UploadProduct;