document.addEventListener('DOMContentLoaded', () => {
  // Notify content script that popup is open
  notifyPopupState(true);

  const toggleFocus = document.getElementById('toggleFocus');
  const toggleFullRow = document.getElementById('toggleFullRow');
  const toggleHighlightMode = document.getElementById('toggleHighlightMode');
  const heightRange = document.getElementById('heightRange');
  const widthRange = document.getElementById('widthRange');
  const opacityRange = document.getElementById('opacityRange');
  const colorPicker = document.getElementById('colorPicker');

  // Load saved settings
  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'height', 'width', 'opacity', 'color'], (result) => {
    toggleFocus.checked = result.enabled || false;
    toggleFullRow.checked = result.fullRowMode || false;
    toggleHighlightMode.checked = result.highlightMode || false;
    heightRange.value = result.height || 50;
    widthRange.value = result.width || 200;
    opacityRange.value = result.opacity || 75;
    colorPicker.value = result.color || '#000000';
  });

  function updateSettings(updates) {
    chrome.storage.local.set(updates);
  }

  function notifyPopupState(isOpen) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'POPUP_STATE_CHANGED', isOpen: isOpen }, (response) => {
          if (chrome.runtime.lastError) {
             // Script might not be injected
          }
        });
      }
    });
  }

  toggleFocus.addEventListener('change', (e) => {
    updateSettings({ enabled: e.target.checked });
  });

  toggleFullRow.addEventListener('change', (e) => {
    updateSettings({ fullRowMode: e.target.checked });
  });

  toggleHighlightMode.addEventListener('change', (e) => {
    updateSettings({ highlightMode: e.target.checked });
  });

  heightRange.addEventListener('input', (e) => {
    updateSettings({ height: parseInt(e.target.value) });
  });

  widthRange.addEventListener('input', (e) => {
    updateSettings({ width: parseInt(e.target.value) });
  });

  opacityRange.addEventListener('input', (e) => {
    updateSettings({ opacity: parseInt(e.target.value) });
  });

  colorPicker.addEventListener('input', (e) => {
    updateSettings({ color: e.target.value });
  });

  colorPicker.addEventListener('change', (e) => {
    updateSettings({ color: e.target.value });
  });
});

window.addEventListener('unload', () => {
  // Notify content script that popup is closed
  notifyPopupState(false);
});
