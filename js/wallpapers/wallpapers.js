import { state } from '../core/state.js';
import { saveWallpapers, saveCurrentWallpaper } from '../core/database.js';

let tempWallpaperData = null;

export function renderWallpapers() {
    const grid = document.getElementById('wallpapers-grid');
    const count = document.getElementById('wallpaper-count');
    const removeBtn = document.getElementById('remove-wallpaper-btn');
    count.textContent = state.wallpapers.length;
    grid.innerHTML = '';
    state.wallpapers.forEach(wp => {
        const div = document.createElement('div');
        div.className = 'wallpaper-item';
        if (state.currentWallpaper === wp.url) {
            div.classList.add('active');
        }
        if (wp.url.startsWith('#')) {
            div.style.backgroundColor = wp.url;
            div.style.height = '80px';
        } else {
            const img = document.createElement('img');
            img.src = wp.url;
            img.alt = 'Wallpaper';
            div.appendChild(img);
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'wallpaper-delete';
        deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteWallpaper(wp.id);
        });
        div.addEventListener('click', () => selectWallpaper(wp.url));
        div.appendChild(deleteBtn);
        grid.appendChild(div);
    });
    removeBtn.style.display = state.currentWallpaper ? 'flex' : 'none';
}

export function selectWallpaper(url) {
    state.currentWallpaper = url;
    saveCurrentWallpaper();
    renderWallpapers();
    if (window.applyStyles) {
        window.applyStyles();
    }
}

export function deleteWallpaper(id) {
    const wallpaper = state.wallpapers.find(w => w.id === id);
    state.wallpapers = state.wallpapers.filter(w => w.id !== id);
    if (state.currentWallpaper === wallpaper.url) {
        state.currentWallpaper = null;
        saveCurrentWallpaper();
    }
    saveWallpapers();
    renderWallpapers();
    if (window.applyStyles) {
        window.applyStyles();
    }
}

export function removeCurrentWallpaper() {
    state.currentWallpaper = null;
    saveCurrentWallpaper();
    renderWallpapers();
    if (window.applyStyles) {
        window.applyStyles();
    }
}

export function openWallpaperModal() {
    if (state.wallpapers.length >= 10) {
        notify('Wallpaper Limit Reached', `Only 10 wallpapers are allowed`);
        return;
    }
    document.getElementById('wallpaper-modal').style.display = 'flex';
    showWallpaperStep('wallpaper-step-1');
}

export function showWallpaperStep(stepId) {
    document.querySelectorAll('.wallpaper-step').forEach(step => {
        step.style.display = 'none';
    });
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
        stepElement.style.display = 'block';
    }
}

export function closeWallpaperModal() {
    document.getElementById('wallpaper-modal').style.display = 'none';
    tempWallpaperData = null;
}

export function confirmWallpaper() {
    if (tempWallpaperData) {
        const newWallpaper = { id: Date.now(), url: tempWallpaperData };
        state.wallpapers.push(newWallpaper);
        saveWallpapers();
        state.currentWallpaper = tempWallpaperData;
        saveCurrentWallpaper();
        renderWallpapers();
        if (window.applyStyles) {
            window.applyStyles();
        }
        closeWallpaperModal();
    }
}

export function getTempWallpaperData() {
    return tempWallpaperData;
}

export function setTempWallpaperData(data) {
    tempWallpaperData = data;
}