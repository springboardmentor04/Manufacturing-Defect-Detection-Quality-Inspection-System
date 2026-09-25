requireAuth();

const params = new URLSearchParams(window.location.search);
const currentPath = window.location.pathname.split("/").pop();

if (currentPath === "inspection-result.html" || currentPath === "inspection-details.html") {
    renderInspectionResultView();
} else {
    renderInspectionStudioView();
}

/* ==========================================================================
   1. INSPECTION ACQUISITION STUDIO VIEW (inspection.html)
   ========================================================================== */

async function renderInspectionStudioView() {
    shell(
        "Product Image Inspection Studio",
        "Acquire product images via upload, webcam stream, or dataset samples for AI defect analysis",
        `
        <div class="grid-2-1" style="margin-bottom:28px">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">1. Select Product Line</div>
                </div>
                <div class="form-group">
                    <label for="productSelect">Production Line / Product Master</label>
                    <select id="productSelect">
                        <option value="">-- General Quality Inspection --</option>
                    </select>
                </div>

                <div class="mode-tabs">
                    <div class="mode-tab active" onclick="switchMode('upload')" id="tab-upload">📁 Upload File</div>
                    <div class="mode-tab" onclick="switchMode('camera')" id="tab-camera">📷 Web Camera</div>
                    <div class="mode-tab" onclick="switchMode('samples')" id="tab-samples">🧪 MVTec Samples</div>
                    <div class="mode-tab" onclick="switchMode('batch')" id="tab-batch">📦 Batch Queue</div>
                </div>

                <!-- MODE 1: FILE UPLOAD -->
                <div id="mode-upload-box">
                    <div class="dropzone" id="dropzone" onclick="document.getElementById('fileInput').click()">
                        <div class="dropzone-icon">📥</div>
                        <h3 style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:6px">Drag & Drop Product Image</h3>
                        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">Supports JPG, PNG, WEBP high-resolution manufacturing images</p>
                        <button class="btn btn-secondary btn-sm" type="button">Browse Local File</button>
                        <input type="file" id="fileInput" accept="image/*" style="display:none" onchange="handleFileSelected(this.files[0])">
                    </div>
                </div>

                <!-- MODE 2: CAMERA -->
                <div id="mode-camera-box" style="display:none; text-align:center">
                    <div style="background:#020617; border:1px solid var(--border-color); border-radius:var(--radius-lg); overflow:hidden; position:relative; margin-bottom:16px">
                        <video id="webcam" autoplay playsinline style="width:100%; height:320px; object-fit:cover; display:none"></video>
                        <canvas id="cameraCanvas" style="display:none"></canvas>
                        <div id="cameraPlaceholder" style="padding:60px 20px">
                            <div style="font-size:40px; margin-bottom:10px">📷</div>
                            <p style="color:var(--text-secondary)">Click below to activate live camera feed simulation</p>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:center; gap:12px">
                        <button class="btn btn-primary" id="btnStartCamera" onclick="startCamera()">Turn On Camera</button>
                        <button class="btn btn-cyan" id="btnCapture" onclick="captureWebcamFrame()" style="display:none">📸 Snapshot & Analyze</button>
                    </div>
                </div>

                <!-- MODE 3: MVTEC SAMPLES -->
                <div id="mode-samples-box" style="display:none">
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px">Select a pre-loaded MVTec AD industrial sample image for 1-click test inspection:</p>
                    <div class="sample-grid" id="sampleGrid">
                        <p style="color:var(--text-muted)">Loading sample library...</p>
                    </div>
                </div>

                <!-- MODE 4: BATCH QUEUE -->
                <div id="mode-batch-box" style="display:none">
                    <div class="dropzone" onclick="document.getElementById('batchFileInput').click()">
                        <div class="dropzone-icon">📦</div>
                        <h3>Batch Multi-File Inspection</h3>
                        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px">Select multiple product files to analyze in sequence</p>
                        <button class="btn btn-secondary btn-sm" type="button">Select Multiple Files</button>
                        <input type="file" id="batchFileInput" accept="image/*" multiple style="display:none" onchange="handleBatchSelected(this.files)">
                    </div>
                    <div id="batchStatus" style="margin-top:16px"></div>
                </div>

                <div id="previewArea" style="display:none; margin-top:20px; padding-top:20px; border-top:1px solid var(--border-color)">
                    <h4 style="font-size:14px; font-weight:700; margin-bottom:10px">Selected Image Preview</h4>
                    <div style="display:flex; align-items:center; gap:16px">
                        <img id="imagePreview" style="width:120px; height:120px; object-fit:cover; border-radius:var(--radius-md); border:1px solid var(--border-color)">
                        <div>
                            <div id="previewFileName" style="font-weight:700; color:var(--text-primary)">filename.jpg</div>
                            <div id="previewFileSize" style="font-size:12px; color:var(--text-muted)">0 KB</div>
                            <button class="btn btn-cyan" style="margin-top:10px" onclick="runSingleInspection()">🚀 Run AI Inspection Now</button>
                        </div>
                    </div>
                </div>

                <div id="loadingStatus" style="display:none; text-align:center; padding:30px 0">
                    <div style="font-size:32px; margin-bottom:10px; animation:spin 1s linear infinite">⚙️</div>
                    <h4 style="font-size:16px; font-weight:700; color:var(--cyan)">Analyzing Image with YOLO Model...</h4>
                    <p style="color:var(--text-muted); font-size:13px; margin-top:4px">Performing noise removal, feature extraction, defect localization, and severity scoring</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:20px">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Inspection Guidelines</div>
                    </div>
                    <ul style="color:var(--text-secondary); font-size:13px; line-height:1.7; padding-left:18px">
                        <li>Ensure lighting is clear without direct lens glare.</li>
                        <li>Product surface should fill at least 40% of the frame.</li>
                        <li>Supported image resolutions up to 4K (scaled automatically).</li>
                        <li>YOLO engine checks 73 defect categories instantly.</li>
                    </ul>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Severity Formula</div>
                    </div>
                    <div class="severity-breakdown" style="font-size:12px">
                        <div style="display:flex; justify-content:space-between"><span>Size Score Weight:</span><strong>30%</strong></div>
                        <div style="display:flex; justify-content:space-between"><span>Location Score Weight:</span><strong>25%</strong></div>
                        <div style="display:flex; justify-content:space-between"><span>Defect Type Weight:</span><strong>25%</strong></div>
                        <div style="display:flex; justify-content:space-between"><span>Detection Confidence:</span><strong>20%</strong></div>
                    </div>
                </div>
            </div>
        </div>
        `
    );

    loadProductsDropdown();
    setupDropzone();
}

