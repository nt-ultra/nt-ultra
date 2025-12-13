import { state } from '../core/state.js';
import { notify } from '../core/notify.js';
import { ModalManager } from '../core/modal-manager.js';
import { addTracker, updateTracker, renderTrackers } from './trackers.js';
import { saveTrackers } from '../core/database.js';
import { validateAndFetchInitialData, getFlattenedKeys, getNestedValue } from './trackers-fetcher.js';

let tempTrackerData = null;
let sourceDebounceTimer = null;

export function initTrackersUI() {
  const trackersBtn = document.getElementById('trackers-btn');
  const trackersSidebar = document.getElementById('trackers-sidebar');
  const closeTrackers = document.getElementById('close-trackers');
  const addTrackerBtn = document.getElementById('add-tracker-btn');
  if (trackersBtn) {
    trackersBtn.addEventListener('click', () => {
      trackersSidebar?.classList.toggle('open');
    });
  }
  if (closeTrackers) {
    closeTrackers.addEventListener('click', () => {
      trackersSidebar?.classList.remove('open');
    });
  }
  if (trackersSidebar) {
    trackersSidebar.addEventListener('click', (e) => {
      if (e.target.id === 'trackers-sidebar') {
        trackersSidebar.classList.remove('open');
      }
    });
  }
  if (addTrackerBtn) {
    addTrackerBtn.addEventListener('click', () => {
      openTrackerModalForAdd();
    });
  }
  initTrackerModal();  
  window.openTrackerModalForEdit = openTrackerModalForEdit;
  console.log('...trackers-ui: initialized...');
}

// UNIFIED TRACKER MODAL //////////////////////////////////////////////////////////////////////////

function initTrackerModal() {
  const modal = document.getElementById('tracker-modal');
  if (!modal) return;
  const sourceInput = document.getElementById('tracker-source');
  const typeSelect = document.getElementById('tracker-type');
  if (sourceInput) {
    sourceInput.addEventListener('input', (e) => {
      clearTimeout(sourceDebounceTimer);
      sourceDebounceTimer = setTimeout(async () => {
        await handleSourceChange(e.target.value.trim());
      }, 700);
    });
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const selectedType = typeSelect.value;
      if (selectedType === 'json') {
        const sourceInput = document.getElementById('tracker-source');
        if (sourceInput) sourceInput.placeholder = 'Enter JSON URL...';
      }
      updateModalFieldVisibility();
    });
  }
  
  modal.addEventListener('click', async (e) => {
    const targetId = e.target.id;
    if (targetId === 'save-edit-tracker') {
      e.stopPropagation();
      await handleSaveTracker();
    } else if (targetId === 'cancel-edit-tracker') {
      e.stopPropagation();
      closeTrackerModal();
    } else if (targetId === 'tracker-modal') {
      closeTrackerModal();
    }
  });
}

// OPEN MODAL FOR ADD /////////////////////////////////////////////////////////////////////////////

function openTrackerModalForAdd() {
  const modal = document.getElementById('tracker-modal');
  const modeTitle = document.getElementById('tracker-modal-mode');
  tempTrackerData = {
    type: 'rss',
    source: '',
    apiEndpoint: '',
    title: '',
    faviconUrl: '',
    redirectUrl: '',
    config: {},
    latestItem: null
  };
  
  modal.setAttribute('display-mode', 'add');
  if (modeTitle) modeTitle.textContent = 'Add Tracker';
  const sourceInput = document.getElementById('tracker-source');
  const typeSelect = document.getElementById('tracker-type');
  const titleInput = document.getElementById('tracker-title');
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  const intervalInput = document.getElementById('edit-tracker-interval');
  const limitInput = document.getElementById('edit-tracker-limit');
  const idInput = document.getElementById('edit-tracker-id');
  
  if (sourceInput) {
    sourceInput.value = '';
    sourceInput.placeholder = 'Enter URL...';
  }
  if (typeSelect) typeSelect.value = 'rss';
  if (titleInput) titleInput.value = '';
  if (titleSelect) titleSelect.innerHTML = '<option value="">Select title key...</option>';
  if (feedSelect) feedSelect.innerHTML = '<option value="">Select feed key...</option>';
  if (faviconInput) faviconInput.value = '';
  if (redirectInput) redirectInput.value = '';
  if (intervalInput) intervalInput.value = '5';
  if (limitInput) limitInput.value = '200';
  if (idInput) idInput.value = '';
  
  updateModalFieldVisibility();
  ModalManager.show('tracker-modal');
  setTimeout(() => {
    sourceInput?.focus();
  }, 100);
}

