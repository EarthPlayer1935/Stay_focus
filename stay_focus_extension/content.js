let isEnabled = false;
let isFullRow = false;
let isHighlightMode = false;
let isPopupOpen = false;
let windowHeight = 79;
let windowWidth = 79;
let currentBorderRadius = 150;
let bgOpacity = 10;
let bgColor = '#000000';
let isAntiScreenshotEnabled = true;
let isAutoHideEnabled = false;
let isKeyboardControlEnabled = false;
let targetTabs = [];
let currentY = window.innerHeight / 2 - windowHeight / 2;
let currentX = window.innerWidth / 2 - windowWidth / 2;

let isHidingForScreenshot = false;
let screenshotTimeout = null;

function hideOverlayForScreenshot() {
  if (overlayContainer) {
    overlayContainer.style.opacity = '0';
    isHidingForScreenshot = true;
    clearTimeout(screenshotTimeout);
    screenshotTimeout = setTimeout(() => {
      restoreOverlayOpacity();
    }, 2000);
  }
}

function restoreOverlayOpacity() {
  if (overlayContainer && isHidingForScreenshot) {
    overlayContainer.style.opacity = '1';
    isHidingForScreenshot = false;
  }
}

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
  
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onKeyUp, { capture: true });
  window.addEventListener('focus', restoreOverlayOpacity);
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

  let tabMatch = true;
  if (isAutoHideEnabled && targetTabs && targetTabs.length > 0) {
    const currentHost = window.location.hostname.toLowerCase();
    tabMatch = targetTabs.includes(currentHost);
  }

  const shouldBeVisible = isEnabled && (tabMatch || isPopupOpen);
  
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
  
  // Debug log for troubleshooting
  if (isKeyboardControlEnabled && (e.key.startsWith('Arrow') || e.key === 'Escape')) {
    console.log('[Stay Focus] Key pressed:', e.key, 'Modifiers:', e.shiftKey, e.altKey);
  }

  if (isAntiScreenshotEnabled) {
    if (e.metaKey && e.shiftKey) {
      hideOverlayForScreenshot();
    }
    const isPrtScn = e.code === 'PrintScreen' || e.key === 'PrintScreen';
    if (isPrtScn) {
      hideOverlayForScreenshot();
    }
  }

  const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const isArrowKey = arrowKeys.includes(e.key);
  
  // 必须同时按下 Shift + Alt + 方向键才触发，防止干扰正常滚动
  if (isArrowKey && (!isKeyboardControlEnabled || !e.shiftKey || !e.altKey)) return;

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
    if (!isFullRow) {
      overlayWindow.style.left = `${currentX}px`;
    }

    if (!isInput) {
      e.preventDefault();
    }
  } else if (e.key === 'Escape') {
    chrome.storage.local.set({ enabled: false });
  }
}

function onKeyUp(e) {
  if (!isEnabled || !isAntiScreenshotEnabled) return;

  if (!e.metaKey || !e.shiftKey) {
    restoreOverlayOpacity();
  }

  const isPrtScn = e.code === 'PrintScreen' || e.key === 'PrintScreen';
  if (isPrtScn) {
    hideOverlayForScreenshot();
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
  if (settings.antiScreenshot !== undefined) isAntiScreenshotEnabled = settings.antiScreenshot;
  if (settings.autoHide !== undefined) isAutoHideEnabled = settings.autoHide;
  if (settings.targetTabs !== undefined) targetTabs = settings.targetTabs || [];
  isKeyboardControlEnabled = settings.keyboardControl !== undefined ? settings.keyboardControl : isKeyboardControlEnabled;
  
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


chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'height', 'width', 'borderRadius', 'opacity', 'color', 'isPopupOpen', 'autoHide', 'keyboardControl', 'targetTabs'], (result) => {
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