let activeFile = null;
let webcamStream = null;

async function loadProductsDropdown() {
    try {
        const products = await api("/api/products");
        const select = document.getElementById("productSelect");
        if (select && products.length) {
            products.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.product_code;
                opt.textContent = `${p.product_code} - ${p.product_name} (${p.production_line || 'Default Line'})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn("Products load warning:", e);
    }
}

function switchMode(mode) {
    document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
    document.getElementById(`tab-${mode}`).classList.add("active");

    document.getElementById("mode-upload-box").style.display = mode === "upload" ? "block" : "none";
    document.getElementById("mode-camera-box").style.display = mode === "camera" ? "block" : "none";
    document.getElementById("mode-samples-box").style.display = mode === "samples" ? "block" : "none";
    document.getElementById("mode-batch-box").style.display = mode === "batch" ? "block" : "none";

    if (mode === "samples") loadSampleGallery();
    if (mode !== "camera" && webcamStream) stopCamera();
}

function setupDropzone() {
    const dz = document.getElementById("dropzone");
    if (!dz) return;
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("dragover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", e => {
        e.preventDefault();
        dz.classList.remove("dragover");
        if (e.dataTransfer.files.length) handleFileSelected(e.dataTransfer.files[0]);
    });
}

function handleFileSelected(file) {
    if (!file) return;
    activeFile = file;
    document.getElementById("previewFileName").textContent = file.name;
    document.getElementById("previewFileSize").textContent = `${Math.round(file.size / 1024)} KB`;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById("imagePreview").src = e.target.result;
        document.getElementById("previewArea").style.display = "block";
    };
    reader.readAsDataURL(file);
}

async function loadSampleGallery() {
    const grid = document.getElementById("sampleGrid");
    try {
        const samples = await api("/api/inspection/samples");
        if (!samples.length) {
            grid.innerHTML = `<p style="color:var(--text-muted)">No samples dataset found.</p>`;
            return;
        }
        grid.innerHTML = samples.map(s => `
            <div class="sample-card" onclick="selectSampleImage('${s.url}', '${s.filename}')">
                <img src="${API + s.url}" alt="${s.name}">
                <p>${s.name}</p>
            </div>
        `).join("");
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--rose)">Failed to load dataset samples.</p>`;
    }
}

async function selectSampleImage(url, filename) {
    try {
        const res = await fetch(API + url);
        const blob = await res.blob();
        activeFile = new File([blob], filename, { type: blob.type || "image/png" });
        handleFileSelected(activeFile);
    } catch (e) {
        alert("Failed to load sample file: " + e.message);
    }
}

async function startCamera() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const video = document.getElementById("webcam");
        video.srcObject = webcamStream;
        video.style.display = "block";
        document.getElementById("cameraPlaceholder").style.display = "none";
        document.getElementById("btnStartCamera").style.display = "none";
        document.getElementById("btnCapture").style.display = "inline-flex";
    } catch (e) {
        alert("Camera access failed: " + e.message + ". You can use file upload or sample picker.");
    }
}

