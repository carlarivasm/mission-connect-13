import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyASM3oAyOQ8lYN0iVAIWP0gwwA1_UTY0KE",
  authDomain: "missoes-semana-santa-app.firebaseapp.com",
  projectId: "missoes-semana-santa-app",
  storageBucket: "missoes-semana-santa-app.firebasestorage.app",
  messagingSenderId: "154086408355",
  appId: "1:154086408355:web:1ff9b562664cbb84cdbf16",
  measurementId: "G-XRCLW5B86W",
};

const VAPID_KEY = "BBJE6qW1flHcz-2xebO8x5R3cCE_ZanbIjAR-3KxYi-kJew3f0nhszWPJf59phF7lb4fJ_tYyY7u4MknQuNx9qU";

// Ensure single Firebase app instance
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const requestNotificationPermission = async (
  userId: string,
  swRegistration?: ServiceWorkerRegistration
) => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[Firebase] Messaging not supported in this browser");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[Firebase] Notification permission:", permission);
      return null;
    }

    const messaging = getMessaging(app);

    // If no registration was passed, try to find the Firebase SW
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.getRegistration(
        "/firebase-cloud-messaging-push-scope"
      ) || undefined;
    }

    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {
      vapidKey: VAPID_KEY,
    };

    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }

    const token = await getToken(messaging, tokenOptions);

    if (token) {
      // Save token to database
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Use upsert to avoid duplicates
      const { error } = await supabase.from("fcm_tokens").upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: "user_id,token" }
      );
      
      if (error) {
        console.error("[Firebase] Error saving token:", error.message);
      } else {
        console.log("[Firebase] Token saved successfully");
      }
    }

    return token;
  } catch (error: any) {
    console.error("[Firebase] Error getting FCM token:", error?.message || error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  isSupported().then((supported) => {
    if (!supported) return;
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, callback);
    } catch (err) {
      console.error("[Firebase] Error setting up foreground listener:", err);
    }
  });
};
