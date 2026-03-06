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

    // Register firebase SW separately from PWA SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then(() => {
          requestNotificationPermission(user.id);
        })
        .catch((err) => console.error("Firebase SW registration failed:", err));
    }

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
