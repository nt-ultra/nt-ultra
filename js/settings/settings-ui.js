import { state } from '../core/state.js';
import { dbGet } from '../core/database.js';
import { notify } from '../core/notify.js';
import { exportToFile, exportToClipboard, importFromFile, importFromClipboard } from '../core/database-io.js';
import { renderWallpapers } from '../wallpapers/wallpapers.js';
import { updateSetting, toggleDisplayExpandedSettings, resetEverything, confirmReset } from './settings.js';

let settingsModulesLoaded = false;

export function initSettingsUI() {
    // on first open we load these

    document.getElementById('settings-btn').addEventListener('click', async () => {
        document.getElementById('settings-sidebar').classList.add('open');
        if (state.wallpapers.length === 0) {
            const wallpapers = await dbGet('wallpapers', 'data');
            if (wallpapers) {
                state.wallpapers = wallpapers;
                renderWallpapers();
            }
            console.log('...settings-ui: wallpapers loaded...');
        }
        //lazy load these modules
        if (!settingsModulesLoaded) {
            const [
                { initWallpapersUI },
                { initThemesUI }
            ] = await Promise.all([
                import('../wallpapers/wallpapers-ui.js'),
                import('../themes/themes-ui.js')
            ]);
            initWallpapersUI();
            initThemesUI();
            settingsModulesLoaded = true;
            console.log('...settings-ui: settings modules loaded...');
        }
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-sidebar').classList.remove('open');
    });
    
    document.getElementById('settings-sidebar').addEventListener('click', (e) => {
        if (e.target.id === 'settings-sidebar') {
            document.getElementById('settings-sidebar').classList.remove('open');
        }
    });

    // Display settings
    document.getElementById('font-family').addEventListener('change', (e) => {
        updateSetting('fontFamily', e.target.value);
    });
    document.getElementById('display-label').addEventListener('change', (e) => {
        updateSetting('displayLabel', e.target.value === 'on');
    });
    document.getElementById('display-searchbar').addEventListener('change', (e) => {
        updateSetting('displaySearchbar', e.target.value === 'on');
    });
    document.getElementById('display-shortcuts').addEventListener('change', (e) => {
        updateSetting('displayShortcuts', e.target.value === 'on');
    });
    document.getElementById('display-tab-browser').addEventListener('change', (e) => {
        const newMode = e.target.value;
        updateSetting('displayTabBrowser', newMode);
        window.tabsSidebarMode = newMode;
        if (window.updateTriggerVisibility) {
            window.updateTriggerVisibility(newMode);
        }
    });
    document.getElementById('display-trackers').addEventListener('change', (e) => {
        updateSetting('displayTrackers', e.target.value === 'on');
    });
    document.getElementById('display-notifications').addEventListener('change', (e) => {
        updateSetting('displayNotifications', e.target.value);
    });
    document.getElementById('theme-border-radius').addEventListener('input', (e) => {
        document.getElementById('theme-border-radius-value').textContent = e.target.value;
        updateSetting('themeBorderRadius', parseInt(e.target.value));
    });
    document.getElementById('theme-animation-speed').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('theme-animation-speed-value').textContent = value.toFixed(1);
        updateSetting('themeAnimationSpeed', value);
    });
    document.getElementById('theme-wallpaper-dimness').addEventListener('input', (e) => {
        document.getElementById('theme-wallpaper-dimness-value').textContent = e.target.value;
        updateSetting('themeWallpaperDimness', parseInt(e.target.value));
    });
    document.getElementById('theme-blur').addEventListener('change', (e) => {
        updateSetting('themeBlur', e.target.checked);
    });
    document.getElementById('theme-sidebar-btns-on-hover').addEventListener('change', (e) => {
        updateSetting('themeSidebarBtnOnHover', e.target.checked);
    });

    // Shortcuts settings
    document.getElementById('shortcut-max-limit').addEventListener('input', (e) => {
        updateSetting('shortcutMaxLimit', parseInt(e.target.value));
    });
    document.getElementById('shortcut-grid-columns').addEventListener('input', (e) => {
        updateSetting('shortcutGridColumns', parseInt(e.target.value));
    });
    document.getElementById('shortcut-scaling').addEventListener('input', (e) => {
        updateSetting('shortcutScaling', parseInt(e.target.value));
    });
    document.getElementById('shortcut-titles-hover').addEventListener('change', (e) => {
        updateSetting('shortcutTitlesHover', e.target.checked);
    });
    document.getElementById('shortcut-scale-hover').addEventListener('change', (e) => {
        updateSetting('shortcutScaleHover', e.target.checked);
    });
    document.getElementById('shortcut-menus-hidden').addEventListener('change', (e) => {
        updateSetting('shortcutMenusHidden', e.target.checked);
    });

    // Custom css settings
    let colorDebounceTimer = null;
    document.getElementById('theme-bg-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeBgColor', e.target.value.trim());
        }, 500);
    });
    document.getElementById('theme-fg-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeFgColor', e.target.value.trim());
        }, 500);
    });
    document.getElementById('theme-accent-color').addEventListener('input', (e) => {
        clearTimeout(colorDebounceTimer);
        colorDebounceTimer = setTimeout(() => {
            updateSetting('themeAccentColor', e.target.value.trim());
        }, 500);
    });

    // should remain these id's
    document.getElementById('theme-controls-toggle-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleDisplayExpandedSettings();
    });
    
    document.getElementById('theme-controls-reset-btn').addEventListener('click', (e) => {
        e.preventDefault();
        resetEverything();
    });

    // Reset modal
    document.getElementById('confirm-reset').addEventListener('click', confirmReset);
    document.getElementById('cancel-reset').addEventListener('click', () => {
        document.getElementById('reset-modal').style.display = 'none';
    });
    document.getElementById('reset-modal').addEventListener('click', (e) => {
        if (e.target.id === 'reset-modal') {
            document.getElementById('reset-modal').style.display = 'none';
        }
    });

    // Database Section
    initDatabaseImportExport();
}

