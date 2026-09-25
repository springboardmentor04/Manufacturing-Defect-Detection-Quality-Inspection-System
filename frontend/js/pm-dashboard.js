requireRole("PRODUCT_MANAGER");

async function loadPMDashboard() {
    shell(
        "Executive Manufacturing Dashboard",
        "Plant-wide quality analytics, production line efficiency, and yield monitoring",
        `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Total Product Lines</span>
                    <div class="kpi-icon-box icon-blue">🏭</div>
                </div>
                <div class="kpi-value" id="totalProducts">0</div>
                <div class="kpi-sub">Active plant product codes</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Total Inspections</span>
                    <div class="kpi-icon-box icon-cyan">📦</div>
                </div>
                <div class="kpi-value" id="totalInspections">0</div>
                <div class="kpi-sub">AI image acquisition volume</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Yield Pass Rate</span>
                    <div class="kpi-icon-box icon-green">📈</div>
                </div>
                <div class="kpi-value" style="color:var(--emerald)"><span id="passRate">0</span>%</div>
                <div class="kpi-sub">First-pass quality rate</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Defect Rate</span>
                    <div class="kpi-icon-box icon-red">📉</div>
                </div>
                <div class="kpi-value" style="color:var(--rose)"><span id="defectRate">0</span>%</div>
                <div class="kpi-sub">Overall manufacturing scrap</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Critical Alerts</span>
                    <div class="kpi-icon-box icon-red">🚨</div>
                </div>
                <div class="kpi-value" id="criticalDefects" style="color:var(--rose)">0</div>
                <div class="kpi-sub">Severe quality incidents</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Products Under Review</span>
                    <div class="kpi-icon-box icon-amber">🔍</div>
                </div>
                <div class="kpi-value" id="productsUnderReview" style="color:var(--amber)">0</div>
                <div class="kpi-sub">Pending QA authorization</div>
            </div>
        </div>

        <div class="grid-2" style="margin-bottom:28px">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">7-Day Plant Quality Yield Trend</div>
                </div>
                <div id="qualityTrendChart" style="height:220px; display:flex; align-items:flex-end; gap:16px; padding:20px 10px 10px; border-bottom:1px solid var(--border-color)">
                    <p style="color:var(--text-muted)">Loading yield trend chart...</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Top Defect Categories</div>
                </div>
                <div id="topDefectsList" style="display:flex; flex-direction:column; gap:12px">
                    <p style="color:var(--text-muted)">Loading Pareto defect analysis...</p>
                </div>
            </div>
        </div>

        <div class="grid-2" style="margin-bottom:28px">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Production Line Performance Matrix</div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Line Identifier</th>
                                <th>Inspections</th>
                                <th>Passed</th>
                                <th>Failed</th>
                                <th>Yield Rate</th>
                            </tr>
                        </thead>
                        <tbody id="linePerformance">
                            <tr><td colspan="5" style="text-align:center">Loading line metrics...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Product Category Quality Breakdown</div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product Code</th>
                                <th>Category</th>
                                <th>Volume</th>
                                <th>Pass Rate</th>
                            </tr>
                        </thead>
                        <tbody id="productPerformance">
                            <tr><td colspan="4" style="text-align:center">Loading product breakdown...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `
    );

    await fetchPMData();
}

async function fetchPMData() {
    try {
        const data = await api("/api/dashboard/pm");
        const kpis = data.kpis || {};

        document.getElementById("totalProducts").textContent = kpis.total_products ?? 0;
        document.getElementById("totalInspections").textContent = kpis.total_inspections ?? 0;
        document.getElementById("passRate").textContent = kpis.pass_rate ?? 0;
        document.getElementById("defectRate").textContent = kpis.defect_rate ?? 0;
        document.getElementById("criticalDefects").textContent = kpis.critical_defects ?? 0;
        document.getElementById("productsUnderReview").textContent = kpis.products_under_review ?? 0;

        renderYieldTrend(data.quality_trend || []);
        renderTopDefects(data.top_defect_types || []);
        renderLinePerformance(data.production_line_performance || []);
        renderProductPerformance(data.product_performance || []);
    } catch (error) {
        console.error("PM Dashboard error:", error);
    }
}

function renderYieldTrend(trend) {
    const container = document.getElementById("qualityTrendChart");
    if (!trend.length) {
        container.innerHTML = `<p style="color:var(--text-muted); width:100%; text-align:center">No trend history available.</p>`;
        return;
    }

    container.innerHTML = trend.map(item => {
        const dateStr = item.date.split("-").slice(1).join("/");
        const height = Math.max(15, Math.min(100, item.pass_rate || 50));
        return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px">
                <div style="font-size:11px; font-weight:700; color:var(--emerald)">${item.pass_rate}%</div>
                <div style="width:100%; height:${height}%; background:linear-gradient(180deg, var(--emerald), var(--cyan)); border-radius:6px 6px 0 0"></div>
                <div style="font-size:11px; color:var(--text-muted)">${dateStr}</div>
            </div>
        `;
    }).join("");
}

function renderTopDefects(defects) {
    const container = document.getElementById("topDefectsList");
    if (!defects.length) {
        container.innerHTML = `<p style="color:var(--text-muted)">Zero defects recorded across inspection history.</p>`;
        return;
    }

    const maxCount = Math.max(...defects.map(d => d.count), 1);
    container.innerHTML = defects.slice(0, 5).map(item => {
        const pct = Math.round((item.count / maxCount) * 100);
        return `
            <div class="score-bar-group">
                <div class="score-bar-header">
                    <span style="font-weight:600; text-transform:capitalize">${escapeHtml(item.defect_type.replace(/_/g, " "))}</span>
                    <span style="color:var(--rose); font-weight:700">${item.count} defects</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill fill-rose" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderLinePerformance(lines) {
    const tbody = document.getElementById("linePerformance");
    if (!lines.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">No line data available.</td></tr>`;
        return;
    }

    tbody.innerHTML = lines.map(item => {
        const passRate = item.pass_rate ?? 0;
        const colorClass = passRate >= 90 ? "var(--emerald)" : passRate >= 75 ? "var(--amber)" : "var(--rose)";
        return `
            <tr>
                <td style="font-weight:700; color:var(--text-primary)">${escapeHtml(item.production_line || "General Line")}</td>
                <td>${item.inspections}</td>
                <td style="color:var(--emerald)">${item.passed}</td>
                <td style="color:var(--rose)">${item.failed}</td>
                <td><strong style="color:${colorClass}">${passRate}%</strong></td>
            </tr>
        `;
    }).join("");
}

function renderProductPerformance(products) {
    const tbody = document.getElementById("productPerformance");
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No product breakdown available.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(item => {
        return `
            <tr>
                <td style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--cyan)">${escapeHtml(item.product_code)}</td>
                <td>${escapeHtml(item.category || "-")}</td>
                <td>${item.inspections}</td>
                <td><span class="badge badge-${item.pass_rate >= 80 ? 'PASS' : 'FAIL'}">${item.pass_rate}%</span></td>
            </tr>
        `;
    }).join("");
}

loadPMDashboard();