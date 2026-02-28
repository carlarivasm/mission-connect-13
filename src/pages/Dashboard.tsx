import { useState, useEffect } from "react";
import { Calendar, BookOpen, Camera, MapPin, ShoppingBag, Link2, Shield, ClipboardList, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import QuickAction from "@/components/QuickAction";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_type: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user, role } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, event_date, event_time, event_type")
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .limit(5)
      .then(({ data }) => { if (data) setEvents(data); });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Juventude e Família Missionária" onLogout={handleLogout} />

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

        {/* Quick Actions */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Acesso Rápido</h3>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction icon={Calendar} label="Calendário" onClick={() => navigate("/calendario")} />
            <QuickAction icon={BookOpen} label="Materiais" onClick={() => navigate("/materiais")} variant="accent" />
            <QuickAction icon={Camera} label="Fotos" onClick={() => navigate("/galeria")} />
            <QuickAction icon={MapPin} label="Mapa" onClick={() => navigate("/mapa")} variant="accent" />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            <QuickAction icon={ShoppingBag} label="Loja" onClick={() => navigate("/loja")} variant="accent" />
            <QuickAction icon={Link2} label="Reuniões" onClick={() => navigate("/reunioes")} />
            <QuickAction icon={ClipboardList} label="Pesquisas" onClick={() => navigate("/pesquisas")} />
            <QuickAction icon={GraduationCap} label="Formação" onClick={() => navigate("/formacao")} variant="accent" />
          </div>
          {role === "admin" && (
            <div className="grid grid-cols-1 gap-3 mt-3">
              <QuickAction icon={Shield} label="Admin" onClick={() => navigate("/admin")} />
            </div>
          )}
        </section>

        {/* Upcoming Events */}
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Próximas Atividades</h3>
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

      <BottomNav />
    </div>
  );
};

export default Dashboard;
