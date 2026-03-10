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
      if (!("serviceWorker" in navigator)) {
        console.warn("[Push] Service Workers not supported");
        return;
      }

      try {
        // Register Firebase SW with a dedicated scope to avoid conflict with PWA SW
        let registration = await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE);

        if (!registration) {
          console.log("[Push] Registering firebase SW...");
          registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: FIREBASE_SW_SCOPE }
          );
          console.log("[Push] Firebase SW registered:", registration.scope);
        } else {
          console.log("[Push] Firebase SW already registered:", registration.scope);
        }

        // Wait for SW to be active
        const sw = registration.installing || registration.waiting;
        if (sw) {
          await new Promise<void>((resolve) => {
            if (registration!.active) {
              resolve();
              return;
            }
            sw.addEventListener("statechange", (e) => {
              if ((e.target as ServiceWorker).state === "activated") resolve();
            });
          });
        }

        console.log("[Push] Requesting notification permission...");
        const token = await requestNotificationPermission(user.id, registration);
        if (token) {
          console.log("[Push] Token obtained successfully:", token.substring(0, 20) + "...");
        } else {
          console.warn("[Push] No token obtained - permission may have been denied");
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

export default PushNotificationManager;
