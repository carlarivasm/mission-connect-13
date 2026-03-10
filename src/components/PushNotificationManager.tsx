import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const FIREBASE_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

const PushNotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      // Basic checks
      if (!("serviceWorker" in navigator)) {
        console.warn("[Push] Service Workers not supported");
        return;
      }
      if (!("Notification" in window)) {
        console.warn("[Push] Notification API not available");
        return;
      }
      if (!("PushManager" in window)) {
        console.warn("[Push] PushManager not available");
        return;
      }

      try {
        // Register Firebase SW with dedicated scope (avoids PWA SW conflict)
        let registration = await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE);

        if (!registration) {
          console.log("[Push] Registering firebase SW...");
          registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: FIREBASE_SW_SCOPE }
          );
          console.log("[Push] Firebase SW registered, scope:", registration.scope);
        } else {
          console.log("[Push] Firebase SW already registered, scope:", registration.scope);
        }

        // Wait for SW to become active
        await waitForSWActive(registration);
        console.log("[Push] Firebase SW is active");

        // Request permission and get token
        console.log("[Push] Requesting notification permission...");
        const token = await requestNotificationPermission(user.id, registration);
        if (token) {
          console.log("[Push] Token obtained:", token.substring(0, 20) + "...");
        } else {
          console.warn("[Push] No token obtained");
        }
      } catch (err) {
        console.error("[Push] Setup error:", err);
      }
    };

    setup();

    // Listen for foreground messages
    onForegroundMessage((payload: any) => {
      const { title, body } = payload.notification || {};
      if (title) {
        toast({ title, description: body });
      }
    });
  }, [user]);

  return null;
};

function waitForSWActive(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already active
    if (registration.active) {
      resolve();
      return;
    }

    const sw = registration.installing || registration.waiting;
    if (!sw) {
      // Edge case: no SW in any state, but also not active
      reject(new Error("Service Worker not found in any state"));
      return;
    }

    const onStateChange = () => {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", onStateChange);
        resolve();
      } else if (sw.state === "redundant") {
        sw.removeEventListener("statechange", onStateChange);
        reject(new Error("Service Worker became redundant"));
      }
    };

    sw.addEventListener("statechange", onStateChange);

    // Timeout after 10 seconds
    setTimeout(() => {
      sw.removeEventListener("statechange", onStateChange);
      // If it became active during the wait
      if (registration.active) {
        resolve();
      } else {
        reject(new Error("Service Worker activation timeout"));
      }
    }, 10000);
  });
}

export default PushNotificationManager;
