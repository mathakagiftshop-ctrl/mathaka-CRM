// Custom Service Worker for Push Notifications
// This file handles push events when the app is in the background

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received:', event);

    let data = {
        title: 'Mathaka CRM',
        body: 'You have a new notification',
        icon: '/icon.svg',
        badge: '/icon.svg'
    };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('[Service Worker] Error parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon.svg',
        badge: data.badge || '/icon.svg',
        tag: data.tag || 'default',
        data: data.data || {},
        vibrate: [100, 50, 100],
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If there's already a window open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }

            // Otherwise open a new window
            const urlToOpen = event.notification.data?.url || '/';
            return clients.openWindow(urlToOpen);
        })
    );
});

// Handle subscription change (key rotation, etc.)
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[Service Worker] Push subscription changed');

    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: self.VAPID_PUBLIC_KEY
        }).then((subscription) => {
            // Re-register the new subscription with the server
            return fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON())
            });
        })
    );
});
