import { MapPin, Navigation } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const mockLocations = [
  { name: "Bairro Esperança", address: "Rua da Paz, 123", status: "Visitado", needs: "Alimentos, roupas" },
  { name: "Vila Nova", address: "Av. Principal, 456", status: "Pendente", needs: "Bíblias, materiais" },
  { name: "Centro Comunitário", address: "Praça Central, s/n", status: "Em andamento", needs: "Voluntários" },
];

const statusColors: Record<string, string> = {
  "Visitado": "bg-primary/10 text-primary",
  "Pendente": "bg-secondary/20 text-secondary-foreground",
  "Em andamento": "bg-accent/20 text-accent-foreground",
};

const Mapa = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Mapa de Missão" />
      <main className="px-4 py-5 space-y-5">
        {/* Map Placeholder */}
        <div className="w-full h-48 rounded-2xl bg-muted flex flex-col items-center justify-center shadow-card animate-fade-in">
          <Navigation size={40} className="text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">Mapa interativo</p>
          <p className="text-xs text-muted-foreground/60">Em breve com Google Maps</p>
        </div>

        {/* Locations */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Locais de Missão</h3>
          <div className="space-y-3">
            {mockLocations.map((loc, i) => (
              <div key={i} className="p-4 bg-card rounded-xl shadow-card">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[loc.status]}`}>
                        {loc.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Necessidades:</span> {loc.needs}
                    </p>
                  </div>
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

export default Mapa;
