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
    document.querySelector('[for="colorPicker"]').textContent         = t('color');
    document.querySelector('[for="toggleAutoHide"]').textContent      = t('autoHideOnLeave');
    document.querySelector('[for="toggleAntiScreenshot"]').textContent = t('antiScreenshot') || 'Screenshot Avoidance';
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
    chrome.tabs.create({ url: 'https://ko-fi.com/earthplayer' });
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

  document.querySelectorAll('.switch-group, .mini-switch').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN' && e.target.tagName !== 'LABEL') {
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
  const toggleAntiScreenshot = document.getElementById('toggleAntiScreenshot');
  const toggleKeyboardControl = document.getElementById('toggleKeyboardControl');
  const colorPicker = document.getElementById('colorPicker');
  const heightRange = document.getElementById('heightRange');
  const widthRange = document.getElementById('widthRange');
  const borderRadiusRange = document.getElementById('borderRadiusRange');
  const opacityRange = document.getElementById('opacityRange');

  const btnSquare = document.getElementById('btnSquare');
  const btnRounded = document.getElementById('btnRounded');
  const btnCircle = document.getElementById('btnCircle');

  const tabGroup = document.getElementById('tabGroup');
  const tabTags = document.getElementById('tabTags');
  const tabInput = document.getElementById('tabInput');
  const btnAddTab = document.getElementById('btnAddTab');
  const tabHint = document.getElementById('tabHint');

  let targetTabs = [];

  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'linkSize', 'autoHide', 'antiScreenshot', 'keyboardControl', 'color', 'targetTabs', 'height', 'width', 'borderRadius', 'opacity'], (result) => {
    toggleFocus.checked = result.enabled || false;
    toggleFullRow.checked = result.fullRowMode || false;
    toggleHighlightMode.checked = result.highlightMode || false;
    toggleLinkSize.checked = result.linkSize || false;
    toggleAutoHide.checked = result.autoHide !== undefined ? result.autoHide : true;
    toggleAntiScreenshot.checked = result.antiScreenshot !== undefined ? result.antiScreenshot : true;
    toggleKeyboardControl.checked = result.keyboardControl || false;
    colorPicker.value = result.color || '#000000';
    if (heightRange && result.height !== undefined) heightRange.value = result.height;
    if (widthRange && result.width !== undefined) widthRange.value = result.width;
    if (borderRadiusRange && result.borderRadius !== undefined) borderRadiusRange.value = result.borderRadius;
    if (opacityRange && result.opacity !== undefined) opacityRange.value = result.opacity;
    if (Array.isArray(result.targetTabs)) {
      targetTabs = result.targetTabs;
    }

    if (result.fullRowMode) {
      toggleLinkSize.disabled = true;
    }
    
    setTabGroupEnabled(toggleAutoHide.checked);
    renderTags();
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
    toggleLinkSize.disabled = isFull;
  });

  toggleHighlightMode.addEventListener('change', (e) => {
    updateSettings({ highlightMode: e.target.checked });
  });
  
  toggleAutoHide.addEventListener('change', (e) => {
    updateSettings({ autoHide: e.target.checked });
    setTabGroupEnabled(e.target.checked);
  });

  toggleAntiScreenshot.addEventListener('change', (e) => {
    updateSettings({ antiScreenshot: e.target.checked });
  });

  toggleKeyboardControl.addEventListener('change', (e) => {
    updateSettings({ keyboardControl: e.target.checked });
  });
  
  toggleLinkSize.addEventListener('change', (e) => {
    updateSettings({ linkSize: e.target.checked });
  });

  function applyPreset(width, height, radius, link) {
    toggleLinkSize.checked = link;
    toggleFullRow.checked = false;
    updateSettings({ 
      width: width, 
      height: height, 
      borderRadius: radius, 
      linkSize: link,
      fullRowMode: false 
    });
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

  colorPicker.addEventListener('input', (e) => {
    updateSettings({ color: e.target.value });
  });

  colorPicker.addEventListener('change', (e) => {
    updateSettings({ color: e.target.value });
  });

  if (heightRange) {
    heightRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      updateSettings({ height: val });
      if (toggleLinkSize.checked && widthRange) {
        widthRange.value = val;
        updateSettings({ width: val });
      }
    });
  }

  if (widthRange) {
    widthRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      updateSettings({ width: val });
      if (toggleLinkSize.checked && heightRange) {
        heightRange.value = val;
        updateSettings({ height: val });
      }
    });
  }

  if (borderRadiusRange) {
    borderRadiusRange.addEventListener('input', (e) => {
      updateSettings({ borderRadius: parseInt(e.target.value, 10) });
    });
  }

  if (opacityRange) {
    opacityRange.addEventListener('input', (e) => {
      updateSettings({ opacity: parseInt(e.target.value, 10) });
    });
  }

  // ── Tab tag management ───────────────────────────────────────────────

  function renderTags() {
    tabTags.innerHTML = '';
    if (targetTabs.length === 0) {
      tabHint.style.display = 'block';
    } else {
      tabHint.style.display = 'none';
      targetTabs.forEach((domain, idx) => {
        const tag = document.createElement('span');
        tag.className = 'process-tag';
        tag.textContent = domain;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'tag-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          targetTabs.splice(idx, 1);
          renderTags();
          updateSettings({ targetTabs: [...targetTabs] });
        });
        tag.appendChild(removeBtn);
        tabTags.appendChild(tag);
      });
    }
  }

  function addTab() {
    const raw = tabInput.value.trim();
    if (!raw) return;
    const name = raw.toLowerCase();
    if (!targetTabs.includes(name)) {
      targetTabs.push(name);
      renderTags();
      updateSettings({ targetTabs: [...targetTabs] });
    }
    tabInput.value = '';
    tabInput.focus();
  }

  btnAddTab.addEventListener('click', addTab);
  tabInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTab();
  });
  tabInput.addEventListener('input', (e) => {
    const list = document.getElementById('tabList');
    if (e.inputType === 'insertReplacementText' || 
        (list && Array.from(list.options).some(opt => opt.value === tabInput.value))) {
      addTab();
    }
  });

  async function refreshTabList() {
    chrome.tabs.query({}, (tabs) => {
      const list = document.getElementById('tabList');
      if (!list) return;
      list.innerHTML = '';
      
      const hostnames = new Set();
      tabs.forEach(tab => {
        try {
          const url = new URL(tab.url);
          if (url.protocol.startsWith('http')) {
            hostnames.add(url.hostname);
          }
        } catch(e) {}
      });
      
      hostnames.forEach(hostname => {
        const option = document.createElement('option');
        option.value = hostname;
        list.appendChild(option);
      });
    });
  }

  tabInput.addEventListener('focus', refreshTabList);

  function setTabGroupEnabled(enabled) {
    if (enabled) {
      tabGroup.classList.remove('disabled');
    } else {
      tabGroup.classList.add('disabled');
    }
  }
});
