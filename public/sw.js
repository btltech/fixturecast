// Service Worker for FixtureCast notifications
const CACHE_NAME = 'fixturecast-v1';
const NOTIFICATION_TAG = 'fixturecast-notification';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    self.clients.claim()
  );
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from FixtureCast',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || NOTIFICATION_TAG,
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: Date.now(),
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FixtureCast', options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('FixtureCast', {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        tag: NOTIFICATION_TAG
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync notifications when back online
      syncNotifications()
    );
  }
});

// Sync notifications function
async function syncNotifications() {
  try {
    // Get stored notifications from IndexedDB
    const notifications = await getStoredNotifications();
    
    for (const notification of notifications) {
      // Send stored notifications
      await self.registration.showNotification(notification.title, notification.options);
    }

    // Clear stored notifications
    await clearStoredNotifications();
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Store notification for offline delivery
async function storeNotification(title, options) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    await store.add({
      title,
      options,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error storing notification:', error);
  }
}

// Get stored notifications
async function getStoredNotifications() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readonly');
    const store = transaction.objectStore('notifications');
    
    return await store.getAll();
  } catch (error) {
    console.error('Error getting stored notifications:', error);
    return [];
  }
}

// Clear stored notifications
async function clearStoredNotifications() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    await store.clear();
  } catch (error) {
    console.error('Error clearing stored notifications:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixtureCastNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { autoIncrement: true });
      }
    };
  });
}

// Handle message events from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle fetch events for caching
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});