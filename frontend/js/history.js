requireAuth();

let currentPage = 1;

async function loadHistoryPage() {
    shell(
        "Inspection History & Quality Log",
        "Comprehensive audit database of all automated AI product inspections and human override decisions",
        `
        <div class="card" style="margin-bottom:28px">
            <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center; justify-content:space-between">
                <div style="display:flex; gap:12px; flex:1; min-width:300px">
                    <input type="text" id="searchInput" placeholder="Search by Inspection UUID..." oninput="debounceSearch()">
                    <select id="filterDecision" onchange="fetchHistoryData(1)">
                        <option value="">-- All Decisions --</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                        <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                    </select>
                    <select id="filterSeverity" onchange="fetchHistoryData(1)">
                        <option value="">-- All Severity Levels --</option>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="location.href='inspection.html'">+ New Inspection</button>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Record ID / UUID</th>
                            <th>Timestamp</th>
                            <th>Decision</th>
                            <th>Severity Score</th>
                            <th>Defects</th>
                            <th>Confidence</th>
                            <th>Speed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="historyTbody">
                        <tr><td colspan="8" style="text-align:center">Loading history logs...</td></tr>
                    </tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color)">
                <div id="paginationInfo" style="font-size:13px; color:var(--text-muted)">Showing page 1</div>
                <div style="display:flex; gap:8px">
                    <button class="btn btn-secondary btn-sm" id="btnPrev" onclick="changePage(-1)">← Previous</button>
                    <button class="btn btn-secondary btn-sm" id="btnNext" onclick="changePage(1)">Next →</button>
                </div>
            </div>
        </div>
        `
    );

    await fetchHistoryData(1);
}

let searchTimer;
function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchHistoryData(1), 350);
}

async function fetchHistoryData(page = 1) {
    currentPage = page;
    const search = document.getElementById("searchInput") ? document.getElementById("searchInput").value.trim() : "";
    const decision = document.getElementById("filterDecision") ? document.getElementById("filterDecision").value : "";
    const severity = document.getElementById("filterSeverity") ? document.getElementById("filterSeverity").value : "";

    let query = `/api/inspection-history?page=${page}&limit=15`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (decision) query += `&decision=${encodeURIComponent(decision)}`;
    if (severity) query += `&severity=${encodeURIComponent(severity)}`;

    try {
        const data = await api(query);
        const tbody = document.getElementById("historyTbody");
        const inspections = data.inspections || [];

        if (!inspections.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted)">No matching inspection records found.</td></tr>`;
            document.getElementById("paginationInfo").textContent = "Total records: 0";
            return;
        }

        tbody.innerHTML = inspections.map(i => {
            const dec = escapeHtml(i.decision);
            const sev = escapeHtml(i.severity_level);
            return `
                <tr>
                    <td style="font-family:var(--font-mono); font-size:12px">
                        <a href="inspection-result.html?id=${i.id}" style="color:var(--cyan); text-decoration:none; font-weight:700">
                            #${i.id} · ${escapeHtml(i.inspection_uuid.substring(0, 8))}...
                        </a>
                    </td>
                    <td style="font-size:13px; color:var(--text-muted)">${new Date(i.created_at).toLocaleString()}</td>
                    <td><span class="badge badge-${dec}">${dec}</span></td>
                    <td><span class="badge badge-${sev}">${sev} (${i.severity_score})</span></td>
                    <td><strong>${i.defect_count}</strong></td>
                    <td>${(i.highest_confidence * 100).toFixed(1)}%</td>
                    <td>${Math.round(i.processing_time_ms)} ms</td>
                    <td style="display:flex; gap:6px">
                        <button class="btn btn-secondary btn-sm" onclick="location.href='inspection-result.html?id=${i.id}'">Inspect</button>
                        <button class="btn btn-cyan btn-sm" onclick="window.open('${API}/api/reports/${i.id}', '_blank')">PDF</button>
                    </td>
                </tr>
            `;
        }).join("");

        const total = data.total || inspections.length;
        document.getElementById("paginationInfo").textContent = `Page ${page} · Showing ${inspections.length} of ${total} total records`;
        document.getElementById("btnPrev").disabled = page <= 1;
        document.getElementById("btnNext").disabled = (page * 15) >= total;
    } catch (e) {
        console.error("History fetch error:", e);
    }
}

function changePage(delta) {
    if (currentPage + delta >= 1) {
        fetchHistoryData(currentPage + delta);
    }
}

loadHistoryPage();
