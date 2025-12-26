import { state } from '../core/state.js';
import { saveSettings } from '../core/database.js';

const SEARCH_PROVIDERS = {
    google: {
        name: 'Google',
        suggestionsUrl: 'https://www.google.com/complete/search?client=firefox&q=',
        searchUrl: 'https://www.google.com/search?q=',
        parseResponse: (data) => data[1] || []
    },

    bing: {
        name: 'Bing',
        suggestionsUrl: 'https://api.bing.com/osjson.aspx?query=',
        searchUrl: 'https://www.bing.com/search?q=',
        parseResponse: (data) => data[1] || []
    },
    brave: {
        name: 'Brave',
        suggestionsUrl: 'https://search.brave.com/api/suggest?q=',
        searchUrl: 'https://search.brave.com/search?q=',
        parseResponse: (data) => {
            try {
                return data[1] || [];
            } catch {
                return [];
            }
        }
    },
    duckduckgo: {
        name: 'DuckDuckGo',
        suggestionsUrl: 'https://duckduckgo.com/ac/?q=',
        searchUrl: 'https://duckduckgo.com/?q=',
        parseResponse: (data) => data.map(item => item.phrase)
    },
    // ecosia: {
    //     name: 'Ecosia',
    //     suggestionsUrl: 'https://ac.ecosia.org/autocomplete?q=',
    //     searchUrl: 'https://www.ecosia.org/search?q=',
    //     parseResponse: (data) => data.suggestions || []
    // },
    startpage: {
        name: 'Startpage',
        suggestionsUrl: 'https://www.google.com/complete/search?client=firefox&q=',
        searchUrl: 'https://www.startpage.com/do/search?q=',
        parseResponse: (data) => data[1] || []
    },
    reddit: {
        name: 'Reddit',
        suggestionsUrl: 'https://www.google.com/complete/search?client=firefox&q=',
        searchUrl: 'https://www.google.com/search?q=',
        parseResponse: (data) => {
            return data[1] || [];
        }
    },
    wikipedia: {
        name: 'Wikipedia',
        suggestionsUrl: 'https://en.wikipedia.org/w/api.php?action=opensearch&search=',
        searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=',
        parseResponse: (data) => data[1] || []
    },
    youtube: {
        name: 'YouTube',
        suggestionsUrl: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=',
        searchUrl: 'https://www.youtube.com/results?search_query=',
        parseResponse: (data) => data[1] || []
    }
};
let debounceTimer;
let selectedIndex = -1;
let currentSuggestions = [];

