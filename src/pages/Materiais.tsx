import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
}

const categoryColors: Record<string, string> = {
  geral: "bg-muted text-muted-foreground",
  oração: "bg-secondary/20 text-secondary-foreground",
  formação: "bg-primary/10 text-primary",
  liturgia: "bg-accent/20 text-accent-foreground",
  evangelização: "bg-destructive/10 text-destructive",
};

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  oração: "Oração",
  formação: "Formação",
  liturgia: "Liturgia",
  evangelização: "Evangelização",
};

const Materiais = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMaterials(data);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const filteredMaterials = selectedCategory
    ? materials.filter((m) => m.category === selectedCategory)
    : materials;

  const uniqueCategories = [...new Set(materials.map((m) => m.category))];

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Materiais de Apoio" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h2 className="text-xl font-display font-bold text-foreground">Materiais de Apoio</h2>
          <p className="text-sm text-muted-foreground mt-1">Recursos disponibilizados pela coordenação.</p>
        </div>

        {/* Category filters */}
        {uniqueCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                !selectedCategory ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Todos
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedCategory === cat ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível.</p>
        ) : (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {filteredMaterials.map((mat) => (
              <div key={mat.id} className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card">
                <div className="p-3 rounded-lg gradient-mission text-primary-foreground">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
                  {mat.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{mat.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[mat.category] || "bg-muted text-muted-foreground"}`}>
                      {categoryLabels[mat.category] || mat.category}
                    </span>
                  </div>
                </div>
                {mat.link_url && (
                  <a
                    href={mat.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-primary hover:text-primary/80"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;
