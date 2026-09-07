import { useCallback, useEffect, useRef, useState } from "react";
import {
    FaCamera,
    FaCheckCircle,
    FaCloudUploadAlt,
    FaFileImage,
    FaFilePdf,
    FaRedo,
    FaShieldAlt,
    FaSpinner,
    FaTimes,
    FaTrash,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import "../styles/Upload.css";

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/bmp",
    "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function Upload() {
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState("");
    const [dimensions, setDimensions] = useState("");
    const [uploadTime, setUploadTime] = useState("");
    const [inspectionResult, setInspectionResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [cameraFacingMode, setCameraFacingMode] = useState("environment");
    const [capturedPreview, setCapturedPreview] = useState("");

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const previewUrlRef = useRef("");

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraReady(false);
    }, []);

    const closeCamera = useCallback(() => {
        stopCamera();
        setCameraOpen(false);
        setCameraError("");
        setCapturedPreview("");
    }, [stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, [stopCamera]);

    const validateFile = useCallback((file) => {
        if (!file) {
            setError("Please select an image.");
            return false;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Only JPG, JPEG, PNG, BMP and WEBP images are allowed.");
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError("Image size must be less than 10 MB.");
            return false;
        }

        setError("");
        return true;
    }, []);

    const loadImageDetails = useCallback((file) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            setDimensions(`${img.width} × ${img.height}`);
            URL.revokeObjectURL(objectUrl);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            setDimensions("");
            setError("Unable to read the selected image.");
        };

        img.src = objectUrl;
        setUploadTime(new Date().toLocaleString());
    }, []);

    const setSelectedImage = useCallback(
        (file) => {
            if (!file || !validateFile(file)) {
                return;
            }

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }

            const nextPreviewUrl = URL.createObjectURL(file);
            previewUrlRef.current = nextPreviewUrl;

            setInspectionResult(null);
            setImage(file);
            setPreviewUrl(nextPreviewUrl);
            loadImageDetails(file);
        },
        [loadImageDetails, validateFile]
    );

    const handleImage = (event) => {
        const file = event.target.files?.[0];
        setSelectedImage(file);
        event.target.value = "";
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        if (!loading) {
            setDragActive(true);
        }
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragActive(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragActive(false);

        if (loading) {
            return;
        }

        const file = event.dataTransfer.files?.[0];
        setSelectedImage(file);
    };

    const openFilePicker = () => {
        if (!loading) {
            fileInputRef.current?.click();
        }
    };

    const startCamera = async () => {
        setError("");
        setCameraError("");
        setCapturedPreview("");
        setCameraOpen(true);

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    "Camera access is not supported by this browser."
                );
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: cameraFacingMode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraReady(true);
        } catch (cameraErr) {
            console.error("Camera error:", cameraErr);

            setCameraReady(false);

            const message =
                cameraErr?.name === "NotAllowedError"
                    ? "Camera permission was denied. Allow camera access and try again."
                    : cameraErr?.name === "NotFoundError"
                      ? "No camera was detected on this device."
                      : cameraErr?.message ||
                        "Unable to access the camera.";

            setCameraError(message);
        }
    };

    const switchCamera = async () => {
        stopCamera();
        setCameraFacingMode((current) =>
            current === "environment" ? "user" : "environment"
        );
    };

    useEffect(() => {
        if (!cameraOpen || capturedPreview) {
            return undefined;
        }

        let cancelled = false;

        const openSelectedCamera = async () => {
            if (cancelled) {
                return;
            }

            await startCamera();
        };

        openSelectedCamera();

        return () => {
            cancelled = true;
        };
        // The camera should be opened when the mode changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraFacingMode, cameraOpen]);

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !cameraReady) {
            setCameraError("Camera is not ready yet.");
            return;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
            setCameraError("Unable to read the camera frame. Please try again.");
            return;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
            setCameraError("Unable to capture the camera frame.");
            return;
        }

        if (cameraFacingMode === "user") {
            context.save();
            context.translate(width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, width, height);
            context.restore();
        } else {
            context.drawImage(video, 0, 0, width, height);
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setCapturedPreview(dataUrl);
        stopCamera();
    };

    const useCapturedPhoto = () => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setCameraError("Unable to prepare the captured image.");
                    return;
                }

                const file = new File(
                    [blob],
                    `camera-inspection-${Date.now()}.jpg`,
                    {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    }
                );

                setSelectedImage(file);
                closeCamera();
            },
            "image/jpeg",
            0.92
        );
    };

    const retakePhoto = () => {
        setCapturedPreview("");
        setCameraError("");
        startCamera();
    };

    const removeImage = () => {
        if (loading) {
            return;
        }

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }

        setImage(null);
        setPreviewUrl("");
        setInspectionResult(null);
        setDimensions("");
        setUploadTime("");
        setError("");
    };

    const inspectImage = async () => {
        if (!image) {
            setError("Please select or capture an image before starting inspection.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setInspectionResult(null);

            const formData = new FormData();
            formData.append("file", image);

            const response = await api.post("/inspection/upload", formData);
            const data = response.data;

            if (!data?.success) {
                throw new Error(
                    data?.message ||
                        data?.detail ||
                        "Inspection failed."
                );
            }

            setInspectionResult(data);

            localStorage.setItem(
                "inspectionResult",
                JSON.stringify(data)
            );
        } catch (err) {
            console.error("Inspection error:", err);

            const message =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                "Inspection failed. Please try again.";

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async () => {
        if (!inspectionResult?.report) {
            setError("No inspection report is available for this inspection.");
            return;
        }

        try {
            setError("");

            const response = await api.get(
                `/inspection/report/${encodeURIComponent(
                    inspectionResult.report
                )}`,
                {
                    responseType: "blob",
                }
            );

            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], {
                    type: "application/pdf",
                })
            );

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download =
                inspectionResult.report || "inspection-report.pdf";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (err) {
            console.error("Report download error:", err);

            const message =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                "Unable to download the inspection report.";

            setError(message);
        }
    };

    const renderResultValue = (value) =>
        value === null || value === undefined || value === ""
            ? "Not available"
            : value;

    return (
        <>
            <Sidebar />

            <div className="dashboard">
                <Navbar />

                <main className="upload-page">
                    <div className="upload-page-header">
                        <div>
                            <span className="upload-eyebrow">
                                AI QUALITY CONTROL
                            </span>

                            <h1>New Inspection</h1>

                            <p>
                                Upload a product image or capture one directly
                                from your camera for AI-powered quality
                                inspection.
                            </p>
                        </div>

                        <div className="inspection-ready">
                            <span className="inspection-ready-dot" />
                            <span>
                                <strong>AI ENGINE</strong>
                                Ready for inspection
                            </span>
                        </div>
                    </div>

                    <section className="inspection-method-card">
                        <div className="method-header">
                            <div>
                                <span className="section-eyebrow">
                                    IMAGE ACQUISITION
                                </span>
                                <h2>Choose inspection source</h2>
                                <p>
                                    Use an existing product image or capture a
                                    fresh image with your device camera.
                                </p>
                            </div>

                            <div className="method-security">
                                <FaShieldAlt />
                                <span>Secure upload</span>
                            </div>
                        </div>

                        <div className="source-grid">
                            <button
                                type="button"
                                className={`source-option ${
                                    dragActive ? "drag-source-active" : ""
                                }`}
                                onClick={openFilePicker}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                disabled={loading}
                            >
                                <div className="source-icon upload-source-icon">
                                    <FaCloudUploadAlt />
                                </div>

                                <div className="source-content">
                                    <strong>Upload Image</strong>
                                    <span>
                                        Drag & drop or choose from your device
                                    </span>
                                    <small>
                                        JPG, PNG, BMP or WEBP • Max 10 MB
                                    </small>
                                </div>

                                <span className="source-arrow">→</span>
                            </button>

                            <button
                                type="button"
                                className="source-option camera-source"
                                onClick={startCamera}
                                disabled={loading}
                            >
                                <div className="source-icon camera-source-icon">
                                    <FaCamera />
                                </div>

                                <div className="source-content">
                                    <strong>Use Camera</strong>
                                    <span>
                                        Capture the product image live
                                    </span>
                                    <small>
                                        Rear camera preferred on mobile
                                    </small>
                                </div>

                                <span className="source-arrow">→</span>
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/bmp,image/webp"
                            hidden
                            onChange={handleImage}
                        />

                        <div className="upload-security-note">
                            <FaCheckCircle />
                            <span>
                                Images are sent securely to the VisionInspect
                                AI inspection engine. No product category
                                selection is required.
                            </span>
                        </div>
                    </section>

                    {error && (
                        <div className="upload-error" role="alert">
                            <FaTimes />
                            <span>{error}</span>
                        </div>
                    )}

                    {image && (
                        <section className="preview-card">
                            <div className="preview-panel">
                                <div className="preview-panel-header">
                                    <div>
                                        <span className="section-eyebrow">
                                            INSPECTION INPUT
                                        </span>
                                        <h2>Product Image</h2>
                                    </div>

                                    <span className="image-ready-badge">
                                        <FaCheckCircle />
                                        Ready
                                    </span>
                                </div>

                                <div className="preview-image-frame">
                                    <img
                                        src={previewUrl}
                                        alt="Selected product preview"
                                        className="preview-image"
                                    />

                                    <div className="preview-overlay-label">
                                        <FaFileImage />
                                        <span>INPUT IMAGE</span>
                                    </div>

                                    <div className="preview-corner preview-corner-tl" />
                                    <div className="preview-corner preview-corner-tr" />
                                    <div className="preview-corner preview-corner-bl" />
                                    <div className="preview-corner preview-corner-br" />
                                </div>
                            </div>

                            <div className="preview-info">
                                <div className="preview-file">
                                    <div className="preview-file-icon">
                                        <FaFileImage />
                                    </div>

                                    <div className="preview-file-copy">
                                        <strong title={image.name}>
                                            {image.name}
                                        </strong>
                                        <span>
                                            {image.type || "image/jpeg"} •{" "}
                                            {(
                                                image.size /
                                                1024 /
                                                1024
                                            ).toFixed(2)}{" "}
                                            MB
                                        </span>
                                    </div>
                                </div>

                                <div className="metadata-grid">
                                    <div className="metadata-item">
                                        <span>RESOLUTION</span>
                                        <strong>{dimensions || "Reading..."}</strong>
                                    </div>

                                    <div className="metadata-item">
                                        <span>SOURCE</span>
                                        <strong>
                                            {image.name.startsWith("camera-inspection-")
                                                ? "Camera"
                                                : "Uploaded"}
                                        </strong>
                                    </div>

                                    <div className="metadata-item">
                                        <span>SELECTED</span>
                                        <strong>{uploadTime || "—"}</strong>
                                    </div>
                                </div>

                                <div className="preview-ai-note">
                                    <span className="ai-note-pulse" />
                                    <div>
                                        <strong>Automatic AI routing</strong>
                                        <span>
                                            Product category will be detected
                                            automatically before defect analysis.
                                        </span>
                                    </div>
                                </div>

                                <div className="preview-actions">
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={removeImage}
                                        disabled={loading}
                                    >
                                        <FaTrash />
                                        Remove
                                    </button>

                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={inspectImage}
                                        disabled={!image || loading}
                                    >
                                        {loading ? (
                                            <>
                                                <FaSpinner className="button-spinner" />
                                                Inspecting...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheckCircle />
                                                Start AI Inspection
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {!image && !error && (
                        <div className="upload-empty-state">
                            <div className="empty-state-line" />
                            <span>
                                Select a source above to prepare the product
                                for inspection.
                            </span>
                            <div className="empty-state-line" />
                        </div>
                    )}

                    {inspectionResult && (
                        <section className="inspection-result">
                            <div className="result-header">
                                <div>
                                    <span className="section-eyebrow">
                                        AI INSPECTION COMPLETE
                                    </span>
                                    <h2>Inspection Result</h2>
                                </div>

                                <span className="result-complete">
                                    <FaCheckCircle />
                                    Analysis complete
                                </span>
                            </div>

                            <div className="result-grid">
                                <div className="result-highlight">
                                    <span>PREDICTION</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.prediction
                                        )}
                                    </strong>
                                    <small>
                                        Status:{" "}
                                        {renderResultValue(
                                            inspectionResult.status
                                        )}
                                    </small>
                                </div>

                                <div className="result-metric">
                                    <span>CONFIDENCE</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.confidence
                                        )}
                                        {inspectionResult.confidence !==
                                            null &&
                                        inspectionResult.confidence !==
                                            undefined &&
                                        inspectionResult.confidence !== ""
                                            ? "%"
                                            : ""}
                                    </strong>
                                </div>

                                <div className="result-metric">
                                    <span>PRODUCT CATEGORY</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.product_category
                                        )}
                                    </strong>
                                    <small>
                                        Category confidence:{" "}
                                        {renderResultValue(
                                            inspectionResult.category_confidence
                                        )}
                                        {inspectionResult.category_confidence !==
                                            null &&
                                        inspectionResult.category_confidence !==
                                            undefined &&
                                        inspectionResult.category_confidence !==
                                            ""
                                            ? "%"
                                            : ""}
                                    </small>
                                </div>

                                <div className="result-metric">
                                    <span>DEFECT CATEGORY</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.defect_category
                                        )}
                                    </strong>
                                </div>

                                <div className="result-metric">
                                    <span>SEVERITY</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.severity
                                        )}
                                    </strong>
                                </div>

                                <div className="result-metric">
                                    <span>RISK LEVEL</span>
                                    <strong>
                                        {renderResultValue(
                                            inspectionResult.risk_level
                                        )}
                                    </strong>
                                </div>
                            </div>

                            {inspectionResult.recommendation && (
                                <div className="recommendation-box">
                                    <span>RECOMMENDATION</span>
                                    <p>{inspectionResult.recommendation}</p>
                                </div>
                            )}

                            {inspectionResult.report && (
                                <button
                                    type="button"
                                    className="report-button"
                                    onClick={downloadReport}
                                >
                                    <FaFilePdf />
                                    Download Inspection Report
                                </button>
                            )}
                        </section>
                    )}
                </main>
            </div>

            {cameraOpen && (
                <div
                    className="camera-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="camera-title"
                >
                    <div className="camera-modal">
                        <div className="camera-modal-header">
                            <div>
                                <span className="section-eyebrow">
                                    LIVE CAMERA
                                </span>
                                <h2 id="camera-title">Capture Product Image</h2>
                            </div>

                            <button
                                type="button"
                                className="camera-close"
                                onClick={closeCamera}
                                aria-label="Close camera"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="camera-view">
                            {!capturedPreview ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        className="camera-video"
                                        autoPlay
                                        playsInline
                                        muted
                                    />

                                    <div className="camera-frame">
                                        <span className="camera-frame-corner top-left" />
                                        <span className="camera-frame-corner top-right" />
                                        <span className="camera-frame-corner bottom-left" />
                                        <span className="camera-frame-corner bottom-right" />
                                        <div className="camera-scan-line" />
                                    </div>

                                    {!cameraReady && (
                                        <div className="camera-status">
                                            <FaSpinner className="button-spinner" />
                                            <span>Starting camera...</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <img
                                    src={capturedPreview}
                                    alt="Captured product preview"
                                    className="camera-captured-image"
                                />
                            )}

                            <canvas ref={canvasRef} hidden />
                        </div>

                        {cameraError && (
                            <div className="camera-error">
                                <FaTimes />
                                <span>{cameraError}</span>
                            </div>
                        )}

                        <div className="camera-modal-footer">
                            {!capturedPreview ? (
                                <>
                                    <button
                                        type="button"
                                        className="camera-secondary-button"
                                        onClick={switchCamera}
                                        disabled={!cameraReady}
                                    >
                                        <FaRedo />
                                        Switch Camera
                                    </button>

                                    <button
                                        type="button"
                                        className="capture-button"
                                        onClick={capturePhoto}
                                        disabled={!cameraReady}
                                    >
                                        <span className="capture-button-ring">
                                            <FaCamera />
                                        </span>
                                        Capture
                                    </button>

                                    <button
                                        type="button"
                                        className="camera-secondary-button"
                                        onClick={closeCamera}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="camera-secondary-button"
                                        onClick={retakePhoto}
                                    >
                                        <FaRedo />
                                        Retake
                                    </button>

                                    <button
                                        type="button"
                                        className="capture-confirm-button"
                                        onClick={useCapturedPhoto}
                                    >
                                        <FaCheckCircle />
                                        Use This Photo
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="camera-tip">
                            Position the product clearly inside the frame for
                            the best inspection result.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

export default Upload;
