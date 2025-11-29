// ...

window.getCleanHostname = function(url) {
    try {
        let hostname = new URL(url).hostname;
        if (hostname.startsWith('www.')) {
            hostname = hostname.replace('www.', '');
        }
        const lastDotIndex = hostname.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            hostname = hostname.substring(0, lastDotIndex);
        }
        return hostname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return '';
    }
}

window.getFaviconUrl = function(url) {
    try {
        const hostname = new URL(url).hostname;
        if (!hostname.includes('.')) {
            // no fallback white globes here...
            return null;
        }
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch (error) {
        console.error('Invalid URL for favicon:', error);
        return null;
    }
}

window.normalizeUrl = function(url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    try {
        new URL(url);
        return url;
    } catch (error) {
        return null;
    }
}