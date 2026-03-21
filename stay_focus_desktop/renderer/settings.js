document.addEventListener('DOMContentLoaded', async () => {
  const electron = window.electronAPI;
  
  async function loadLocale(lang) {
    if (!electron) return (key) => key;
    const data = await electron.getLocale(lang);
    if (!data) return (key) => key;
    return (key) => (data[key] && data[key].message) || key;
  }

  function applyTranslations(t) {
    document.getElementById('pluginName').textContent                 = t('appName') || 'Stay Focus';
    document.querySelector('[for="toggleFullRow"]').textContent       = t('fullRowMode');
    document.querySelector('[for="toggleHighlightMode"]').textContent = t('colorHighlightMode');
    document.querySelector('[for="toggleLinkSize"]').textContent      = t('linkDimensions');
    document.querySelector('[for="heightRange"]').textContent         = t('spotlightHeight');
    document.querySelector('[for="widthRange"]').textContent          = t('spotlightWidth');
    document.querySelector('[for="borderRadiusRange"]').textContent   = t('cornerRadius');
    document.querySelector('[for="opacityRange"]').textContent        = t('opacity');
    document.querySelector('[for="colorPicker"]').textContent         = t('color');
    document.querySelector('[for="toggleAutoHide"]').textContent      = t('autoHideOnLeave');
    document.querySelector('[for="toggleKeyboardControl"]').textContent = (t('keyboardControl') || 'Keyboard Control') + ' (Shift+Alt+Arrow)';
    document.getElementById('btnSquare').title                        = t('shapeSquare');
    document.getElementById('btnRounded').title                       = t('shapeRounded');
    document.getElementById('btnCircle').title                        = t('shapeCircle');
    document.getElementById('btnKofi').title                          = t('supportKofi');
    document.getElementById('btnGithub').title                        = t('supportGithub');
    document.getElementById('uipiWarningText').textContent            = t('uipiWarning') || 'The spotlight may freeze over high-privilege windows (like Task Manager). Run as Administrator to fix this.';
  }

  const btnLanguage = document.getElementById('btnLanguage');
  const btnKofi = document.getElementById('btnKofi');
  const btnGithub = document.getElementById('btnGithub');
  const btnNightMode = document.getElementById('btnNightMode');
  const langMenu = document.getElementById('langMenu');
  const appVersion = document.getElementById('appVersion');
  const btnUpdate = document.getElementById('btnUpdate');

  if (electron.getVersion) {
    electron.getVersion().then(v => {
      if (appVersion) appVersion.textContent = 'v' + v;
    });
  }

  if (electron.checkForUpdates) {
    electron.checkForUpdates().catch(err => console.error(err));
  }

  if (electron.onUpdateAvailable) {
    electron.onUpdateAvailable((event, info) => {
      if (btnUpdate) {
        btnUpdate.style.display = 'inline-block';
        btnUpdate.textContent = '🚀 New';
        btnUpdate.title = `Update available: ${info?.version || 'New version'}. Click to download.`;
      }
    });
  }

  if (electron.onUpdateProgress) {
    electron.onUpdateProgress((event, progressObj) => {
      if (btnUpdate) {
        btnUpdate.textContent = `⏳ ${Math.round(progressObj.percent)}%`;
        btnUpdate.title = 'Downloading update...';
      }
    });
  }

  if (electron.onUpdateError) {
    electron.onUpdateError((event, msg) => {
      if (btnUpdate) {
        btnUpdate.textContent = '❌ Error';
        btnUpdate.title = 'Error: ' + msg;
      }
    });
  }

  if (btnUpdate && electron.downloadUpdate) {
    btnUpdate.addEventListener('click', () => {
      btnUpdate.textContent = '⏳ ...';
      btnUpdate.title = 'Starting download...';
      electron.downloadUpdate();
    });
  }

  let settings = await electron.getSettings();
  
  const sysLang = await electron.getSystemLocale();
  const browserLang = sysLang ? sysLang.replace('-', '_') : 'en';
  
  const lang = settings.userLang || browserLang || 'en';
  let normalized = lang.split('_')[0];
  if (lang.startsWith('zh')) {
    normalized = (lang.includes('TW') || lang.includes('HK') || lang.includes('Hant')) ? 'zh_TW' : 'zh_CN';
  }
  const options = Array.from(document.querySelectorAll('.lang-option'));
  const resolved = options.find(opt => opt.dataset.value === lang) ? lang :
                   options.find(opt => opt.dataset.value === normalized) ? normalized : 'en';
  
  const t = await loadLocale(resolved);
  applyTranslations(t);

  if (settings.nightMode) {
    document.body.classList.add('dark-mode');
    btnNightMode.textContent = '☀️';
  }

  btnLanguage.addEventListener('click', (e) => {
    langMenu.classList.toggle('hidden');
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    langMenu.classList.add('hidden');
  });

  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', async () => {
      const selectedLang = option.dataset.value;
      updateSettings({ userLang: selectedLang });
      const t = await loadLocale(selectedLang);
      applyTranslations(t);
      langMenu.classList.add('hidden');
    });
  });

  btnNightMode.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    updateSettings({ nightMode: isDark });
    btnNightMode.textContent = isDark ? '☀️' : '🌙';
  });

  btnKofi.addEventListener('click', () => electron.openExternal('https://ko-fi.com/earthplayer'));
  btnGithub.addEventListener('click', () => electron.openExternal('https://github.com/EarthPlayer1935/Stay_focus'));

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

  // Process tag UI elements
  const processGroup = document.getElementById('processGroup');
  const processTags = document.getElementById('processTags');
  const processInput = document.getElementById('processInput');
  const btnAddProcess = document.getElementById('btnAddProcess');
  const processHint = document.getElementById('processHint');

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

  toggleFocus.checked = settings.enabled;
  toggleFullRow.checked = settings.fullRowMode;
  toggleHighlightMode.checked = settings.highlightMode;
  toggleLinkSize.checked = settings.linkSize;
  toggleAutoHide.checked = settings.autoHide;
  toggleKeyboardControl.checked = settings.keyboardControl;
  heightRange.value = settings.height;
  widthRange.value = settings.width;
  borderRadiusRange.value = settings.borderRadius;
  opacityRange.value = settings.opacity;
  colorPicker.value = settings.color;

  if (settings.fullRowMode) {
    widthRange.disabled = true;
    toggleLinkSize.disabled = true;
  }

  // ── Process tag management ───────────────────────────────────────────────
  let targetProcesses = Array.isArray(settings.targetProcesses) ? [...settings.targetProcesses] : [];

  function renderTags() {
    processTags.innerHTML = '';
    if (targetProcesses.length === 0) {
      processHint.style.display = 'block';
    } else {
      processHint.style.display = 'none';
      targetProcesses.forEach((name, idx) => {
        const tag = document.createElement('span');
        tag.className = 'process-tag';
        tag.textContent = name;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'tag-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          targetProcesses.splice(idx, 1);
          renderTags();
          updateSettings({ targetProcesses: [...targetProcesses] });
        });
        tag.appendChild(removeBtn);
        processTags.appendChild(tag);
      });
    }
  }

  function addProcess() {
    const raw = processInput.value.trim();
    if (!raw) return;
    // Normalize: strip .exe suffix for comparison but keep it for storage as-is
    const name = raw.replace(/\.exe$/i, '').toLowerCase();
    if (!name) return;
    // Avoid duplicates (case-insensitive)
    if (!targetProcesses.some(p => p.toLowerCase().replace(/\.exe$/i, '') === name)) {
      targetProcesses.push(raw);
      renderTags();
      updateSettings({ targetProcesses: [...targetProcesses] });
    }
    processInput.value = '';
    processInput.focus();
  }

  btnAddProcess.addEventListener('click', addProcess);
  processInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProcess();
  });
  processInput.addEventListener('input', (e) => {
    const list = document.getElementById('processList');
    if (e.inputType === 'insertReplacementText' || 
        (list && Array.from(list.options).some(opt => opt.value === processInput.value))) {
      addProcess();
    }
  });

  async function refreshProcessList() {
    if (!electron || !electron.getRunningProcesses) return;
    const processes = await electron.getRunningProcesses();
    const list = document.getElementById('processList');
    if (!list) return;
    
    list.innerHTML = '';
    processes.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      list.appendChild(option);
    });
  }

  processInput.addEventListener('focus', refreshProcessList);

  // Disable process group when auto-hide is off
  function setProcessGroupEnabled(enabled) {
    if (enabled) {
      processGroup.classList.remove('disabled');
    } else {
      processGroup.classList.add('disabled');
    }
  }

  setProcessGroupEnabled(settings.autoHide);
  renderTags();
  // ────────────────────────────────────────────────────────────────────────

  function updateSettings(updates) {
    electron.saveSettings(updates);
  }

  toggleFocus.addEventListener('change', (e) => updateSettings({ enabled: e.target.checked }));

  toggleFullRow.addEventListener('change', (e) => {
    const isFull = e.target.checked;
    updateSettings({ fullRowMode: isFull });
    widthRange.disabled = isFull;
    toggleLinkSize.disabled = isFull;
  });

  toggleHighlightMode.addEventListener('change', (e) => updateSettings({ highlightMode: e.target.checked }));

  toggleAutoHide.addEventListener('change', (e) => {
    updateSettings({ autoHide: e.target.checked });
    setProcessGroupEnabled(e.target.checked);
  });

  toggleKeyboardControl.addEventListener('change', (e) => updateSettings({ keyboardControl: e.target.checked }));
  
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

  btnSquare.addEventListener('click', () => applyPreset(200, 200, 0, true));
  btnRounded.addEventListener('click', () => applyPreset(300, 50, 12, false));
  btnCircle.addEventListener('click', () => applyPreset(150, 150, 150, true));

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

  borderRadiusRange.addEventListener('input', (e) => updateSettings({ borderRadius: parseInt(e.target.value) }));
  opacityRange.addEventListener('input', (e) => updateSettings({ opacity: parseInt(e.target.value) }));
  colorPicker.addEventListener('input', (e) => updateSettings({ color: e.target.value }));
  colorPicker.addEventListener('change', (e) => updateSettings({ color: e.target.value }));
});
