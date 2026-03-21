const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, globalShortcut, shell, screen, dialog } = electron;
const { autoUpdater } = require('electron-updater');
const ipcMain = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');

const DEFAULT_SETTINGS = {
  enabled: true,
  fullRowMode: false,
  highlightMode: false,
  linkSize: true,
  autoHide: true,
  targetProcesses: [],
  keyboardControl: false,
  height: 79,
  width: 79,
  borderRadius: 150,
  opacity: 10,
  color: '#000000',
  userLang: null,
  nightMode: false
};

let configPath;

function loadSettings() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsToFile(settings) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

let mainWindow;
let settingsWindow;
let tray;
let isLayerVisible = true;

let currentSettings = { ...DEFAULT_SETTINGS };
let pendingUpdateInfo = null;

// ── Auto-hide: two-tier polling ──────────────────────────────────────────────
let cachedWindowRects = [];   // [{x, y, w, h}]
let lastAutoHideState = null; // null = never sent yet
let slowTimer = null;
let fastTimer = null;

let psQueryProcess = null;
let psQueryCallback = null;
let psProcessesCallback = null;

function ensurePsChild() {
  if (psQueryProcess) return;
  fs.appendFileSync("debug.txt", "Spawning powershell\\n");
  psQueryProcess = spawn('powershell', ['-NoProfile', '-NonInteractive']);
  
  // Initialize the C# helper once
  psQueryProcess.stdin.write(`
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class WinHelper {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public struct RECT { public int L, T, R, B; }

  public static string GetWindows(int[] pids) {
    IntPtr fg = GetForegroundWindow();
    List<int> pidList = new List<int>(pids);
    List<string> results = new List<string>();
    EnumWindows((hWnd, lParam) => {
      if (IsWindowVisible(hWnd)) {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pidList.Contains((int)pid)) {
          RECT r;
          if (GetWindowRect(hWnd, out r)) {
            int isFg = (hWnd == fg) ? 1 : 0;
            results.Add(r.L + "," + r.T + "," + (r.R - r.L) + "," + (r.B - r.T) + "," + isFg);
          }
        }
      }
      return true;
    }, IntPtr.Zero);
    return string.Join("|", results.ToArray());
  }

  public static int[] GetVisibleProcessIds() {
    List<int> pids = new List<int>();
    EnumWindows((hWnd, lParam) => {
      if (IsWindowVisible(hWnd)) {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (!pids.Contains((int)pid)) {
          pids.Add((int)pid);
        }
      }
      return true;
    }, IntPtr.Zero);
    return pids.ToArray();
  }
}
'@
\r\n`);

  let buffer = '';
  psQueryProcess.stdout.on('data', (data) => {
    fs.appendFileSync("debug.txt", "STDOUT: " + data.toString() + "\\n");
    buffer += data.toString();
    const lines = buffer.split('\n');
    while (lines.length > 1) {
      const line = lines.shift().trim();
      if (line.startsWith('RESULT:')) {
        fs.appendFileSync("debug.txt", "PARSED RESULT\\n");
        const payload = line.substring(7);
        if (psQueryCallback) {
          const rects = payload.split('|').filter(Boolean).map(s => {
            const parts = s.split(',');
            const x = parseInt(parts[0], 10);
            const y = parseInt(parts[1], 10);
            const w = parseInt(parts[2], 10);
            const h = parseInt(parts[3], 10);
            const isForeground = parts[4] === '1';
            return { x, y, w, h, isForeground };
          }).filter(r => r.w > 0 && r.h > 0);
          psQueryCallback(rects);
          psQueryCallback = null;
        }
      } else if (line.startsWith('PROCESSES_RESULT:')) {
        fs.appendFileSync("debug.txt", "PARSED PROCESSES_RESULT\\n");
        const payload = line.substring(17);
        if (psProcessesCallback) {
          const names = payload.split('|').filter(Boolean);
          psProcessesCallback(names);
          psProcessesCallback = null;
        }
      }
    }
    buffer = lines[0];
  });
  
  psQueryProcess.stderr.on('data', (data) => {
    fs.appendFileSync("debug.txt", "STDERR: " + data.toString() + "\\n");
  });

  psQueryProcess.on('exit', (code) => {
    fs.appendFileSync("debug.txt", "EXIT: " + code + "\\n");
    psQueryProcess = null;
  });
}

