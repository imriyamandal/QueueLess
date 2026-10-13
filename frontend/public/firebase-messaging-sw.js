// Firebase Messaging Service Worker for background push notifications
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyDemoQueueLessKey001122334455',
  authDomain: 'queueless-app.firebaseapp.com',
  projectId: 'queueless-app',
  storageBucket: 'queueless-app.appspot.com',
  messagingSenderId: '102938475610',
  appId: '1:102938475610:web:9876543210abcdef',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || 'QueueLess Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Your queue status has been updated.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
