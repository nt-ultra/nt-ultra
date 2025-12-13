import { state } from '../core/state.js';
import { saveShortcuts } from '../core/database.js';
import { normalizeUrl, getCleanHostname, getFaviconUrl } from '../utils/url-helpers.js';
import { renderShortcuts } from './shortcuts.js';

export function parseShortcutsText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const shortcuts = [];
    for (const line of lines) {
        if (state.shortcuts.length + shortcuts.length >= state.settings.shortcutMaxLimit) break;
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length === 0) continue;
        const url = normalizeUrl(parts[0]);
        if (!url) continue;
        let title, customIcon;
        if (parts.length === 1) {
            title = getCleanHostname(url) || 'Untitled';
            customIcon = null;
        } else if (parts.length === 2) {
            title = parts[1];
            customIcon = null;
        } else {
            const lastPart = parts[parts.length - 1];
            if (lastPart.startsWith('http://') || lastPart.startsWith('https://') || lastPart.startsWith('data:image')) {
                customIcon = lastPart;
                title = parts.slice(1, -1).join(' ');
            } else {
                title = parts.slice(1).join(' ');
                customIcon = null;
            }
        }
        const icon = customIcon || getFaviconUrl(url);
        const exists = state.shortcuts.some(s => s.url === url);
        if (!exists) {
            shortcuts.push({
                id: Date.now() + shortcuts.length,
                title: title,
                url: url,
                icon: icon,
                pinned: false,
                order: state.shortcuts.length + shortcuts.length
            });
        }
    }
    return shortcuts;
}

export async function importShortcuts(shortcuts) {
    if (shortcuts.length === 0) {
        notify('No Shortcuts Imported', 'Try checking your format, or if you already have these shortcuts.');
        return;
    }
    state.shortcuts.push(...shortcuts);
    await saveShortcuts();
    renderShortcuts();
    document.getElementById('import-shortcuts-modal').style.display = 'none';
    notify('Shortcuts Imported', `${shortcuts.length} shortcuts were imported`);
}

export async function importFromFirefox(pinnedSites) {
    if (!Array.isArray(pinnedSites) || pinnedSites.length === 0) {
        notify('No Shortcuts Imported', 'invalid data or no shortcuts found');
        return;
    }
    const shortcuts = [];
    for (const site of pinnedSites) {
        if (state.shortcuts.length + shortcuts.length >= state.settings.shortcutMaxLimit) break;
        if (!site.url) continue;
        const exists = state.shortcuts.some(s => s.url === site.url);
        if (!exists) {
            shortcuts.push({
                id: Date.now() + shortcuts.length,
                title: site.label || getCleanHostname(site.url),
                url: site.url,
                icon: site.customScreenshotURL || getFaviconUrl(site.url),
                pinned: false,
                order: state.shortcuts.length + shortcuts.length
            });
        }
    }
    await importShortcuts(shortcuts);
}

export function exportShortcutsText() {
    return state.shortcuts.map(s => {
        let line = s.url;
        if (s.title) line += ` ${s.title}`;
        if (s.icon && !s.icon.includes('google.com/s2/favicons')) {
            line += ` ${s.icon}`;
        }
        return line;
    }).join('\n');
}

export async function exportShortcutsToFile() {
    const text = exportShortcutsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ntultra-shortcuts.txt';
    a.click();
    URL.revokeObjectURL(url);
    notify('Shortcuts Exported', 'Shortcuts exported to file');
}

export async function exportShortcutsToClipboard() {
    const text = exportShortcutsText();
    try {
        await navigator.clipboard.writeText(text);
        notify('Shortcuts Exported', 'Shortcuts copied to clipboard');
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        notify('Shortcuts Exported', 'Shortcuts copied to clipboard');
    }
}