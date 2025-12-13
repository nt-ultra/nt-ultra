import { state } from './state.js';
import { dbGet, dbSet } from './database.js';
import { loadData } from './database.js';

// Export All Data ///////////////////////////////////////////////////////////////

const DB_VERSION = 3;

export async function exportAllData(options = {}) {
    const {
        includeThemes = true,
        includeWallpapers = true,
        includeShortcuts = true,
        includeTrackers = true
    } = options;
    try {
        const exportData = {
            version: DB_VERSION,
            exportDate: Date.now(),
            data: {}
        };
        if (includeShortcuts) {
            const shortcuts = await dbGet('shortcuts', 'data');
            exportData.data.shortcuts = shortcuts || [];
        }
        if (includeWallpapers) {
            const wallpapers = await dbGet('wallpapers', 'data');
            const currentWallpaper = await dbGet('settings', 'currentWallpaper');
            exportData.data.wallpapers = wallpapers || [];
            exportData.data.currentWallpaper = currentWallpaper || '';
        }
        if (includeTrackers) {
            const trackers = await dbGet('trackers', 'data');
            exportData.data.trackers = trackers || [];
        }
        if (includeThemes) {
            const themeList = await dbGet('settings', 'themeList');
            const activeTheme = await dbGet('settings', 'activeTheme');
            const themeSettings = {};
            if (themeList && Array.isArray(themeList)) {
                for (const themeName of themeList) {
                    const settings = await dbGet('settings', `theme_${themeName}`);
                    if (settings) {
                        themeSettings[themeName] = settings;
                    }
                }
            }
            exportData.data.themes = {
                themeList: themeList || ['default', 'custom'],
                activeTheme: activeTheme || 'default',
                themeSettings: themeSettings
            };
        }
        return exportData;
    } catch (error) {
        console.error('exportAllData:', error);
        throw new Error('exportAllData: failed to export data. Please try again.');
    }
}

export async function exportToFile(options) {
    try {
        const data = await exportAllData(options);
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ntultra-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('exportToFile:', error);
        throw error;
    }
}

export async function exportToClipboard(options) {
    try {
        const data = await exportAllData(options);
        const jsonString = JSON.stringify(data, null, 2);
        try {
            await navigator.clipboard.writeText(jsonString);
        } catch (clipboardError) {
            const textarea = document.createElement('textarea');
            textarea.value = jsonString;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        return true;
    } catch (error) {
        console.error('exportToClipboard:', error);
        throw error;
    }
}

// Import All Data ///////////////////////////////////////////////////////////////

function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('validateImportData: date invalid');
    }
    if (!data.version || !data.data) {
        throw new Error('validateImportData: file invalid');
    }
    if (data.version !== DB_VERSION) {
        throw new Error(`validateImportData: Version incompatibility. Got ${data.version} but need ${DB_VERSION}.`);
    }
    return true;
}

export async function importAllData(importData, options = {}) {
    const {
        includeThemes = true,
        includeWallpapers = true,
        includeShortcuts = true,
        includeTrackers = true
    } = options;
    try {
        validateImportData(importData);
        const data = importData.data;

        if (includeShortcuts && data.shortcuts) {
            await dbSet('shortcuts', 'data', data.shortcuts);
            console.log('Shortcuts imported:', data.shortcuts.length);
        }
        if (includeWallpapers) {
            if (data.wallpapers) {
                await dbSet('wallpapers', 'data', data.wallpapers);
                console.log('Wallpapers imported:', data.wallpapers.length);
            }
            if (data.currentWallpaper !== undefined) {
                await dbSet('settings', 'currentWallpaper', data.currentWallpaper);
                console.log('Current wallpaper imported');
            }
        }
        if (includeTrackers && data.trackers) {
            await dbSet('trackers', 'data', data.trackers);
            console.log('Trackers imported:', data.trackers.length);
        }
        if (includeThemes && data.themes) {
            const themes = data.themes;
            if (themes.themeList) {
                await dbSet('settings', 'themeList', themes.themeList);
                console.log('Theme list imported:', themes.themeList);
            }
            if (themes.activeTheme) {
                await dbSet('settings', 'activeTheme', themes.activeTheme);
                console.log('Active theme imported:', themes.activeTheme);
            }
            if (themes.themeSettings) {
                for (const [themeName, settings] of Object.entries(themes.themeSettings)) {
                    await dbSet('settings', `theme_${themeName}`, settings);
                    console.log(`Theme settings imported: ${themeName}`);
                }
            }
        }

        // re render
        await loadData();
        return true;
    } catch (error) {
        console.error('importAllData: error on', error);
        throw error;
    }
}

export async function importFromFile(file, options) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonString = event.target.result;
                const data = JSON.parse(jsonString);
                await importAllData(data, options);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => {
            reject(new Error('importFromFile: failed to read file?'));
        };
        reader.readAsText(file);
    });
}

export async function importFromClipboard(options) {
    try {
        const jsonString = await navigator.clipboard.readText();
        const data = JSON.parse(jsonString);
        await importAllData(data, options);
        return true;
    } catch (error) {
        console.error('importFromClipboard:', error);
        throw new Error('importFromClipboard: failed to import from clipboard.');
    }
}