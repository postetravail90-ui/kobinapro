importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'TA_FIREBASE_API_KEY',
  authDomain: 'TON_FIREBASE_AUTH_DOMAIN',
  projectId: 'TON_FIREBASE_PROJECT_ID',
  storageBucket: 'TON_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'TON_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'TON_FIREBASE_APP_ID',
});

firebase.messaging();