function stopCamera() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
    }
}

function captureWebcamFrame() {
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
        activeFile = new File([blob], "camera_snapshot.jpg", { type: "image/jpeg" });
        handleFileSelected(activeFile);
    }, "image/jpeg", 0.95);
}

async function runSingleInspection() {
    if (!activeFile) return alert("Please select or capture a product image first.");
    const productCode = document.getElementById("productSelect").value;
    const formData = new FormData();
    formData.append("file", activeFile);
    if (productCode) formData.append("product_code", productCode);

    document.getElementById("previewArea").style.display = "none";
    document.getElementById("loadingStatus").style.display = "block";

    try {
        const result = await api("/api/inspection/upload", { method: "POST", body: formData });
        window.location.href = `inspection-result.html?id=${result.id}`;
    } catch (e) {
        document.getElementById("loadingStatus").style.display = "none";
        document.getElementById("previewArea").style.display = "block";
        alert("Inspection failed: " + e.message);
    }
}

async function handleBatchSelected(files) {
    if (!files.length) return;
    const statusDiv = document.getElementById("batchStatus");
    statusDiv.innerHTML = `<p style="color:var(--cyan); font-size:13px; font-weight:600">Processing ${files.length} images in batch mode...</p>`;
    const formData = new FormData();
    for (let f of files) formData.append("files", f);
    const productCode = document.getElementById("productSelect").value;
    if (productCode) formData.append("product_code", productCode);

    try {
        const results = await api("/api/inspection/batch", { method: "POST", body: formData });
        statusDiv.innerHTML = `<p style="color:var(--emerald); font-size:14px; font-weight:700">✓ Batch complete! ${results.length} inspections logged.</p>`;
        setTimeout(() => window.location.href = `history.html`, 1200);
    } catch (e) {
        statusDiv.innerHTML = `<p style="color:var(--rose); font-size:13px">Batch inspection failed: ${escapeHtml(e.message)}</p>`;
    }
}

/* ==========================================================================
   2. INSPECTION RESULT VIEW (inspection-result.html)
   ========================================================================== */

