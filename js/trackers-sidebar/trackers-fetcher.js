const TRACKER_METADATA = {
  'rss': { label: 'RSS Feed' },
  'json': { label: 'JSON Feed' },
  'github-commits': { label: 'GitHub Commits' },
  'github-releases': { label: 'GitHub Releases' },
  'github-issues': { label: 'GitHub Issues' },
  'github-discussions': { label: 'GitHub Discussions' },
  'youtube': { label: 'YouTube Channel' },
  'crypto': { label: 'Cryptocurrency' },
  'stock': { label: 'Stock Price' },
  'weather': { label: 'Weather' },
  'twitch': { label: 'Twitch Stream' },
  'medium': { label: 'Medium Author' },
  'devto': { label: 'Dev.to Author' },
  'substack': { label: 'Substack Newsletter' },
  'twitter': { label: 'X/Twitter User' },
  'mastodon': { label: 'Mastodon User' },
};

function getTrackerMetadata(type, sourceUrl = '') {
  const meta = TRACKER_METADATA[type] || TRACKER_METADATA['rss'];
  let domain = '';
  if (sourceUrl) {
    try {
      domain = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname;
    } catch (e) {
      domain = 'feed';
    }
  }
  return {
    typeLabel: meta.label,
    faviconUrl: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : ''
  };
}

function createFetcherResponse({
  feedTitle,
  faviconUrl = null,
  typeLabel,
  feedContent
}) {
  return {
    feedTitle,
    faviconUrl,
    typeLabel,
    feedContent: {
      displayedContent: feedContent.displayedContent,
      fetchedContent: feedContent.fetchedContent || '',
      pubDate: feedContent.pubDate,
      link: feedContent.link || null
    }
  };
}

function normalizeUrl(url) {
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

async function getYouTubeChannelId(username) {
  try {
    const pageUrl = `https://www.youtube.com/@${username}`;
    const response = await fetch(pageUrl);
    const html = await response.text();
    const patterns = [
      /"channelId":"(UC[^"]+)"/,
      /"browseId":"(UC[^"]+)"/,
      /channel\/(UC[A-Za-z0-9_-]+)/
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    throw new Error('Could not find channel ID');
  } catch (error) {
    throw new Error(`Could not find channel ID for @${username}`);
  }
}

export function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

export function getFlattenedKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    keys.push({
      path: fullPath,
      value: value,
      type: typeof value
    });
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getFlattenedKeys(value, fullPath));
    }
  }
  return keys;
}

// TYPE DETECTION ///////////////////////////////////////////////////////////////////////////////////////////

