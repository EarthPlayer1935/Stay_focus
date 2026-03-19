const overlayWindow = document.getElementById('overlay-window');

let isEnabled = true;
let isFullRow = false;
let isHighlightMode = false;
let windowHeight = 50;
let windowWidth = 200;
let currentBorderRadius = 12;
let bgOpacity = 75;
let bgColor = '#000000';
let currentY = window.innerHeight / 2 - windowHeight / 2;
let currentX = window.innerWidth / 2 - windowWidth / 2;

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

function updateStyles() {
  overlayWindow.style.height = `${windowHeight}px`;
  
  if (isFullRow) {
    overlayWindow.style.width = '100vw';
    overlayWindow.style.left = '0px';
    overlayWindow.style.borderRadius = '0px';
  } else {
    overlayWindow.style.width = `${windowWidth}px`;
    overlayWindow.style.borderRadius = `${currentBorderRadius}px`;
    if (currentX + windowWidth > window.innerWidth) currentX = window.innerWidth - windowWidth;
    if (currentX < 0) currentX = 0;
    overlayWindow.style.left = `${currentX}px`;
  }
  
  if (currentY + windowHeight > window.innerHeight) currentY = window.innerHeight - windowHeight;
  if (currentY < 0) currentY = 0;
  overlayWindow.style.top = `${currentY}px`;

  const rgb = hexToRgb(bgColor);
  const alpha = bgOpacity / 100;
  
  if (isHighlightMode) {
    overlayWindow.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    overlayWindow.style.boxShadow = 'none';
  } else {
    overlayWindow.style.backgroundColor = 'transparent';
    overlayWindow.style.boxShadow = `0 0 0 9999px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
}

document.addEventListener('mousemove', (e) => {
  if (!isEnabled) return;
  
  let newY = e.clientY - (windowHeight / 2);
  currentY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight));
  overlayWindow.style.top = `${currentY}px`;

  if (!isFullRow) {
    let newX = e.clientX - (windowWidth / 2);
    currentX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth));
    overlayWindow.style.left = `${currentX}px`;
  }
});

// IPC settings sync
if (window.electronAPI) {
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
}

updateStyles();
