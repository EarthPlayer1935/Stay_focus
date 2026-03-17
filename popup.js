document.addEventListener('DOMContentLoaded', () => {
  const toggleFocus = document.getElementById('toggleFocus');
  const heightRange = document.getElementById('heightRange');
  const opacityRange = document.getElementById('opacityRange');
  const colorPicker = document.getElementById('colorPicker');

  // Load saved settings
  chrome.storage.local.get(['enabled', 'height', 'opacity', 'color'], (result) => {
    toggleFocus.checked = result.enabled || false;
    heightRange.value = result.height || 150;
    opacityRange.value = result.opacity || 75;
    colorPicker.value = result.color || '#000000';
  });

  function updateSettings(updates) {
    chrome.storage.local.set(updates, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_FOCUS_SETTINGS', ...updates }, (response) => {
            // Ignore if we can't connect, script might not be injected
            if (chrome.runtime.lastError) {
              console.log("Could not send message to tab, maybe script is not injected yet.");
            }
          });
        }
      });
    });
  }

  toggleFocus.addEventListener('change', (e) => {
    updateSettings({ enabled: e.target.checked });
  });

  heightRange.addEventListener('input', (e) => {
    updateSettings({ height: parseInt(e.target.value) });
  });

  opacityRange.addEventListener('input', (e) => {
    updateSettings({ opacity: parseInt(e.target.value) });
  });

  colorPicker.addEventListener('input', (e) => {
    updateSettings({ color: e.target.value });
  });
});