export async function detectTrackerType(rawInput) {
  const originalInput = rawInput.trim();
  
  // crypto - revisit too lazy
  const cryptoMap = {
    'bitcoin': 'bitcoin', 'btc': 'bitcoin',
    'ethereum': 'ethereum', 'eth': 'ethereum',
    'cardano': 'cardano', 'ada': 'cardano',
    'ripple': 'ripple', 'xrp': 'ripple',
    'dogecoin': 'dogecoin', 'doge': 'dogecoin',
    'solana': 'solana', 'sol': 'solana',
    'polkadot': 'polkadot', 'dot': 'polkadot',
    'litecoin': 'litecoin', 'ltc': 'litecoin'
  };
  if (cryptoMap[originalInput.toLowerCase()]) {
    const coinId = cryptoMap[originalInput.toLowerCase()];
    return {
      type: 'crypto',
      source: originalInput,
      apiEndpoint: `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      redirectUrl: `https://www.coingecko.com/en/coins/${coinId}`
    };
  }
  
  // weather
  const weatherPatterns = [
    /^weather\s+(?:in|for)\s+(.+)$/i,
    /^(.+)\s+weather$/i,
    /^weather\s+(.+)$/i
  ];
  for (const pattern of weatherPatterns) {
    const match = originalInput.match(pattern);
    if (match) {
      const location = match[1].trim();
      return {
        type: 'weather',
        source: originalInput,
        apiEndpoint: `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
        redirectUrl: `https://wttr.in/${location}`
      };
    }
  }
  
  // Stocks by the ticker
  if (/^[A-Za-z]{1,5}$/.test(originalInput)) {
    return {
      type: 'stock',
      source: originalInput,
      apiEndpoint: `https://query1.finance.yahoo.com/v8/finance/chart/${originalInput}`,
      redirectUrl: `https://finance.yahoo.com/quote/${originalInput}`
    };
  }
  
  // URL based, rss, json, special cases
  const url = normalizeUrl(originalInput);
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    if (pathname.endsWith('.json')) {
      return {
        type: 'json',
        source: originalInput,
        apiEndpoint: url,
        redirectUrl: url
      };
    }
    try {
      const headResponse = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // unsure on timeout
      });
      const contentType = headResponse.headers.get('content-type');
      if (contentType && contentType.toLowerCase().includes('json')) {
        return {
          type: 'json',
          source: originalInput,
          apiEndpoint: url,
          redirectUrl: url
        };
      }
    } catch (headError) {
      console.log('HEAD request failed for JSON detection:', headError.message);
    }
  } catch (e) {
  }

  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace('www.', '');
  const pathname = urlObj.pathname;

  // ...twitch
  if (hostname.includes('twitch.tv')) {
    const username = pathname.split('/').filter(Boolean)[0];
    if (username) {
      return {
        type: 'twitch',
        source: originalInput,
        apiEndpoint: `https://decapi.me/twitch/uptime/${username}`,
        redirectUrl: `https://twitch.tv/${username}`
      };
    }
  }
  // ...medium
  if (hostname.includes('medium.com') && pathname.includes('/@')) {
    const feedUrl = `https://medium.com/feed${pathname.split('?')[0]}`;
    return {
      type: 'medium',
      source: originalInput,
      apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      redirectUrl: url
    };
  }
  // ...Dev.to
  if (hostname.includes('dev.to')) {
    const username = pathname.split('/').filter(Boolean)[0];
    if (username) {
      const feedUrl = `https://dev.to/feed/${username}`;
      return {
        type: 'devto',
        source: originalInput,
        apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
        redirectUrl: url
      };
    }
  }
  // ...substack
  if (hostname.includes('substack.com')) {
    const baseUrl = url.split('?')[0].replace(/\/$/, '');
    const feedUrl = `${baseUrl}/feed`;
    return {
      type: 'substack',
      source: originalInput,
      apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      redirectUrl: baseUrl
    };
  }
  // ...twitter/X (attention needed)
  if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
    const usernameMatch = pathname.match(/^\/([a-zA-Z0-9_]+)$/);
    if (usernameMatch && usernameMatch[1] && !['home', 'explore', 'notifications'].includes(usernameMatch[1].toLowerCase())) {
      const username = usernameMatch[1];
      return {
        type: 'twitter',
        source: originalInput,
        apiEndpoint: `https://xcancel.com/${username}/rss`,
        redirectUrl: `https://x.com/${username}`
      };
    }
  }
  // ...mastodon
  if (hostname.includes('mastodon') && pathname.includes('/@')) {
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    const rssUrl = `${cleanUrl}.rss`;
    return {
      type: 'mastodon',
      source: originalInput,
      apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
      redirectUrl: cleanUrl
    };
  }
  // ...yt
  if (hostname.includes('youtube.com')) {
    if (pathname.includes('/@')) {
      const username = pathname.split('/@')[1].split('/')[0];
      const channelId = await getYouTubeChannelId(username);
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      return {
        type: 'youtube',
        source: originalInput,
        apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
        redirectUrl: `https://www.youtube.com/channel/${channelId}`
      };
    }
    if (pathname.includes('/channel/')) {
      const channelId = pathname.split('/channel/')[1].split('/')[0].split('?')[0];
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      return {
        type: 'youtube',
        source: originalInput,
        apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
        redirectUrl: `https://www.youtube.com/channel/${channelId}`
      };
    }
  }
  // ...github
  if (hostname.includes('github.com')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      const baseUrl = `https://github.com/${owner}/${repo}`;
      
      if (pathname.includes('/releases')) {
        return {
          type: 'github-releases',
          source: originalInput,
          apiEndpoint: `https://api.github.com/repos/${owner}/${repo}/releases`,
          redirectUrl: `${baseUrl}/releases`
        };
      }
      if (pathname.includes('/issues')) {
        return {
          type: 'github-issues',
          source: originalInput,
          apiEndpoint: `https://api.github.com/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc`,
          redirectUrl: `${baseUrl}/issues`
        };
      }
      if (pathname.includes('/discussions')) {
        return {
          type: 'github-discussions',
          source: originalInput,
          apiEndpoint: `${baseUrl}/discussions.atom`,
          redirectUrl: `${baseUrl}/discussions`
        };
      }
      return {
        type: 'github-commits',
        source: originalInput,
        apiEndpoint: `https://api.github.com/repos/${owner}/${repo}/commits`,
        redirectUrl: baseUrl
      };
    }
  }
  // reddit supplies the rss already
  if (hostname.includes('reddit.com')) {
    let cleanUrl = url.split('?')[0].replace('.json', '');
    if (!cleanUrl.endsWith('.rss')) {
      cleanUrl = cleanUrl.replace(/\/$/, '') + '/.rss';
    }
    return {
      type: 'rss',
      source: originalInput,
      apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cleanUrl)}`,
      redirectUrl: url.split('?')[0]
    };
  }
  // default to plain old RSS
  return {
    type: 'rss',
    source: originalInput,
    apiEndpoint: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
    redirectUrl: url
  };
}

// INDIVIDUAL FETCHERS ////////////////////////////////////////////////////////////////////////////////////

// naming convention:
// feed title
// feed content {fetched, displayed}

async function fetchRSS(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok' || !data.items || data.items.length === 0) {
    throw new Error('No items in feed');
  }
  const latestItem = data.items[0];
  const meta = getTrackerMetadata('rss', sourceUrl);
  return createFetcherResponse({
    feedTitle: data.feed?.title || 'RSS Feed',
    faviconUrl: meta.faviconUrl,
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: latestItem.title, // 
      fetchedContent: latestItem.description?.substring(0, 150) || '',
      pubDate: new Date(latestItem.pubDate).getTime(),
      link: latestItem.link
    }
  });
}

async function fetchJsonTracker(tracker) {
  const response = await fetch(tracker.apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const titleValue = getNestedValue(data, tracker.config.titleKey);
  const feedValue = getNestedValue(data, tracker.config.feedKey);
  const meta = getTrackerMetadata('json', tracker.source);
  return createFetcherResponse({
    feedTitle: titleValue ? String(titleValue) : 'JSON Feed',
    faviconUrl: tracker.faviconUrl || meta.faviconUrl,
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: feedValue ? String(feedValue) : 'No data',
      fetchedContent: '',
      pubDate: Date.now(),
      link: null
    }
  });
}

async function fetchGitHubCommits(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const commits = await response.json();
  if (!commits || commits.length === 0) throw new Error('No commits found');
  const latest = commits[0];
  const repoName = sourceUrl.split('github.com/')[1]?.split('/').slice(0, 2).join('/') || 'Repository';
  const meta = getTrackerMetadata('github-commits');
  return createFetcherResponse({
    feedTitle: repoName,
    faviconUrl: meta.faviconUrl || 'https://github.com/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: latest.commit.message.split('\n')[0],
      fetchedContent: `by ${latest.commit.author.name}`,
      pubDate: new Date(latest.commit.author.date).getTime(),
      link: latest.html_url
    }
  });
}

async function fetchGitHubReleases(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const releases = await response.json();
  if (!releases || releases.length === 0) throw new Error('No releases found');
  const latest = releases[0];
  const repoName = sourceUrl.split('github.com/')[1]?.split('/').slice(0, 2).join('/') || 'Repository';
  const meta = getTrackerMetadata('github-releases');
  return createFetcherResponse({
    feedTitle: repoName,
    faviconUrl: meta.faviconUrl || 'https://github.com/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: latest.name || latest.tag_name,
      fetchedContent: latest.body?.substring(0, 150) || '',
      pubDate: new Date(latest.published_at).getTime(),
      link: latest.html_url
    }
  });
}

async function fetchGitHubIssues(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const issues = await response.json();
  if (!issues || issues.length === 0) throw new Error('No issues found');
  const latest = issues[0];
  const repoName = sourceUrl.split('github.com/')[1]?.split('/').slice(0, 2).join('/') || 'Repository';
  const meta = getTrackerMetadata('github-issues');
  return createFetcherResponse({
    feedTitle: repoName,
    faviconUrl: meta.faviconUrl || 'https://github.com/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: latest.title,
      fetchedContent: latest.body?.substring(0, 150) || '',
      pubDate: new Date(latest.created_at).getTime(),
      link: latest.html_url
    }
  });
}

async function fetchGitHubDiscussions(apiEndpoint) {
  return await fetchDirectRSS(apiEndpoint, 'github-discussions');
}

async function fetchTwitch(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const isLive = !text.toLowerCase().includes('offline');
  const username = sourceUrl.split('/').pop();
  const meta = getTrackerMetadata('twitch');
  return createFetcherResponse({
    feedTitle: `Twitch: ${username}`,
    faviconUrl: 'https://www.twitch.tv/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: isLive ? `LIVE 🟣` : 'offline ⚫',
      fetchedContent: isLive ? text.trim() : 'Not streaming',
      pubDate: Date.now(),
      link: null
    }
  });
}

async function fetchCrypto(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const coinId = sourceUrl.toLowerCase().replace(/[^a-z]/g, '');
  const cryptoMap = {
    'btc': 'bitcoin', 'bitcoin': 'bitcoin',
    'eth': 'ethereum', 'ethereum': 'ethereum',
    'ada': 'cardano', 'cardano': 'cardano',
    'xrp': 'ripple', 'ripple': 'ripple',
    'doge': 'dogecoin', 'dogecoin': 'dogecoin',
    'sol': 'solana', 'solana': 'solana',
    'dot': 'polkadot', 'polkadot': 'polkadot',
    'ltc': 'litecoin', 'litecoin': 'litecoin'
  };
  const fullCoinId = cryptoMap[coinId] || coinId;
  const coin = data[fullCoinId];
  if (!coin) throw new Error('Coin not found');
  const change = coin.usd_24h_change || 0;
  const emoji = change >= 0 ? '🟢' : '🔻';
  const meta = getTrackerMetadata('crypto');
  return createFetcherResponse({
    feedTitle: fullCoinId.charAt(0).toUpperCase() + fullCoinId.slice(1),
    faviconUrl: 'https://www.coingecko.com/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: `$${coin.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${emoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      fetchedContent: `$${coin.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pubDate: Date.now(),
      link: null
    }
  });
}

async function fetchWeather(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const current = data.current_condition[0];
  const weatherDesc = current.weatherDesc[0].value;
  const city = sourceUrl.replace(/^weather\s+(?:in|for)?\s*/i, '').replace(/\s+weather$/i, '');
  const meta = getTrackerMetadata('weather');
  return createFetcherResponse({
    feedTitle: `Weather in ${city}`,
    faviconUrl: 'https://wttr.in/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: `${weatherDesc}, ${current.temp_F}°F`,
      fetchedContent: `Feels like ${current.FeelsLikeF}°F`,
      pubDate: Date.now(),
      link: null
    }
  });
}

async function fetchStock(apiEndpoint, sourceUrl) {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const result = data.chart.result[0];
  const smeta = result.meta;
  const price = smeta.regularMarketPrice;
  const change = smeta.regularMarketChangePercent ?? smeta.regularMarketChange ?? 0;
  const emoji = change >= 0 ? '🟢' : '🔻';
  const meta = getTrackerMetadata('stock');
  return createFetcherResponse({
    feedTitle: sourceUrl.toUpperCase(),
    faviconUrl: 'https://finance.yahoo.com/favicon.ico',
    typeLabel: meta.typeLabel,
    feedContent: {
      displayedContent: `${price.toFixed(2)} ${emoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      fetchedContent: `${price.toFixed(2)}`,
      pubDate: Date.now(),
      link: null
    }
  });
}

