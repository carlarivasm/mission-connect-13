/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// InjectManifest will replace self.__WB_MANIFEST with the precache manifest
precacheAndRoute(self.__WB_MANIFEST || []);

// Listen for SKIP_WAITING message from the app to activate the new SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Load Firebase compat SDKs for Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyASM3oAyOQ8lYN0iVAIWP0gwwA1_UTY0KE",
    authDomain: "missoes-semana-santa-app.firebaseapp.com",
    projectId: "missoes-semana-santa-app",
    storageBucket: "missoes-semana-santa-app.firebasestorage.app",
    messagingSenderId: "154086408355",
    appId: "1:154086408355:web:1ff9b562664cbb84cdbf16",
};

// Initialize Firebase
(self as any).firebase.initializeApp(firebaseConfig);
const messaging = (self as any).firebase.messaging();

// Handle background messages (when app is not in foreground)
messaging.onBackgroundMessage((payload: any) => {
    console.log("[SW] Background message received:", payload);
    // NOTE: Do NOT call showNotification here.
    // FCM messages with a `notification` payload are auto-displayed by the browser.
    // Calling showNotification here would produce duplicate notifications.
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification click:", event.notification.data);
    event.notification.close();

    const link = event.notification.data?.link || "/dashboard";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Try to focus an existing window
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(link);
                    return client.focus();
                }
            }
            // Open new window if none found
            return self.clients.openWindow(link);
        })
    );
});

// Handle push event directly (fallback for generic data payloads)
self.addEventListener("push", (event) => {
    if (event.data) {
        try {
            const payload = event.data.json();
            // Only show if not already handled by onBackgroundMessage
            if (!payload.notification) {
                const data = payload.data || {};
                const title = data.title || "JFM";
                const options = {
                    body: data.body || "",
                    icon: "/icons/icon-192.png",
                    badge: "/icons/icon-192.png",
                    data: data,
                    tag: "jfm-push-" + Date.now(),
                };
                event.waitUntil(self.registration.showNotification(title, options));
            }
        } catch (e) {
            console.error("[SW] Push event parse error:", e);
        }
    }
});
