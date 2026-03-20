document.addEventListener('DOMContentLoaded', async () => {
  chrome.runtime.connect({ name: 'stay_focus_popup' });

  async function loadLocale(lang) {
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('not found');
      const data = await resp.json();
      return (key) => (data[key] && data[key].message) || key;
    } catch {
      return (key) => chrome.i18n.getMessage(key) || key;
    }
  }

  function applyTranslations(t) {
    document.getElementById('pluginName').textContent                 = t('appName');
    document.querySelector('[for="toggleFullRow"]').textContent       = t('fullRowMode');
    document.querySelector('[for="toggleHighlightMode"]').textContent = t('colorHighlightMode');
    document.querySelector('[for="toggleLinkSize"]').textContent      = t('linkDimensions');
    document.querySelector('[for="heightRange"]').textContent         = t('spotlightHeight');
    document.querySelector('[for="widthRange"]').textContent          = t('spotlightWidth');
    document.querySelector('[for="borderRadiusRange"]').textContent   = t('cornerRadius');
    document.querySelector('[for="opacityRange"]').textContent        = t('opacity');
    document.querySelector('[for="colorPicker"]').textContent         = t('color');
    document.querySelector('[for="toggleAutoHide"]').textContent      = t('autoHideOnLeave');
    document.querySelector('[for="toggleKeyboardControl"]').textContent = t('keyboardControl');
    document.getElementById('btnSquare').title                        = t('shapeSquare');
    document.getElementById('btnRounded').title                       = t('shapeRounded');
    document.getElementById('btnCircle').title                        = t('shapeCircle');
    document.getElementById('btnKofi').title                          = t('supportKofi');
    document.getElementById('btnGithub').title                        = t('supportGithub');
  }

  const btnLanguage = document.getElementById('btnLanguage');
  const btnKofi = document.getElementById('btnKofi');
  const btnGithub = document.getElementById('btnGithub');
  const btnNightMode = document.getElementById('btnNightMode');
  const langMenu = document.getElementById('langMenu');
  const pluginName = document.getElementById('pluginName');

  const browserLang = chrome.i18n.getUILanguage().replace('-', '_');

  chrome.storage.local.get(['userLang', 'nightMode'], async (result) => {
    const lang = result.userLang || browserLang || 'en';
    const normalized = lang.startsWith('zh') ? 'zh_CN' : lang.split('_')[0];
    const options = Array.from(document.querySelectorAll('.lang-option'));
    const resolved = options.find(opt => opt.dataset.value === lang) ? lang :
                     options.find(opt => opt.dataset.value === normalized) ? normalized : 'en';
    
    const t = await loadLocale(resolved);
    applyTranslations(t);

    if (result.nightMode) {
      document.body.classList.add('dark-mode');
      btnNightMode.textContent = '☀️';
    }
  });

  btnLanguage.addEventListener('click', (e) => {
    langMenu.classList.toggle('hidden');
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    langMenu.classList.add('hidden');
  });

  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', async () => {
      const lang = option.dataset.value;
      chrome.storage.local.set({ userLang: lang });
      const t = await loadLocale(lang);
      applyTranslations(t);
      langMenu.classList.add('hidden');
    });
  });

  btnNightMode.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    chrome.storage.local.set({ nightMode: isDark });
    btnNightMode.textContent = isDark ? '☀️' : '🌙';
  });

  btnKofi.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ko-fi.com/EarthPlayer1935' });
  });

  btnGithub.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/EarthPlayer1935/Stay_focus' });
  });

  document.querySelector('.header').addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN') {
      const toggleFocus = document.getElementById('toggleFocus');
      if (toggleFocus) toggleFocus.click();
    }
  });

  document.querySelectorAll('.switch-group').forEach(row => {
    row.addEventListener('click', (e) => {
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
  const toggleAutoHide = document.getElementById('toggleAutoHide');
  const toggleKeyboardControl = document.getElementById('toggleKeyboardControl');
  const heightRange = document.getElementById('heightRange');
  const widthRange = document.getElementById('widthRange');
  const borderRadiusRange = document.getElementById('borderRadiusRange');
  const opacityRange = document.getElementById('opacityRange');
  const colorPicker = document.getElementById('colorPicker');

  const btnSquare = document.getElementById('btnSquare');
  const btnRounded = document.getElementById('btnRounded');
  const btnCircle = document.getElementById('btnCircle');

  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'linkSize', 'autoHide', 'keyboardControl', 'height', 'width', 'borderRadius', 'opacity', 'color'], (result) => {
    toggleFocus.checked = result.enabled || false;
    toggleFullRow.checked = result.fullRowMode || false;
    toggleHighlightMode.checked = result.highlightMode || false;
    toggleLinkSize.checked = result.linkSize || false;
    toggleAutoHide.checked = result.autoHide !== undefined ? result.autoHide : true;
    toggleKeyboardControl.checked = result.keyboardControl || false;
    heightRange.value = result.height || 50;
    widthRange.value = result.width || 200;
    borderRadiusRange.value = result.borderRadius !== undefined ? result.borderRadius : 12;
    opacityRange.value = result.opacity || 75;
    colorPicker.value = result.color || '#000000';

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
    widthRange.disabled = isFull;
    toggleLinkSize.disabled = isFull;
  });

  toggleHighlightMode.addEventListener('change', (e) => {
    updateSettings({ highlightMode: e.target.checked });
  });
  
  toggleAutoHide.addEventListener('change', (e) => {
    updateSettings({ autoHide: e.target.checked });
  });

  toggleKeyboardControl.addEventListener('change', (e) => {
    updateSettings({ keyboardControl: e.target.checked });
  });
  
  toggleLinkSize.addEventListener('change', (e) => {
    updateSettings({ linkSize: e.target.checked });
    if (e.target.checked) {
      heightRange.value = widthRange.value;
      updateSettings({ height: parseInt(widthRange.value) });
    }
  });

  function applyPreset(width, height, radius, link) {
    widthRange.value = width;
    heightRange.value = height;
    borderRadiusRange.value = radius;
    toggleLinkSize.checked = link;
    toggleFullRow.checked = false;
    updateSettings({ 
      width: width, 
      height: height, 
      borderRadius: radius, 
      linkSize: link,
      fullRowMode: false 
    });
    widthRange.disabled = false;
    toggleLinkSize.disabled = false;
  }

  btnSquare.addEventListener('click', () => {
    applyPreset(200, 200, 0, true);
  });

  btnRounded.addEventListener('click', () => {
    applyPreset(300, 50, 12, false);
  });

  btnCircle.addEventListener('click', () => {
    applyPreset(150, 150, 150, true);
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
