// default settings ////////////////////////////// 
export const default_settings = {
    fontFamily: 'system-ui',
    themeMode: 'default',
    displayLabel: true,
    displaySearchbar: false,
    displayShortcuts: true,
    displayTabBrowser: 'disabled',
    displayTrackers: false,
    displayNotifications: 'page',
    themeBgColor: '',
    themeFgColor: '',
    themeAccentColor: '',
    themeBorderRadius: 10,
    themeAnimationSpeed: 0.3,
    themeWallpaperDimness: 0,
    themeBlur: false,
    themeSidebarBtnOnHover: false,
    displayExpandedSettings: false,
    labelPosition: 'top',
    labelFontSize: 48,
    labelContent: 'none',
    labelStyle: 'none',
    shortcutMaxLimit: 24,
    shortcutScaling: 100,
    shortcutGridColumns: 8,
    shortcutTitlesHover: false,
    shortcutScaleHover: false,
    shortcutMenusHidden: false,
    trackerMaxLimit: 50,
    searchProvider: 'google',
    userName: ''
};

// default states ////////////////////////////////
export let state = {
    shortcuts: [],
    wallpapers: [],
    currentWallpaper: null,
    trackers: [],
    settings: { ...default_settings },
    activeTheme: 'default',
    themeList: ['default', 'custom'],
    editingShortcut: null,
    creatingShortcut: false
};

export const themeVersion = '1.0';
export const themeMaxLimit = 20;

// update  //////////////////////////////////////
export function updateState(key, value) {
    state[key] = value;
}

// version  //////////////////////////////////////
const getExtensionVersion = () => {
    try {
        const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;
        return browserAPI.runtime.getManifest().version;
    } catch (error) {
        return '0.0.0';
    }
};
export const extensionVersion = getExtensionVersion();
console.log(`...NT Ultra ${extensionVersion}...`);



