document.addEventListener('DOMContentLoaded', async () => {
  const toggleFocus = document.getElementById('toggleFocus');
  const toggleFullRow = document.getElementById('toggleFullRow');
  const toggleHighlightMode = document.getElementById('toggleHighlightMode');
  const heightRange = document.getElementById('heightRange');
  const widthRange = document.getElementById('widthRange');
  const borderRadiusRange = document.getElementById('borderRadiusRange');
  const opacityRange = document.getElementById('opacityRange');
  const colorPicker = document.getElementById('colorPicker');

  const btnSquare = document.getElementById('btnSquare');
  const btnRounded = document.getElementById('btnRounded');
  const btnCircle = document.getElementById('btnCircle');

  if (window.electronAPI) {
    const settings = await window.electronAPI.getSettings();
    toggleFocus.checked = settings.enabled;
    toggleFullRow.checked = settings.fullRowMode;
    toggleHighlightMode.checked = settings.highlightMode;
    heightRange.value = settings.height;
    widthRange.value = settings.width;
    borderRadiusRange.value = settings.borderRadius;
    opacityRange.value = settings.opacity;
    colorPicker.value = settings.color;
    
    if (settings.fullRowMode) {
      widthRange.disabled = true;
    }
  }

  function updateSettings(updates) {
    if (window.electronAPI) {
      window.electronAPI.saveSettings(updates);
    }
  }

  toggleFocus.addEventListener('change', (e) => updateSettings({ enabled: e.target.checked }));

  toggleFullRow.addEventListener('change', (e) => {
    const isFull = e.target.checked;
    updateSettings({ fullRowMode: isFull });
    widthRange.disabled = isFull;
  });

  toggleHighlightMode.addEventListener('change', (e) => updateSettings({ highlightMode: e.target.checked }));

  function applyPreset(width, height, radius) {
    widthRange.value = width;
    heightRange.value = height;
    borderRadiusRange.value = radius;
    toggleFullRow.checked = false;
    updateSettings({ width, height, borderRadius: radius, fullRowMode: false });
    widthRange.disabled = false;
  }

  btnSquare.addEventListener('click', () => applyPreset(200, 200, 0));
  btnRounded.addEventListener('click', () => applyPreset(300, 50, 12));
  btnCircle.addEventListener('click', () => applyPreset(150, 150, 150));

  heightRange.addEventListener('input', (e) => updateSettings({ height: parseInt(e.target.value) }));
  widthRange.addEventListener('input', (e) => updateSettings({ width: parseInt(e.target.value) }));
  borderRadiusRange.addEventListener('input', (e) => updateSettings({ borderRadius: parseInt(e.target.value) }));
  opacityRange.addEventListener('input', (e) => updateSettings({ opacity: parseInt(e.target.value) }));
  colorPicker.addEventListener('input', (e) => updateSettings({ color: e.target.value }));
});
