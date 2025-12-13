// State
let tabsSidebarState = {
    isOpen: false,
    tabs: [],
    collapsedWindows: new Set(),
    tabsWithAudio: new Set(),
    playingSectionCollapsed: false
};

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

async function loadTabsFromBrowser() {
    try {
        const tabs = await browserAPI.tabs.query({});
        tabsSidebarState.tabs = tabs.map(tab => {
            if (tab.audible) {
                tabsSidebarState.tabsWithAudio.add(tab.id);
            }
            return {
                id: tab.id,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                active: tab.active,
                windowId: tab.windowId,
                audible: tab.audible || false,
                mutedInfo: tab.mutedInfo || { muted: false },
                hasAudio: tabsSidebarState.tabsWithAudio.has(tab.id)
                // track if it ever had audio so it doesnt instantly dissappear
            };
        });
    } catch (error) {
        console.error('loadTabsFromBrowser: Error loading tabs:', error);
        tabsSidebarState.tabs = [];
    }
}

function toggleWindowCollapse(windowId) {
    if (tabsSidebarState.collapsedWindows.has(windowId)) {
        tabsSidebarState.collapsedWindows.delete(windowId);
    } else {
        tabsSidebarState.collapsedWindows.add(windowId);
    }
    renderTabsSidebar();
}

function togglePlayingCollapse() {
    tabsSidebarState.playingSectionCollapsed = !tabsSidebarState.playingSectionCollapsed;
    renderTabsSidebar();
}

function renderTabItem(tab, showAudioControls = false) {
    const tabItem = document.createElement('div');
    tabItem.className = 'tabs-item';
    if (tab.active) {
        tabItem.classList.add('active');
    }
    tabItem.draggable = true;
    let dragStarted = false;
    tabItem.addEventListener('dragstart', (e) => {
        dragStarted = true;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify({
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl
        }));
        tabItem.classList.add('dragging');
    });
    tabItem.addEventListener('dragend', () => {
        dragStarted = false;
        tabItem.classList.remove('dragging');
    });
    const favicon = document.createElement('img');
    favicon.className = 'tabs-item-favicon';
    if (tab.favIconUrl) {
        favicon.src = tab.favIconUrl;
        favicon.onerror = function() {
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'tabs-item-favicon-placeholder';
            placeholder.textContent = tab.title ? tab.title[0].toUpperCase() : '?';
            tabItem.insertBefore(placeholder, this.nextSibling);
        };
    } else {
        favicon.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'tabs-item-favicon-placeholder';
        placeholder.textContent = tab.title ? tab.title[0].toUpperCase() : '?';
        tabItem.appendChild(placeholder);
    }
    tabItem.appendChild(favicon);
    const tabInfo = document.createElement('div');
    tabInfo.className = 'tabs-item-info';
    const tabTitle = document.createElement('div');
    tabTitle.className = 'tabs-item-title';
    tabTitle.textContent = tab.title || 'Untitled';
    const tabUrl = document.createElement('div');
    tabUrl.className = 'tabs-item-url';
    try {
        const url = new URL(tab.url);
        tabUrl.textContent = url.hostname;
    } catch (e) {
        tabUrl.textContent = tab.url;
    }
    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabUrl);
    tabItem.appendChild(tabInfo);
    if (showAudioControls && tab.hasAudio) {
        const audioBtn = document.createElement('button');
        audioBtn.className = 'tabs-item-audio';
        audioBtn.textContent = tab.mutedInfo.muted ? '🕨' : '🕪';
        audioBtn.title = tab.mutedInfo.muted ? 'Unmute' : 'Mute';
        audioBtn.draggable = false;
        audioBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        audioBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleTabMute(tab.id, !tab.mutedInfo.muted);
        });
        tabItem.appendChild(audioBtn);
    }
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tabs-item-close';
    closeBtn.draggable = false;
    closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    closeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await closeTab(tab.id);
    });
    tabItem.appendChild(closeBtn);
    
    tabItem.addEventListener('click', async (e) => {
        if (!dragStarted && !e.target.closest('button')) {
            await switchToTab(tab.id, tab.windowId);
        }
    });
    return tabItem;
}

