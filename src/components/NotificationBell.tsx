import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Trash2, MapPin, Calendar, Info, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const typeLabels: Record<string, { label: string; icon: typeof MapPin }> = {
  new_location: { label: "Locais", icon: MapPin },
  new_event: { label: "Eventos", icon: Calendar },
  event_reminder: { label: "Lembretes", icon: Bell },
  info: { label: "Geral", icon: Info },
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(newNotif.title, { body: newNotif.message, icon: "/favicon.ico" });
          }
        }
      )
      .subscribe();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true } as any)
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteOldNotifications = async () => {
    if (!user) return;
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0) return;
    await supabase
      .from("notifications")
      .delete()
      .in("id", readIds);
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = filterType
    ? notifications.filter((n) => n.type === filterType)
    : notifications;

  const typeIcon = (type: string) => {
    const config = typeLabels[type];
    if (!config) return <Info size={12} />;
    const Icon = config.icon;
    return <Icon size={12} />;
  };

  // Get unique types present
  const presentTypes = [...new Set(notifications.map((n) => n.type))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm text-foreground">Notificações</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <Check size={10} /> Lidas
              </button>
            )}
            {notifications.some((n) => n.read) && (
              <button onClick={deleteOldNotifications} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5">
                <Trash2 size={10} /> Limpar lidas
              </button>
            )}
          </div>
        </div>

        {/* Type filter */}
        {presentTypes.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            <Filter size={12} className="text-muted-foreground shrink-0" />
            <button
              onClick={() => setFilterType(null)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0 ${!filterType ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              Todas
            </button>
            {presentTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? null : t)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0 flex items-center gap-1 ${filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              >
                {typeIcon(t)} {typeLabels[t]?.label || t}
              </button>
            ))}
          </div>
        )}

        {/* Notification list */}
        <div className="max-h-72 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              {filterType ? "Nenhuma notificação deste tipo." : "Nenhuma notificação."}
            </p>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2.5 border-b border-border last:border-0 group relative ${!n.read ? "bg-accent/30" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-muted-foreground">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1 rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
