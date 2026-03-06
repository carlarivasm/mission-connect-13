import { initializeApp } from "firebase/app";
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

const VAPID_KEY = "7OG7uZ7hvXkBs1dhMCytO4twt1A6QMXIhJbHYUobtYc";

const app = initializeApp(firebaseConfig);

export const requestNotificationPermission = async (userId: string) => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log("Firebase Messaging not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js"),
    });

    if (token) {
      // Save token to Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("fcm_tokens").upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: "user_id,token" }
      );
      console.log("FCM token saved successfully");
    }

    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, callback);
  });
};
