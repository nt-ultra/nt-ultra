import { state } from '../core/state.js';
import { saveShortcuts } from '../core/database.js';
import ContextMenuManager from '../core/context-manager.js';
import { normalizeUrl, getCleanHostname, getFaviconUrl } from '../utils/url-helpers.js';
import { isDragging, initShortcutDragDrop } from './shortcuts-dragdrop.js';

let urlInputDebounceTimer = null;

export function renderShortcuts() {
    const grid = document.getElementById('shortcuts-grid');
    const container = document.querySelector('.shortcuts-container');
    if (!state.settings.displayShortcuts) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    grid.innerHTML = '';
    const shortcutMaxLimit = state.settings.shortcutMaxLimit;
    const shortcuts = state.shortcuts.slice(0, shortcutMaxLimit);

    shortcuts.forEach((shortcut, index) => {
        const div = document.createElement('div');
        div.className = 'shortcut';
        div.draggable = true;
        div.dataset.index = index;
        div.dataset.shortcutId = shortcut.id;
        const icon = document.createElement('div');
        icon.className = 'shortcut-icon';
        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = "  ";
            let retryCount = 0;
            const maxRetries = 2;
            img.onerror = function() {
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(() => {
                        this.src = this.src;
                    }, 500 * retryCount);
                } else {
                    img.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'shortcut-icon-placeholder';
                    placeholder.textContent = shortcut.title[0].toUpperCase();
                    icon.appendChild(placeholder);
                }
            };
            icon.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'shortcut-icon-placeholder';
            placeholder.textContent = shortcut.title[0].toUpperCase();
            icon.appendChild(placeholder);
        }
        const menuBtn = document.createElement('button');
        menuBtn.className = 'shortcut-menu-btn';
        menuBtn.innerHTML = '⋮';
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ContextMenuManager.show(e, shortcut, [
                { action: 'pin', label: shortcut.pinned ? 'Unpin' : 'Pin', handler: () => togglePin(shortcutId) },
                { action: 'edit', label: 'Edit', handler: () => editShortcut(shortcut) },
                { action: 'open', label: 'Open in New Tab', handler: () => window.open(shortcut.url, '_blank') },
                { action: 'copy', label: 'Copy Link', handler: () => navigator.clipboard.writeText(shortcut.url) },
                { action: 'delete', label: 'Delete', danger: true, handler: () => deleteShortcut(shortcutId) }
            ]);
        });
        icon.appendChild(menuBtn);
        
        icon.addEventListener('click', (e) => {
            if (isDragging()) return;
            if (shortcut.url.startsWith('about:') || shortcut.url.startsWith('chrome://')) {
                browser.tabs.create({ url: shortcut.url });
                notify('Extension Access Denied','Extensions cannot access these sort of links due to api security')
                return;
            }
            if (e.button === 1 || e.ctrlKey || e.metaKey) {
                window.open(shortcut.url, '_blank');
            } else {
                window.location.href = shortcut.url;
            }
        });
        icon.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                window.open(shortcut.url, '_blank');
            }
        });
        const title = document.createElement('span');
        title.className = 'shortcut-title';
        title.textContent = shortcut.title;
        div.appendChild(icon);
        div.appendChild(title);
        grid.appendChild(div);
    });
    if (shortcuts.length < shortcutMaxLimit) {
        const addBtn = document.createElement('div');
        addBtn.className = 'add-shortcut';
        addBtn.innerHTML = `
            <div class="add-shortcut-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
            <span class="shortcut-title">New</span>
        `;
        addBtn.addEventListener('click', addShortcut);
        grid.appendChild(addBtn);
    }
    
    initShortcutDragDrop();
    
    document.querySelectorAll('.shortcut').forEach(shortcut => {
        shortcut.toggleAttribute('shortcut-scale-hover', state.settings.shortcutScaleHover);
        shortcut.toggleAttribute('shortcut-titles-hover', state.settings.shortcutTitlesHover);
        shortcut.toggleAttribute('shortcut-menus-hidden', state.settings.shortcutMenusHidden);
    });
}

export function addShortcut() {
    if (state.shortcuts.length >= state.settings.shortcutMaxLimit) {
        notify('Shortcut Limit Reached', `Maximum ${state.settings.shortcutMaxLimit} shortcuts allowed`);
        return;
    }
    state.creatingShortcut = true;
    state.editingShortcut = {
        id: Date.now(),
        title: '',
        url: '',
        icon: null,
        pinned: false,
        order: state.shortcuts.length
    };
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-url').value = '';
    document.getElementById('edit-icon').value = '';
    document.getElementById('edit-modal').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('edit-url').focus();
    }, 100);
}

export function deleteShortcut(id) {
    state.shortcuts = state.shortcuts.filter(s => s.id !== id);
    saveShortcuts();
    renderShortcuts();
}

export function togglePin(id) {
    const shortcut = state.shortcuts.find(s => s.id === id);
    if (shortcut) {
        shortcut.pinned = !shortcut.pinned;
        saveShortcuts();
        renderShortcuts();
    }
}

export function editShortcut(shortcut) {
    state.creatingShortcut = false;
    state.editingShortcut = shortcut;
    document.getElementById('edit-title').value = shortcut.title;
    document.getElementById('edit-url').value = shortcut.url;
    document.getElementById('edit-icon').value = shortcut.icon || '';
    document.getElementById('edit-modal').style.display = 'flex';
}

