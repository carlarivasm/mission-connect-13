import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Bell } from "lucide-react";

const NotificationPopup = () => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<{ id: string; title: string; message: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchLatest = async () => {
      const lastDismissed = sessionStorage.getItem("jfm_popup_dismissed");
      
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message")
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.id !== lastDismissed) {
        setNotification(data);
      }
    };

    fetchLatest();
  }, [user]);

  const handleDismiss = async () => {
    if (notification) {
      sessionStorage.setItem("jfm_popup_dismissed", notification.id);
      await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", notification.id);
    }
    setDismissed(true);
  };

  if (!notification || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-elevated max-w-sm w-full p-5 space-y-3 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full gradient-mission">
              <Bell size={18} className="text-primary-foreground" />
            </div>
            <h3 className="font-bold text-foreground font-display">{notification.title}</h3>
          </div>
          <button onClick={handleDismiss} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <button
          onClick={handleDismiss}
          className="w-full py-2.5 rounded-xl gradient-mission text-primary-foreground font-semibold text-sm"
        >
          OK, entendi
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;
