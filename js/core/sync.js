const SYNC_VERSION = 1;
const MAX_SYNC_SIZE = 8000; // chrome apparently

if (typeof browser === 'undefined') {
    var browser = chrome;
}

function isSyncAvailable() {
    return !!(browser && browser.storage && browser.storage.sync);
}

function getDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
}

async function backupToSync(key, data) {
    if (!isSyncAvailable()) return;
    try {
        const syncData = {
            data: data,
            timestamp: Date.now(),
            version: SYNC_VERSION
        };
        const size = getDataSize(syncData);
        if (size > MAX_SYNC_SIZE) {
            console.warn(`${key} too large for sync: ${size} bytes, skipping`);
            return;
        }
        await browser.storage.sync.set({ [key]: syncData });
        console.log(`✓ ${key} backed up to sync`);
    } catch (error) {
        console.warn(`Sync backup failed for ${key}:`, error);
    }
}

async function restoreFromSync(key) {
    if (!isSyncAvailable()) return null;
    try {
        const result = await browser.storage.sync.get(key);
        if (result[key] && result[key].version === SYNC_VERSION) {
            console.log(`→ Restored ${key} from sync backup`);
            return result[key].data;
        }
        return null;
    } catch (error) {
        console.warn(`Sync restore failed for ${key}:`, error);
        return null;
    }
}

window.syncModule = {
    isSyncAvailable,
    backupToSync,
    restoreFromSync
};