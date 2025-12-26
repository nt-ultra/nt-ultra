import { state, default_settings } from '../core/state.js';
import { saveSettings, saveShortcuts, saveWallpapers, saveCurrentWallpaper, saveThemeList, dbSet, dbDelete } from '../core/database.js';

export function renderSettings() {
    document.getElementById('font-family').value = state.settings.fontFamily;
    document.getElementById('display-label').value = state.settings.displayLabel ? 'on' : 'off';
    document.getElementById('display-searchbar').value = state.settings.displaySearchbar ? 'on' : 'off';
    document.getElementById('display-shortcuts').value = state.settings.displayShortcuts ? 'on' : 'off';
    document.getElementById('display-tab-browser').value = state.settings.displayTabBrowser ? 'on' : 'off';
    document.getElementById('display-trackers').value = state.settings.displayTrackers ? 'on' : 'off';
    document.getElementById('display-notifications').value = state.settings.displayNotifications;
    const themeControls = document.getElementById('theme-controls');
    themeControls.style.display = state.settings.displayExpandedSettings ? 'block' : 'none';
    document.getElementById('theme-controls-toggle-btn').textContent = 
        state.settings.displayExpandedSettings ? 'Collapse' : 'Expand';
    document.getElementById('theme-CSS').value = state.settings.themeCSS;
    document.getElementById('theme-bg-color').value = state.settings.themeBgColor;
    document.getElementById('theme-fg-color').value = state.settings.themeFgColor;
    document.getElementById('theme-accent-color').value = state.settings.themeAccentColor;
    document.getElementById('theme-border-radius').value = state.settings.themeBorderRadius;
    document.getElementById('theme-border-radius-value').textContent = state.settings.themeBorderRadius;
    document.getElementById('theme-animation-speed').value = state.settings.themeAnimationSpeed;
    document.getElementById('theme-animation-speed-value').textContent = state.settings.themeAnimationSpeed;
    document.getElementById('theme-blur').checked = state.settings.themeBlur;
    document.getElementById('theme-sidebar-btns-on-hover').checked = state.settings.themeSidebarBtnOnHover;
    document.getElementById('theme-wallpaper-dimness').value = state.settings.themeWallpaperDimness;
    document.getElementById('theme-wallpaper-dimness-value').textContent = state.settings.themeWallpaperDimness;
    document.getElementById('content-label').value = state.settings.labelContent;
    document.getElementById('label-style').value = state.settings.labelStyle;
    document.getElementById('user-name').value = state.settings.userName;
    document.getElementById('label-font-size').value = state.settings.labelFontSize;
    document.getElementById('label-font-size-value').textContent = state.settings.labelFontSize;
    document.getElementById('label-position').value = state.settings.labelPosition;
    document.getElementById('shortcut-scaling').value = state.settings.shortcutScaling;
    document.getElementById('shortcut-scaling-value').textContent = state.settings.shortcutScaling;
    document.getElementById('shortcut-grid-columns').value = state.settings.shortcutGridColumns;
    document.getElementById('shortcut-grid-columns-value').textContent = state.settings.shortcutGridColumns;
    document.getElementById('shortcut-max-limit').value = state.settings.shortcutMaxLimit;
    document.getElementById('shortcut-max-limit-value').textContent = state.settings.shortcutMaxLimit;
    document.getElementById('shortcut-titles-hover').checked = state.settings.shortcutTitlesHover;
    document.getElementById('shortcut-scale-hover').checked = state.settings.shortcutScaleHover;
    document.getElementById('shortcut-menus-hidden').checked = state.settings.shortcutMenusHidden;
    // Show/hide sections
    document.getElementById('label-section').style.display = state.settings.displayLabel ? 'block' : 'none';
    document.getElementById('shortcuts-section').style.display = state.settings.displayShortcuts ? 'block' : 'none';
    // document.getElementById('searchbar-section').style.display = state.settings.displaySearchbar ? 'block' : 'none';
    // document.getElementById('tab-browser-section').style.display = 
    //     state.settings.displayTabBrowser !== 'disabled' ? 'block' : 'none';
    const userNameInput = document.getElementById('user-name');
    userNameInput.style.display =
        (state.settings.labelContent === 'greetings' || state.settings.labelContent === 'timeOfDay')
        ? 'block' : 'none';
}

