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
  antiScreenshot: true,
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
let progressWindow;
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
using System.Diagnostics;
public class WinHelper {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public struct RECT { public int L, T, R, B; }

  public static string GetWindows(string[] names) {
    IntPtr fg = GetForegroundWindow();
    List<string> results = new List<string>();
    EnumWindows((hWnd, lParam) => {
      if (IsWindowVisible(hWnd)) {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        string procName = null;
        try {
          procName = Process.GetProcessById((int)pid).ProcessName;
        } catch { }

        if (procName != null) {
          bool match = false;
          foreach (string n in names) {
            if (string.Equals(n, procName, StringComparison.OrdinalIgnoreCase)) {
              match = true;
              break;
            }
          }
          if (match) {
            RECT r;
            int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
            if (DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out r, Marshal.SizeOf(typeof(RECT))) != 0) {
              GetWindowRect(hWnd, out r);
            }
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
  if (process.platform === 'darwin') {
    const script = `
      try
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set frontWindow to (first window of (first application process whose frontmost is true))
          set boundsList to properties of frontWindow as record
          set {p1, p2} to position of boundsList
          set {s1, s2} to size of boundsList
          return frontApp & "|" & p1 & "," & p2 & "," & s1 & "," & s2 & "|1"
        end tell
      on error
        return ""
      end try
    `;
    require('child_process').execFile('osascript', ['-e', script], (error, stdout) => {
      if (error || !stdout || !stdout.trim()) {
        callback([]);
        return;
      }
      const res = stdout.trim();
      const parts = res.split('|');
      const frontApp = parts[0];
      
      let match = false;
      const targetLower = processNames.map(n => n.replace(/'/g, '').replace(/\.exe$/i, '').toLowerCase());
      if (targetLower.includes(frontApp.toLowerCase())) {
        match = true;
      }
      
      if (match && parts[1]) {
        const bounds = parts[1].split(',');
        const x = parseInt(bounds[0], 10);
        const y = parseInt(bounds[1], 10);
        const w = parseInt(bounds[2], 10);
        const h = parseInt(bounds[3], 10);
        callback([{ x, y, w, h, isForeground: true }]);
      } else {
        callback([]);
      }
    });
    return;
  }

  ensurePsChild();
  psQueryCallback = callback;

  let names = processNames.map(n => n.replace(/'/g, '').replace(/\.exe$/i, ''));
  let namesStr = names.map(n => `'${n.replace(/'/g, "''")}'`).join(',');

  const psCmd = `
$names = @(${namesStr})
$res = [WinHelper]::GetWindows([string[]]$names)
Write-Output "RESULT:$res"
`;
  psQueryProcess.stdin.write(psCmd + "\r\n");
}

function pointInRect(px, py, { x, y, w, h }) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function stopAutoHideTimers() {
  if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
  if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
  psQueryCallback = null;
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

  function loop() {
    if (!currentSettings.autoHide || !currentSettings.enabled || (mainWindow && mainWindow.isDestroyed())) return;
    queryWindowRects(names, (rects) => {
      cachedWindowRects = rects;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        const { x, y } = screen.getCursorScreenPoint();
        const activeRect = cachedWindowRects.find(r => pointInRect(x, y, r) && r.isForeground);
        
        const state = activeRect || false;
        const stateStr = JSON.stringify(state);
        if (stateStr !== lastAutoHideState) {
          lastAutoHideState = stateStr;
          mainWindow.webContents.send('auto-hide-state', state);
        }
      }
      
      slowTimer = setTimeout(loop, 30);
    });
  }
  
  loop();
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

  if (process.platform !== 'darwin') {
    mainWindow.setContentProtection(currentSettings.antiScreenshot);
  } else {
    registerMacScreenshotShortcut(currentSettings.antiScreenshot && currentSettings.enabled && isLayerVisible);
  }

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
  
  if (process.platform === 'darwin') {
    registerMacScreenshotShortcut(currentSettings.antiScreenshot && currentSettings.enabled && isLayerVisible);
  }
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

function registerMacScreenshotShortcut(enable) {
  if (process.platform !== 'darwin') return;
  const keys = ['Command+Shift+3', 'Command+Shift+4', 'Command+Shift+5'];
  if (enable) {
    keys.forEach(key => {
      try {
        globalShortcut.register(key, () => {
          if (mainWindow && !mainWindow.isDestroyed() && isLayerVisible) {
            mainWindow.hide();
            
            let args = '';
            if (key === 'Command+Shift+3') args = '';
            else if (key === 'Command+Shift+4') args = '-i';
            else if (key === 'Command+Shift+5') args = '-U';
            
            require('child_process').exec(`screencapture ${args}`, () => {
              if (mainWindow && !mainWindow.isDestroyed() && isLayerVisible && currentSettings.enabled) {
                mainWindow.showInactive();
              }
            });
          }
        });
      } catch(e) {}
    });
  } else {
    keys.forEach(key => {
      try { globalShortcut.unregister(key); } catch(e) {}
    });
  }
}


ipcMain.handle('get-os-info', () => {
  const os = require('os');
  const release = os.release().split('.');
  const build = parseInt(release[2] || '0', 10);
  const isWin11 = process.platform === 'win32' && build >= 22000;
  return { isWin11 };
});

ipcMain.handle('get-settings', () => currentSettings);

ipcMain.on('save-settings', (event, newSettings) => {
  const oldKbCtrl = currentSettings.keyboardControl;
  const oldAutoHide = currentSettings.autoHide;
  const oldProcesses = JSON.stringify(currentSettings.targetProcesses);
  const oldEnabled = currentSettings.enabled;
  const oldAntiScreenshot = currentSettings.antiScreenshot;

  currentSettings = { ...currentSettings, ...newSettings };
  saveSettingsToFile(currentSettings);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-settings', currentSettings);
  }

  if (oldKbCtrl !== currentSettings.keyboardControl) {
    registerKeyboardControl(currentSettings.keyboardControl);
  }

  if (oldAntiScreenshot !== currentSettings.antiScreenshot || oldEnabled !== currentSettings.enabled) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (process.platform !== 'darwin') {
        mainWindow.setContentProtection(currentSettings.antiScreenshot);
      } else {
        registerMacScreenshotShortcut(currentSettings.antiScreenshot && currentSettings.enabled && isLayerVisible);
      }
    }
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
    const localesDir = app.isPackaged
      ? path.join(process.resourcesPath, '_locales')
      : path.join(__dirname, '../../stay_focus_extension/_locales');
    const file = path.join(localesDir, `${lang}/messages.json`);
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
    if (process.platform === 'darwin') {
      const script = `
        tell application "System Events"
          set apps to name of every application process whose background only is false
          set AppleScript's text item delimiters to "|"
          return apps as string
        end tell
      `;
      require('child_process').execFile('osascript', ['-e', script], (error, stdout) => {
        if (error || !stdout || !stdout.trim()) {
          resolve([]);
          return;
        }
        resolve(stdout.trim().split('|').filter(Boolean));
      });
      return;
    }

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

function createProgressWindow() {
  if (progressWindow) return;
  progressWindow = new BrowserWindow({
    width: 400,
    height: 150,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  progressWindow.loadFile(path.join(__dirname, '../renderer/update.html'));
  progressWindow.on('closed', () => {
    progressWindow = null;
  });
}

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', (info) => {
  pendingUpdateInfo = info;
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('update-available', info);
});
autoUpdater.on('error', (err) => {
  const msg = err == null ? "Unknown error" : (err.message || err.toString());
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('update-error', msg);
  if (progressWindow && !progressWindow.isDestroyed()) progressWindow.webContents.send('update-error', msg);
});
autoUpdater.on('download-progress', (progressObj) => {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('update-progress', progressObj);
  if (progressWindow && !progressWindow.isDestroyed()) progressWindow.webContents.send('update-progress', progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('download-update', () => {
  createProgressWindow();
  autoUpdater.downloadUpdate();
});
ipcMain.on('close-update-window', () => {
  if (progressWindow) {
    progressWindow.close();
  }
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
