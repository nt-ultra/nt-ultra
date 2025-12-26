import ContextMenuManager from '../core/context-manager.js';

// State
let tabsSidebarState = {
    isOpen: false,
    tabs: [],
    groups: [],
    mode: 'tabs',
    collapsedWindows: new Set(),
    collapsedGroups: new Set(),
    tabsWithAudio: new Set(),
    playingSectionCollapsed: false
};

// Browser comp
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// browser mode, tabs | groups
function switchMode(newMode) {
    tabsSidebarState.mode = newMode;
    const sidebar = document.getElementById('tabs-sidebar');
    if (sidebar) {
        sidebar.setAttribute('mode', newMode);
    }
    const tabsHeader = document.getElementById('tabs-content-header-tabs');
    const groupsHeader = document.getElementById('tabs-content-header-groups');
    if (tabsHeader) tabsHeader.toggleAttribute('selected', newMode === 'tabs');
    if (groupsHeader) groupsHeader.toggleAttribute('selected', newMode === 'groups');
    const tabsCount = document.getElementById('tabs-content-tabs-count');
    const groupsCount = document.getElementById('tabs-content-groups-count');
    if (tabsCount) tabsCount.toggleAttribute('hidden', newMode !== 'tabs');
    if (groupsCount) groupsCount.toggleAttribute('hidden', newMode !== 'groups');
    // collapse first, persist while, seems like the easiest way to display
    if (newMode === 'groups' && tabsSidebarState.collapsedGroups.size === 0) {
        tabsSidebarState.groups.forEach(group => {
            tabsSidebarState.collapsedGroups.add(group.id);
        });
    }
    renderTabsSidebarContent();
}




async function loadTabsFromBrowser() {
    try {
        const tabs = await browserAPI.tabs.query({});
        const groupedTab = tabs.find(t => t.groupId && t.groupId !== -1);
        // if (groupedTab) {
        //     console.log('TEST GROUPED TAB', tabs[0]?.groupId);
        //     console.log('TEST GROUPED TAB properties', Object.keys(groupedTab));
        // }
        tabsSidebarState.tabs = tabs.map(tab => {
            if (tab.audible) {
                tabsSidebarState.tabsWithAudio.add(tab.id);
            }
            return {
                id: tab.id,
                index: tab.index,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                active: tab.active,
                pinned: tab.pinned,
                windowId: tab.windowId,
                groupId: tab.groupId || -1,
                audible: tab.audible || false,
                mutedInfo: tab.mutedInfo || { muted: false },
                hasAudio: tabsSidebarState.tabsWithAudio.has(tab.id),
                discarded: tab.discarded || false
            };
        });
        const tabsCountEl = document.getElementById('tabs-count');
        if (tabsCountEl) {
            tabsCountEl.textContent = tabsSidebarState.tabs.length;
        }
    } catch (error) {
        console.error('loadTabsFromBrowser: Error loading tabs:', error);
        tabsSidebarState.tabs = [];
    }
}

