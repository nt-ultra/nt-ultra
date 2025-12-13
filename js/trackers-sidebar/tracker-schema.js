/**
 * @typedef {Object} TrackerConfig
 * @property {string} [titleKey] - JSON: key path for feed title
 * @property {string} [feedKey] - JSON: key path for item description
 * @property {'commits'|'releases'|'issues'|'discussions'} [feedType] - GitHub: which feed to track
 */

/**
 * @typedef {Object} FeedContent
 * @property {string} displayedContent - Text shown on tracker card
 * @property {string} fetchedContent - Raw content from API
 * @property {number} pubDate - Publication timestamp
 * @property {string|null} link - Link to specific item
 */

/**
 * @typedef {Object} Tracker
 * @property {number} id - Unique identifier (timestamp)
 * @property {string} type - Tracker type: 'rss'|'json'|'crypto'|etc
 * 
 * === USER INPUT ===
 * @property {string} source - Raw user input
 * 
 * === COMPUTED/INTERNAL ===
 * @property {string} apiEndpoint - Where to fetch data from
 * 
 * === USER CONFIGURATION ===
 * @property {string} title - Display name
 * @property {string} faviconUrl - Icon URL
 * @property {string} redirectUrl - Where clicking navigates to
 * 
 * === TYPE-SPECIFIC ===
 * @property {TrackerConfig} config - Type-specific configuration
 * 
 * === FETCHED CONTENT ===
 * @property {FeedContent} feedContent - Latest content from feed
 * 
 * === METADATA ===
 * @property {number} lastChecked - Last fetch attempt
 * @property {number} lastUpdate - Last time new content found
 * @property {number} updateInterval - Milliseconds between updates
 * @property {number} dailyRequestLimit - Max requests per 24h
 * @property {number} requestCount - Current request count
 * @property {number} requestResetTime - When count resets
 * @property {number|null} rateLimitedUntil - Pause until timestamp
 */

/**
 * Creates a new tracker with default values
 */
export function createTracker({
  type,
  source,
  apiEndpoint,
  title,
  faviconUrl = '',
  redirectUrl,
  config = {},
  feedContent = null
}) {
  return {
    id: Date.now(),
    type,
    source,
    apiEndpoint,
    title,
    faviconUrl,
    redirectUrl,
    config,
    feedContent: feedContent || {
      displayedContent: 'Checking for updates...',
      fetchedContent: '',
      pubDate: Date.now(),
      link: null
    },
    lastChecked: Date.now(),
    lastUpdate: null,
    updateInterval: 300000, // 5 min by default
    dailyRequestLimit: 200,
    requestCount: 0,
    requestResetTime: Date.now() + (24 * 60 * 60 * 1000),
    rateLimitedUntil: null
  };
}

export default { createTracker };