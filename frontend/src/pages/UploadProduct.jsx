import { useState, useRef, useEffect } from "react";

import {
    Camera,
    Upload,
    Package,
    CheckCircle,
    AlertTriangle,
    ScanSearch,
    Video,
    X,
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
// LIVE CAMERA
// =========================================================

    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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
// START LIVE CAMERA
// =========================================================

    async function startCamera() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            },
            audio: false
        });

        setCameraStream(stream);
        setCameraOpen(true);

        // Wait until video element is rendered
        setTimeout(() => {

            if (videoRef.current) {

                videoRef.current.srcObject = stream;

                videoRef.current.play();

            }

        }, 100);

    } catch (error) {

        console.error("Camera access error:", error);

        alert(
            "Unable to access the camera. Please allow camera permission and try again."
        );

    }
}


// =========================================================
// STOP LIVE CAMERA
// =========================================================

    function stopCamera() {

    if (cameraStream) {

        cameraStream.getTracks().forEach(
            (track) => track.stop()
        );

    }

    setCameraStream(null);
    setCameraOpen(false);

}


// =========================================================
// CAPTURE IMAGE FROM CAMERA
// =========================================================

    function captureImage() {

    if (!videoRef.current) {
        return;
    }

    const video = videoRef.current;

    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(
        (blob) => {

            if (!blob) {
                return;
            }

            const file = new File(
                [blob],
                `camera_capture_${Date.now()}.jpg`,
                {
                    type: "image/jpeg"
                }
            );

            setSelectedFile(file);

            setPreview(
                URL.createObjectURL(file)
            );

            setInspectionResult(null);

            setMessage("");

            setImageDimensions({
                width: canvas.width,
                height: canvas.height
            });

            stopCamera();

        },
        "image/jpeg",
        0.95
    );

}


// =========================================================
// CLEAN CAMERA WHEN PAGE IS CLOSED
// =========================================================

    useEffect(() => {

    return () => {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach((track) => track.stop());

        }

    };

}, [cameraStream]);
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
                    setProductCode(e.target.value)
                    }
                />

    <input
        type="text"
        placeholder="Product Name"
        value={productName}
        onChange={(e) =>
            setProductName(e.target.value)
        }
    />

    {/* CATEGORY */}
    <select
    className="product-form"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    required
>
    <option value="">Select Category</option>

    <option value="Pharmaceuticals">Pharmaceuticals</option>
    <option value="Medical Devices">Medical Devices</option>
    <option value="Food & Beverages">Food & Beverages</option>
    <option value="Cosmetics & Personal Care">
        Cosmetics & Personal Care
    </option>
    <option value="Chemicals">Chemicals</option>

    <option value="Automotive Components">
        Automotive Components
    </option>
    <option value="Aerospace Components">
        Aerospace Components
    </option>

    <option value="Electrical Components">
        Electrical Components
    </option>
    <option value="Electronic Components">
        Electronic Components
    </option>
    <option value="Cables & Wires">Cables & Wires</option>
    <option value="Connectors & Terminals">
        Connectors & Terminals
    </option>
    <option value="Semiconductors">Semiconductors</option>
    <option value="Batteries & Power Components">
        Batteries & Power Components
    </option>

    <option value="Mechanical Components">
        Mechanical Components
    </option>
    <option value="Fasteners">Fasteners</option>
    <option value="Nuts, Bolts & Washers">
        Nuts, Bolts & Washers
    </option>
    <option value="Industrial Tools">Industrial Tools</option>
    <option value="Machinery Components">
        Machinery Components
    </option>
    <option value="Metal Parts">Metal Parts</option>

    <option value="Plastic Parts">Plastic Parts</option>
    <option value="Rubber Products">Rubber Products</option>
    <option value="Glass Products">Glass Products</option>
    <option value="Ceramic Products">Ceramic Products</option>

    <option value="Building & Construction Materials">
        Building & Construction Materials
    </option>

    <option value="Packaging Materials">
        Packaging Materials
    </option>
    <option value="Bottles & Containers">
        Bottles & Containers
    </option>

    <option value="Textiles & Fabrics">
        Textiles & Fabrics
    </option>
    <option value="Leather Products">Leather Products</option>
    <option value="Wood Products">Wood Products</option>
    <option value="Paper & Cardboard Products">
        Paper & Cardboard Products
    </option>

    <option value="Consumer Products">
        Consumer Products
    </option>
    <option value="Household Products">
        Household Products
    </option>
    <option value="Hardware Products">
        Hardware Products
    </option>
    <option value="Lighting Components">
        Lighting Components
    </option>
    <option value="Optical Components">
        Optical Components
    </option>

    <option value="Agricultural Products">
        Agricultural Products
    </option>
    <option value="Food Ingredients">
        Food Ingredients
    </option>

    <option value="Other Industrial Products">
        Other Industrial Products
    </option>
    </select>

    {/* BATCH NUMBER */}
    <input
    type="text"
    placeholder="BATCH-PRODUCTCODE-YYYY-NNN"
    value={batchNumber}
    onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
    pattern="BATCH-[A-Z0-9]+-[0-9]{4}-[0-9]{3}"
    title="Format: BATCH-PRODUCTCODE-YYYY-NNN (Example: BATCH-CAP-2026-004)"
    required