async function loadTabGroups() {
    try {
        let groups = [];
        if (browserAPI.tabGroups && browserAPI.tabGroups.query) {
            try {
                groups = await browserAPI.tabGroups.query({});
                const windows = await browserAPI.windows.getAll();
                const allGroups = [];
                for (const window of windows) {
                    const windowGroups = await browserAPI.tabGroups.query({ windowId: window.id });
                    allGroups.push(...windowGroups);
                }
                groups = allGroups.length > groups.length ? allGroups : groups;
            } catch (e) {
                console.error('loadTabGroups failed to query tab groups:', e);
            }
        }        
        const allTabs = await browserAPI.tabs.query({});
        const groupIds = new Set();
        allTabs.forEach(tab => {
            if (tab.groupId && tab.groupId !== -1) {
                groupIds.add(tab.groupId);
            }
        });
        if (groupIds.size > 0 && browserAPI.tabGroups) {
            try {
                groups = await browserAPI.tabGroups.query({});
            } catch (e) {
                for (const groupId of groupIds) {
                    try {
                        const group = await browserAPI.tabGroups.get(groupId);
                        groups.push(group);
                    } catch (err) {
                        console.warn('loadTabGroups failed for', groupId, err.message);
                    }
                }
            }
        }
        if (groups.length === 0 && groupIds.size > 0) {
            for (const groupId of groupIds) {
                groups.push({
                    id: groupId,
                    title: `Group ${groupId}`,
                    color: 'grey',
                    collapsed: group.collapsed || false,
                    windowId: allTabs.find(t => t.groupId === groupId)?.windowId || 1
                });
            }
        }
        tabsSidebarState.groups = groups.map(group => ({
            id: group.id,
            title: group.title || 'Unnamed Group',
            color: group.color || 'grey',
            collapsed: group.collapsed || false,
            windowId: group.windowId
        }));
        const totalGroups = tabsSidebarState.groups.length;
        const closedGroups = tabsSidebarState.groups.filter(g => g.collapsed).length;
        const groupsCountEl = document.getElementById('groups-count');
        const closedGroupsCountEl = document.getElementById('closed-groups-count');
        if (groupsCountEl) groupsCountEl.textContent = totalGroups;
        if (closedGroupsCountEl) closedGroupsCountEl.textContent = closedGroups;
    } catch (error) {
        console.error('loadTabGroups: Error:', error);
        tabsSidebarState.groups = [];
    }
}




function toggleWindowCollapse(windowId) {
    if (tabsSidebarState.collapsedWindows.has(windowId)) {
        tabsSidebarState.collapsedWindows.delete(windowId);
    } else {
        tabsSidebarState.collapsedWindows.add(windowId);
    }
    const container = document.querySelector(`.tabs-window-container[data-window-id="${windowId}"]`);
    if (container) {
        const items = container.querySelector('.tabs-window-items');
        const header = container.querySelector('.tabs-window-header');
        const isCollapsed = tabsSidebarState.collapsedWindows.has(windowId);
        items.style.display = isCollapsed ? 'none' : 'block';
        const spans = header.querySelectorAll('span');
        const arrow = spans[spans.length - 1] || header.lastChild;
        if (arrow) {
            arrow.textContent = isCollapsed ? '↓' : '↑';
        }
    }
}

