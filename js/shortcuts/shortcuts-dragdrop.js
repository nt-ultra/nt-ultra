import { state } from '../core/state.js';
import { saveShortcuts } from '../core/database.js';
import { renderShortcuts } from './shortcuts.js';

// default state
let dragState = {
    draggedElement: null,
    draggedShortcut: null,
    draggedIndex: -1,
    placeholderIndex: -1,
    placeholder: null,
    isDragging: false
};

// shortcuts.js will check if dragging
export function isDragging() {
    return dragState.isDragging;
}

export function initShortcutDragDrop() {
    const grid = document.getElementById('shortcuts-grid');
    if (!grid) {
        console.error('Grid not found?');
        return;
    }
    // refresh listeners
    grid.removeEventListener('dragover', handleGridDragOver);
    grid.removeEventListener('drop', handleGridDrop);
    grid.addEventListener('dragover', handleGridDragOver);
    grid.addEventListener('drop', handleGridDrop);
    
    const shortcuts = grid.querySelectorAll('.shortcut');
    shortcuts.forEach(shortcut => {
        shortcut.draggable = true;
        shortcut.addEventListener('dragstart', handleDragStart);
        shortcut.addEventListener('dragend', handleDragEnd);
        shortcut.addEventListener('dragenter', handleDragEnter);
        shortcut.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        shortcut.addEventListener('drop', handleGridDrop);
    });
}

export function initializeShortcutOrder() {
    state.shortcuts.forEach((shortcut, index) => {
        if (shortcut.order === undefined) {
            shortcut.order = index;
        }
    });
    state.shortcuts.sort((a, b) => a.order - b.order);
}

function createPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'shortcut shortcut-placeholder';
    placeholder.innerHTML = `
        <div class="shortcut-icon"></div>
        <span class="shortcut-title"></span>
    `;
    placeholder.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    placeholder.addEventListener('drop', handleGridDrop);
    return placeholder;
}

function insertPlaceholderAt(visualIndex) {
    const grid = document.getElementById('shortcuts-grid');
    if (dragState.placeholder) {
        dragState.placeholder.remove();
    }
    dragState.placeholder = createPlaceholder();
    dragState.placeholderIndex = visualIndex;
    const allShortcuts = Array.from(grid.querySelectorAll('.shortcut:not(.shortcut-placeholder)'))
        .filter(s => s.style.display !== 'none');

    if (visualIndex >= allShortcuts.length) {
        const addButton = grid.querySelector('.add-shortcut');
        if (addButton) {
            grid.insertBefore(dragState.placeholder, addButton);
        } else {
            grid.appendChild(dragState.placeholder);
        }
    } else {
        const targetShortcut = allShortcuts[visualIndex];
        grid.insertBefore(dragState.placeholder, targetShortcut);
    }
}

// Drag event handlers
function handleDragStart(e) {
    const draggedElement = e.currentTarget;
    dragState.isDragging = true;
    dragState.draggedIndex = parseInt(draggedElement.dataset.index);
    dragState.draggedShortcut = state.shortcuts[dragState.draggedIndex];
    dragState.draggedElement = draggedElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.innerHTML);
    const dragImage = draggedElement.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(3deg)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 32, 32);
    
    setTimeout(() => {
        if (dragImage.parentNode) {
            document.body.removeChild(dragImage);
        }
        draggedElement.style.display = 'none';
        insertPlaceholderAt(dragState.draggedIndex);
    }, 0);
}

function handleDragEnter(e) {
    if (!dragState.isDragging) return;
    const target = e.currentTarget;
    if (target.classList.contains('add-shortcut')) return;
    if (target.classList.contains('shortcut-placeholder')) return;
    const grid = document.getElementById('shortcuts-grid');
    const allShortcuts = Array.from(grid.querySelectorAll('.shortcut:not(.shortcut-placeholder)'));
    let visualIndex = 0;
    for (let shortcut of allShortcuts) {
        if (shortcut === target) break;
        if (shortcut.style.display !== 'none') {
            visualIndex++;
        }
    }
    if (visualIndex >= dragState.placeholderIndex) {
        insertPlaceholderAt(visualIndex + 1);
    } else {
        insertPlaceholderAt(visualIndex);
    }
}

function handleGridDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!dragState.isDragging) {
        return;
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleGridDrop(e) {
    if (!dragState.isDragging) {
        return;
    }
    e.stopPropagation();
    e.preventDefault();
    const originalIndex = dragState.draggedIndex;
    const visualDropIndex = dragState.placeholderIndex;
    // console.log('Original index:', originalIndex);
    // console.log('Visual drop index:', visualDropIndex);
    // console.log('Before:', state.shortcuts.map(s => s.title));
    if (originalIndex !== visualDropIndex) {
        const shortcuts = [...state.shortcuts];
        const [draggedItem] = shortcuts.splice(originalIndex, 1);
        // console.log('After removal:', shortcuts.map(s => s.title));
        shortcuts.splice(visualDropIndex, 0, draggedItem);
        // console.log('After insertion:', shortcuts.map(s => s.title));
        shortcuts.forEach((shortcut, idx) => {
            shortcut.order = idx;
        });
        state.shortcuts = shortcuts;
        saveShortcuts();
    }
    cleanupDrag();
    renderShortcuts();
    return false;
}

function handleDragEnd(e) {
    cleanupDrag();
    if (dragState.isDragging) {
        renderShortcuts();
    }
}

// Cleanup
function cleanupDrag() {
    if (dragState.placeholder && dragState.placeholder.parentNode) {
        dragState.placeholder.remove();
    }
    if (dragState.draggedElement) {
        dragState.draggedElement.style.display = '';
        dragState.draggedElement.style.opacity = '';
        dragState.draggedElement.style.pointerEvents = 'auto';
    }
    dragState = {
        draggedElement: null,
        draggedShortcut: null,
        draggedIndex: -1,
        placeholderIndex: -1,
        placeholder: null,
        isDragging: false
    };
}