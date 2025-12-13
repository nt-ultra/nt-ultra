import { state, default_settings } from './state.js';
import { initializeShortcutOrder } from '../shortcuts/shortcuts-dragdrop.js';

let db;

// database //////////////////////////////////////

export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NewtabultraDB', 3);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
            if (!db.objectStoreNames.contains('shortcuts')) {
                db.createObjectStore('shortcuts');
            }
            if (!db.objectStoreNames.contains('wallpapers')) {
                db.createObjectStore('wallpapers');
            }
            if (!db.objectStoreNames.contains('trackers')) {
                db.createObjectStore('trackers');
            }
        };
    });
}

export async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function dbSet(storeName, key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function loadData() {
    try {
        let shortcuts = await dbGet('shortcuts', 'data');
        if (!shortcuts && window.syncModule) {
            shortcuts = await window.syncModule.restoreFromSync('shortcuts_data');
            if (shortcuts) await dbSet('shortcuts', 'data', shortcuts);
        }
        let currentWallpaper = await dbGet('settings', 'currentWallpaper');
        if (currentWallpaper === undefined && window.syncModule) {
            currentWallpaper = await window.syncModule.restoreFromSync('currentWallpaper');
            if (currentWallpaper) await dbSet('settings', 'currentWallpaper', currentWallpaper);
        }
        let themeList = await dbGet('settings', 'themeList');
        if (!themeList && window.syncModule) {
            themeList = await window.syncModule.restoreFromSync('themeList');
            if (themeList) await dbSet('settings', 'themeList', themeList);
        }
        if (themeList && Array.isArray(themeList)) {
            state.themeList = themeList;
        } else {
            state.themeList = ['default', 'custom'];
            await dbSet('settings', 'themeList', state.themeList);
        }     
        let activeTheme = await dbGet('settings', 'activeTheme');
        if (!activeTheme && window.syncModule) {
            activeTheme = await window.syncModule.restoreFromSync('activeTheme');
            if (activeTheme) await dbSet('settings', 'activeTheme', activeTheme);
        }
        if (activeTheme && state.themeList.includes(activeTheme)) {
            state.activeTheme = activeTheme;
        } else {
            state.activeTheme = 'default';
            await dbSet('settings', 'activeTheme', 'default');
        }
        
        let themeSettings = await dbGet('settings', `theme_${state.activeTheme}`);
        if (!themeSettings && window.syncModule) {
            themeSettings = await window.syncModule.restoreFromSync(`theme_${state.activeTheme}`);
            if (themeSettings) await dbSet('settings', `theme_${state.activeTheme}`, themeSettings);
        }
        if (themeSettings) {
            state.settings = { ...default_settings, ...themeSettings };
        } else {
            state.settings = { ...default_settings };
            state.settings.themeMode = state.activeTheme;
        }
        if (shortcuts) {
            state.shortcuts = shortcuts;
            initializeShortcutOrder();
        }
        let trackers = await dbGet('trackers', 'data');
        if (trackers && Array.isArray(trackers)) {
            trackers = trackers.map(t => ({
                ...t,
                dailyRequestLimit: t.dailyRequestLimit || 200,
                requestCount: t.requestCount || 0,
                requestResetTime: t.requestResetTime || Date.now() + (24 * 60 * 60 * 1000),
                rateLimitedUntil: t.rateLimitedUntil || null
            }));
            state.trackers = trackers;
        } else {
            state.trackers = [];
        }
        // Wallpapers are lazy loaded when settings sidebar opens
        if (currentWallpaper !== undefined) {
            state.currentWallpaper = currentWallpaper;
        } else {
            state.currentWallpaper = '';
            saveCurrentWallpaper();
        }
    } catch (error) {
        console.log('No saved data found, starting fresh', error);
        state.currentWallpaper = '';
        state.activeTheme = 'default';
        state.themeList = ['default', 'custom'];
        state.trackers = [];
        saveCurrentWallpaper();
    }
    // Call render from window (set in index.js)
    if (window.render) {
        window.render();
    }
}

// save data /////////////////////////////////////

export async function saveShortcuts() {
    try {
        await dbSet('shortcuts', 'data', state.shortcuts);
        if (window.syncModule) {
            await window.syncModule.backupToSync('shortcuts_data', state.shortcuts);
        }
    } catch (error) {z
        console.error('Error saving shortcuts:', error);
    }
}

export async function saveWallpapers() {
    try {
        await dbSet('wallpapers', 'data', state.wallpapers);
    } catch (error) {
        console.error('Error saving wallpapers:', error);
    }
}

export async function saveSettings() {
    try {
        await dbSet('settings', `theme_${state.activeTheme}`, state.settings);
        if (window.syncModule) {
            await window.syncModule.backupToSync(`theme_${state.activeTheme}`, state.settings);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

export async function saveCurrentWallpaper() {
    try {
        await dbSet('settings', 'currentWallpaper', state.currentWallpaper);
        // only colors
        if (window.syncModule && state.currentWallpaper?.startsWith('#')) {
            await window.syncModule.backupToSync('currentWallpaper', state.currentWallpaper);
        }
    } catch (error) {
        console.error('Error saving current wallpaper:', error);
    }
}

export async function saveThemeList() {
    try {
        await dbSet('settings', 'themeList', state.themeList);
        if (window.syncModule) {
            await window.syncModule.backupToSync('themeList', state.themeList);
        }
    } catch (error) {
        console.error('Error saving theme list:', error);
    }
}

export async function saveTrackers() {
    try {
        await dbSet('trackers', 'data', state.trackers);
    } catch (error) {
        console.error('Error saving trackers:', error);
    }
}