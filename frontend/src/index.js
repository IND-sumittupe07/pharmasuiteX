@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =====================================================
   CSS VARIABLES
===================================================== */
:root {
  --bg1: #f8fafc;
  --bg2: #ffffff;
  --bg3: #f1f5f9;
  --bg4: #e2e8f0;
  --txt1: #1e293b;
  --txt2: #475569;
  --txt3: #64748b;
  --txt4: #94a3b8;
  --border: #e2e8f0;
  --border2: #f1f5f9;
  --primary: #2563eb;
  --primary2: #1d4ed8;
  --input-bg: #ffffff;
  --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  --shadow2: 0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06);
  --btn2-bg: #f1f5f9;
  --btn2-txt: #475569;
  --nav-hover: rgba(59,130,246,0.08);
  --table-head: #f8fafc;
  --table-hover: #f8faff;
  --scrollbar: #cbd5e1;
  --tag-bg: #f1f5f9;
}

[data-theme="dark"] {
  --bg1: #0f172a;
  --bg2: #1e293b;
  --bg3: #283548;
  --bg4: #334155;
  --txt1: #f1f5f9;
  --txt2: #cbd5e1;
  --txt3: #94a3b8;
  --txt4: #64748b;
  --border: #334155;
  --border2: #2a3a4e;
  --primary: #3b82f6;
  --primary2: #2563eb;
  --input-bg: #162032;
  --shadow: 0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
  --shadow2: 0 2px 8px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4);
  --btn2-bg: #283548;
  --btn2-txt: #cbd5e1;
  --nav-hover: rgba(59,130,246,0.15);
  --table-head: #1a2740;
  --table-hover: #1e3050;
  --scrollbar: #334155;
  --tag-bg: #283548;
}

/* =====================================================
   NUCLEAR OVERRIDE — Forces EVERY element dark
===================================================== */

/* Body & Root */
[data-theme="dark"],
[data-theme="dark"] body {
  background: var(--bg1) !important;
  color: var(--txt1) !important;
}

/* ALL divs, sections, articles, headers, mains, asides, navs */
[data-theme="dark"] div,
[data-theme="dark"] section,
[data-theme="dark"] article,
[data-theme="dark"] main,
[data-theme="dark"] aside,
[data-theme="dark"] nav,
[data-theme="dark"] header,
[data-theme="dark"] footer {
  background-color: inherit;
  color: inherit;
}

/* ===== SIDEBAR ===== */
/* The sidebar container — usually the left panel */
[data-theme="dark"] div[style*="width:240"],
[data-theme="dark"] div[style*="width: 240"],
[data-theme="dark"] div[style*="width:220"],
[data-theme="dark"] div[style*="width: 220"],
[data-theme="dark"] div[style*="width:200"],
[data-theme="dark"] div[style*="width: 200"] {
  background: var(--bg2) !important;
  border-color: var(--border) !important;
}

/* ===== MAIN CONTENT AREA ===== */
[data-theme="dark"] div[style*="flex:1"],
[data-theme="dark"] div[style*="flex: 1"],
[data-theme="dark"] div[style*="minHeight"],
[data-theme="dark"] div[style*="min-height"] {
  background: var(--bg1) !important;
}

/* ===== ALL WHITE BACKGROUNDS ===== */
[data-theme="dark"] *[style*="background: white"],
[data-theme="dark"] *[style*="background:white"],
[data-theme="dark"] *[style*="background: #ffffff"],
[data-theme="dark"] *[style*="background: #fff"],
[data-theme="dark"] *[style*="background:#ffffff"],
[data-theme="dark"] *[style*="background:#fff"],
[data-theme="dark"] *[style*="backgroundColor: white"],
[data-theme="dark"] *[style*="backgroundColor: #ffffff"],
[data-theme="dark"] *[style*="backgroundColor: #fff"] {
  background: var(--bg2) !important;
}

/* ===== f8fafc backgrounds ===== */
[data-theme="dark"] *[style*="background: #f8fafc"],
[data-theme="dark"] *[style*="background:#f8fafc"],
[data-theme="dark"] *[style*="backgroundColor: #f8fafc"] {
  background: var(--bg1) !important;
}

