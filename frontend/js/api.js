const API = localStorage.getItem("vi_api") || "http://127.0.0.1:8000";

function token() {
    return localStorage.getItem("vi_token");
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("vi_user") || "null");
    } catch {
        return null;
    }
}

function setSession(data) {
    localStorage.setItem("vi_token", data.access_token);
    localStorage.setItem("vi_user", JSON.stringify(data.user));
}

function logout() {
    localStorage.removeItem("vi_token");
    localStorage.removeItem("vi_user");
    window.location.href = "login.html";
}

function requireAuth() {
    if (!token() || !getUser()) {
        window.location.href = "login.html";
    }
}

function requireRole(requiredRole) {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    if (requiredRole && user.role !== requiredRole) {
        if (user.role === "QUALITY_ENGINEER") {
            window.location.href = "qe-dashboard.html";
        } else if (user.role === "PRODUCT_MANAGER") {
            window.location.href = "pm-dashboard.html";
        }
    }
}

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token()) {
        headers.set("Authorization", "Bearer " + token());
    }
    const r = await fetch(API + path, { ...options, headers });
    let d = null;
    try {
        d = await r.json();
    } catch {}
    if (!r.ok) {
        throw new Error(d?.detail || "Request failed");
    }
    return d;
}

function shell(title, subtitle, body) {
    const u = getUser();
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    
    const isQE = u?.role === "QUALITY_ENGINEER";
    const dashboardHref = isQE ? "qe-dashboard.html" : "pm-dashboard.html";
    const roleBadge = isQE ? '<span class="role-badge role-qe">QUALITY ENGINEER</span>' : '<span class="role-badge role-pm">PRODUCT MANAGER</span>';
    
    const initials = (u?.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase();

    const html = `
    <div class="layout">
        <aside class="sidebar">
            <div class="logo">
                <div class="logo-icon">◈</div>
                <div>VisionInspect <span>AI</span></div>
            </div>
            
            <nav class="nav">
                <div class="nav-category">Main Workspace</div>
                <a href="${dashboardHref}" class="${(currentPath === 'qe-dashboard.html' || currentPath === 'pm-dashboard.html' || currentPath === 'dashboard.html') ? 'active' : ''}">
                    <span class="nav-icon">📊</span> ${isQE ? 'Quality Control Center' : 'Executive Dashboard'}
                </a>
                
                ${isQE ? `
                <a href="inspection.html" class="${currentPath === 'inspection.html' ? 'active' : ''}">
                    <span class="nav-icon">🔍</span> Inspect Product
                </a>
                ` : ''}

                <a href="history.html" class="${(currentPath === 'history.html' || currentPath === 'inspection-result.html' || currentPath === 'inspection-details.html') ? 'active' : ''}">
                    <span class="nav-icon">📋</span> Inspection Records
                </a>

                <div class="nav-category">Analytics & Insights</div>
                <a href="analytics.html" class="${currentPath === 'analytics.html' ? 'active' : ''}">
                    <span class="nav-icon">📈</span> Defect Intelligence
                </a>
                <a href="quality-reports.html" class="${currentPath === 'quality-reports.html' ? 'active' : ''}">
                    <span class="nav-icon">📁</span> Quality Reports
                </a>

                <div class="nav-category" style="margin-top:auto">System & Account</div>
                <a href="profile.html" class="${currentPath === 'profile.html' ? 'active' : ''}">
                    <span class="nav-icon">👤</span> Profile & Settings
                </a>
                <a href="#" onclick="logout(); return false;">
                    <span class="nav-icon">🚪</span> Sign Out
                </a>
            </nav>
        </aside>

        <main class="content">
            <header class="topbar">
                <div class="topbar-title">
                    <h1>${escapeHtml(title)}</h1>
                    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
                </div>
                
                <div style="display:flex; align-items:center; gap:16px">
                    <div class="user-chip">
                        <div class="user-avatar">${escapeHtml(initials)}</div>
                        <div style="line-height:1.2">
                            <div style="font-weight:700; color:var(--text-primary)">${escapeHtml(u?.full_name || "")}</div>
                            <div style="font-size:11px">${escapeHtml(u?.email || "")}</div>
                        </div>
                        ${roleBadge}
                    </div>
                </div>
            </header>

            ${body}
        </main>
    </div>
    <div id="modalContainer"></div>
    `;

    document.getElementById("app").innerHTML = html;
}

function showModal(title, bodyHtml, footerButtonsHtml = "") {
    const modalHtml = `
    <div class="modal-overlay active" id="modalOverlay">
        <div class="modal-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                <h3 style="font-size:20px; font-weight:700; color:var(--text-primary)">${escapeHtml(title)}</h3>
                <button class="btn btn-secondary btn-sm" onclick="hideModal()">✕</button>
            </div>
            <div>${bodyHtml}</div>
            ${footerButtonsHtml ? `<div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">${footerButtonsHtml}</div>` : ''}
        </div>
    </div>
    `;
    document.getElementById("modalContainer").innerHTML = modalHtml;
}

function hideModal() {
    const el = document.getElementById("modalOverlay");
    if (el) el.remove();
}