// OPEN MODAL FOR EDIT ////////////////////////////////////////////////////////////////////////////

function openTrackerModalForEdit(tracker) {
  const modal = document.getElementById('tracker-modal');
  const modeTitle = document.getElementById('tracker-modal-mode');
  tempTrackerData = structuredClone(tracker);
  
  modal.setAttribute('display-mode', 'edit');
  if (modeTitle) modeTitle.textContent = 'Edit Tracker';

  const sourceInput = document.getElementById('tracker-source');
  const typeSelect = document.getElementById('tracker-type');
  const titleInput = document.getElementById('tracker-title');
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  const intervalInput = document.getElementById('edit-tracker-interval');
  const limitInput = document.getElementById('edit-tracker-limit');
  const idInput = document.getElementById('edit-tracker-id');
  
  if (sourceInput) sourceInput.value = tracker.source || '';
  if (typeSelect) typeSelect.value = tracker.type || 'rss';
  if (titleInput) titleInput.value = tracker.title || '';
  if (faviconInput) faviconInput.value = tracker.faviconUrl || '';
  if (redirectInput) redirectInput.value = tracker.redirectUrl || '';
  if (intervalInput) intervalInput.value = (tracker.updateInterval || 300000) / 60000;
  if (limitInput) limitInput.value = tracker.dailyRequestLimit || 200;
  if (idInput) idInput.value = tracker.id || '';
  
  if (tracker.type === 'json' && tracker.config.titleKey && tracker.config.feedKey) {
    if (titleSelect) {
      titleSelect.innerHTML = `<option value="${tracker.config.titleKey}">${tracker.config.titleKey}</option>`;
      titleSelect.value = tracker.config.titleKey;
    }
    if (feedSelect) {
      feedSelect.innerHTML = `<option value="${tracker.config.feedKey}">${tracker.config.feedKey}</option>`;
      feedSelect.value = tracker.config.feedKey;
    }
  }
  
  updateModalFieldVisibility();
  ModalManager.show('tracker-modal');
}

// CLOSE MODAL ////////////////////////////////////////////////////////////////////////////////////

function closeTrackerModal() {
  tempTrackerData = null;
  const sourceInput = document.getElementById('tracker-source');
  const titleInput = document.getElementById('tracker-title');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  if (sourceInput) {
    sourceInput.value = '';
    sourceInput.placeholder = 'Enter URL...';
  }
  if (titleInput) titleInput.value = '';
  if (faviconInput) faviconInput.value = '';
  if (redirectInput) redirectInput.value = '';
  if (titleSelect) titleSelect.innerHTML = '<option value="">Select title key...</option>';
  if (feedSelect) feedSelect.innerHTML = '<option value="">Select feed key...</option>';
  ModalManager.hide('tracker-modal');
}





// HANDLE SOURCE CHANGE ///////////////////////////////////////////////////////////////////////////

async function handleSourceChange(source) {
  if (!source) return;
  
  const sourceInput = document.getElementById('tracker-source');
  const typeSelect = document.getElementById('tracker-type');
  const titleInput = document.getElementById('tracker-title');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  
  try {
    if (sourceInput) sourceInput.placeholder = 'Detecting...';
    
    const detected = await validateAndFetchInitialData(source);
    
    console.log('temp data extracted from source:', detected);
    
    if (detected.needsConfiguration) {
      // JSON with URL
      if (typeSelect) typeSelect.value = 'json';
      tempTrackerData.type = 'json';
      tempTrackerData.source = source;
      tempTrackerData.apiEndpoint = source;
      updateModalFieldVisibility();
      await fetchAndPopulateJsonKeys(source);
      return;
    }
    // Update temp data
    tempTrackerData.type = detected.type;
    tempTrackerData.source = detected.source;
    tempTrackerData.apiEndpoint = detected.apiEndpoint;
    tempTrackerData.redirectUrl = detected.redirectUrl;
    tempTrackerData.faviconUrl = detected.faviconUrl;
    tempTrackerData.feedContent = detected.feedContent;
    tempTrackerData.title = detected.feedTitle;
    
    console.log('updated temp data:', tempTrackerData);
    
    if (typeSelect) {
      typeSelect.value = detected.type;
    }
    if (titleInput) {
      titleInput.value = detected.feedTitle || '';
    }
    if (faviconInput) {
      faviconInput.value = detected.faviconUrl || '';
    }
    if (redirectInput) {
      redirectInput.value = detected.redirectUrl || '';
    }
    if (sourceInput) sourceInput.placeholder = 'Enter URL...';
    
    updateModalFieldVisibility();
    
  } catch (error) {
    if (sourceInput) sourceInput.placeholder = 'Invalid URL or unsupported type';
    notify('Source could not be identified?', error.message);
  }
}

