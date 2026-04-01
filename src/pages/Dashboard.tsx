import { useState, useEffect } from "react";
import { BookOpen, MapPin, ShoppingBag, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import QuickAction from "@/components/QuickAction";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationPopup from "@/components/NotificationPopup";
import PendingSurveyAlert from "@/components/PendingSurveyAlert";
import PendingCartAlert from "@/components/PendingCartAlert";
import OnboardingCard from "@/components/OnboardingCard";
import DashboardBanner from "@/components/DashboardBanner";
import { usePageTracking } from "@/hooks/usePageTracking";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_type: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user, role, approved } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLabel, setEventsLabel] = useState("Próximas Atividades");
  usePageTracking("dashboard");

  const filterAndSetEvents = (data: EventData[]) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM"

    const filtered = data.filter((ev) => {
      if (ev.event_date > todayStr) return true;
      if (ev.event_date === todayStr) {
        // If no time set, keep it for the whole day
        if (!ev.event_time) return true;
        // Hide if event time has passed
        return ev.event_time.slice(0, 5) >= currentTimeStr;
      }
      return false;
    });

    const hasTodayEvents = filtered.some((ev) => ev.event_date === todayStr);
    setEventsLabel(hasTodayEvents ? "Atividades de Hoje" : "Próximas Atividades");
    setEvents(filtered.slice(0, 5));
  };

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    supabase
      .from("events")
      .select("id, title, event_date, event_time, event_type")
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true })
      .limit(10)
      .then(({ data }) => {
        if (data) filterAndSetEvents(data);
      });

    // Re-filter every 60s to hide past events
    const interval = setInterval(() => {
      supabase
        .from("events")
        .select("id, title, event_date, event_time, event_type")
        .gte("event_date", todayStr)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true })
        .limit(10)
        .then(({ data }) => {
          if (data) filterAndSetEvents(data);
        });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Olá{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}! 👋
          </h2>
          {role && (
            <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
              {role === "admin" ? "Administrador" : "Missionário"}
            </span>
          )}
          <p className="text-muted-foreground text-sm mt-1">Que bom ter você aqui. Veja o que temos para hoje.</p>
        </div>

        {/* Pending surveys alert */}
        {!approved && role !== "admin" && (
          <div className="animate-fade-in rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30 p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⏳ Conta pendente de aprovação</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Seu cadastro está sendo analisado por um administrador. Enquanto isso, algumas funcionalidades estão restritas (Materiais, Fotos e Calendário completo).
            </p>
          </div>
        )}
        <PendingCartAlert />
        <PendingSurveyAlert />

        {/* Quick Actions */}
        <OnboardingCard />
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Acesso Rápido</h3>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction icon={MapPin} label="Mapa" onClick={() => navigate("/mapa")} variant="accent" />
            <QuickAction icon={ShoppingBag} label="Loja" onClick={() => navigate("/loja")} />
            {(approved || role === "admin") && (
              <QuickAction icon={BookOpen} label="Materiais" onClick={() => navigate("/materiais")} variant="accent" />
            )}
          </div>
          {role === "admin" && (
            <div className="grid grid-cols-1 gap-3 mt-3">
              <QuickAction icon={Shield} label="Admin" onClick={() => navigate("/admin")} />
            </div>
          )}
        </section>

        {/* Banner */}
        <DashboardBanner />

        {/* Upcoming Events */}
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">{eventsLabel}</h3>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade próxima.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card"
                >
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg gradient-mission text-primary-foreground">
                    <span className="text-xs font-bold leading-none">{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                    <span className="text-[10px] leading-none mt-0.5">{new Date(event.event_date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.event_time?.slice(0, 5) || ""} • {event.event_type}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <NotificationPopup />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
