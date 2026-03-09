import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

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
        // Check if SW already registered
        let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        
        if (!registration) {
          console.log("[Push] Registering firebase SW...");
          registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          console.log("[Push] Firebase SW registered:", registration.scope);
        } else {
          console.log("[Push] Firebase SW already registered:", registration.scope);
        }

        // Wait for SW to be active
        if (registration.installing) {
          await new Promise<void>((resolve) => {
            registration!.installing!.addEventListener("statechange", (e) => {
              if ((e.target as ServiceWorker).state === "activated") resolve();
            });
          });
        }

        console.log("[Push] Requesting notification permission...");
        const token = await requestNotificationPermission(user.id);
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
