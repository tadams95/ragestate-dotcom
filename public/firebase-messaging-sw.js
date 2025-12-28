/* Firebase Cloud Messaging Service Worker */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Service workers cannot access process.env or Next.js environment variables.
// These values must be hardcoded. Get them from Firebase Console → Project Settings → General.
// IMPORTANT: You need to fill in messagingSenderId and appId from your Firebase project.
firebase.initializeApp({
  apiKey: 'AIzaSyDcHCRWrYonzJa_Pyfwzbfp-r3bxz2bUX8',
  authDomain: 'ragestate-app.firebaseapp.com',
  projectId: 'ragestate-app',
  storageBucket: 'ragestate-app.appspot.com',
  messagingSenderId: '930832370585',
  appId: '1:930832370585:web:fc703a0dd37d550a1fa108',
  measurementId: 'G-5YQ5FWXH85',
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