function togglePlayingCollapse() {
    tabsSidebarState.playingSectionCollapsed = !tabsSidebarState.playingSectionCollapsed;
    const container = document.querySelector('.tabs-section-container');
    if (container) {
        const items = container.querySelector('.tabs-section-items');
        const header = container.querySelector('.tabs-section-header');
        
        items.style.display = tabsSidebarState.playingSectionCollapsed ? 'none' : 'block';
        const arrow = header.lastChild;
        if (arrow) arrow.textContent = tabsSidebarState.playingSectionCollapsed ? ' ↓' : ' ↑';
    }
}
function toggleGroupCollapse(groupId) {
    if (tabsSidebarState.collapsedGroups.has(groupId)) {
        tabsSidebarState.collapsedGroups.delete(groupId);
    } else {
        tabsSidebarState.collapsedGroups.add(groupId);
    }
    const container = document.querySelector(`.tabs-group-container[data-group-id="${groupId}"]`);
    if (container) {
        const items = container.querySelector('.tabs-group-items');
        const header = container.querySelector('.tabs-group-header');
        const isCollapsed = tabsSidebarState.collapsedGroups.has(groupId);
        items.style.display = isCollapsed ? 'none' : 'block';
        const spans = header.querySelectorAll('span');
        const arrow = spans[spans.length - 1];
        if (arrow) {
            arrow.textContent = isCollapsed ? '↓' : '↑';
        }
    }
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
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('application/json', JSON.stringify({
            tabId: tab.id,
            fromWindowId: tab.windowId,
            fromGroupId: tab.groupId,
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
    tabItem.addEventListener('auxclick', async (e) => {
        if (e.button === 1 && !e.target.closest('button')) {
            e.preventDefault();
            await switchToTab(tab.id, tab.windowId);
        }
    });
    tabItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ContextMenuManager.show(e, tab, [
            { action: 'reload', label: 'Reload Tab', handler: () => reloadTab(tab.id) },
            { action: 'pin', label: tab.pinned ? 'Unpin Tab' : 'Pin Tab', handler: () => togglePinTab(tab.id) },
            { action: 'copy', label: 'Copy Link', handler: () => {navigator.clipboard.writeText(tab.url); notify('Link Copied to Clipboard', `${tab.url}`);}},
            { action: 'sleep', label: 'Sleep Tab', handler: () => sleepTab(tab.id) },
            { action: 'close', label: 'Close Tab', danger: true, handler: () => closeTab(tab.id) }
        ]);
    });
    return tabItem;
}

function renderTabsSidebarContent() {
    const tabsList = document.getElementById('tabs-list');
    if (!tabsList) return;
    tabsList.innerHTML = '';
    if (tabsSidebarState.mode === 'tabs') {
        renderTabsView();
    } else {
        renderGroupsView();
    }
}





function renderTabsView() {
    const tabsList = document.getElementById('tabs-list');
    if (!tabsList) return;
    
    const playingTabs = tabsSidebarState.tabs.filter(tab => 
        tab.audible || (tab.mutedInfo.muted && tab.hasAudio)
    );
    if (playingTabs.length > 0) {
        const playingContainer = document.createElement('div');
        playingContainer.className = 'tabs-section-container';
        const playingHeader = document.createElement('div');
        playingHeader.className = 'tabs-section-header';
        playingHeader.innerHTML = `<span>Playing (${playingTabs.length} tab${playingTabs.length !== 1 ? 's' : ''})</span> <span>${tabsSidebarState.playingSectionCollapsed ? '↓' : '↑'}</span>`;
        playingHeader.addEventListener('click', () => togglePlayingCollapse());
        const playingItems = document.createElement('div');
        playingItems.className = 'tabs-section-items';
        playingItems.style.display = tabsSidebarState.playingSectionCollapsed ? 'none' : 'block';
        playingTabs.forEach(tab => {
            playingItems.appendChild(renderTabItem(tab, true));
        });
        playingContainer.appendChild(playingHeader);
        playingContainer.appendChild(playingItems);
        tabsList.appendChild(playingContainer);
    }
    
    const tabsByWindow = {};
    tabsSidebarState.tabs.forEach(tab => {
        if (!tabsByWindow[tab.windowId]) {
            tabsByWindow[tab.windowId] = [];
        }
        tabsByWindow[tab.windowId].push(tab);
    });
    Object.entries(tabsByWindow).forEach(([windowId, tabs], index) => {
        const windowIdNum = Number(windowId);
        const isCollapsed = tabsSidebarState.collapsedWindows.has(windowIdNum);
        const windowContainer = document.createElement('div');
        windowContainer.className = 'tabs-window-container';
        windowContainer.dataset.windowId = windowIdNum;

        windowContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            windowContainer.classList.add('drag-over');
        });
        windowContainer.addEventListener('dragleave', (e) => {
            if (e.target === windowContainer) {
                windowContainer.classList.remove('drag-over');
            }
        });
        windowContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            windowContainer.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.tabId && data.fromWindowId !== windowIdNum) {
                    await browserAPI.tabs.move(data.tabId, { 
                        windowId: windowIdNum, 
                        index: -1 
                    });
                    await loadTabsFromBrowser();
                    renderTabsSidebarContent();
                }
            } catch (err) {
                console.error('Drop failed:', err);
            }
        });

        const windowHeader = document.createElement('div');
        windowHeader.className = 'tabs-window-header';
        windowHeader.innerHTML = `<span>Window ${index + 1} (${tabs.length} tab${tabs.length !== 1 ? 's' : ''})</span> <span>${isCollapsed ? '↓' : '↑'}</span>`;
        windowHeader.addEventListener('click', () => toggleWindowCollapse(windowIdNum));

        windowHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ContextMenuManager.show(e, { windowId: windowIdNum, tabs }, [
                { action: 'new-tab', label: 'New Tab in Window', handler: () => createNewTabInWindow(windowIdNum) },
                { action: 'reload-all', label: 'Reload All', handler: () => reloadAllTabsInWindow(windowIdNum) },
                { action: 'pin-all', label: 'Pin All Tabs', handler: () => pinAllTabsInWindow(windowIdNum) },
                { action: 'sleep-all', label: 'Sleep All Tabs', handler: () => sleepAllTabsInWindow(windowIdNum) },
                { action: 'close-all', label: 'Close Window', danger: true, handler: () => closeAllTabsInWindow(windowIdNum) }
            ]);
        });

        const windowItems = document.createElement('div');
        windowItems.className = 'tabs-window-items';
        windowItems.style.display = isCollapsed ? 'none' : 'block';
        
        tabs.forEach(tab => {
            windowItems.appendChild(renderTabItem(tab, false));
        });
        windowContainer.appendChild(windowHeader);
        windowContainer.appendChild(windowItems);
        tabsList.appendChild(windowContainer);
    });
}

