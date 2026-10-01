// Firebase Cloud Messaging Background Service Worker
// PT AETRA AIR TANGERANG - Mobile Officer Notification Handler

/* global importScripts, firebase */

// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with default config
firebase.initializeApp({
  apiKey: "AIzaSyDSWlWJdfgS7p_W4qJ_c_CIwUW78RPZnBc",
  authDomain: "gen-lang-client-0455339264.firebaseapp.com",
  projectId: "gen-lang-client-0455339264",
  storageBucket: "gen-lang-client-0455339264.firebasestorage.app",
  messagingSenderId: "140637282794",
  appId: "1:140637282794:web:0f3487adadf07e58021293"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background FCM message:', payload);
  
  const notificationTitle = payload.notification?.title || (payload.data && payload.data.title) || '🔔 Penugasan Work Order Baru AETRA';
  const notificationOptions = {
    body: payload.notification?.body || (payload.data && payload.data.body) || 'Terdapat aduan baru yang ditugaskan ke Anda. Klik untuk membuka.',
    icon: '/aetra-logo.svg',
    badge: '/aetra-logo.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.data?.ticketId || 'aetra-wo-notif',
    data: {
      url: payload.data?.url || '/mobile.html',
      ticketId: payload.data?.ticketId,
      officer: payload.data?.officer
    },
    actions: [
      { action: 'open_wo', title: '🚀 Buka WO' },
      { action: 'dismiss', title: 'Tutup' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/mobile.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('mobile.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