/////////////////////////////////////////////////////////////////////////////////////

export function initDatabaseImportExport() {
    document.getElementById('export-data-btn').addEventListener('click', () => {
        document.getElementById('export-data-modal').style.display = 'flex';
        document.getElementById('e-d-themes').checked = true;
        document.getElementById('e-d-wallpapers').checked = true;
        document.getElementById('e-d-shortcuts').checked = true;
        document.getElementById('e-d-trackers').checked = true;
    });
    document.getElementById('cancel-e-d').addEventListener('click', () => {
        document.getElementById('export-data-modal').style.display = 'none';
    });
    document.getElementById('export-data-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-data-modal') {
            document.getElementById('export-data-modal').style.display = 'none';
        }
    });
    document.getElementById('confirm-e-d-file').addEventListener('click', async () => {
        const options = {
            includeThemes: document.getElementById('e-d-themes').checked,
            includeWallpapers: document.getElementById('e-d-wallpapers').checked,
            includeShortcuts: document.getElementById('e-d-shortcuts').checked,
            includeTrackers: document.getElementById('e-d-trackers').checked
        };
        if (!options.includeThemes && !options.includeWallpapers && 
            !options.includeShortcuts && !options.includeTrackers) {
            notify('Database Export', 'Nothing is selected');
            return;
        }
        try {
            await exportToFile(options);
            document.getElementById('export-data-modal').style.display = 'none';
            notify('Database Exported', 'File successfully sent to user');
        } catch (error) {
            notify('Database Export failed', `${error.message}`);
        }
    });

    document.getElementById('confirm-e-d-clipboard').addEventListener('click', async () => {
        const options = {
            includeThemes: document.getElementById('e-d-themes').checked,
            includeWallpapers: document.getElementById('e-d-wallpapers').checked,
            includeShortcuts: document.getElementById('e-d-shortcuts').checked,
            includeTrackers: document.getElementById('e-d-trackers').checked
        };
        if (!options.includeThemes && !options.includeWallpapers && 
            !options.includeShortcuts && !options.includeTrackers) {
            notify('Database Export', 'Nothing is selected');
            return;
        }
        try {
            await exportToClipboard(options);
            document.getElementById('export-data-modal').style.display = 'none';
            notify('Database Exported', 'Data copied to clipboard');
        } catch (error) {
            notify('Database Export failed', `${error.message}`);
        }
    });

    // Import Data Modal
    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-data-modal').style.display = 'flex';
        document.getElementById('i-d-themes').checked = true;
        document.getElementById('i-d-wallpapers').checked = true;
        document.getElementById('i-d-shortcuts').checked = true;
        document.getElementById('i-d-trackers').checked = true;
    });
    document.getElementById('cancel-i-d').addEventListener('click', () => {
        document.getElementById('import-data-modal').style.display = 'none';
    });
    document.getElementById('import-data-modal').addEventListener('click', (e) => {
        if (e.target.id === 'import-data-modal') {
            document.getElementById('import-data-modal').style.display = 'none';
        }
    });

    document.getElementById('confirm-i-d-file').addEventListener('click', () => {
        const options = {
            includeThemes: document.getElementById('i-d-themes').checked,
            includeWallpapers: document.getElementById('i-d-wallpapers').checked,
            includeShortcuts: document.getElementById('i-d-shortcuts').checked,
            includeTrackers: document.getElementById('i-d-trackers').checked
        };
        if (!options.includeThemes && !options.includeWallpapers && 
            !options.includeShortcuts && !options.includeTrackers) {
            notify('Database Import', 'Please make a selection');
            return;
        }
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await importFromFile(file, options);
                document.getElementById('import-data-modal').style.display = 'none';
                notify('Database Imported', 'Import successful');
                location.reload();
            } catch (error) {
                notify('Database Import failed', `${error.message}`);
            }
        });
        fileInput.click();
    });

    document.getElementById('confirm-i-d-clipboard').addEventListener('click', async () => {
        const options = {
            includeThemes: document.getElementById('i-d-themes').checked,
            includeWallpapers: document.getElementById('i-d-wallpapers').checked,
            includeShortcuts: document.getElementById('i-d-shortcuts').checked,
            includeTrackers: document.getElementById('i-d-trackers').checked
        };
        if (!options.includeThemes && !options.includeWallpapers && 
            !options.includeShortcuts && !options.includeTrackers) {
            notify('Database Import', 'PLease make a selection');
            return;
        }
        try {
            await importFromClipboard(options);
            document.getElementById('import-data-modal').style.display = 'none';
            notify('Database Import', 'Import successful');
            location.reload();
        } catch (error) {
            notify('Database Import failed', `${error.message}`);
        }
    });
}