function renderGroupsView() {
    const tabsList = document.getElementById('tabs-list');
    if (!tabsList) return;
    const tabsByGroup = {};
    const ungroupedTabs = [];
    tabsSidebarState.tabs.forEach(tab => {
        if (tab.groupId && tab.groupId !== -1) {
            if (!tabsByGroup[tab.groupId]) {
                tabsByGroup[tab.groupId] = [];
            }
            tabsByGroup[tab.groupId].push(tab);
        } else {
            ungroupedTabs.push(tab);
        }
    });
    tabsSidebarState.groups.forEach(group => {
        const groupTabs = tabsByGroup[group.id] || [];
        const isCollapsed = tabsSidebarState.collapsedGroups.has(group.id);
        const groupContainer = document.createElement('div');
        groupContainer.className = 'tabs-group-container';
        groupContainer.dataset.groupId = group.id;
        groupContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            groupContainer.classList.add('drag-over');
        });
        groupContainer.addEventListener('dragleave', (e) => {
            if (e.target === groupContainer) {
                groupContainer.classList.remove('drag-over');
            }
        });
        groupContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            groupContainer.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.tabId && data.fromGroupId !== group.id) {
                    await browserAPI.tabs.group({ 
                        tabIds: [data.tabId], 
                        groupId: group.id 
                    });
                    await loadTabsFromBrowser();
                    await loadTabGroups();
                    renderTabsSidebarContent();
                }
            } catch (err) { console.error('Drop failed:', err); }
        });
        const groupHeader = document.createElement('div');
        groupHeader.className = 'tabs-group-header';
        groupHeader.setAttribute('tab-group-color', group.color);
        groupHeader.innerHTML = `<span>${group.title} (${groupTabs.length} tab${groupTabs.length !== 1 ? 's' : ''})</span> <span>${isCollapsed ? '↓' : '↑'}</span>`;
        groupHeader.addEventListener('click', () => toggleGroupCollapse(group.id));

        groupHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ContextMenuManager.show(e, { group, tabs: groupTabs }, [
                { action: 'new-tab-group', label: 'New Tab in Group', handler: () => createNewTabInGroup(group.id) },
                { action: 'pin-group', label: 'Pin Group', handler: () => pinGroup(group.id) },
                { action: 'pin-all', label: 'Pin All Tabs', handler: () => pinAllTabsInGroup(group.id) },
                { action: 'reload-all', label: 'Reload All', handler: () => reloadAllTabsInGroup(group.id) },
                { action: 'sleep-all', label: 'Sleep All Tabs', handler: () => sleepAllTabsInGroup(group.id) },
                { action: 'close-group', label: 'Close Group', danger: true, handler: () => closeGroup(group.id) }
            ]);
        });

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-group-items';
        tabsContainer.style.display = isCollapsed ? 'none' : 'block';
                
        groupTabs.forEach(tab => {
            const tabItem = renderTabItem(tab, false);
            tabItem.setAttribute('tab-group-color', group.color);
            tabsContainer.appendChild(tabItem);
        });
        groupContainer.appendChild(groupHeader);
        groupContainer.appendChild(tabsContainer);
        tabsList.appendChild(groupContainer);
    });
    // ungrouped tabs
    if (ungroupedTabs.length > 0) {
        const ungroupedId = 'ungrouped';
        const isCollapsed = tabsSidebarState.collapsedGroups.has(ungroupedId);
        const ungroupedContainer = document.createElement('div');
        ungroupedContainer.className = 'tabs-group-container';
        ungroupedContainer.dataset.groupId = ungroupedId;

        ungroupedContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            ungroupedContainer.classList.add('drag-over');
        });
        ungroupedContainer.addEventListener('dragleave', (e) => {
            if (e.target === ungroupedContainer) {
                ungroupedContainer.classList.remove('drag-over');
            }
        });
        ungroupedContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            ungroupedContainer.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                // If dropping a grouped tab into ungrouped, UNGROUP it
                if (data.tabId && data.fromGroupId !== -1) {
                    await browserAPI.tabs.ungroup(data.tabId);
                    await loadTabsFromBrowser();
                    await loadTabGroups();
                    renderTabsSidebarContent();
                }
            } catch (err) { 
                console.error('Ungroup failed:', err); 
            }
        });        

        const ungroupedHeader = document.createElement('div');
        ungroupedHeader.className = 'tabs-group-header';
        ungroupedHeader.innerHTML = `<span>Ungrouped (${ungroupedTabs.length} tab${ungroupedTabs.length !== 1 ? 's' : ''})</span><span>${isCollapsed ? '↓' : '↑'}</span>`;
        ungroupedHeader.addEventListener('click', () => toggleGroupCollapse(ungroupedId));
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-group-items';
        tabsContainer.style.display = isCollapsed ? 'none' : 'block';
        ungroupedTabs.forEach(tab => {
            tabsContainer.appendChild(renderTabItem(tab, false));
        });
        ungroupedContainer.appendChild(ungroupedHeader);
        ungroupedContainer.appendChild(tabsContainer);
        tabsList.appendChild(ungroupedContainer);
    }
}

