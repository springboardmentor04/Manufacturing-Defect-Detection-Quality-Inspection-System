# VisionInspect AI — Frontend (React + Vite)

This is your original `frontend` (plain HTML/CSS/JS) rebuilt in **React**,
using **Vite** as the build tool. The UI, styling, pages, and behavior are
identical to the original — only the underlying technology changed.

## What changed

| Original | React version |
|---|---|
| `login.html`, `register.html`, `app.html` (3 static pages) | `src/pages/Login.jsx`, `Register.jsx`, plus a component tree under `/app` |
| Hand-written DOM manipulation in `js/app.js` (921 lines, one big file) | Split into one component per page under `src/pages/`, each rendering the same markup |
| `#/dashboard`, `#/upload`, etc. hash routes handled by a manual `router()` function | Same hash-style URLs (`#/app/dashboard`, `#/app/upload`, ...), now handled by `react-router-dom`'s `HashRouter` |
| `localStorage` read directly everywhere via the `Auth` object | Same `Auth` object (`src/api.js`), now wrapped in a React `AuthContext` so components re-render on login/logout |
| Chart.js charts built imperatively (`makeChart()` + manual `canvas` lookup) | Same Chart.js configs, now created/destroyed through a `useChart` hook tied to component lifecycle |
| PDF report generation (`downloadInspectionReport`) | Same jsPDF code, moved to `src/utils/pdfReport.js`, called from a button's `onClick` |
| `css/style.css` | Copied over **unchanged** — same file, same class names, same look |
| Chart.js / jsPDF loaded via `<script>` CDN tags | Same CDN tags, now in `index.html` (Vite's entry point) as global `Chart` / `window.jspdf` |

Nothing about the visual design, colors, layout, or functionality was
changed — every page, button, form field, chart, and PDF export works the
same way it did before.

## Project structure

```
src/
  api.js                  — same Auth + Api client as before, now an ES module
  App.jsx                 — all routes (HashRouter)
  main.jsx                — React entry point
  styles.css              — unchanged CSS
  context/
    AuthContext.jsx        — wraps Auth (login/logout/session) for React
    PageHeaderContext.jsx  — lets each page set the topbar title/subtitle/actions
  components/
    Sidebar.jsx             — role-based nav (Quality Engineer vs Supervisor)
    Shared.jsx              — pills, KPI cards, tables, empty states, skeletons
    InspectionResult.jsx    — AI pipeline output panel + PDF download button
    RoleRoute.jsx            — redirects to dashboard if role doesn't match a route
  pages/
    Login.jsx, Register.jsx
    AppShell.jsx             — sidebar + topbar layout wrapper
    Dashboard.jsx            — picks QE or Supervisor dashboard by role
    QEDashboard.jsx, Upload.jsx, Results.jsx, Analytics.jsx, History.jsx, Reports.jsx
    SupDashboard.jsx, Overview.jsx, Monitoring.jsx, Trends.jsx
  utils/
    format.js                — fmtDateTime, severityColor, chart color defaults
    useChart.js               — Chart.js lifecycle hook
    pdfReport.js               — jsPDF report generator
```

## Setup

```powershell
cd frontend-react
npm install
npm run dev
```

This starts a dev server (Vite) at **http://localhost:3000** by default.

## Connecting to your backend

Same as before — `src/api.js` reads `window.VISIONINSPECT_API_BASE`, falling
back to `http://localhost:8000` (your FastAPI + PostgreSQL backend). No
change needed if your backend is already running on port 8000.

## Building for production

```powershell
npm run build
```

Outputs static files to `dist/` — you can serve that folder with any static
file server (or point FastAPI's `StaticFiles` at it, same idea as before).

## Note on this sandbox

This code was written and reviewed for correctness (structure, imports,
JSX syntax) but `npm install` / `npm run build` could not be executed in
the environment that generated it (no network access). Run `npm install`
locally as the first step — if anything doesn't compile, send me the exact
error and I'll fix it immediately.
