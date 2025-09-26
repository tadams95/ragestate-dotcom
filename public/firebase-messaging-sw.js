/* Firebase Cloud Messaging Service Worker */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// These values rely on NEXT_PUBLIC_* env vars being inlined at build if using next.config rewrites.
// For safety, they can be replaced at build time or you can hard-code for local testing.
firebase.initializeApp({
  apiKey: self?.ENV_FIREBASE_API_KEY || undefined,
  authDomain: self?.ENV_FIREBASE_AUTH_DOMAIN || undefined,
  projectId: self?.ENV_FIREBASE_PROJECT_ID || undefined,
  messagingSenderId: self?.ENV_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: self?.ENV_FIREBASE_APP_ID || undefined,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'RAGESTATE';
  const options = {
    body: payload.notification?.body,
    data: payload.data || {},
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };
  self.registration.showNotification(title, options);
});