// TAB ACTIONS //////////////////////////////////////////////////////////////

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
        await loadTabGroups();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('closeTab: Error closing tab:', error);
    }
}
async function toggleTabMute(tabId, muted) {
    try {
        await browserAPI.tabs.update(tabId, { muted: muted });
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('toggleTabMute: Error muting tab:', error);
    }
}
async function reloadTab(tabId) {
    try {
        await browserAPI.tabs.reload(tabId);
    } catch (error) {
        console.error('reloadTab: Failed to reload tab:', error);
    }
}
async function togglePinTab(tabId) {
    try {
        const tab = tabsSidebarState.tabs.find(t => t.id === tabId);
        if (tab) {
            await browserAPI.tabs.update(tabId, { pinned: !tab.pinned });
            await loadTabsFromBrowser();
            renderTabsSidebarContent();
        }
    } catch (error) {
        console.error('togglePinTab: Failed to pin tab:', error);
    }
}
async function sleepTab(tabId) {
    try {
        await browserAPI.tabs.discard(tabId);
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('sleepTab: Failed to sleep tab:', error);
    }
}
async function createNewTabInWindow(windowId) {
    try {
        await browserAPI.tabs.create({ windowId });
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('createNewTabInWindow: Failed to create new tab:', error);
    }
}
async function reloadAllTabsInWindow(windowId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.windowId === windowId);
        for (const tab of tabs) {
            await browserAPI.tabs.reload(tab.id);
        }
    } catch (error) {
        console.error('reloadAllTabsInWindow: Failed to reload tabs:', error);
    }
}
async function pinAllTabsInWindow(windowId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.windowId === windowId);
        for (const tab of tabs) {
            await browserAPI.tabs.update(tab.id, { pinned: true });
        }
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('pinAllTabsInWindow: Failed to pin tabs:', error);
    }
}
async function sleepAllTabsInWindow(windowId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.windowId === windowId && !t.active);
        for (const tab of tabs) {
            await browserAPI.tabs.discard(tab.id);
        }
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('sleepAllTabsInWindow: Failed to sleep tabs:', error);
    }
}
async function closeAllTabsInWindow(windowId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.windowId === windowId);
        const tabIds = tabs.map(t => t.id);
        await browserAPI.tabs.remove(tabIds);
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('closeAllTabsInWindow: Failed to close tabs:', error);
    }
}
async function createNewTabInGroup(groupId) {
    try {
        const tab = await browserAPI.tabs.create({});
        await browserAPI.tabs.group({ tabIds: [tab.id], groupId });
        await loadTabsFromBrowser();
        await loadTabGroups();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('createNewTabInGroup: Failed to create tab in group:', error);
    }
}
async function pinGroup(groupId) {
    try {
        await pinAllTabsInGroup(groupId);
    } catch (error) {
        console.error('pinGroup: Failed to pin group:', error);
    }
}
async function pinAllTabsInGroup(groupId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.groupId === groupId);
        for (const tab of tabs) {
            await browserAPI.tabs.update(tab.id, { pinned: true });
        }
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('pinAllTabsInGroup: Failed to pin tabs:', error);
    }
}
async function reloadAllTabsInGroup(groupId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.groupId === groupId);
        for (const tab of tabs) {
            await browserAPI.tabs.reload(tab.id);
        }
    } catch (error) {
        console.error('reloadAllTabsInGroup: Failed to reload tabs:', error);
    }
}

