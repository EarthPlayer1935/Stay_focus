chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: false,
    fullRowMode: false,
    highlightMode: false, // false = dim background, true = colored focus area
    height: 50,
    width: 200,
    opacity: 75,
    color: '#000000'
  });
});

chrome.action.onClicked.addListener((tab) => {
    // If not using a default popup, we could toggle here.
    // But since we use a popup.html, this event usually doesn't fire.
});