async function getSearchSuggestions(query) {
    const provider = SEARCH_PROVIDERS[state.settings.searchProvider] || SEARCH_PROVIDERS.google;
    try {
        const response = await fetch(provider.suggestionsUrl + encodeURIComponent(query));
        const data = await response.json();
        return provider.parseResponse(data);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
}
function displaySuggestions(suggestions) {
    const suggestionsBox = document.getElementById('search-suggestions');
    currentSuggestions = suggestions;
    selectedIndex = -1;
    if (!suggestions || suggestions.length === 0) {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        return;
    }
    suggestionsBox.innerHTML = suggestions
        .map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
                <span>${escapeHtml(suggestion)}</span>
            </div>
        `)
        .join('');
    suggestionsBox.style.display = 'block';
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const suggestion = item.querySelector('span').textContent;
            performSearch(suggestion);
        });
    });
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// search away
function performSearch(query) {
    const provider = SEARCH_PROVIDERS[state.settings.searchProvider] || SEARCH_PROVIDERS.google;
    if (state.settings.searchProvider === 'reddit') {
        const searchQuery = `${query} reddit`;
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    } else {
        const searchUrl = provider.searchUrl + encodeURIComponent(query);
        window.location.href = searchUrl;
    }
}
// navigation
function handleKeyboardNavigation(e, searchInput) {
    const suggestionsBox = document.getElementById('search-suggestions');
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelectedItem(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
            performSearch(currentSuggestions[selectedIndex]);
        } else {
            performSearch(searchInput.value.trim());
        }
    } else if (e.key === 'Escape') {
        suggestionsBox.style.display = 'none';
        searchInput.blur();
    }
}
function updateSelectedItem(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// bit of a sloppy implementation, but finally init
export function renderSearchbar() {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.display = state.settings.displaySearchbar ? 'block' : 'none';
    }
}
export function initSearchbar() {
    const searchInput = document.querySelector('.searchbar input');
    const suggestionsBox = document.getElementById('search-suggestions');
    if (!searchInput || !suggestionsBox) {
        console.error('initSearchbar: Search elements not found');
        return;
    }

    // if (state.settings.displaySearchbar) {
    //     setTimeout(() => {
    //         searchInput.focus();
    //     }, 100);
        
    //     // Also focus on any click on the search input
    //     document.addEventListener('click', (e) => {
    //         if (e.target === searchInput || searchInput.contains(e.target)) {
    //             searchInput.focus();
    //         }
    //     });
    // }
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                suggestionsBox.innerHTML = '';
                suggestionsBox.style.display = 'none';
                return;
            }
            const suggestions = await getSearchSuggestions(query);
            displaySuggestions(suggestions);
        }, 300);
    });
    searchInput.addEventListener('keydown', (e) => {
        handleKeyboardNavigation(e, searchInput);
    });
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });
    searchInput.addEventListener('focus', () => {
        if (currentSuggestions.length > 0) {
            suggestionsBox.style.display = 'block';
        }
    });
    initSearchProviderUI();
}


export { SEARCH_PROVIDERS };

// and imitate firefox search bonnet

const PROVIDER_ICONS = {
    google: 'https://www.google.com/favicon.ico',
    duckduckgo: 'https://duckduckgo.com/favicon.ico',
    bing: 'https://www.bing.com/favicon.ico',
    brave: 'https://brave.com/static-assets/images/brave-favicon.png',
    ecosia: 'https://www.ecosia.org/favicon.ico',
    reddit: 'https://www.reddit.com/favicon.ico',
    startpage: 'https://www.startpage.com/favicon.ico',
    wikipedia: 'https://en.wikipedia.org/favicon.ico',
    youtube: 'https://www.youtube.com/favicon.ico'
};
let isDropdownOpen = false;

export function initSearchProviderUI() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    const providerButton = document.createElement('button');
    providerButton.className = 'search-provider-button';
    providerButton.setAttribute('aria-label', 'Select search provider');
    const dropdown = document.createElement('div');
    dropdown.className = 'search-provider-dropdown';
    dropdown.style.display = 'none';
    
    Object.keys(SEARCH_PROVIDERS).forEach(key => {
        const provider = SEARCH_PROVIDERS[key];
        const item = document.createElement('div');
        item.className = 'search-provider-item';
        item.dataset.provider = key;
        item.innerHTML = `
            <img src="${PROVIDER_ICONS[key]}" alt="${provider.name}" class="provider-icon">
            <span class="provider-name">${provider.name}</span>
        `;
        item.addEventListener('click', () => {
            selectProvider(key);
            closeDropdown();
        });
        dropdown.appendChild(item);
    });
    
    updateProviderButton(providerButton);
    const searchbar = searchContainer.querySelector('.searchbar');
    searchbar.appendChild(providerButton);
    searchbar.appendChild(dropdown);
    providerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
        dropdown.style.display = isDropdownOpen ? 'block' : 'none';
        dropdown.querySelectorAll('.search-provider-item').forEach(item => {
            item.classList.toggle('active', item.dataset.provider === state.settings.searchProvider);
        });
    }
    function closeDropdown() {
        isDropdownOpen = false;
        dropdown.style.display = 'none';
    }
    function updateProviderButton(button) {
        const currentProvider = state.settings.searchProvider || 'google';
        const icon = PROVIDER_ICONS[currentProvider];
        button.innerHTML = `
            <img src="${icon}" alt="${SEARCH_PROVIDERS[currentProvider].name}" class="provider-icon">
            <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
    }
    async function selectProvider(providerKey) {
        state.settings.searchProvider = providerKey;
        await saveSettings();
        updateProviderButton(providerButton);
    }
}