async function sleepAllTabsInGroup(groupId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.groupId === groupId && !t.active);
        for (const tab of tabs) {
            await browserAPI.tabs.discard(tab.id);
        }
        await loadTabsFromBrowser();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('sleepAllTabsInGroup: Failed to sleep tabs:', error);
    }
}

async function closeGroup(groupId) {
    try {
        const tabs = tabsSidebarState.tabs.filter(t => t.groupId === groupId);
        const tabIds = tabs.map(t => t.id);
        await browserAPI.tabs.remove(tabIds);
        await loadTabsFromBrowser();
        await loadTabGroups();
        renderTabsSidebarContent();
    } catch (error) {
        console.error('closeGroup: Failed to close group:', error);
    }
}


// SIDEBAR TOGGLE ///////////////////////////////////////////////////////////

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

// INITIALIZATION ///////////////////////////////////////////////////////////

export async function initTabsSidebar() {
    await loadTabsFromBrowser();
    await loadTabGroups();
    renderTabsSidebarContent();
    setupEventListeners();
}

function setupEventListeners() {
    const sidebar = document.getElementById('tabs-sidebar');
    const closeBtn = document.getElementById('close-tabs-sidebar');
    const tabsBtn = document.getElementById('tabs-btn');
    const tabsTrigger = document.querySelector('.tht');
    
    // Mode switchers
    const tabsHeader = document.getElementById('tabs-content-header-tabs');
    const groupsHeader = document.getElementById('tabs-content-header-groups');
    
    if (tabsHeader) {
        tabsHeader.addEventListener('click', () => switchMode('tabs'));
    }
    if (groupsHeader) {
        groupsHeader.addEventListener('click', () => switchMode('groups'));
    }
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
    
    
    
    if (browserAPI.tabs) { 
        browserAPI.tabs.onCreated.addListener(async () => {
            await loadTabsFromBrowser();
            await loadTabGroups();
            renderTabsSidebarContent();
        });
        browserAPI.tabs.onRemoved.addListener(async () => {
            await loadTabsFromBrowser();
            await loadTabGroups();
            renderTabsSidebarContent();
        });
        browserAPI.tabs.onUpdated.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebarContent();
        });
        browserAPI.tabs.onActivated.addListener(async () => {
            await loadTabsFromBrowser();
            renderTabsSidebarContent();
        });
    }

    if (browserAPI.tabGroups) {
        if (browserAPI.tabGroups.onCreated) {
            browserAPI.tabGroups.onCreated.addListener(async () => {
                await loadTabGroups();
                renderTabsSidebarContent();
            });
        }
        if (browserAPI.tabGroups.onRemoved) {
            browserAPI.tabGroups.onRemoved.addListener(async () => {
                await loadTabGroups();
                renderTabsSidebarContent();
            });
        }
        if (browserAPI.tabGroups.onUpdated) {
            browserAPI.tabGroups.onUpdated.addListener(async () => {
                await loadTabGroups();
                renderTabsSidebarContent();
            });
        }
    }
}