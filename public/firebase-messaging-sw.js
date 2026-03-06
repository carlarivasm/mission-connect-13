/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyASM3oAyOQ8lYN0iVAIWP0gwwA1_UTY0KE",
  authDomain: "missoes-semana-santa-app.firebaseapp.com",
  projectId: "missoes-semana-santa-app",
  storageBucket: "missoes-semana-santa-app.firebasestorage.app",
  messagingSenderId: "154086408355",
  appId: "1:154086408355:web:1ff9b562664cbb84cdbf16",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || {};
  const notificationTitle = title || "JFM";
  const notificationOptions = {
    body: body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data || {},
    tag: "jfm-notification",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
