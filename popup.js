document.addEventListener('DOMContentLoaded', async () => {
  // Connect a port so background.js can detect when popup opens and closes
  chrome.runtime.connect({ name: 'stay_focus_popup' });

  // --- Internationalization (i18n) ---
  // Fetch a locale's messages.json and return a translator function
  async function loadLocale(lang) {
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('not found');
      const data = await resp.json();
      return (key) => (data[key] && data[key].message) || key;
    } catch {
      // Fallback to Chrome's built-in i18n
      return (key) => chrome.i18n.getMessage(key) || key;
    }
  }

  function applyTranslations(t) {
    document.querySelector('.header h1').textContent                  = t('appName');
    document.querySelector('[for="toggleFullRow"]').textContent       = t('fullRowMode');
    document.querySelector('[for="toggleHighlightMode"]').textContent = t('colorHighlightMode');
    document.querySelector('[for="toggleLinkSize"]').textContent      = t('linkDimensions');
    document.querySelector('[for="heightRange"]').textContent         = t('spotlightHeight');
    document.querySelector('[for="widthRange"]').textContent          = t('spotlightWidth');
    document.querySelector('[for="borderRadiusRange"]').textContent   = t('cornerRadius');
    document.querySelector('[for="opacityRange"]').textContent        = t('opacity');
    document.querySelector('[for="colorPicker"]').textContent         = t('color');
    document.querySelector('.footer').textContent                     = t('footerTip');
    document.getElementById('btnSquare').title                        = t('shapeSquare');
    document.getElementById('btnRounded').title                       = t('shapeRounded');
    document.getElementById('btnCircle').title                        = t('shapeCircle');
  }

  const langSelect = document.getElementById('langSelect');

  // Detect initial language: user preference > browser UI language > 'en'
  const browserLang = chrome.i18n.getUILanguage().replace('-', '_');
  chrome.storage.local.get(['userLang'], async (result) => {
    const lang = result.userLang || browserLang || 'en';
    // Normalise zh-TW etc
    const normalised = lang.startsWith('zh') ? 'zh_CN' : lang.split('_')[0];
    const resolved = langSelect.querySelector(`option[value="${lang}"]`) ? lang :
                     langSelect.querySelector(`option[value="${normalised}"]`) ? normalised : 'en';
    langSelect.value = resolved;
    const t = await loadLocale(resolved);
    applyTranslations(t);
  });

  langSelect.addEventListener('change', async () => {
    const lang = langSelect.value;
    chrome.storage.local.set({ userLang: lang });
    const t = await loadLocale(lang);
    applyTranslations(t);
  });

  document.querySelectorAll('.switch-group').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't double-fire if user clicks the input or its visual slider directly
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN') {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.click();
      }
    });
  });

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
    
    // Initial binding state
    if (result.fullRowMode) {
      widthRange.disabled = true;
      toggleLinkSize.disabled = true;
    }
  });

  function updateSettings(updates) {
    chrome.storage.local.set(updates);
  }



  toggleFocus.addEventListener('change', (e) => {
    updateSettings({ enabled: e.target.checked });
  });

  toggleFullRow.addEventListener('change', (e) => {
    const isFull = e.target.checked;
    updateSettings({ fullRowMode: isFull });
    
    // Bind logic: if Full Row is ON, width slider and link toggle are useless
    widthRange.disabled = isFull;
    toggleLinkSize.disabled = isFull;
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
    toggleFullRow.checked = false; // Disable full row when a shape is picked
    updateSettings({ 
      width: width, 
      height: height, 
      borderRadius: radius, 
      linkSize: link,
      fullRowMode: false 
    });
    // Ensure controls are re-enabled when a preset is picked
    widthRange.disabled = false;
    toggleLinkSize.disabled = false;
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
