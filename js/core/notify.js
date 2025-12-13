import { state, default_settings } from '../core/state.js';

let notificationQueue = [];
let isShowing = false;
let autoHideTimer = null;
let notificationPermission = Notification.permission;

async function requestNotificationPermission() {
    if (notificationPermission === 'default') {
        try {
            notificationPermission = await Notification.requestPermission();
            console.log(`Notification permission status: ${notificationPermission}`);
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            notificationPermission = 'denied'; 
        }
    }
    return notificationPermission;
}

function hideNotification() {
    const notifyElement = document.getElementById('notify');
    if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
    }
    if (notifyElement) {
        notifyElement.removeEventListener('click', hideNotification);
        notifyElement.style.display = 'none';
    }
    isShowing = false;
    showNextNotification();
}


function showNextNotification() {
    if (isShowing || notificationQueue.length === 0) {
        return;
    }
    isShowing = true;
    const { source, message } = notificationQueue.shift();
    const notifyElement = document.getElementById('notify');
    const sourceElement = document.getElementById('notify-source');
    const messageElement = document.getElementById('notify-message');
    if (sourceElement) sourceElement.textContent = source;
    if (messageElement) messageElement.textContent = message;
    if (notifyElement) {
        notifyElement.style.display = 'flex'; 
        notifyElement.addEventListener('click', hideNotification, { once: true });
        autoHideTimer = setTimeout(hideNotification, 6000);
    }

}

export async function notify(source, message) {
    console.log(`notify: ${source} - ${message}`);
    notificationQueue.push({ source, message });
    const displayMode = state.settings.displayNotifications;

    if (displayMode === 'page') showNextNotification();
    
    if (displayMode === 'desktop') {
        if (notificationPermission === 'default') { await requestNotificationPermission(); }
        if (notificationPermission === 'granted') {
            try {
                new Notification(source, {
                    body: message,
                    icon: '../../static/logo.png',
                    tag: source,
                    renotify: true
                });
            } catch (error) {
                console.error('Error displaying OS notification:', error);
            }
        }
    }
} // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!