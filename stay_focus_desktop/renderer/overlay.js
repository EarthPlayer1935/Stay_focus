const urlParams = new URLSearchParams(window.location.search);
const offsetGlobalX = parseInt(urlParams.get('winX') || '0', 10);
const offsetGlobalY = parseInt(urlParams.get('winY') || '0', 10);

const overlayContainer = document.getElementById('overlay-container');
const overlayWindow = document.getElementById('overlay-window');
const maskClip = document.getElementById('mask-clip');

let isEnabled = false;   // will be set from settings on init
let isWin11 = false;
let isFullRow = false;
let isHighlightMode = false;
let windowHeight = 50;
let windowWidth = 200;
let currentBorderRadius = 12;
let bgOpacity = 75;
let bgColor = '#000000';

let currentY = window.innerHeight / 2 - windowHeight / 2;
let currentX = window.innerWidth / 2 - windowWidth / 2;

// Track the current active mask rect
let activeRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };

// Whether auto-hide has forced us to hide (separate from isEnabled)
let autoHideVisible = true;

function hexToRgb(hex) {
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function applyVisibility() {
  // Visible only when enabled AND auto-hide allows it
  overlayContainer.style.display = (isEnabled && autoHideVisible) ? 'block' : 'none';
}

function updateStyles() {
  overlayWindow.style.height = `${windowHeight}px`;

  // Calculate local coordinates relative to mask-clip
  let localX = currentX - activeRect.x;
  let localY = currentY - activeRect.y;

  if (isFullRow) {
    overlayWindow.style.width = '100vw'; // Note: full-row might need special handling if clip is on
    overlayWindow.style.left = `${-activeRect.x}px`;
    overlayWindow.style.borderRadius = '0px';
  } else {
    overlayWindow.style.width = `${windowWidth}px`;
    overlayWindow.style.borderRadius = `${currentBorderRadius}px`;
    overlayWindow.style.left = `${localX}px`;
  }

  overlayWindow.style.top = `${localY}px`;

  const rgb = hexToRgb(bgColor);
  const alpha = bgOpacity / 100;

  if (isHighlightMode) {
    overlayWindow.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    overlayWindow.style.boxShadow = 'none';
  } else {
    overlayWindow.style.backgroundColor = 'transparent';
    overlayWindow.style.boxShadow = `0 0 0 9999px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
  applyVisibility();
}

document.addEventListener('mousemove', (e) => {
  if (!isEnabled) return;

  currentY = e.clientY - (windowHeight / 2);
  currentX = e.clientX - (windowWidth / 2);
  
  updateStyles();
});

document.addEventListener('mouseleave', () => {
  if (!isEnabled) return;

  // Move the spotlight just slightly off-screen to hide the "hole"
  // If we move it too far (e.g., -innerWidth * 2), the 9999px box-shadow 
  // won't be large enough to reach the opposite edge of the screen!
  currentY = -windowHeight * 2;
  currentX = -windowWidth * 2;
  
  updateStyles();
});

// IPC settings sync
if (window.electronAPI) {
  if (window.electronAPI.getOsInfo) {
    window.electronAPI.getOsInfo().then(info => {
      isWin11 = info.isWin11;
      updateStyles();
    });
  }

  // Initialize from saved settings on load
  window.electronAPI.getSettings().then((settings) => {
    if (settings.enabled !== undefined) isEnabled = settings.enabled;
    if (settings.fullRowMode !== undefined) isFullRow = settings.fullRowMode;
    if (settings.highlightMode !== undefined) isHighlightMode = settings.highlightMode;
    if (settings.height !== undefined) windowHeight = settings.height;
    if (settings.width !== undefined) windowWidth = settings.width;
    if (settings.borderRadius !== undefined) currentBorderRadius = settings.borderRadius;
    if (settings.opacity !== undefined) bgOpacity = settings.opacity;
    if (settings.color !== undefined) bgColor = settings.color;
    updateStyles();
  });

  window.electronAPI.onUpdateSettings((event, newSettings) => {
    if (newSettings.enabled !== undefined) isEnabled = newSettings.enabled;
    if (newSettings.fullRowMode !== undefined) isFullRow = newSettings.fullRowMode;
    if (newSettings.highlightMode !== undefined) isHighlightMode = newSettings.highlightMode;
    if (newSettings.height !== undefined) windowHeight = newSettings.height;
    if (newSettings.width !== undefined) windowWidth = newSettings.width;
    if (newSettings.borderRadius !== undefined) currentBorderRadius = newSettings.borderRadius;
    if (newSettings.opacity !== undefined) bgOpacity = newSettings.opacity;
    if (newSettings.color !== undefined) bgColor = newSettings.color;
    updateStyles();
  });

  // Auto-hide state from main process: can be boolean (global) or rect object
  if (window.electronAPI.onAutoHideState) {
    window.electronAPI.onAutoHideState((event, state) => {
      if (typeof state === 'object' && state !== null) {
        // Limited scope mode
        activeRect = {
          x: state.x - offsetGlobalX,
          y: state.y - offsetGlobalY,
          w: state.w,
          h: state.h
        };
        maskClip.style.left = `${activeRect.x}px`;
        maskClip.style.top = `${activeRect.y}px`;
        maskClip.style.width = `${activeRect.w}px`;
        maskClip.style.height = `${activeRect.h}px`;
        maskClip.style.borderRadius = isWin11 ? '8px' : '0px';
        autoHideVisible = true;
      } else if (state === true) {
        // Global mode
        activeRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
        maskClip.style.left = '0px';
        maskClip.style.top = '0px';
        maskClip.style.width = '100vw';
        maskClip.style.height = '100vh';
        maskClip.style.borderRadius = '0px';
        autoHideVisible = true;
      } else {
        // Hidden
        autoHideVisible = false;
      }
      updateStyles();
    });
  }

  if (window.electronAPI.onKeyboardMove) {
    window.electronAPI.onKeyboardMove((event, key) => {
      if (!isEnabled) return;
      const step = 20;
      if (key === 'Up') currentY = Math.max(0, currentY - step);
      else if (key === 'Down') currentY = Math.min(window.innerHeight - windowHeight, currentY + step);
      else if (key === 'Left' && !isFullRow) currentX = Math.max(0, currentX - step);
      else if (key === 'Right' && !isFullRow) currentX = Math.min(window.innerWidth - windowWidth, currentX + step);

      overlayWindow.style.top = `${currentY}px`;
      if (!isFullRow) overlayWindow.style.left = `${currentX}px`;
    });
  }
}

updateStyles();
