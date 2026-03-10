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

const VAPID_KEY = "BBJE6qW1flHcz-2xebO8x5R3cCE_ZanbIjAR-3KxYi-kJew3f0nhszWPJf59phF7lb4fJ_tYyY7u4MknQuNx9qU";

const app = initializeApp(firebaseConfig);

export const requestNotificationPermission = async (
  userId: string,
  swRegistration?: ServiceWorkerRegistration
) => {
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
      serviceWorkerRegistration: swRegistration,
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
