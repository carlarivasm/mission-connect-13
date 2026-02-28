import { FileText, Download, ExternalLink } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const materials = [
  { title: "Guia do Missionário 2026", type: "PDF", category: "Formação" },
  { title: "Roteiro de Oração", type: "PDF", category: "Oração" },
  { title: "Manual de Evangelização", type: "PDF", category: "Formação" },
  { title: "Cânticos Missionários", type: "Link", category: "Música" },
  { title: "Testemunhos de Missão", type: "Vídeo", category: "Inspiração" },
];

const categoryColors: Record<string, string> = {
  "Formação": "bg-primary/10 text-primary",
  "Oração": "bg-secondary/20 text-secondary-foreground",
  "Música": "bg-accent/20 text-accent-foreground",
  "Inspiração": "bg-destructive/10 text-destructive",
};

const Materiais = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Materiais de Apoio" />
      <main className="px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h2 className="text-xl font-display font-bold text-foreground">Materiais de Apoio</h2>
          <p className="text-sm text-muted-foreground mt-1">Recursos disponibilizados pela coordenação.</p>
        </div>

        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {materials.map((mat, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card">
              <div className="p-3 rounded-lg gradient-mission text-primary-foreground">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[mat.category] || "bg-muted text-muted-foreground"}`}>
                    {mat.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{mat.type}</span>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                {mat.type === "Link" ? <ExternalLink size={18} /> : <Download size={18} />}
              </button>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;
