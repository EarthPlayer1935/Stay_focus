chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled', 'fullRowMode', 'highlightMode', 'height', 'width', 'borderRadius', 'opacity', 'color'], (result) => {
    chrome.storage.local.set({
      enabled: result.enabled !== undefined ? result.enabled : false,
      fullRowMode: result.fullRowMode !== undefined ? result.fullRowMode : false,
      highlightMode: result.highlightMode !== undefined ? result.highlightMode : false,
      height: result.height !== undefined ? result.height : 50,
      width: result.width !== undefined ? result.width : 200,
      borderRadius: result.borderRadius !== undefined ? result.borderRadius : 12,
      opacity: result.opacity !== undefined ? result.opacity : 75,
      color: result.color !== undefined ? result.color : '#000000'
    });
  });
});