export function renderThemeDropdown() {
    const dropdown = document.getElementById('theme-mode');
    dropdown.innerHTML = '';
    state.themeList.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        if (theme === state.activeTheme) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

export function applyStyles() {
    const body = document.body;
    const header = document.querySelector('.header');
    const headerText = document.querySelector('.header h1');
    const grid = document.getElementById('shortcuts-grid');
    const app = document.getElementById('app');
    const tabsSidebar = document.getElementById('tabs-sidebar');
    const tabsBtn = document.getElementById('tabs-btn');
    body.style.fontFamily = state.settings.fontFamily;
    const tCSS = state.settings.themeCSS || '';
    const bgColor = state.settings.themeBgColor || '#2b2a33';
    const fgColor = state.settings.themeFgColor || '#ffffff';
    const accentColor = state.settings.themeAccentColor || '#3b82f6';
 
    
    let styleTag = document.getElementById('custom-theme-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-theme-styles';
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
        * {
            --element-bg-color: ${bgColor} !important;
            --element-fg-color: ${fgColor} !important;
            --accent-color: ${accentColor} !important;
            --element-border-radius: ${state.settings.themeBorderRadius}px !important;
        }
        * { ${state.settings.themeCSS} }
    `;
    
    const animSpeed = state.settings.themeAnimationSpeed;
    if (tabsSidebar) tabsSidebar.style.transitionDuration = `${animSpeed}s`;
    const settingsSidebar = document.getElementById('settings-sidebar');
    if (settingsSidebar) settingsSidebar.style.transitionDuration = `${animSpeed}s`;
    const dimValue = state.settings.themeWallpaperDimness / 10;
    app.style.background = `rgba(0, 0, 0, ${dimValue})`;
    body.toggleAttribute('theme-blur', state.settings.themeBlur);
    body.toggleAttribute('theme-sidebar-btns-on-hover', state.settings.themeSidebarBtnOnHover);
    
    if (tabsSidebar && tabsBtn) {
        if (state.settings.displayTabBrowser) {
            tabsSidebar.style.display = 'block';
            tabsBtn.style.display = 'flex';
        } else {
            tabsSidebar.style.display = 'none';
            tabsBtn.style.display = 'none';
        }
    }
    
    if (headerText) {
        headerText.style.fontSize = `${state.settings.labelFontSize}px`;
    }

    if (state.currentWallpaper) {
        if (state.currentWallpaper.startsWith('#')) {
            body.style.background = state.currentWallpaper;
            body.style.backgroundImage = 'none';
        } else {
            body.style.background = 'none';
            body.style.backgroundImage = `url(${state.currentWallpaper})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
        }
    } else {
        body.style.background = 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)';
        body.style.backgroundImage = '';
    }
    
    const scale = state.settings.shortcutScaling / 100;
    grid.style.transform = `scale(${scale})`;
    grid.style.gridTemplateColumns = `repeat(${state.settings.shortcutGridColumns}, minmax(0, 1fr))`;
}

export async function updateSetting(key, value) {
    if (state.activeTheme === 'default') {
        state.activeTheme = 'custom';
        state.settings.themeMode = 'custom';
        await dbSet('settings', 'activeTheme', 'custom');
    }
    state.settings[key] = value;
    await saveSettings();

    if (window.render) {
        window.render();
    }
}

export function toggleDisplayExpandedSettings() {
    state.settings.displayExpandedSettings = !state.settings.displayExpandedSettings;
    saveSettings();
    renderSettings();
}

// Reset Everything
export async function resetEverything() {
    document.getElementById('reset-modal').style.display = 'flex';
    document.getElementById('reset-themes').checked = true;
    document.getElementById('reset-wallpapers').checked = false;
    document.getElementById('reset-shortcuts').checked = false;
}

export async function confirmReset() {
    const resetThemes = document.getElementById('reset-themes').checked;
    const resetWallpapers = document.getElementById('reset-wallpapers').checked;
    const resetShortcuts = document.getElementById('reset-shortcuts').checked;
    
    if (!resetThemes && !resetWallpapers && !resetShortcuts) {
        notify('Database Reset', 'Nothing is selected');
        return;
    }
    
    try {
        if (resetThemes) {
            for (const theme of state.themeList) {
                if (theme !== 'default' && theme !== 'custom') {
                    await dbDelete('settings', `theme_${theme}`);
                }
            }
            await dbSet('settings', 'theme_custom', { ...default_settings, themeMode: 'custom' });
            state.themeList = ['default', 'custom'];
            await saveThemeList();
            state.activeTheme = 'default';
            state.settings = { ...default_settings };
            await dbSet('settings', 'activeTheme', 'default');
        }
        if (resetWallpapers) {
            state.wallpapers = [];
            await saveWallpapers();
            state.currentWallpaper = '';
            await saveCurrentWallpaper();
        }
        if (resetShortcuts) {
            state.shortcuts = state.shortcuts.filter(s => s.pinned);
            state.shortcuts.forEach((s, i) => s.order = i);
            await saveShortcuts();
        }
        document.getElementById('reset-modal').style.display = 'none';
        location.reload();
    } catch (error) {
        console.error('Reset error:', error);
        notify('Database Reset', 'Failed to reset. Please try again');
    }
}