requireAuth();

async function loadAnalyticsPage() {
    shell(
        "Manufacturing Defect Intelligence & Analytics Studio",
        "Pareto defect distribution, severity scoring classification, and manufacturing quality trends",
        `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Total Defects Identified</span>
                    <div class="kpi-icon-box icon-red">⚠️</div>
                </div>
                <div class="kpi-value" id="kpiDefects">0</div>
                <div class="kpi-sub">Across all product lines</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Scrap / Fail Rate</span>
                    <div class="kpi-icon-box icon-red">📉</div>
                </div>
                <div class="kpi-value" style="color:var(--rose)"><span id="kpiFailRate">0</span>%</div>
                <div class="kpi-sub">Quality rejections</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">First Pass Yield</span>
                    <div class="kpi-icon-box icon-green">✅</div>
                </div>
                <div class="kpi-value" style="color:var(--emerald)"><span id="kpiPassRate">0</span>%</div>
                <div class="kpi-sub">Accepted product releases</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Avg Inspection Speed</span>
                    <div class="kpi-icon-box icon-cyan">⚡</div>
                </div>
                <div class="kpi-value"><span id="kpiSpeed">0</span> <small style="font-size:16px">ms</small></div>
                <div class="kpi-sub">AI inference latency</div>
            </div>
        </div>

        <div class="grid-2" style="margin-bottom:28px">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Defect Type Pareto Distribution</div>
                </div>
                <div id="defectParetoChart" style="display:flex; flex-direction:column; gap:14px">
                    <p style="color:var(--text-muted)">Loading defect distribution...</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Severity Level Breakdown</div>
                </div>
                <div id="severityChart" style="display:flex; flex-direction:column; gap:16px">
                    <p style="color:var(--text-muted)">Loading severity metrics...</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">Quality Trend History</div>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Inspection Date</th>
                            <th>Quality Decision</th>
                            <th>Total Inspections</th>
                        </tr>
                    </thead>
                    <tbody id="qualityTrendTbody">
                        <tr><td colspan="3" style="text-align:center">Loading trend data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        `
    );

    await fetchAnalyticsData();
}

async function fetchAnalyticsData() {
    try {
        const [kpiData, defects, severity, trend] = await Promise.all([
            api("/api/analytics/dashboard"),
            api("/api/analytics/defects"),
            api("/api/analytics/severity"),
            api("/api/analytics/quality")
        ]);

        document.getElementById("kpiDefects").textContent = kpiData.total_defects ?? 0;
        document.getElementById("kpiFailRate").textContent = kpiData.fail_rate ?? 0;
        document.getElementById("kpiPassRate").textContent = kpiData.pass_rate ?? 0;
        document.getElementById("kpiSpeed").textContent = Math.round(kpiData.average_inspection_time_ms || 0);

        renderDefectPareto(defects || []);
        renderSeverityDistribution(severity || []);
        renderQualityTrend(trend || []);
    } catch (e) {
        console.error("Analytics fetch error:", e);
    }
}

function renderDefectPareto(defects) {
    const container = document.getElementById("defectParetoChart");
    if (!defects.length) {
        container.innerHTML = `<p style="color:var(--text-muted)">Zero defects recorded across inspection database.</p>`;
        return;
    }

    const maxVal = Math.max(...defects.map(d => d.value), 1);
    container.innerHTML = defects.map(item => {
        const pct = Math.round((item.value / maxVal) * 100);
        return `
            <div class="score-bar-group">
                <div class="score-bar-header">
                    <span style="font-weight:600; text-transform:capitalize">${escapeHtml(item.label.replace(/_/g, " "))}</span>
                    <span style="color:var(--rose); font-weight:700">${item.value} count</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill fill-rose" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderSeverityDistribution(severity) {
    const container = document.getElementById("severityChart");
    if (!severity.length) {
        container.innerHTML = `<p style="color:var(--text-muted)">No severity data available.</p>`;
        return;
    }

    const total = severity.reduce((sum, item) => sum + item.value, 0) || 1;
    container.innerHTML = severity.map(item => {
        const pct = Math.round((item.value / total) * 100);
        const fillClass = item.label === "CRITICAL" ? "fill-rose" : item.label === "HIGH" ? "fill-amber" : "fill-emerald";
        return `
            <div class="score-bar-group">
                <div class="score-bar-header">
                    <span class="badge badge-${item.label}">${item.label}</span>
                    <span style="font-weight:700">${item.value} inspections (${pct}%)</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderQualityTrend(trend) {
    const tbody = document.getElementById("qualityTrendTbody");
    if (!trend.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted)">No trend history available.</td></tr>`;
        return;
    }

    tbody.innerHTML = trend.map(item => `
        <tr>
            <td style="font-weight:600; color:var(--text-primary)">${escapeHtml(item.date)}</td>
            <td><span class="badge badge-${item.decision}">${escapeHtml(item.decision)}</span></td>
            <td><strong>${item.count}</strong></td>
        </tr>
    `).join("");
}

loadAnalyticsPage();
