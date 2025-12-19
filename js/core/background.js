chrome.runtime.onInstalled.addListener(() => {
  console.log('...Background worker initialized...');
  // context menu options for turning links/tabs into shortcuts
  chrome.contextMenus.create({
    id: "add-link-shortcut",
    title: "Turn into Shortcut",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "add-tab-shortcut",
    title: "Turn into Shortcut",
    contexts: ["tab"]
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let shortcuts = [];
  // links
  if (info.menuItemId === "add-link-shortcut") {
    const url = info.linkUrl;
    const title = info.linkText || new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    shortcuts.push({
      id: Date.now(),
      title: title,
      url: url,
      icon: favicon,
      pinned: false,
      order: -1
    });
  } 
  // tabs and multi selected
  else if (info.menuItemId === "add-tab-shortcut") {
    const highlightedTabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
    const tabsToAdd = highlightedTabs.length > 1 ? highlightedTabs : [tab];
    tabsToAdd.forEach((currentTab, index) => {
      const url = currentTab.url;
      const title = currentTab.title;
      const favicon = currentTab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
      shortcuts.push({
        id: Date.now() + index,
        title: title,
        url: url,
        icon: favicon,
        pinned: false,
        order: -1
      });
    });
  }
  if (shortcuts.length > 0) {
    await addShortcutsToStorage(shortcuts);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((currentTab) => {
        if (currentTab.url && currentTab.url.includes('index.html')) {
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'add-shortcuts',
            shortcuts: shortcuts
          }).catch(() => {
          });
        }
      });
    });
  }
});
async function addShortcutsToStorage(newShortcuts) {
  try {
    const result = await chrome.storage.local.get(['pendingShortcuts']);
    const pending = result.pendingShortcuts || [];
    pending.push(...newShortcuts);
    await chrome.storage.local.set({ pendingShortcuts: pending });
    console.log(`Background: addShortcutsToStorage: ${newShortcuts.length} shortcut(s) pending`);
  } catch (error) {
    console.error('Background: addShortcutsToStorage:', error);
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'clear-pending-shortcuts') {
    chrome.storage.local.remove('pendingShortcuts');
    sendResponse({ success: true });
  }
  return true;
});