export function saveEdit() {
    if (!state.editingShortcut) return;
    const title = document.getElementById('edit-title').value.trim();
    const urlInput = document.getElementById('edit-url').value.trim();
    const customIcon = document.getElementById('edit-icon').value.trim();
    const url = normalizeUrl(urlInput);
    if (!url) {
        notify('Shortcut URL Needed', `Please enter a valid URL`);
        return;
    }
    if (!title) {
        notify('Shortcut Title Missing', `Please enter a title`);
        return;
    }
    const icon = customIcon || getFaviconUrl(url);
    if (state.creatingShortcut) {
        const newShortcut = {
            id: state.editingShortcut.id,
            title: title,
            url: url,
            icon: icon,
            pinned: false
        };
        state.shortcuts.push(newShortcut);
    } else {
        const shortcut = state.shortcuts.find(s => s.id === state.editingShortcut.id);
        if (shortcut) {
            shortcut.title = title;
            shortcut.url = url;
            shortcut.icon = customIcon || icon;
        }
    }
    saveShortcuts();
    renderShortcuts();
    closeEditModal();
}

export function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    state.editingShortcut = null;
    state.creatingShortcut = false;
}

export function handleUrlInput(e) {
    const urlInput = e.target.value.trim();
    const titleInput = document.getElementById('edit-title');
    if (urlInputDebounceTimer) clearTimeout(urlInputDebounceTimer);
    urlInputDebounceTimer = setTimeout(() => {
        if (!urlInput) return;
        const normalizedUrl = normalizeUrl(urlInput);
        if (!normalizedUrl) return;
        const suggestedTitle = getCleanHostname(normalizedUrl);
        if (!suggestedTitle) return;
        const currentTitle = titleInput.value.trim();
        if (state.creatingShortcut) {
            if (!currentTitle) {
                titleInput.value = suggestedTitle;
            }
            return;
        }
        if (state.editingShortcut) {
            const originalSuggestedTitle = getCleanHostname(normalizeUrl(state.editingShortcut.url) || '');
            const titleWasAutoGenerated = !currentTitle ||
                currentTitle.toLowerCase() === originalSuggestedTitle.toLowerCase() ||
                currentTitle.toLowerCase() === state.editingShortcut.title.toLowerCase();
            if (titleWasAutoGenerated) {
                titleInput.value = suggestedTitle;
            }
        }
    }, 500);
}

export function createShortcutFromData(title, url, iconUrl) {
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl) {
        // console.error('Invalid URL dropped');
        return;
    }
    const newShortcut = {
        id: Date.now(),
        title: title || getCleanHostname(cleanUrl) || 'Untitled',
        url: cleanUrl,
        icon: iconUrl || getFaviconUrl(cleanUrl),
        pinned: false,
        order: state.shortcuts.length
    };
    state.shortcuts.push(newShortcut);
    saveShortcuts();
    renderShortcuts();
    console.log('createShortcutFromData:', newShortcut.title);
}

// background.js
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'add-shortcuts') {
      const shortcuts = message.shortcuts;
      let addedCount = 0;
      let skippedCount = 0;
      shortcuts.forEach(shortcut => {
        const exists = state.shortcuts.some(s => s.url === shortcut.url);
        if (!exists && state.shortcuts.length < state.settings.shortcutMaxLimit) {
          shortcut.order = state.shortcuts.length;
          state.shortcuts.push(shortcut);
          addedCount++;
        } else {
          skippedCount++;
        }
      });
      if (addedCount > 0) {
        saveShortcuts();
        renderShortcuts();
        const message = addedCount === 1 
          ? `"${shortcuts[0].title}" has been turned into a shortcut`
          : `You've recieved ${addedCount} new shortcuts`;
        notify('Shortcut Added', message);
      } else if (skippedCount > 0) {
        notify('Already Exists', 'shortcut already exist');
      }
    }
    return true;
  });
}
export async function checkPendingShortcuts() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  try {
    const result = await chrome.storage.local.get(['pendingShortcuts']);
    const pending = result.pendingShortcuts || [];
    if (pending.length > 0) {
      let addedCount = 0;
      let skippedCount = 0;
      pending.forEach(shortcut => {
        const exists = state.shortcuts.some(s => s.url === shortcut.url);
        if (!exists && state.shortcuts.length < state.settings.shortcutMaxLimit) {
          shortcut.order = state.shortcuts.length;
          state.shortcuts.push(shortcut);
          addedCount++;
        } else {
          skippedCount++;
        }
      });
      if (addedCount > 0) {
        await saveShortcuts();
        renderShortcuts();
        const message = addedCount === 1 
          ? `"${pending[0].title}" has been turned into a shortcut`
          : `You've recieved ${addedCount} new shortcuts`;
        notify('Shortcut Added', message);
      } else if (skippedCount > 0) {
        notify('Shortcut Already Exists', 'shortcut already exist');
      }
      await chrome.runtime.sendMessage({ action: 'clear-pending-shortcuts' });
    }
  } catch (error) {
    console.error('checkPendingShortcuts:', error);
  }
}