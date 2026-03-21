const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateSettings: (callback) => ipcRenderer.on('update-settings', callback),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getLocale: (lang) => ipcRenderer.invoke('get-locale', lang),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  closeSettings: () => ipcRenderer.send('close-settings'),
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  onKeyboardMove: (callback) => ipcRenderer.on('keyboard-move', callback),
  onAutoHideState: (callback) => ipcRenderer.on('auto-hide-state', callback),
  getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
});

