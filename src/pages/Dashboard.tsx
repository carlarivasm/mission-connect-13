import { Calendar, BookOpen, Camera, MapPin, ShoppingBag, Link2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import QuickAction from "@/components/QuickAction";

const upcomingEvents = [
  { title: "Reunião de Planejamento", date: "05 Mar", time: "19:00", type: "reunião" },
  { title: "Missão Bairro Esperança", date: "08 Mar", time: "08:00", type: "missão" },
  { title: "Formação Missionária", date: "12 Mar", time: "20:00", type: "formação" },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Juventude e Família Missionária" onLogout={() => navigate("/")} />

      <main className="px-4 py-5 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-display font-bold text-foreground">Olá, Missionário! 👋</h2>
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
          <div className="grid grid-cols-3 gap-3 mt-3">
            <QuickAction icon={ShoppingBag} label="Loja" onClick={() => navigate("/loja")} variant="accent" />
            <QuickAction icon={Link2} label="Reuniões" onClick={() => navigate("/reunioes")} />
            <QuickAction icon={Users} label="Minha Família" onClick={() => navigate("/familia")} variant="accent" />
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Próximas Atividades</h3>
          <div className="space-y-3">
            {upcomingEvents.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card"
              >
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg gradient-mission text-primary-foreground">
                  <span className="text-xs font-bold leading-none">{event.date.split(" ")[0]}</span>
                  <span className="text-[10px] leading-none mt-0.5">{event.date.split(" ")[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time} • {event.type}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