// UPDATE MODAL FIELD VISIBILITY //////////////////////////////////////////////////////////////////

function updateModalFieldVisibility() {
  const typeSelect = document.getElementById('tracker-type');
  const feedContainer = document.getElementById('tracker-modal-feed-container');
  const titleInput = document.getElementById('tracker-title');
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  
  if (!typeSelect) return;
  
  const type = typeSelect.value;
  
  if (type === 'json') {
    // for json, show feed container, hide title input, show title select
    if (feedContainer) feedContainer.style.display = 'block';
    if (titleInput) titleInput.style.display = 'none';
    if (titleSelect) {
      titleSelect.style.display = 'block';
      titleSelect.removeAttribute('hidden');
    }
  } else if (type.startsWith('github')) {
    // for github, show feed selector with options
    if (feedContainer) feedContainer.style.display = 'block';
    if (feedSelect) {
      feedSelect.innerHTML = `
        <option value="commits">Commits</option>
        <option value="releases">Releases</option>
        <option value="issues">Issues</option>
        <option value="discussions">Discussions</option>
      `;
    }
    if (titleInput) titleInput.style.display = 'block';
    if (titleSelect) {
      titleSelect.style.display = 'none';
      titleSelect.setAttribute('hidden', '');
    }
  } else {
    // default, hide feed container, show title input
    if (feedContainer) feedContainer.style.display = 'none';
    if (titleInput) titleInput.style.display = 'block';
    if (titleSelect) {
      titleSelect.style.display = 'none';
      titleSelect.setAttribute('hidden', '');
    }
    // everything else, same
  }
}

// JSON KEY SELECTION /////////////////////////////////////////////////////////////////////////////

async function fetchAndPopulateJsonKeys(url) {
  if (!url) return;
  
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  
  if (titleSelect) titleSelect.innerHTML = '<option value="">Loading...</option>';
  if (feedSelect) feedSelect.innerHTML = '<option value="">Loading...</option>';
  
  try {
    // Auto-populate favicon and redirect
    try {
      const urlObj = new URL(url);
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      if (faviconInput) faviconInput.value = faviconUrl;
      if (redirectInput) redirectInput.value = url;
      
      tempTrackerData.faviconUrl = faviconUrl;
      tempTrackerData.redirectUrl = url;
    } catch (e) {}
    
    // Fetch JSON
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const json = await response.json();
    const keys = getFlattenedKeys(json);
    
    if (keys.length === 0) {
      if (titleSelect) titleSelect.innerHTML = '<option value="">No keys found</option>';
      if (feedSelect) feedSelect.innerHTML = '<option value="">No keys found</option>';
      return;
    }
    
    // Populate dropdowns
    if (titleSelect) titleSelect.innerHTML = '';
    if (feedSelect) feedSelect.innerHTML = '';
    
    keys.forEach(keyObj => {
      const displayValue = String(keyObj.value).substring(0, 50);
      const optionText = `${keyObj.path} = ${displayValue}`;
      
      if (titleSelect) {
        const titleOption = document.createElement('option');
        titleOption.value = keyObj.path;
        titleOption.textContent = optionText;
        titleSelect.appendChild(titleOption);
      }
      
      if (feedSelect) {
        const feedOption = document.createElement('option');
        feedOption.value = keyObj.path;
        feedOption.textContent = optionText;
        feedSelect.appendChild(feedOption);
      }
    });
    
  } catch (error) {
    if (titleSelect) titleSelect.innerHTML = '<option value="">Failed to fetch JSON</option>';
    if (feedSelect) feedSelect.innerHTML = '<option value="">Failed to fetch JSON</option>';
    console.error('JSON fetch error:', error);
  }
}

