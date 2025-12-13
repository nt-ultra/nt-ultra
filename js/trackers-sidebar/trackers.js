import { state } from '../core/state.js';
import { saveTrackers } from '../core/database.js';
import { ModalManager } from '../core/modal-manager.js';
import { notify } from '../core/notify.js';
import ContextMenuManager from '../core/context-manager.js';
import { createTracker } from './tracker-schema.js';
import { fetchTrackerUpdate } from './trackers-fetcher.js';

let refreshInterval = null;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// RENDERING //////////////////////////////////////////////////////////////////////////////////////

export function renderTrackers() {
  const grid = document.getElementById('trackers-grid');
  const count = document.getElementById('trackers-count');
  if (!grid) return;
  
  count.textContent = `${state.trackers.length}/${state.settings.trackerMaxLimit}`;
  grid.innerHTML = '';
  
  if (state.trackers.length === 0) {
    grid.innerHTML = `
      <div class="trackers-empty">
        <h3>Nothing to track</h3>
        <p>Add your first tracker to stay updated on things like RSS feeds,<br>github activity, youtube channels, reddit posts, subreddits, and more.</p>
      </div>
    `;
    return;
  }
  
  state.trackers.forEach(tracker => {
    const item = createTrackerItem(tracker);
    grid.appendChild(item);
  });
}

function createTrackerItem(tracker) {
  const div = document.createElement('div');
  div.className = 'tracker-item';
  div.dataset.trackerId = tracker.id;
  div.dataset.source = tracker.type;
  const oneHour = 60 * 60 * 1000;
  if (tracker.lastUpdate && (Date.now() - tracker.lastUpdate < oneHour)) {
    div.classList.add('new');
  }
  
  const typeIcon = document.createElement('img');
  typeIcon.className = 'tracker-type-icon';
  typeIcon.src = tracker.faviconUrl || '';
  typeIcon.onerror = function() {
    const fallback = document.createElement('div');
    fallback.className = 'tracker-type-icon tracker-type-icon-fallback';
    fallback.textContent = '💬';
    this.replaceWith(fallback);
  };
  div.appendChild(typeIcon);
  
  if (div.classList.contains('new')) {
    const badge = document.createElement('span');
    badge.className = 'tracker-badge';
    badge.textContent = 'NEW';
    div.appendChild(badge);
  }
  
  const info = document.createElement('div');
  info.className = 'tracker-info';
  const title = document.createElement('div');
  title.className = 'tracker-title';
  title.textContent = tracker.title || 'Untitled Tracker';
  const description = document.createElement('div');
  description.className = 'tracker-description';
  description.textContent = tracker.feedContent?.displayedContent || 'Checking for updates...';
  const meta = document.createElement('div');
  meta.className = 'tracker-meta';
  const displayTime = tracker.feedContent?.pubDate || tracker.lastChecked || Date.now();
  const typeLabel = getTrackerTypeLabel(tracker.type);
  meta.textContent = `${typeLabel} • ${formatDate(displayTime)}`;
  
  info.appendChild(title);
  info.appendChild(description);
  info.appendChild(meta);
  div.appendChild(info);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'tracker-delete';
  deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTracker(tracker.id);
  });
  div.appendChild(deleteBtn);
  
  div.addEventListener('click', (e) => {
    if (e.button === 0) {
      openTracker(tracker);
    }
  });
  div.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      openTrackerInNewTab(tracker);
    }
  });
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ContextMenuManager.show(e, tracker, [
      { action: 'refresh', label: 'Refresh Feed', handler: () => updateTracker(tracker.id) },
      { 
        action: 'open-new', 
        label: 'Open Link in New Tab', 
        handler: () => {
          const url = tracker.feedContent?.link || tracker.redirectUrl;
          if (url) window.open(url, '_blank');
        }
      },
      { action: 'edit', label: 'Edit', handler: () => openEditTrackerModal(tracker) },
      { action: 'delete', label: 'Delete', danger: true, handler: () => deleteTracker(tracker.id) }
    ]);
  });
  
  return div;
}

