let isEnabled = false;
let isFullRow = false;
let isHighlightMode = false;
let isPopupOpen = false;
let windowHeight = 50;
let windowWidth = 200;
let currentBorderRadius = 12;
let bgOpacity = 75;
let bgColor = '#000000';
let isAutoHideEnabled = false;
let isKeyboardControlEnabled = false;
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
  
  overlayContainer.appendChild(overlayWindow);
  document.body.appendChild(overlayContainer);

  updateStyles();
  
  document.addEventListener('mousemove', onMouseMove);
  
  document.addEventListener('keydown', onKeyDown);

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
    overlayWindow.style.borderRadius = '0px';
  } else {
    overlayWindow.style.width = `${windowWidth}px`;
    overlayWindow.style.borderRadius = `${currentBorderRadius}px`;
    if (currentX + windowWidth > window.innerWidth) {
      currentX = window.innerWidth - windowWidth;
    }
    if (currentX < 0) currentX = 0;
    overlayWindow.style.left = `${currentX}px`;
  }
  
  if (currentY + windowHeight > window.innerHeight) {
    currentY = window.innerHeight - windowHeight;
  }
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

  updateVisibility();
}

function updateVisibility() {
  if (!overlayContainer) return;

  const shouldBeVisible = isEnabled && (!(isAutoHideEnabled && isMouseOutside) || isPopupOpen);
  
  if (shouldBeVisible) {
    overlayContainer.classList.add('active');
  } else {
    overlayContainer.classList.remove('active');
  }
}

function onMouseMove(e) {
  if (!isEnabled || isPopupOpen) return;
  
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

  const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const isArrowKey = arrowKeys.includes(e.key);
  
  if (isArrowKey && !isKeyboardControlEnabled) return;

  const activeElem = document.activeElement;
  const isInput = activeElem && (
    activeElem.tagName === 'INPUT' || 
    activeElem.tagName === 'TEXTAREA' || 
    activeElem.isContentEditable
  );

  const step = 20;
  
  if (isArrowKey) {
    if (e.key === 'ArrowUp') {
      currentY = Math.max(0, currentY - step);
    } else if (e.key === 'ArrowDown') {
      currentY = Math.min(window.innerHeight - windowHeight, currentY + step);
    } else if (e.key === 'ArrowLeft' && !isFullRow) {
      currentX = Math.max(0, currentX - step);
    } else if (e.key === 'ArrowRight' && !isFullRow) {
      currentX = Math.min(window.innerWidth - windowWidth, currentX + step);
    }
    
    overlayWindow.style.top = `${currentY}px`;
    overlayWindow.style.left = `${currentX}px`;

    if (!isInput) {
      e.preventDefault();
    }
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
  if (settings.keyboardControl !== undefined) isKeyboardControlEnabled = settings.keyboardControl;
  
  if (settings.isPopupOpen !== undefined) {
    isPopupOpen = settings.isPopupOpen;
    if (isPopupOpen) {
      currentY = window.innerHeight / 2 - windowHeight / 2;
      currentX = window.innerWidth / 2 - windowWidth / 2;
    }
  }
  
  if (isEnabled && !overlayContainer) {
    initOverlay();
  }
  
  updateStyles();
}


chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'height', 'width', 'borderRadius', 'opacity', 'color', 'isPopupOpen', 'autoHide', 'keyboardControl'], (result) => {
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