async function renderInspectionResultView() {
    const id = params.get("id");
    if (!id) {
        shell("Inspection Result", "Error", `<div class="card"><p style="color:var(--rose)">Missing inspection ID parameter.</p></div>`);
        return;
    }

    try {
        const i = await api(`/api/inspection/${id}`);
        const decision = escapeHtml(i.decision || "PASS");
        const severity = escapeHtml(i.severity_level || "LOW");

        shell(
            `Inspection Record #${i.id}`,
            `AI Quality Decision & Severity Breakdown report`,
            `
            <div class="grid-2" style="margin-bottom:28px">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <span class="badge badge-${decision}" style="font-size:14px; padding:8px 16px">${decision}</span>
                            <span class="badge badge-${severity}" style="font-size:14px; padding:8px 16px; margin-left:8px">${severity} (${i.severity_score}/100)</span>
                        </div>
                        <button class="btn btn-cyan btn-sm" onclick="downloadPDF(${i.id}, '${i.inspection_uuid}')">📄 Download PDF Report</button>
                    </div>

                    <div style="margin:20px 0; padding:16px; background:rgba(15,23,42,0.6); border-radius:var(--radius-md); border:1px solid var(--border-color)">
                        <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px">Quality Recommendation</h4>
                        <p style="color:var(--text-secondary); font-size:14px">${escapeHtml(i.recommendation)}</p>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:13px">
                        <div><span style="color:var(--text-muted)">UUID:</span> <strong style="font-family:var(--font-mono); font-size:11px">${i.inspection_uuid.substring(0,12)}...</strong></div>
                        <div><span style="color:var(--text-muted)">Confidence:</span> <strong>${(i.highest_confidence*100).toFixed(1)}%</strong></div>
                        <div><span style="color:var(--text-muted)">Latencies:</span> <strong>${Math.round(i.processing_time_ms)} ms</strong></div>
                    </div>

                    ${getUser()?.role === "QUALITY_ENGINEER" ? `
                    <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border-color)">
                        <button class="btn btn-secondary" onclick="openReviewModal(${i.id}, '${decision}')">✍️ Quality Engineer Override / Human Review</button>
                    </div>
                    ` : ''}
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Severity Calculation Breakdown Framework</div>
                    </div>
                    <div class="severity-breakdown">
                        <div class="score-bar-group">
                            <div class="score-bar-header"><span>Overall Composite Severity Score</span><strong>${i.severity_score} / 100</strong></div>
                            <div class="progress-track"><div class="progress-fill ${i.severity_score >= 80 ? 'fill-rose' : i.severity_score >= 60 ? 'fill-amber' : 'fill-emerald'}" style="width:${i.severity_score}%"></div></div>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:8px">
                            Formula = Size(30%) + Location(25%) + Type(25%) + Confidence(20%)
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom:28px">
                <div class="card-header">
                    <div class="card-title">Dual Vision Acquisition: Original vs AI Bounding-Box Overlay</div>
                </div>
                <div class="image-comparison-grid">
                    <div class="image-box">
                        <p style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px">Original Surface Image</p>
                        <img src="${API + i.original_image_url}" alt="Original">
                    </div>
                    <div class="image-box">
                        <p style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:8px">AI Annotated Surface with YOLO Defect Bounding Boxes</p>
                        <img src="${API + i.annotated_image_url}" alt="AI Annotated">
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Detected Defects Breakdown (${i.defects ? i.defects.length : 0})</div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Defect Type</th>
                                <th>Confidence</th>
                                <th>Size Score (30%)</th>
                                <th>Location (25%)</th>
                                <th>Type Weight (25%)</th>
                                <th>Severity Score</th>
                                <th>Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${i.defects && i.defects.length ? i.defects.map(d => `
                                <tr>
                                    <td style="font-weight:700; text-transform:capitalize; color:var(--text-primary)">${escapeHtml((d.class_name || d.defect_type || "").replace(/_/g, " "))}</td>
                                    <td>${(d.confidence * 100).toFixed(1)}%</td>
                                    <td>${d.size_score}</td>
                                    <td>${d.location_score}</td>
                                    <td>${d.defect_type_score}</td>
                                    <td><strong>${d.severity_score}</strong></td>
                                    <td><span class="badge badge-${d.severity_level}">${d.severity_level}</span></td>
                                </tr>
                            `).join("") : `<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">Zero defects detected on surface. Product passed quality check.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
            `
        );
    } catch (e) {
        shell("Inspection Result", "Error", `<div class="card"><p style="color:var(--rose)">Failed to fetch inspection record: ${escapeHtml(e.message)}</p></div>`);
    }
}

function openReviewModal(inspectionId, currentDecision) {
    const bodyHtml = `
    <form id="reviewForm">
        <div class="form-group">
            <label for="overrideDecision">Final Engineer Decision</label>
            <select id="overrideDecision">
                <option value="PASS" ${currentDecision === 'PASS' ? 'selected' : ''}>PASS - Approve Product Release</option>
                <option value="FAIL" ${currentDecision === 'FAIL' ? 'selected' : ''}>FAIL - Reject & Scrap Product</option>
                <option value="REWORK" ${currentDecision === 'REWORK' ? 'selected' : ''}>REWORK - Isolate for Maintenance Rework</option>
                <option value="MANUAL_REVIEW" ${currentDecision === 'MANUAL_REVIEW' ? 'selected' : ''}>MANUAL_REVIEW - Keep Under Evaluation</option>
            </select>
        </div>
        <div class="form-group">
            <label for="reviewComments">Engineer Justification Comments</label>
            <textarea id="reviewComments" placeholder="Enter reason for human decision override..." required></textarea>
        </div>
    </form>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitReview(${inspectionId})">Submit Human Review</button>
    `;

    showModal("Quality Engineer Manual Override", bodyHtml, footerHtml);
}

async function submitReview(inspectionId) {
    const decision = document.getElementById("overrideDecision").value;
    const comments = document.getElementById("reviewComments").value.trim();
    if (!comments) return alert("Please enter review justification comments.");

    try {
        await api(`/api/reviews/${inspectionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ final_decision: decision, comments: comments })
        });
        hideModal();
        alert("Human review logged successfully.");
        window.location.reload();
    } catch (e) {
        alert("Review submission failed: " + e.message);
    }
}

function downloadPDF(id, uuid) {
    window.open(`${API}/api/reports/${id}`, "_blank");
}