/>

    {/* PRODUCTION LINE */}
    <select
    value={productionLine}
    onChange={(e) => setProductionLine(e.target.value)}
    required
>
    <option value="">Select Production Line</option>
    <option value="LINE 1">LINE 1</option>
    <option value="LINE 2">LINE 2</option>
    <option value="LINE 3">LINE 3</option>
    <option value="LINE 4">LINE 4</option>
    <option value="LINE 5">LINE 5</option>
    <option value="LINE A">LINE A</option>
    <option value="LINE B">LINE B</option>
    <option value="LINE C">LINE C</option>
    <option value="LINE D">LINE D</option>
    <option value="LINE E">LINE E</option>
    </select>

    <input
        type="date"
        value={manufacturingDate}
        onChange={(e) =>
            setManufacturingDate(e.target.value)
        }
    />

</div>


                    {/* =================================================
                        IMAGE UPLOAD
                    ================================================= */}

                    {/* =================================================
    IMAGE UPLOAD / LIVE CAMERA
================================================= */}

    <div className="upload-box">

    {/* =============================================
        CAMERA PREVIEW
    ============================================= */}

    {cameraOpen ? (

        <div className="camera-container">

            <video
                ref={videoRef}
                className="camera-preview"
                autoPlay
                playsInline
                muted
            />

            <div className="camera-controls">

                <button
                    type="button"
                    className="capture-camera-btn"
                    onClick={captureImage}
                >
                    <Camera size={18} />
                    &nbsp;
                    Capture Image
                </button>

                <button
                    type="button"
                    className="close-camera-btn"
                    onClick={stopCamera}
                >
                    <X size={18} />
                    &nbsp;
                    Close Camera
                </button>

            </div>

        </div>

    ) : (

        <>

            {/* =============================================
                IMAGE PREVIEW
            ============================================= */}

            {preview ? (

                <img
                    src={preview}
                    alt="Product Preview"
                    className="preview-image"
                />

            ) : (

                <Camera size={80} />

            )}


            <h3>
                Select Product Image
            </h3>


            {/* =============================================
                IMAGE SOURCE OPTIONS
            ============================================= */}

            <div className="image-source-options">

    {/* CHOOSE IMAGE FILE */}
    <label
        htmlFor="product-image-file"
        className="image-source-btn"
    >
        <Upload size={18} />
        <span>Choose Image File</span>
    </label>

    <input
        id="product-image-file"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={uploading}
        style={{ display: "none" }}
    />


    {/* LIVE CAMERA */}
    <button
        type="button"
        className="image-source-btn"
        onClick={startCamera}
        disabled={uploading}
    >
        <Video size={18} />
        <span>Live Camera</span>
    </button>

</div>


            {/* =============================================
                SELECTED IMAGE INFORMATION
            ============================================= */}

            {selectedFile && (

                <div className="selected-image-info">

                    <span>
                        Selected:
                    </span>

                    <strong>
                        {selectedFile.name}
                    </strong>

                </div>

            )}

        </>

    )}


    {/* =============================================
        HIDDEN CANVAS
    ============================================= */}

    <canvas
        ref={canvasRef}
        style={{ display: "none" }}
    />


    {/* =============================================
        AI INSPECTION BUTTON
    ============================================= */}

    {!cameraOpen && (

        <button
            onClick={uploadImage}
            disabled={uploading || !selectedFile}
        >

            {uploading ? (

                <>

                    <ScanSearch size={18} />

                    &nbsp;

                    Inspecting...

                </>

            ) : (

                <>

                    <ScanSearch size={18} />

                    &nbsp;

                    Run AI Inspection

                </>

            )}

        </button>

    )}

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