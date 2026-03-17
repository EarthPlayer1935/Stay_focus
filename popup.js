document.addEventListener('DOMContentLoaded', () => {
  // Flag that popup is open
  chrome.storage.local.set({ isPopupOpen: true });


  const toggleFocus = document.getElementById('toggleFocus');
  const toggleFullRow = document.getElementById('toggleFullRow');
  const toggleHighlightMode = document.getElementById('toggleHighlightMode');
  const toggleLinkSize = document.getElementById('toggleLinkSize');
  const heightRange = document.getElementById('heightRange');
  const widthRange = document.getElementById('widthRange');
  const borderRadiusRange = document.getElementById('borderRadiusRange');
  const opacityRange = document.getElementById('opacityRange');
  const colorPicker = document.getElementById('colorPicker');

  const btnSquare = document.getElementById('btnSquare');
  const btnRounded = document.getElementById('btnRounded');
  const btnCircle = document.getElementById('btnCircle');

  // Load saved settings
  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'linkSize', 'height', 'width', 'borderRadius', 'opacity', 'color'], (result) => {
    toggleFocus.checked = result.enabled || false;
    toggleFullRow.checked = result.fullRowMode || false;
    toggleHighlightMode.checked = result.highlightMode || false;
    toggleLinkSize.checked = result.linkSize || false;
    heightRange.value = result.height || 50;
    widthRange.value = result.width || 200;
    borderRadiusRange.value = result.borderRadius !== undefined ? result.borderRadius : 12;
    opacityRange.value = result.opacity || 75;
    colorPicker.value = result.color || '#000000';
  });

  function updateSettings(updates) {
    chrome.storage.local.set(updates);
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
  
  toggleLinkSize.addEventListener('change', (e) => {
    updateSettings({ linkSize: e.target.checked });
    if (e.target.checked) {
      // Upon linking, immediately match height to width
      heightRange.value = widthRange.value;
      updateSettings({ height: parseInt(widthRange.value) });
    }
  });

  // Preset Buttons Logic
  function applyPreset(width, height, radius, link) {
    widthRange.value = width;
    heightRange.value = height;
    borderRadiusRange.value = radius;
    toggleLinkSize.checked = link;
    updateSettings({ width: width, height: height, borderRadius: radius, linkSize: link });
  }

  btnSquare.addEventListener('click', () => {
    applyPreset(200, 200, 0, true); // Square, link dimensions
  });

  btnRounded.addEventListener('click', () => {
    applyPreset(300, 50, 12, false); // Standard reading line, unlink dimensions
  });

  btnCircle.addEventListener('click', () => {
    applyPreset(150, 150, 150, true); // Circle, link dimensions
  });

  heightRange.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    let updates = { height: val };
    if (toggleLinkSize.checked) {
      widthRange.value = val;
      updates.width = val;
    }
    updateSettings(updates);
  });

  widthRange.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    let updates = { width: val };
    if (toggleLinkSize.checked) {
      heightRange.value = val;
      updates.height = val;
    }
    updateSettings(updates);
  });

  borderRadiusRange.addEventListener('input', (e) => {
    updateSettings({ borderRadius: parseInt(e.target.value) });
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
  chrome.storage.local.set({ isPopupOpen: false });
});