function queryWindowRects(processNames, callback) {
  ensurePsChild();
  if (psQueryCallback) {
    // Drop previous if still pending
    psQueryCallback([]);
  }
  psQueryCallback = callback;

  let names = processNames.map(n => n.replace(/'/g, '').replace(/\\.exe$/i, ''));
  const namesStr = names.map(n => `'${n}'`).join(',');

  const psCmd = `
$names = @(${namesStr})
$pids = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $names -contains $_.ProcessName } | Select-Object -ExpandProperty Id)
$res = ""
if ($pids.Count -gt 0) {
  $res = [WinHelper]::GetWindows([int[]]$pids)
}
Write-Output "RESULT:$res"
`;
  psQueryProcess.stdin.write(psCmd + "\r\n");
}

function pointInRect(px, py, { x, y, w, h }) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function stopAutoHideTimers() {
  if (slowTimer) { clearInterval(slowTimer); slowTimer = null; }
  if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
  cachedWindowRects = [];
  lastAutoHideState = null;
}

function startAutoHideTimers() {
  stopAutoHideTimers();

  const names = currentSettings.targetProcesses;
  if (!names || names.length === 0) {
    // Global mode: always show the overlay (nothing to do)
    if (mainWindow && !mainWindow.isDestroyed() && currentSettings.enabled) {
      mainWindow.webContents.send('auto-hide-state', true);
    }
    return;
  }

  // Slow timer: refresh window rects every 2 s
  function refreshRects() {
    queryWindowRects(names, (rects) => {
      cachedWindowRects = rects;
    });
  }
  refreshRects(); // immediate first fetch
  slowTimer = setInterval(refreshRects, 2000);

  // Fast timer: check mouse position and foreground state every 100 ms
  fastTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const { x, y } = screen.getCursorScreenPoint();
    
    // Find the target window that is both in foreground AND contains the mouse
    const activeRect = cachedWindowRects.find(r => pointInRect(x, y, r) && r.isForeground);
    
    // state is either the rect object or false
    const state = activeRect || false;
    
    // We compare JSON string because objects are different instances
    const stateStr = JSON.stringify(state);
    if (stateStr !== lastAutoHideState) {
      lastAutoHideState = stateStr;
      mainWindow.webContents.send('auto-hide-state', state);
    }
  }, 100);
}

function refreshAutoHide() {
  if (currentSettings.autoHide && currentSettings.enabled) {
    startAutoHideTimers();
  } else {
    stopAutoHideTimers();
    // If auto-hide is off (or overlay disabled), ensure overlay knows to show
    if (mainWindow && !mainWindow.isDestroyed() && currentSettings.enabled) {
      mainWindow.webContents.send('auto-hide-state', true);
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  const topTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && isLayerVisible) {
      mainWindow.moveTop();
    }
  }, 500);

  mainWindow.on('closed', () => {
    clearInterval(topTimer);
    mainWindow = null;
  });

  mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    // Start auto-hide timers after renderer is ready
    refreshAutoHide();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  const appName = app.isPackaged ? 'Stay Focus' : 'Stay Focus (Dev)';
  const contextMenu = Menu.buildFromTemplate([
    { label: `Toggle ${appName}`, click: toggleLayer },
    { type: 'separator' },
    { label: 'Settings', click: openSettings },
    { label: 'Restart', click: () => { app.relaunch(); app.quit(); } },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setToolTip(appName);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    openSettings();
  });
}