function getTrackerTypeLabel(type) {
  const labels = {
    'rss': 'RSS Feed',
    'json': 'JSON Feed',
    'crypto': 'Cryptocurrency',
    'stock': 'Stock Price',
    'weather': 'Weather',
    'youtube': 'YouTube Channel',
    'github-commits': 'GitHub Commits',
    'github-releases': 'GitHub Releases',
    'github-issues': 'GitHub Issues',
    'github-discussions': 'GitHub Discussions',
    'twitch': 'Twitch Stream',
    'medium': 'Medium Author',
    'devto': 'Dev.to Author',
    'substack': 'Substack Newsletter',
    'twitter': 'X/Twitter User',
    'mastodon': 'Mastodon User'
  };
  return labels[type] || 'Feed';
}

function formatDate(timestamp) {
  if (!timestamp) return 'Never checked';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function openTracker(tracker) {
  const url = tracker.feedContent?.link || tracker.redirectUrl;
  if (url) {
    window.location.href = url;
  }
}

function openTrackerInNewTab(tracker) {
  const url = tracker.feedContent?.link || tracker.redirectUrl;
  if (url) {
    window.open(url, '_blank');
  }
}

// /////////////////////////////////////////////////////////////////////////////////////////

export function deleteTracker(id) {
  state.trackers = state.trackers.filter(t => t.id !== id);
  saveTrackers();
  renderTrackers();
}

export async function addTracker(trackerData) {
  if (state.trackers.length >= state.settings.trackerMaxLimit) {
    notify('Tracker Limit Reached', `Only ${state.settings.trackerMaxLimit} trackers allowed.`);
    return;
  }
  
  const newTracker = createTracker({
    type: trackerData.type,
    source: trackerData.source,
    apiEndpoint: trackerData.apiEndpoint,
    title: trackerData.title || trackerData.feedTitle || 'New Tracker',
    faviconUrl: trackerData.faviconUrl || '',
    redirectUrl: trackerData.redirectUrl,
    config: trackerData.config || {},
    feedContent: trackerData.feedContent || null
  });
  
  state.trackers.push(newTracker);
  await saveTrackers();
  renderTrackers();
  
  await updateTracker(newTracker.id);
}

// UPDATE LOGIC ///////////////////////////////////////////////////////////////////////////////////

export async function updateTracker(trackerId) {
  const tracker = state.trackers.find(t => t.id === trackerId);
  if (!tracker) return;
  
  if (Date.now() >= tracker.requestResetTime) {
    tracker.requestCount = 0;
    tracker.requestResetTime = Date.now() + (24 * 60 * 60 * 1000);
  }
  
  // Check if rate limited
  if (tracker.rateLimitedUntil && Date.now() < tracker.rateLimitedUntil) {
    return;
  }
  if (tracker.requestCount >= tracker.dailyRequestLimit) {
    notify('Tracker Limit Reached', `${tracker.title} has reached its daily limit.`);
    tracker.rateLimitedUntil = tracker.requestResetTime;
    await saveTrackers();
    return;
  }
  tracker.requestCount++;
  
  try {
    const data = await fetchTrackerUpdate(tracker);
    if (!data) {
      tracker.lastChecked = Date.now();
      await saveTrackers();
      return;
    }
    const isNewItem = !tracker.feedContent?.pubDate || 
                      data.feedContent.pubDate > tracker.feedContent.pubDate;
    
    tracker.feedContent = data.feedContent;
    tracker.lastChecked = Date.now();
    if (isNewItem) {
      tracker.lastUpdate = data.feedContent.pubDate;
    }
    await saveTrackers();
    renderTrackers();
    
  } catch (error) {
    console.error(`updateTracker: failed for ${tracker.title}:`, error);
    tracker.lastChecked = Date.now();
    await saveTrackers();
  }
}

export async function updateAllTrackers() {
  for (const tracker of state.trackers) {
    await updateTracker(tracker.id);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// AUTO-REFRESH ///////////////////////////////////////////////////////////////////////////////////

export function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  setTimeout(() => updateAllTrackers(), 2000);
  
  refreshInterval = setInterval(() => {
    updateAllTrackers();
  }, REFRESH_INTERVAL_MS);
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

export function applyTrackerButton() {
  const btn = document.getElementById('trackers-btn');
  if (!btn) return;
  
  if (state.settings.displayTrackers) {
    btn.style.display = 'flex';
    startAutoRefresh();
  } else {
    btn.style.display = 'none';
    stopAutoRefresh();
  }
}


export function openEditTrackerModal(tracker) {
  // revisit
  window.openTrackerModalForEdit(tracker);
}