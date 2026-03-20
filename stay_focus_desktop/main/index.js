const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, globalShortcut, shell, screen } = electron;
const ipcMain = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const DEFAULT_SETTINGS = {
  enabled: true,
  fullRowMode: false,
  highlightMode: false,
  linkSize: false,
  autoHide: true,
  targetProcesses: [],
  keyboardControl: false,
  height: 50,
  width: 200,
  borderRadius: 12,
  opacity: 75,
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

// ── Auto-hide: two-tier polling ──────────────────────────────────────────────
let cachedWindowRects = [];   // [{x, y, w, h}]
let lastAutoHideState = null; // null = never sent yet
let slowTimer = null;
let fastTimer = null;

/**
 * Query window bounds for all target processes via PowerShell.
 * Returns an array of {x, y, w, h} rectangles.
 */
function queryWindowRects(processNames, callback) {
  // Build a PS filter expression: processname -in @('notepad','chrome', ...)
  const nameList = processNames
    .map(n => n.replace(/'/g, '').replace(/\.exe$/i, ''))
    .map(n => `'${n}'`)
    .join(',');

  const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinHelper {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public struct RECT { public int L, T, R, B; }
}
"@
$fg = [WinHelper]::GetForegroundWindow()
$names = @(${nameList})
$procs = Get-Process | Where-Object { $names -contains $_.ProcessName }
$results = @()
foreach ($p in $procs) {
  foreach ($h in $p.MainWindowHandle) {
    if ($h -eq [IntPtr]::Zero) { continue }
    $r = New-Object WinHelper+RECT
    if ([WinHelper]::GetWindowRect($h, [ref]$r) -and [WinHelper]::IsWindowVisible($h)) {
      $isFg = if ($h -eq $fg) { "1" } else { "0" }
      $results += "$($r.L),$($r.T),$($r.R - $r.L),$($r.B - $r.T),$($isFg)"
    }
  }
}
$results -join '|'
`.trim();

  execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 4000 }, (err, stdout) => {
    if (err) { callback([]); return; }
    const rects = stdout.trim().split('|').filter(Boolean).map(s => {
      const parts = s.split(',');
      const [x, y, w, h] = parts.slice(0, 4).map(Number);
      const isForeground = parts[4] === '1';
      return { x, y, w, h, isForeground };
    }).filter(r => r.w > 0 && r.h > 0);
    callback(rects);
  });
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
    if (mainWindow && currentSettings.enabled) {
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
    if (!mainWindow) return;
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
    if (mainWindow && currentSettings.enabled) {
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

  // Ignore mouse events to allow click-through, forward: true lets us still
  // track mousemove for the spotlight position
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    // Start auto-hide timers after renderer is ready
    refreshAutoHide();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Stay Focus', click: toggleLayer },
    { type: 'separator' },
    { label: 'Settings', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setToolTip('Stay Focus');
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
        if (mainWindow) mainWindow.webContents.send('keyboard-move', key);
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

  if (mainWindow) {
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
    const ps = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -Property ProcessName | Sort-Object -Property ProcessName -Unique | ForEach-Object { $_.ProcessName }`;
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], (err, stdout) => {
      if (err) {
        resolve([]);
        return;
      }
      const names = stdout.trim().split(/\r?\n/).filter(Boolean);
      resolve(names);
    });
  });
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.handle('get-version', () => app.getVersion());

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
  });

  app.on('window-all-closed', () => {
    stopAutoHideTimers();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