async function fetchTwitter(sourceUrl) {
  const NITTER_INSTANCES = [
    'https://xcancel.com',
    'https://nitter.net',
    'https://nitter.poast.org',
    'https://nitter.moomoo.host'
  ];
  const username = sourceUrl.split('/').filter(Boolean).pop().replace('@', '');
  let lastError = new Error(`Failed to fetch @${username} feed`);
  for (const instance of NITTER_INSTANCES) {
    try {
      const rssUrl = `${instance}/${username}/rss`;
      const data = await fetchDirectRSS(rssUrl, 'twitter');
      data.feedTitle = `X/Twitter: @${username}`;
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`${instance} failed, trying next...`);
    }
  }
  throw lastError;
}

async function fetchDirectRSS(feedUrl, type = 'rss') {
  const response = await fetch(feedUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  // try ATOM
  const entries = xml.querySelectorAll('entry');
  if (entries.length > 0) {
    const latest = entries[0];
    let title = latest.querySelector('title')?.textContent || '';
    const linkEl = latest.querySelector('link[rel="alternate"]') || latest.querySelector('link');
    const link = linkEl?.getAttribute('href') || feedUrl;
    const published = latest.querySelector('published')?.textContent || 
                     latest.querySelector('updated')?.textContent || 
                     new Date().toISOString();
    const content = latest.querySelector('content')?.textContent || 
                   latest.querySelector('summary')?.textContent || '';
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    
    if (!title || title === 'Untitled') {
      title = cleanContent.substring(0, 100) || 'New post';
    }
    
    const feedTitle = xml.querySelector('feed > title')?.textContent || 'Feed';
    const meta = getTrackerMetadata(type, feedUrl);
    return createFetcherResponse({
      feedTitle,
      faviconUrl: meta.faviconUrl,
      typeLabel: meta.typeLabel,
      feedContent: {
        displayedContent: title,
        fetchedContent: cleanContent.substring(0, 150),
        pubDate: new Date(published).getTime(),
        link
      }
    });
  }
  // try rss
  const items = xml.querySelectorAll('item');
  if (items.length > 0) {
    const latest = items[0];
    let title = latest.querySelector('title')?.textContent?.trim() || '';
    const link = latest.querySelector('link')?.textContent || feedUrl;
    const pubDate = latest.querySelector('pubDate')?.textContent || new Date().toISOString();
    const description = latest.querySelector('description')?.textContent || '';
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
    if (!title) {
      title = cleanDescription.substring(0, 100) || 'New post';
    }
    const feedTitle = xml.querySelector('channel > title')?.textContent || 'Feed';
    const meta = getTrackerMetadata(type, feedUrl);
    return createFetcherResponse({
      feedTitle,
      faviconUrl: meta.faviconUrl,
      typeLabel: meta.typeLabel,
      feedContent: {
        displayedContent: title,
        fetchedContent: cleanDescription.substring(0, 150),
        pubDate: new Date(pubDate).getTime(),
        link
      }
    });
  }
  
  throw new Error('fetchDirectRSS: no items found in feed');
}

// fetching all //////////////////////////////////////////////////////////////////////////////////

export async function fetchTrackerUpdate(tracker) {
  try {
    switch (tracker.type) {
      case 'rss':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
      case 'medium':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
    case 'devto':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
    case 'substack':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
    case 'mastodon':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
    case 'json':
        return await fetchJsonTracker(tracker);
    case 'youtube':
        return await fetchRSS(tracker.apiEndpoint, tracker.source);
    case 'github-commits':
        return await fetchGitHubCommits(tracker.apiEndpoint, tracker.source);
    case 'github-releases':
        return await fetchGitHubReleases(tracker.apiEndpoint, tracker.source);
    case 'github-issues':
        return await fetchGitHubIssues(tracker.apiEndpoint, tracker.source);
    case 'github-discussions':
        return await fetchGitHubDiscussions(tracker.apiEndpoint);
    case 'twitch':
        return await fetchTwitch(tracker.apiEndpoint, tracker.source);
    case 'crypto':
        return await fetchCrypto(tracker.apiEndpoint, tracker.source);
    case 'weather':
        return await fetchWeather(tracker.apiEndpoint, tracker.source);
    case 'stock':
        return await fetchStock(tracker.apiEndpoint, tracker.source);
    case 'twitter':
        return await fetchTwitter(tracker.source);
    default:
        throw new Error(`fetchTrackerUpdate: unknown type: ${tracker.type}`);
    }
  } catch (error) {
    console.error(`fetchTrackerUpdate: fetch failed for ${tracker.title}:`, error);
    return null;
  }
}

// VALIDATE AND FETCH INITIAL DATA /////////////////////////////////////////////////////////////

export async function validateAndFetchInitialData(rawSource) {
    const detected = await detectTrackerType(rawSource);
    if (detected.type === 'json') {
      return {
        type: 'json',
        source: rawSource,
        apiEndpoint: detected.apiEndpoint,
        redirectUrl: detected.redirectUrl,
        needsConfiguration: true
      };
    }
    const tempTracker = {
        type: detected.type,
        source: detected.source,
        apiEndpoint: detected.apiEndpoint,
        redirectUrl: detected.redirectUrl,
        config: {}
    };
    const fetchedData = await fetchTrackerUpdate(tempTracker);
    if (!fetchedData) {
        throw new Error('validateAndFetchInitialData: failed to fetch initial data');
    }
    return {
        type: detected.type,
        source: detected.source,
        apiEndpoint: detected.apiEndpoint,
        redirectUrl: detected.redirectUrl,
        feedTitle: fetchedData.feedTitle,
        faviconUrl: fetchedData.faviconUrl,
        typeLabel: fetchedData.typeLabel,
        feedContent: fetchedData.feedContent
    };
}