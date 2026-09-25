requireAuth();

async function loadQualityReportsPage() {
    shell(
        "Quality Reports Repository",
        "Exportable PDF quality compliance reports, human review logs, and product defect certificates",
        `
        <div class="card" style="margin-bottom:28px">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px">
                <div>
                    <h3 style="font-size:18px; font-weight:700; color:var(--text-primary)">Automated Report Generation</h3>
                    <p style="color:var(--text-secondary); font-size:13px; margin-top:2px">ReportLab PDF engine compiles inspection metrics, defect coordinates, severity scoring, and QA recommendations</p>
                </div>
                <button class="btn btn-cyan" onclick="location.href='inspection.html'">+ Run New Inspection</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">Generated Inspection Reports</div>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Report Ref / UUID</th>
                            <th>Date Generated</th>
                            <th>Quality Decision</th>
                            <th>Severity Score</th>
                            <th>Defect Count</th>
                            <th>PDF Document</th>
                        </tr>
                    </thead>
                    <tbody id="reportsTbody">
                        <tr><td colspan="6" style="text-align:center">Loading PDF reports repository...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        `
    );

    await fetchReportsRepository();
}

async function fetchReportsRepository() {
    try {
        const data = await api("/api/inspection-history?limit=50");
        const tbody = document.getElementById("reportsTbody");
        const inspections = data.inspections || [];

        if (!inspections.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No inspection reports found in database repository.</td></tr>`;
            return;
        }

        tbody.innerHTML = inspections.map(i => {
            const dec = escapeHtml(i.decision);
            const sev = escapeHtml(i.severity_level);
            return `
                <tr>
                    <td style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-primary)">
                        inspection-${i.inspection_uuid.substring(0, 8)}.pdf
                    </td>
                    <td style="font-size:13px; color:var(--text-muted)">${new Date(i.created_at).toLocaleString()}</td>
                    <td><span class="badge badge-${dec}">${dec}</span></td>
                    <td><span class="badge badge-${sev}">${sev} (${i.severity_score})</span></td>
                    <td>${i.defect_count} defect(s)</td>
                    <td>
                        <button class="btn btn-cyan btn-sm" onclick="window.open('${API}/api/reports/${i.id}', '_blank')">
                            📄 Download PDF Report
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Reports load error:", e);
    }
}

loadQualityReportsPage();
