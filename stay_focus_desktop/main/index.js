const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_SETTINGS = {
  enabled: false,
  fullRowMode: false,
  highlightMode: false,
  linkSize: false,
  autoHide: true,
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

  // Ignore mouse events to allow click-through, but capture mousemove if hardware supports forward: true
  // Note: On Windows and macOS this should forward mouse events properly so the app can still track hover for the hole
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
}

function createTray() {
  // Use a placeholder icon for now, later replaced by the actual one
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
    height: 650,
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
  currentSettings = { ...currentSettings, ...newSettings };
  saveSettingsToFile(currentSettings);
  if (mainWindow) {
    mainWindow.webContents.send('update-settings', currentSettings);
  }
  if (oldKbCtrl !== currentSettings.keyboardControl) {
    registerKeyboardControl(currentSettings.keyboardControl);
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

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
