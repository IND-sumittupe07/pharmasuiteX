const { app, BrowserWindow, shell, Tray, Menu, dialog, autoUpdater } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow;
let tray;
let backendProcess;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

// ── Start Backend Server ───────────────────────────────────────────────────────
function startBackend() {
  const backendPath = isDev
    ? path.join(__dirname, "../../backend")
    : path.join(process.resourcesPath, "backend");

  console.log("Starting backend at:", backendPath);

  backendProcess = spawn("node", ["src/server.js"], {
    cwd: backendPath,
    env: { ...process.env, NODE_ENV: "production" },
    shell: true,
  });

  backendProcess.stdout.on("data", d => console.log("[Backend]", d.toString()));
  backendProcess.stderr.on("data", d => console.error("[Backend Error]", d.toString()));
  backendProcess.on("close", code => console.log("Backend exited:", code));
}

// ── Wait for backend to be ready ──────────────────────────────────────────────
function waitForBackend(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`http://localhost:${BACKEND_PORT}/api/health`, res => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on("error", retry);
    };
    const retry = () => {
      if (retries-- <= 0) reject(new Error("Backend failed to start"));
      else setTimeout(check, 1000);
    };
    check();
  });
}

// ── Create Main Window ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, "icon.png"),
    title: "MedTrack — Pharmacy Suite",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  const url = isDev
    ? `http://localhost:${FRONTEND_PORT}`
    : `http://localhost:${FRONTEND_PORT}`;

  mainWindow.loadURL(url);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, "icon.png"));
    const menu = Menu.buildFromTemplate([
      { label: "Open MedTrack", click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setToolTip("MedTrack — Pharmacy Suite");
    tray.setContextMenu(menu);
    tray.on("double-click", () => { if (mainWindow) mainWindow.show(); });
  } catch (e) {
    console.log("Tray not available:", e.message);
  }
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend();
  createTray();

  // Show loading dialog while backend starts
  const loadingWin = new BrowserWindow({
    width: 360, height: 200, frame: false, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: false }
  });
  loadingWin.loadURL(`data:text/html,
    <html><body style="background:#1e293b;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:white;margin:0">
      <div style="font-size:40px;margin-bottom:12px">💊</div>
      <div style="font-size:20px;font-weight:700">MedTrack</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:8px">Starting pharmacy server...</div>
    </body></html>`);

  try {
    await waitForBackend();
    loadingWin.close();
    createWindow();
  } catch (err) {
    loadingWin.close();
    dialog.showErrorBox("Startup Error", "Could not start the backend server. Please check your database connection in backend/.env");
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