/* ===== f1f5f9 backgrounds ===== */
[data-theme="dark"] *[style*="background: #f1f5f9"],
[data-theme="dark"] *[style*="background:#f1f5f9"],
[data-theme="dark"] *[style*="backgroundColor: #f1f5f9"] {
  background: var(--bg3) !important;
}

/* ===== e2e8f0 backgrounds ===== */
[data-theme="dark"] *[style*="background: #e2e8f0"],
[data-theme="dark"] *[style*="background:#e2e8f0"] {
  background: var(--bg4) !important;
}

/* ===== ALL DARK TEXT ===== */
[data-theme="dark"] *[style*="color: #1e293b"],
[data-theme="dark"] *[style*="color:#1e293b"] {
  color: var(--txt1) !important;
}

[data-theme="dark"] *[style*="color: #475569"],
[data-theme="dark"] *[style*="color:#475569"] {
  color: var(--txt2) !important;
}

[data-theme="dark"] *[style*="color: #64748b"],
[data-theme="dark"] *[style*="color:#64748b"] {
  color: var(--txt3) !important;
}

[data-theme="dark"] *[style*="color: #94a3b8"],
[data-theme="dark"] *[style*="color:#94a3b8"] {
  color: var(--txt4) !important;
}

/* ===== ALL BORDER COLORS ===== */
[data-theme="dark"] *[style*="border: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="border:1px solid #e2e8f0"],
[data-theme="dark"] *[style*="borderBottom: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="borderTop: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="borderLeft: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="borderRight: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="border-bottom: 1px solid #e2e8f0"],
[data-theme="dark"] *[style*="border-top: 1px solid #e2e8f0"] {
  border-color: var(--border) !important;
}

[data-theme="dark"] *[style*="border: 1px solid #f1f5f9"],
[data-theme="dark"] *[style*="border-top: 1px solid #f1f5f9"],
[data-theme="dark"] *[style*="borderTop: 1px solid #f1f5f9"] {
  border-color: var(--border2) !important;
}

/* ===== INPUTS ===== */
[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
  background: var(--input-bg) !important;
  color: var(--txt1) !important;
  border-color: var(--border) !important;
}

[data-theme="dark"] input::placeholder,
[data-theme="dark"] textarea::placeholder {
  color: var(--txt4) !important;
}

[data-theme="dark"] select option {
  background: var(--bg2);
  color: var(--txt1);
}

[data-theme="dark"] input:-webkit-autofill,
[data-theme="dark"] input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px #162032 inset !important;
  -webkit-text-fill-color: #f1f5f9 !important;
}

/* ===== TABLES ===== */
[data-theme="dark"] table { background: var(--bg2) !important; }
[data-theme="dark"] thead,
[data-theme="dark"] th { background: var(--table-head) !important; color: var(--txt4) !important; }
[data-theme="dark"] td { background: var(--bg2) !important; color: var(--txt2) !important; border-color: var(--border2) !important; }
[data-theme="dark"] tr:hover td { background: var(--table-hover) !important; }
[data-theme="dark"] *[style*="background: #f8faff"],
[data-theme="dark"] *[style*="background:#f8faff"] { background: var(--table-hover) !important; }

/* ===== CARDS ===== */
[data-theme="dark"] .card {
  background: var(--bg2) !important;
  border-color: var(--border) !important;
  box-shadow: var(--shadow) !important;
  color: var(--txt1) !important;
}

/* ===== ALERTS ===== */
[data-theme="dark"] *[style*="background: #fef2f2"] { background: rgba(239,68,68,0.15) !important; }
[data-theme="dark"] *[style*="background: #f0fdf4"] { background: rgba(34,197,94,0.1) !important; }
[data-theme="dark"] *[style*="background: #eff6ff"] { background: rgba(59,130,246,0.1) !important; }
[data-theme="dark"] *[style*="background: #fef3c7"] { background: rgba(251,191,36,0.1) !important; }
[data-theme="dark"] *[style*="background: #f0f9ff"] { background: rgba(14,165,233,0.1) !important; }

