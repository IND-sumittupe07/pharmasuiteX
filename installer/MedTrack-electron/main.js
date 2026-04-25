const { app, BrowserWindow, shell, Tray, Menu, dialog, nativeImage } = require("electron");
const path = require("path");
const { spawn, execSync } = require("child_process");
const http = require("http");
const fs = require("fs");

let mainWindow;
let splashWindow;
let tray;
let backendProcess;

const isDev = !app.isPackaged;
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

// ── Paths ──────────────────────────────────────────────────────────────────────
const BACKEND_PATH = isDev
  ? path.join(__dirname, "../backend")
  : path.join(process.resourcesPath, "backend");

const FRONTEND_PATH = isDev
  ? `http://localhost:${FRONTEND_PORT}`
  : `http://localhost:${FRONTEND_PORT}`;

// ── Splash Screen ──────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480, height: 300,
    frame: false, alwaysOnTop: true, resizable: false, center: true,
    transparent: true,
    webPreferences: { nodeIntegration: false }
  });

  splashWindow.loadURL(`data:text/html,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: linear-gradient(135deg, #1e293b, #1d4ed8);
          border-radius: 20px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100vh; font-family: 'Segoe UI', sans-serif; color: white;
          overflow: hidden;
        }
        .logo { font-size: 64px; margin-bottom: 16px; }
        .title { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
        .sub { font-size: 14px; color: #93c5fd; margin-bottom: 32px; }
        .bar-wrap { width: 280px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden; }
        .bar { height: 100%; width: 0%; background: linear-gradient(90deg, #34d399, #60a5fa); border-radius: 2px; animation: load 3s ease forwards; }
        @keyframes load { 0%{width:0%} 30%{width:40%} 60%{width:70%} 90%{width:90%} 100%{width:100%} }
        .status { margin-top: 12px; font-size: 12px; color: #93c5fd; }
        .version { position: absolute; bottom: 16px; font-size: 11px; color: rgba(255,255,255,0.4); }
      </style>
    </head>
    <body>
      <div class="logo">💊</div>
      <div class="title">MedTrack</div>
      <div class="sub">Pharmacy Management Suite</div>
      <div class="bar-wrap"><div class="bar"></div></div>
      <div class="status" id="status">Starting services...</div>
      <div class="version">v1.0.0</div>
      <script>
        const msgs = ["Starting services...", "Connecting to database...", "Loading pharmacy data...", "Almost ready..."];
        let i = 0;
        setInterval(() => { if(i < msgs.length) document.getElementById("status").textContent = msgs[i++]; }, 800);
      </script>
    </body>
    </html>
  `);
}

// ── Start Backend ──────────────────────────────────────────────────────────────
function startBackend() {
  const envPath = path.join(BACKEND_PATH, ".env");
  if (!fs.existsSync(envPath)) {
    dialog.showErrorBox("Configuration Missing",
      `Cannot find .env file at:\n${envPath}\n\nPlease reinstall MedTrack.`);
    app.quit();
    return;
  }

  backendProcess = spawn("node", ["src/server.js"], {
    cwd: BACKEND_PATH,
    env: { ...process.env, NODE_ENV: "production" },
    shell: process.platform === "win32",
  });

  backendProcess.stdout?.on("data", d => console.log("[API]", d.toString().trim()));
  backendProcess.stderr?.on("data", d => console.error("[API Error]", d.toString().trim()));
  backendProcess.on("close", code => {
    if (code !== 0 && code !== null) {
      console.error("Backend crashed with code:", code);
    }
  });
}

// ── Wait for API ready ─────────────────────────────────────────────────────────
function waitForBackend(maxRetries = 40) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(`http://localhost:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on("error", retry);
    };
    const retry = () => {
      if (++retries >= maxRetries) reject(new Error("Backend timeout"));
      else setTimeout(check, 500);
    };
    setTimeout(check, 500);
  });
}

// ── Main Window ────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 768,
    minWidth: 1024, minHeight: 640,
    title: "MedTrack — Pharmacy Suite",
    icon: path.join(__dirname, "icon.ico"),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Custom menu bar
  const menu = Menu.buildFromTemplate([
    {
      label: "MedTrack",
      submenu: [
        { label: "About MedTrack", click: () => showAbout() },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload", label: "Reload" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Full Screen" },
        { role: "zoomin" }, { role: "zoomout" }, { role: "resetzoom" }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: "Documentation", click: () => shell.openExternal("https://medtrack.in/docs") },
        { label: "Support", click: () => shell.openExternal("mailto:support@medtrack.in") },
        { type: "separator" },
        { label: "Check for Updates", click: () => checkForUpdates() },
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(FRONTEND_PATH);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    if (process.platform !== "darwin") return;
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── System Tray ────────────────────────────────────────────────────────────────
function createTray() {
  try {
    const iconPath = path.join(__dirname, "icon.ico");
    tray = new Tray(iconPath);
    const menu = Menu.buildFromTemplate([
      { label: "💊 MedTrack", enabled: false },
      { type: "separator" },
      { label: "Open MedTrack", click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createMainWindow(); } },
      { label: "Dashboard", click: () => { mainWindow?.loadURL(`${FRONTEND_PATH}/`); mainWindow?.show(); } },
      { label: "Customers", click: () => { mainWindow?.loadURL(`${FRONTEND_PATH}/customers`); mainWindow?.show(); } },
      { label: "Reminders", click: () => { mainWindow?.loadURL(`${FRONTEND_PATH}/reminders`); mainWindow?.show(); } },
      { type: "separator" },
      { label: "Quit MedTrack", click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.setToolTip("MedTrack — Pharmacy Suite");
    tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) {
    console.log("Tray setup failed:", e.message);
  }
}

// ── About Dialog ───────────────────────────────────────────────────────────────
function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "About MedTrack",
    icon: path.join(__dirname, "icon.ico"),
    message: "MedTrack Pharmacy Suite",
    detail: `Version: 1.0.0\n\nPharmacy Management Software for Indian Medical Stores.\n\nManage customers, medicines, reminders, and campaigns.\n\n© 2026 MedTrack Technologies`,
    buttons: ["OK"],
  });
}

// ── Update Check ───────────────────────────────────────────────────────────────
function checkForUpdates() {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Check for Updates",
    message: "You are on the latest version",
    detail: "MedTrack v1.0.0 is up to date.",
    buttons: ["OK"],
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  startBackend();
  createTray();

  try {
    await waitForBackend();
    createMainWindow();
  } catch (err) {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    const choice = dialog.showMessageBoxSync({
      type: "error",
      title: "MedTrack — Startup Error",
      message: "Could not connect to the pharmacy database.",
      detail: "Please make sure PostgreSQL is running and your database settings are correct.\n\nCheck: C:\\Program Files\\MedTrack\\backend\\.env",
      buttons: ["Retry", "Open Settings", "Quit"],
    });
    if (choice === 0) app.relaunch();
    else if (choice === 1) shell.openPath(path.join(BACKEND_PATH, ".env"));
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep running in system tray
    if (!app.isQuitting) return;
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (backendProcess) {
    try { backendProcess.kill("SIGTERM"); } catch (e) {}
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