// SAVE TRACKER ///////////////////////////////////////////////////////////////////////////////////

async function handleSaveTracker() {
  const modal = document.getElementById('tracker-modal');
  const mode = modal?.getAttribute('display-mode');
  const saveBtn = document.getElementById('save-edit-tracker');
  const originalText = saveBtn?.textContent || 'Save';
  
  // Get all field values
  const sourceInput = document.getElementById('tracker-source');
  const typeSelect = document.getElementById('tracker-type');
  const titleInput = document.getElementById('tracker-title');
  const titleSelect = document.getElementById('tracker-selected-title');
  const feedSelect = document.getElementById('tracker-selected-feed');
  const faviconInput = document.getElementById('edit-tracker-favicon');
  const redirectInput = document.getElementById('tracker-url');
  const intervalInput = document.getElementById('edit-tracker-interval');
  const limitInput = document.getElementById('edit-tracker-limit');
  
  const source = sourceInput?.value.trim() || '';
  const type = typeSelect?.value || 'rss';
  const title = titleInput?.value.trim() || '';
  const titleKey = titleSelect?.value || '';
  const feedKey = feedSelect?.value || '';
  const faviconUrl = faviconInput?.value.trim() || '';
  const redirectUrl = redirectInput?.value.trim() || '';
  const interval = parseInt(intervalInput?.value || '5') * 60000;
  const limit = parseInt(limitInput?.value || '200');
  
  // Validation
  if (!source) {
    notify('Missing Source', 'Please enter a source URL');
    return;
  }
  
  if (type === 'json' && (!titleKey || !feedKey)) {
    notify('Missing Selection', 'Please select keys for title and feed');
    return;
  }
  
  if (isNaN(interval) || interval < 60000) {
    notify('Invalid Interval', 'Update interval must be at least 1 minute');
    return;
  }
  
  if (isNaN(limit) || limit < 1) {
    notify('Invalid Limit', 'Daily limit must be at least 1');
    return;
  }
  
  if (saveBtn) {
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
  }
  
  try {
    // Update temp data with user inputs
    tempTrackerData.title = title || tempTrackerData.title;
    tempTrackerData.faviconUrl = faviconUrl || tempTrackerData.faviconUrl;
    tempTrackerData.redirectUrl = redirectUrl || tempTrackerData.redirectUrl;
    tempTrackerData.updateInterval = interval;
    tempTrackerData.dailyRequestLimit = limit;
    
    // JSON-specific config
    if (type === 'json') {
      tempTrackerData.config = {
        titleKey: titleKey,
        feedKey: feedKey
      };
      tempTrackerData.apiEndpoint = source;
      
      // 🆕 Fetch the JSON to get the actual title value
      try {
        const response = await fetch(source);
        if (response.ok) {
          const jsonData = await response.json();
          const actualTitle = getNestedValue(jsonData, titleKey);
          tempTrackerData.title = actualTitle ? String(actualTitle) : (title || 'JSON Feed');
        } else {
          tempTrackerData.title = title || 'JSON Feed';
        }
      } catch (fetchError) {
        console.error('Failed to fetch JSON for title:', fetchError);
        tempTrackerData.title = title || 'JSON Feed';
      }
    }
    
    if (mode === 'add') {
      await addTracker(tempTrackerData);
      notify('Tracker Added', `${tempTrackerData.title} has been added`);
    } else {
      // Update existing
      const index = state.trackers.findIndex(t => t.id === tempTrackerData.id);
      if (index !== -1) {
        state.trackers[index] = tempTrackerData;
        await saveTrackers();
        await updateTracker(tempTrackerData.id);
        renderTrackers();
        notify('Tracker Updated', `${tempTrackerData.title} has been updated`);
      }
    }
    
    closeTrackerModal();
    
  } catch (error) {
    notify('Save Failed', error.message);
    console.error('Save error:', error);
  } finally {
    if (saveBtn) {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }
}