/* ===== BUTTONS ===== */
[data-theme="dark"] .btn-secondary,
[data-theme="dark"] *[style*="background: #f1f5f9"][role="button"] {
  background: var(--btn2-bg) !important;
  color: var(--btn2-txt) !important;
}

/* ===== GRADIENT SECTIONS (keep as-is, they look good in dark) ===== */
[data-theme="dark"] *[style*="background: linear-gradient(135deg, #1e293b"],
[data-theme="dark"] *[style*="background: linear-gradient(135deg,#1e293b"] {
  /* keep the dark gradient */
}

/* ===== h1, h2, h3, p, labels, spans with dark text ===== */
[data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3,
[data-theme="dark"] h4, [data-theme="dark"] h5, [data-theme="dark"] h6 {
  color: var(--txt1) !important;
}

[data-theme="dark"] p { color: var(--txt2) !important; }
[data-theme="dark"] label { color: var(--txt3) !important; }
[data-theme="dark"] small { color: var(--txt4) !important; }
[data-theme="dark"] span { color: inherit; }

/* =====================================================
   BASE STYLES (SAME AS BEFORE)
===================================================== */

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Outfit', sans-serif; background: var(--bg1); color: var(--txt1); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg3); }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 2px; }

.loader-screen { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 18px; font-weight: 600; color: var(--primary); background: var(--bg1); }

.card { background: var(--bg2); border-radius: 16px; box-shadow: var(--shadow); border: 1px solid var(--border); color: var(--txt1); }
.card:hover { box-shadow: var(--shadow2); }

.btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary2)); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px; font-family: inherit; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-secondary { background: var(--btn2-bg); color: var(--btn2-txt); border: 1px solid var(--border); border-radius: 10px; padding: 10px 20px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-size: 14px; font-family: inherit; }
.btn-secondary:hover { background: var(--bg4); }

.input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; color: var(--txt1); background: var(--input-bg); font-family: inherit; outline: none; transition: border-color 0.2s; }
.input::placeholder { color: var(--txt4); }
.input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.pulse-dot { animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

.nav-item { transition: all 0.2s; color: var(--txt3); }
.nav-item:hover { background: var(--nav-hover); color: var(--primary); }
.nav-item.active { background: linear-gradient(135deg, var(--primary), var(--primary2)); color: white; box-shadow: 0 4px 12px rgba(37,99,235,0.35); }

.tag { border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; display: inline-block; background: var(--tag-bg); color: var(--txt2); }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 12px 20px; font-size: 11px; font-weight: 700; color: var(--txt4); text-align: left; text-transform: uppercase; letter-spacing: 0.05em; background: var(--table-head); }
.data-table td { padding: 14px 20px; border-top: 1px solid var(--border2); color: var(--txt2); }
.data-table tr:hover td { background: var(--table-hover); }

.progress-bar { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--primary), var(--primary2)); transition: width 0.8s ease; }

.ring { border-radius: 50%; display: flex; align-items: center; justify-content: center; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; }

.bar { border-radius: 4px 4px 0 0; transition: height 0.6s ease; }

/* Dark mode toggle button */
.dark-toggle {
  position: fixed; bottom: 20px; right: 20px; z-index: 9999;
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary2));
  color: white; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; box-shadow: 0 4px 16px rgba(37,99,235,0.4);
  transition: transform 0.2s ease;
}
.dark-toggle:hover { transform: scale(1.1); }
.dark-toggle:active { transform: scale(0.95); }

/* Smooth transitions */
*, *::before, *::after {
  transition: background-color 0.25s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Accessibility */
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
::selection { background: var(--primary); color: white; }

@media (max-width: 640px) {
  .card { padding: 16px !important; }
  .btn-primary, .btn-secondary { padding: 12px 16px !important; }
  .input { font-size: 16px !important; }
  .data-table { display: block; overflow-x: auto; }
  .dark-toggle { width: 44px; height: 44px; font-size: 18px; bottom: 16px; right: 16px; }
}