function toggleLayer() {
  if (isLayerVisible) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
  isLayerVisible = !isLayerVisible;
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 350,
    height: 680,
    resizable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

  settingsWindow.webContents.on('did-finish-load', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      if (!app.isPackaged) {
        settingsWindow.webContents.executeJavaScript(`document.title = document.title + ' (Dev)';`);
        settingsWindow.webContents.insertCSS(`#pluginName::after { content: ' (Dev)'; }`);
      }
      if (pendingUpdateInfo) {
        settingsWindow.webContents.send('update-available', pendingUpdateInfo);
      }
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function registerKeyboardControl(enable) {
  const keys = ['Up', 'Down', 'Left', 'Right'];
  keys.forEach(key => {
    const combo = `Shift+Alt+${key}`;
    if (enable) {
      globalShortcut.register(combo, () => {
        if (!isLayerVisible) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('keyboard-move', key);
      });
    } else {
      globalShortcut.unregister(combo);
    }
  });
}

ipcMain.handle('get-settings', () => currentSettings);

ipcMain.on('save-settings', (event, newSettings) => {
  const oldKbCtrl = currentSettings.keyboardControl;
  const oldAutoHide = currentSettings.autoHide;
  const oldProcesses = JSON.stringify(currentSettings.targetProcesses);
  const oldEnabled = currentSettings.enabled;

  currentSettings = { ...currentSettings, ...newSettings };
  saveSettingsToFile(currentSettings);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-settings', currentSettings);
  }

  if (oldKbCtrl !== currentSettings.keyboardControl) {
    registerKeyboardControl(currentSettings.keyboardControl);
  }

  // Restart auto-hide timers if relevant settings changed
  if (
    oldAutoHide !== currentSettings.autoHide ||
    oldEnabled !== currentSettings.enabled ||
    oldProcesses !== JSON.stringify(currentSettings.targetProcesses)
  ) {
    refreshAutoHide();
  }
});

ipcMain.handle('get-locale', (e, lang) => {
  try {
    const file = path.join(__dirname, `../_locales/${lang}/messages.json`);
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
});

ipcMain.handle('get-system-locale', () => app.getLocale());

ipcMain.on('open-external', (e, url) => shell.openExternal(url));

ipcMain.handle('get-running-processes', async () => {
  return new Promise((resolve) => {
    ensurePsChild();
    if (psProcessesCallback) {
      psProcessesCallback([]);
    }
    psProcessesCallback = resolve;
    const psCmd = `
$pids = [WinHelper]::GetVisibleProcessIds()
$res = ""
if ($pids.Count -gt 0) {
  $names = Get-Process -Id $pids -ErrorAction SilentlyContinue | Select-Object -Property ProcessName -Unique | Sort-Object -Property ProcessName | ForEach-Object { $_.ProcessName }
  $res = $names -join '|'
}
Write-Output "PROCESSES_RESULT:$res"
`;
    psQueryProcess.stdin.write(psCmd + "\r\n");
  });
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.handle('get-version', () => app.getVersion());

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', (info) => {
  pendingUpdateInfo = info;
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('update-available', info);
});
autoUpdater.on('download-progress', (progressObj) => {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('update-progress', progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'The update has been downloaded. Restart the application to apply the updates.',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});
ipcMain.handle('check-for-updates', () => {
  return autoUpdater.checkForUpdates();
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus settings window if user tries to open a second instance
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.focus();
    } else {
      openSettings();
    }
  });

  app.whenReady().then(() => {
    configPath = path.join(app.getPath('userData'), 'config.json');
    currentSettings = loadSettings();

    createWindow();
    createTray();

    globalShortcut.register('CommandOrControl+Shift+L', () => {
      toggleLayer();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    
    // Check for updates shortly after startup and periodically
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 3600000); // Check every 1 hour
  });

  app.on('window-all-closed', () => {
    stopAutoHideTimers();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