function renderTabsSidebar() {
    const sidebar = document.getElementById('tabs-sidebar');
    const tabsList = document.getElementById('tabs-list');
    if (!sidebar || !tabsList) return;
    tabsList.innerHTML = '';
    const playingTabs = tabsSidebarState.tabs.filter(tab => 
        tab.audible || (tab.mutedInfo.muted && tab.hasAudio)
    );
    if (playingTabs.length > 0) {
        const playingHeader = document.createElement('div');
        playingHeader.className = 'tabs-section-header';
        playingHeader.innerHTML = `Playing (${playingTabs.length} tab${playingTabs.length !== 1 ? 's' : ''}) ${tabsSidebarState.playingSectionCollapsed ? '↓' : '↑'}`;
        playingHeader.addEventListener('click', () => togglePlayingCollapse());
        tabsList.appendChild(playingHeader);
        
        if (!tabsSidebarState.playingSectionCollapsed) {
            playingTabs.forEach(tab => {
                tabsList.appendChild(renderTabItem(tab, true));
            });
        }
    }
    const tabsByWindow = {};
    tabsSidebarState.tabs.forEach(tab => {
        if (!tabsByWindow[tab.windowId]) {
            tabsByWindow[tab.windowId] = [];
        }
        tabsByWindow[tab.windowId].push(tab);
    });
    Object.entries(tabsByWindow).forEach(([windowId, tabs], index) => {
        const isCollapsed = tabsSidebarState.collapsedWindows.has(windowId);
        const windowHeader = document.createElement('div');
        windowHeader.className = 'tabs-window-header';
        windowHeader.innerHTML = `Window ${index + 1} (${tabs.length} tab${tabs.length !== 1 ? 's' : ''}) ${isCollapsed ? '↓' : '↑'}`;
        windowHeader.addEventListener('click', () => toggleWindowCollapse(windowId));
        tabsList.appendChild(windowHeader); 
        if (!isCollapsed) {
            tabs.forEach(tab => {
                tabsList.appendChild(renderTabItem(tab, false));
            });
        }
    });
    const tabCount = document.getElementById('tabs-count');
    if (tabCount) {
        tabCount.textContent = tabsSidebarState.tabs.length;
    }
}

export function updateTriggerVisibility(currentMode) {
    const tabsSidebar = document.getElementById('tabs-sidebar');
    const tabsTrigger = document.querySelector('.tht');
    const mode = currentMode || 'disabled'; 
    
    if (tabsTrigger && tabsSidebar) {
        if (mode === 'autohide') {
            tabsTrigger.style.display = 'block';
            tabsSidebar.classList.remove('open'); 
        } else {
            tabsTrigger.style.display = 'none';
        }
    }
}

async function switchToTab(tabId, windowId) {
    try {
        await browserAPI.windows.update(windowId, { focused: true });
        await browserAPI.tabs.update(tabId, { active: true });
    } catch (error) {
        console.error('switchToTab: Error switching to tab:', error);
    }
}

async function closeTab(tabId) {
    try {
        await browserAPI.tabs.remove(tabId);
        tabsSidebarState.tabsWithAudio.delete(tabId);
        await loadTabsFromBrowser();
        renderTabsSidebar();
    } catch (error) {
        console.error('switchToTab: Error closing tab:', error);
    }
}

async function toggleTabMute(tabId, muted) {
    try {
        await browserAPI.tabs.update(tabId, { muted: muted });
        await loadTabsFromBrowser();
        renderTabsSidebar();
    } catch (error) {
        console.error('switchToTab: Error muting tab:', error);
    }
}

function toggleTabsSidebar() {
    const sidebar = document.getElementById('tabs-sidebar');
    if (!sidebar) return;
    tabsSidebarState.isOpen = !tabsSidebarState.isOpen;
    if (tabsSidebarState.isOpen) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
    }
}

export async function initTabsSidebar() {
    await loadTabsFromBrowser();
    renderTabsSidebar();
    setupEventListeners();
}

function setupEventListeners() {
    const sidebar = document.getElementById('tabs-sidebar');
    const closeBtn = document.getElementById('close-tabs-sidebar');
    const tabsBtn = document.getElementById('tabs-btn');
    const tabsTrigger = document.querySelector('.tht');
    if (!sidebar) return;
    if (tabsBtn) {
        tabsBtn.addEventListener('click', () => {
            toggleTabsSidebar();
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleTabsSidebar();
        });
    }
    // Auto-hide
    sidebar.addEventListener('mouseenter', () => {
        const mode = window.tabsSidebarMode || 'disabled';
        if (mode === 'autohide' && !tabsSidebarState.isOpen) {
            toggleTabsSidebar();
        }
    });
    sidebar.addEventListener('mouseleave', () => {
        const mode = window.tabsSidebarMode || 'disabled';
        if (mode === 'autohide' && tabsSidebarState.isOpen) {
            setTimeout(() => {
                if (tabsTrigger && !tabsTrigger.matches(':hover')) { 
                    toggleTabsSidebar();
                }
            }, 50); 
        }
    });
    if (tabsTrigger) {
        tabsTrigger.addEventListener('mouseenter', () => {
            const mode = window.tabsSidebarMode || 'disabled';
            if (mode === 'autohide' && !tabsSidebarState.isOpen) {
                toggleTabsSidebar();
            }
        });
    }

    // Browser API compatible listeners
    if (browserAPI.tabs) { 
        browserAPI.tabs.onCreated.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebar();
        });
        
        browserAPI.tabs.onRemoved.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebar();
        });
        
        browserAPI.tabs.onUpdated.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebar();
        });
        
        browserAPI.tabs.onActivated.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebar();
        });
    }
}