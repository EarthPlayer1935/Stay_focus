let isEnabled = false;
let isFullRow = false;
let isHighlightMode = false;
let isPopupOpen = false;
let windowHeight = 50;
let windowWidth = 200;
let currentBorderRadius = 12;
let bgOpacity = 75; // 0 to 100
let bgColor = '#000000';
let isAutoHideEnabled = false;
let isMouseOutside = false;
let currentY = window.innerHeight / 2 - windowHeight / 2;
let currentX = window.innerWidth / 2 - windowWidth / 2;

let overlayContainer = null;
let overlayWindow = null;

function initOverlay() {
  if (overlayContainer) return;

  overlayContainer = document.createElement('div');
  overlayContainer.className = 'stay-focus-overlay-container';

  overlayWindow = document.createElement('div');
  overlayWindow.className = 'stay-focus-window';
  // Note: border-radius handles the rounded corners; it's dynamically set or hardcoded in CSS. We'll set it in JS or CSS.
  
  overlayContainer.appendChild(overlayWindow);
  document.body.appendChild(overlayContainer);

  updateStyles();
  
  // Track mouse movement
  document.addEventListener('mousemove', onMouseMove);
  
  // Track keyboard arrow keys for fine tuning
  document.addEventListener('keydown', onKeyDown);

  // Auto-hide when mouse leaves window
  document.addEventListener('mouseleave', () => {
    if (isAutoHideEnabled) {
      isMouseOutside = true;
      updateVisibility();
    }
  });

  document.addEventListener('mouseenter', () => {
    isMouseOutside = false;
    updateVisibility();
  });
}

function hexToRgb(hex) {
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function updateStyles() {
  if (!overlayWindow) return;

  overlayWindow.style.height = `${windowHeight}px`;
  
  if (isFullRow) {
    overlayWindow.style.width = '100vw';
    overlayWindow.style.left = '0px';
    overlayWindow.style.borderRadius = '0px'; // No corners for full row
  } else {
    overlayWindow.style.width = `${windowWidth}px`;
    overlayWindow.style.borderRadius = `${currentBorderRadius}px`; // Configurable rounded corners
    if (currentX + windowWidth > window.innerWidth) {
      currentX = window.innerWidth - windowWidth;
    }
    if (currentX < 0) currentX = 0;
    overlayWindow.style.left = `${currentX}px`;
  }
  
  // Ensure window stays within bounds vertically (applies to both modes)
  if (currentY + windowHeight > window.innerHeight) {
    currentY = window.innerHeight - windowHeight;
  }
  if (currentY < 0) currentY = 0;
  
  overlayWindow.style.top = `${currentY}px`;

  const rgb = hexToRgb(bgColor);
  const alpha = bgOpacity / 100;
  
  if (isHighlightMode) {
    // Color the focus area, no dimming background
    overlayWindow.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    overlayWindow.style.boxShadow = 'none';
  } else {
    // Dim background, transparent focus area
    overlayWindow.style.backgroundColor = 'transparent';
    overlayWindow.style.boxShadow = `0 0 0 9999px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  updateVisibility();
}

function updateVisibility() {
  if (!overlayContainer) return;

  const shouldBeVisible = isEnabled && !(isAutoHideEnabled && isMouseOutside);
  
  if (shouldBeVisible) {
    overlayContainer.classList.add('active');
  } else {
    overlayContainer.classList.remove('active');
  }
}

function onMouseMove(e) {
  if (!isEnabled || isPopupOpen) return;
  
  // Center the window on the mouse cursor
  let newY = e.clientY - (windowHeight / 2);
  currentY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight));
  overlayWindow.style.top = `${currentY}px`;

  if (!isFullRow) {
    let newX = e.clientX - (windowWidth / 2);
    currentX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth));
    overlayWindow.style.left = `${currentX}px`;
  }
}

function onKeyDown(e) {
  if (!isEnabled) return;
  
  const step = 20; // 20px step for keyboard
  
  if (e.key === 'ArrowUp') {
    currentY = Math.max(0, currentY - step);
    overlayWindow.style.top = `${currentY}px`;
    e.preventDefault(); // Optional: prevent page scroll when tuning
  } else if (e.key === 'ArrowDown') {
    currentY = Math.min(window.innerHeight - windowHeight, currentY + step);
    overlayWindow.style.top = `${currentY}px`;
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' && !isFullRow) {
    currentX = Math.max(0, currentX - step);
    overlayWindow.style.left = `${currentX}px`;
    e.preventDefault();
  } else if (e.key === 'ArrowRight' && !isFullRow) {
    currentX = Math.min(window.innerWidth - windowWidth, currentX + step);
    overlayWindow.style.left = `${currentX}px`;
    e.preventDefault();
  } else if (e.key === 'Escape') {
    chrome.storage.local.set({ enabled: false });
  }
}

function applySettings(settings) {
  if (settings.enabled !== undefined) isEnabled = settings.enabled;
  if (settings.fullRowMode !== undefined) isFullRow = settings.fullRowMode;
  if (settings.highlightMode !== undefined) isHighlightMode = settings.highlightMode;
  if (settings.height !== undefined) windowHeight = settings.height;
  if (settings.width !== undefined) windowWidth = settings.width;
  if (settings.borderRadius !== undefined) currentBorderRadius = settings.borderRadius;
  if (settings.opacity !== undefined) bgOpacity = settings.opacity;
  if (settings.color !== undefined) bgColor = settings.color;
  if (settings.autoHide !== undefined) isAutoHideEnabled = settings.autoHide;
  
  if (settings.isPopupOpen !== undefined) {
    isPopupOpen = settings.isPopupOpen;
    if (isPopupOpen) {
      // Reposition to center so user can see it while popup is open
      currentY = window.innerHeight / 2 - windowHeight / 2;
      currentX = window.innerWidth / 2 - windowWidth / 2;
    }
  }
  
  if (isEnabled && !overlayContainer) {
    initOverlay();
  }
  
  updateStyles();
}

// Ensure manifest specifies "content_scripts" if we want it auto-injected.
// Wait, manifest.json didn't have "content_scripts", let me check if we inject dynamically.
// Actually, it's better to add it to manifest.json so it auto-loads on all pages.

chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'height', 'width', 'borderRadius', 'opacity', 'color', 'isPopupOpen', 'autoHide'], (result) => {
  applySettings(result);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    let updates = {};
    for (let key in changes) {
      updates[key] = changes[key].newValue;
    }
    applySettings(updates);
  }
});

