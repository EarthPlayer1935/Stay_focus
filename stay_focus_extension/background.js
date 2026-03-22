chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'linkSize', 'height', 'width', 'borderRadius', 'opacity', 'color'], (result) => {
    chrome.storage.local.set({
      enabled: result.enabled !== undefined ? result.enabled : false,
      fullRowMode: result.fullRowMode !== undefined ? result.fullRowMode : false,
      highlightMode: result.highlightMode !== undefined ? result.highlightMode : false,
      linkSize: result.linkSize !== undefined ? result.linkSize : true,
      height: result.height !== undefined ? result.height : 79,
      width: result.width !== undefined ? result.width : 79,
      borderRadius: result.borderRadius !== undefined ? result.borderRadius : 150,
      opacity: result.opacity !== undefined ? result.opacity : 10,
      color: result.color !== undefined ? result.color : '#000000',
      autoHide: result.autoHide !== undefined ? result.autoHide : true,
      keyboardControl: result.keyboardControl !== undefined ? result.keyboardControl : false,
      isPopupOpen: false
    });
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'stay_focus_popup') {
    chrome.storage.local.set({ isPopupOpen: true });
    port.onDisconnect.addListener(() => {
      chrome.storage.local.set({ isPopupOpen: false });
    });
  }
});
