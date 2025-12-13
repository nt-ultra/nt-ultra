import { initDB, loadData } from './js/core/database.js';
import { notify } from './js/core/notify.js';
import { renderShortcuts } from './js/shortcuts/shortcuts.js';
import { initShortcutsUI, initShortcutsImportExport } from './js/shortcuts/shortcuts-ui.js';
import { renderLabel } from './js/label/label.js';
import { initLabelUI } from './js/label/label-ui.js';
import { renderWallpapers } from './js/wallpapers/wallpapers.js';
import { renderThemeDropdown, renderSettings, applyStyles } from './js/settings/settings.js';
import { initSettingsUI } from './js/settings/settings-ui.js';
import { initTabsSidebar, updateTriggerVisibility } from './js/tabs-sidebar/tabs-sidebar.js';
import { renderTrackers, applyTrackerButton } from './js/trackers-sidebar/trackers.js';
import { initTrackersUI } from './js/trackers-sidebar/trackers-ui.js';

function render() {
    renderLabel();
    renderShortcuts();
    renderWallpapers();
    renderSettings();
    renderThemeDropdown();
    applyStyles();
    renderTrackers();
    applyTrackerButton();
}

window.render = render;
window.applyStyles = applyStyles;
window.notify = notify;

// Event Listeners ////////////////////////////////
document.addEventListener('DOMContentLoaded', async () => {
    console.log('...Initializing IndexedDB...');
    await initDB();
    console.log('...IndexedDB initialized...');
    await loadData();

    initShortcutsUI();
    initShortcutsImportExport();
    initLabelUI();
    initSettingsUI();
    initTabsSidebar();
    initTrackersUI();

    setInterval(renderLabel, 60000);
    
    console.log('...All event listeners attached...');
    const isInitted = sessionStorage.getItem('isInitted') === 'true';
    if (!isInitted) {
        setTimeout(() => {
            document.body.toggleAttribute('initted', true);
            console.log('...Index: Initted?...', document.body.hasAttribute('initted'));
        }, 2100); // after 2 seconds we can consider the page init,  used with animate-launch.css
    }

});