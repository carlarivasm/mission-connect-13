import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

interface MissionLocation {
  id: string;
  name: string;
  address: string;
  status: string;
  needs: string | null;
  notes: string | null;
}

const statusColors: Record<string, string> = {
  visitado: "bg-green-100 text-green-700",
  pendente: "bg-amber-100 text-amber-700",
  "em andamento": "bg-blue-100 text-blue-700",
};

const statusLabels: Record<string, string> = {
  visitado: "Visitado",
  pendente: "Pendente",
  "em andamento": "Em andamento",
};

const Mapa = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mission_locations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLocations(data);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const filteredLocations = selectedStatus
    ? locations.filter((l) => l.status === selectedStatus)
    : locations;

  const stats = {
    total: locations.length,
    visitado: locations.filter((l) => l.status === "visitado").length,
    pendente: locations.filter((l) => l.status === "pendente").length,
    emAndamento: locations.filter((l) => l.status === "em andamento").length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Mapa de Missão" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        {/* Map Placeholder */}
        <div className="w-full h-48 rounded-2xl bg-muted flex flex-col items-center justify-center shadow-card animate-fade-in">
          <Navigation size={40} className="text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">Mapa interativo</p>
          <p className="text-xs text-muted-foreground/60">Em breve com Google Maps</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in">
          <button
            onClick={() => setSelectedStatus(selectedStatus === "visitado" ? null : "visitado")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "visitado" ? "ring-2 ring-green-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-green-600">{stats.visitado}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Visitados</p>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === "em andamento" ? null : "em andamento")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "em andamento" ? "ring-2 ring-blue-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-blue-600">{stats.emAndamento}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Em andamento</p>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === "pendente" ? null : "pendente")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "pendente" ? "ring-2 ring-amber-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-amber-600">{stats.pendente}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Pendentes</p>
          </button>
        </div>

        {/* Locations */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Locais de Missão {selectedStatus && `(${statusLabels[selectedStatus]})`}
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum local cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((loc) => (
                <div key={loc.id} className="p-4 bg-card rounded-xl shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[loc.status] || loc.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                      {loc.needs && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-semibold">Necessidades:</span> {loc.needs}
                        </p>
                      )}
                      {loc.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{loc.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Mapa;
