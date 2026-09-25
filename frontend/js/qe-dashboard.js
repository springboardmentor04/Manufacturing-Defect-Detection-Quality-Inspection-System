requireRole("QUALITY_ENGINEER");

async function loadQEDashboard() {
    shell(
        "Quality Engineer Control Center",
        "Real-time product inspection workflow & human quality verification studio",
        `
        <div class="card card-hover" style="margin-bottom:28px; background:linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.1)); border-color:var(--border-glow)">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px">
                <div>
                    <h2 style="font-size:22px; font-weight:800; color:var(--text-primary); margin-bottom:6px">
                        ⚡ AI Defect Detection Engine Ready
                    </h2>
                    <p style="color:var(--text-secondary); font-size:14px">
                        Acquire images via webcam feed, drag & drop upload, or select MVTec dataset sample images.
                    </p>
                </div>
                <button class="btn btn-cyan btn-lg" onclick="location.href='inspection.html'">
                    🔍 Launch Inspection Studio →
                </button>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Today's Volume</span>
                    <div class="kpi-icon-box icon-blue">📋</div>
                </div>
                <div class="kpi-value" id="todayInspections">0</div>
                <div class="kpi-sub">Total product image scans today</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Passed Inspections</span>
                    <div class="kpi-icon-box icon-green">✅</div>
                </div>
                <div class="kpi-value" id="passed" style="color:var(--emerald)">0</div>
                <div class="kpi-sub">Verified zero defect release</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Failed / Rejected</span>
                    <div class="kpi-icon-box icon-red">❌</div>
                </div>
                <div class="kpi-value" id="failed" style="color:var(--rose)">0</div>
                <div class="kpi-sub">Quality threshold violations</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Pending QE Review</span>
                    <div class="kpi-icon-box icon-amber">⏳</div>
                </div>
                <div class="kpi-value" id="pendingReviews" style="color:var(--amber)">0</div>
                <div class="kpi-sub">Requires manual engineer check</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Critical Defects</span>
                    <div class="kpi-icon-box icon-red">⚠️</div>
                </div>
                <div class="kpi-value" id="criticalDefects" style="color:var(--rose)">0</div>
                <div class="kpi-sub">Score 80-100 severity</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Avg Inspection Speed</span>
                    <div class="kpi-icon-box icon-cyan">⚡</div>
                </div>
                <div class="kpi-value"><span id="avgInspectionTime">0</span> <small style="font-size:16px">ms</small></div>
                <div class="kpi-sub">End-to-end processing latencies</div>
            </div>
        </div>

        <div class="grid-2-1" style="margin-bottom:28px">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Recent Inspection Stream</div>
                    <button class="btn btn-secondary btn-sm" onclick="location.href='history.html'">View All →</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Inspection UUID</th>
                                <th>Decision</th>
                                <th>Severity</th>
                                <th>Confidence</th>
                                <th>Defects</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="recentInspections">
                            <tr><td colspan="6" style="text-align:center">Loading inspections...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:20px">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Active Quality Alerts</div>
                    </div>
                    <div id="qualityAlerts" style="display:flex; flex-direction:column; gap:12px">
                        <p style="color:var(--text-muted)">Loading quality alerts...</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Quick Workflows</div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                        <button class="btn btn-secondary" onclick="location.href='inspection.html'">📷 Camera Feed</button>
                        <button class="btn btn-secondary" onclick="location.href='history.html'">📋 Records Archive</button>
                        <button class="btn btn-secondary" onclick="location.href='analytics.html'">📈 Defect Trends</button>
                        <button class="btn btn-secondary" onclick="location.href='quality-reports.html'">📁 Export PDF</button>
                    </div>
                </div>
            </div>
        </div>
        `
    );

    await fetchDashboardData();
}

async function fetchDashboardData() {
    try {
        const data = await api("/api/dashboard/qe");
        const kpis = data.kpis || {};

        document.getElementById("todayInspections").textContent = kpis.today_inspections ?? 0;
        document.getElementById("passed").textContent = kpis.passed ?? 0;
        document.getElementById("failed").textContent = kpis.failed ?? 0;
        document.getElementById("pendingReviews").textContent = kpis.pending_reviews ?? 0;
        document.getElementById("criticalDefects").textContent = kpis.critical_defects ?? 0;
        document.getElementById("avgInspectionTime").textContent = Math.round((kpis.avg_inspection_time || 0) * 1000);

        renderRecentInspections(data.recent_inspections || []);
        renderAlerts(kpis);
    } catch (error) {
        console.error("QE Dashboard error:", error);
    }
}

function renderRecentInspections(inspections) {
    const tbody = document.getElementById("recentInspections");
    if (!inspections.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No recent product inspections logged.</td></tr>`;
        return;
    }

    tbody.innerHTML = inspections.map(item => {
        const decision = escapeHtml(item.decision || "PENDING");
        const severity = escapeHtml(item.severity || "LOW");
        return `
            <tr>
                <td style="font-family:var(--font-mono); font-size:12px">
                    <a href="inspection-result.html?id=${item.id}" style="color:var(--cyan); text-decoration:none">
                        #${item.id} - ${escapeHtml(item.inspection_uuid.substring(0, 8))}...
                    </a>
                </td>
                <td><span class="badge badge-${decision}">${decision}</span></td>
                <td><span class="badge badge-${severity}">${severity} (${item.severity_score})</span></td>
                <td><strong>${item.confidence}%</strong></td>
                <td>${item.defect_count} detected</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="location.href='inspection-result.html?id=${item.id}'">Inspect →</button>
                </td>
            </tr>
        `;
    }).join("");
}

function renderAlerts(kpis) {
    const container = document.getElementById("qualityAlerts");
    const alerts = [];

    if ((kpis.critical_defects || 0) > 0) {
        alerts.push(`
            <div style="background:var(--rose-bg); border:1px solid var(--rose-border); padding:12px; border-radius:var(--radius-md); color:var(--rose)">
                <div style="font-weight:700; font-size:13px">Critical Defects Detected</div>
                <div style="font-size:12px; margin-top:2px">${kpis.critical_defects} defect(s) scored above 80 severity. Immediate action required.</div>
            </div>
        `);
    }

    if ((kpis.pending_reviews || 0) > 0) {
        alerts.push(`
            <div style="background:var(--amber-bg); border:1px solid var(--amber-border); padding:12px; border-radius:var(--radius-md); color:var(--amber)">
                <div style="font-weight:700; font-size:13px">Pending Manual Reviews</div>
                <div style="font-size:12px; margin-top:2px">${kpis.pending_reviews} inspection(s) queued for engineer evaluation.</div>
            </div>
        `);
    }

    if (!alerts.length) {
        container.innerHTML = `
            <div style="background:var(--emerald-bg); border:1px solid var(--emerald-border); padding:12px; border-radius:var(--radius-md); color:var(--emerald)">
                <div style="font-weight:700; font-size:13px">All Systems Normal</div>
                <div style="font-size:12px; margin-top:2px">Zero critical anomalies queued. Inspection line operational.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.join("");
}

loadQEDashboard();