import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink, Film, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
}

interface Category { id: string; name: string; description: string | null; }
interface Video { id: string; category_id: string; title: string; description: string | null; video_url: string; created_at: string; }

const categoryColors: Record<string, string> = {
  geral: "bg-muted text-muted-foreground",
  oração: "bg-secondary/20 text-secondary-foreground",
  formação: "bg-primary/10 text-primary",
  liturgia: "bg-accent/20 text-accent-foreground",
  evangelização: "bg-destructive/10 text-destructive",
  responsaveis: "bg-primary/20 text-primary",
};
const categoryLabels: Record<string, string> = {
  geral: "Geral", oração: "Oração", formação: "Formação", liturgia: "Liturgia", evangelização: "Evangelização", atividades: "Atividades", responsaveis: "Material de Apoio Responsáveis",
};

const Materiais = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Formation state
  const [fCategories, setFCategories] = useState<Category[]>([]);
  const [fVideos, setFVideos] = useState<Video[]>([]);
  const [fLoading, setFLoading] = useState(true);
  const [fSelectedCat, setFSelectedCat] = useState<string>("all");
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  useEffect(() => {
    supabase.from("materials").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMaterials(data); setLoading(false); });

    Promise.all([
      supabase.from("formation_categories").select("*").order("sort_order"),
      supabase.from("formation_videos").select("*").order("created_at", { ascending: false }),
    ]).then(([catRes, vidRes]) => {
      if (catRes.data) setFCategories(catRes.data as Category[]);
      if (vidRes.data) setFVideos(vidRes.data as Video[]);
      setFLoading(false);
    });
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };
  const filteredMaterials = selectedCategory ? materials.filter((m) => m.category === selectedCategory) : materials;
  const uniqueCategories = [...new Set(materials.map((m) => m.category))];
  const filteredVideos = fSelectedCat === "all" ? fVideos : fVideos.filter((v) => v.category_id === fSelectedCat);
  const getCatName = (id: string) => fCategories.find((c) => c.id === id)?.name || "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Materiais" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h2 className="text-xl font-display font-bold text-foreground">Materiais</h2>
          <p className="text-sm text-muted-foreground mt-1">Recursos e formação missionária.</p>
        </div>

        <Tabs defaultValue="materiais" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="materiais">Material de Apoio Missionários</TabsTrigger>
            <TabsTrigger value="formacao">Vídeos</TabsTrigger>
          </TabsList>

          {/* Materials Tab */}
          <TabsContent value="materiais" className="space-y-4">
            {uniqueCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button onClick={() => setSelectedCategory(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selectedCategory ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Todos
                </button>
                {uniqueCategories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedCategory === cat ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredMaterials.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível.</p>
            ) : (
              <div className="space-y-3 animate-fade-in">
                {filteredMaterials.map((mat) => (
                  <div key={mat.id} className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card">
                    <div className="p-3 rounded-lg gradient-mission text-primary-foreground"><FileText size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
                      {mat.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{mat.description}</p>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[mat.category] || "bg-muted text-muted-foreground"}`}>
                        {categoryLabels[mat.category] || mat.category}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {mat.file_url && (
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors text-primary" title="Baixar documento">
                          <FileText size={18} />
                        </a>
                      )}
                      {mat.link_url && (
                        <a href={mat.link_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors text-primary" title="Abrir link">
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Formation Tab */}
          <TabsContent value="formacao" className="space-y-4">
            {fCategories.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFSelectedCat("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${fSelectedCat === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Todos
                </button>
                {fCategories.map((cat) => (
                  <button key={cat.id} onClick={() => setFSelectedCat(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${fSelectedCat === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            {fLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Film size={40} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Nenhum vídeo de formação disponível.</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                {filteredVideos.map((video) => (
                  <button key={video.id} onClick={() => setPlayingVideo(video)} className="w-full flex items-center gap-4 p-4 bg-card rounded-xl shadow-card text-left">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Play size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{getCatName(video.category_id)}</p>
                      {video.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{video.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Video Player Dialog */}
        <Dialog open={!!playingVideo} onOpenChange={(open) => { if (!open) setPlayingVideo(null); }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {playingVideo && (
              <>
                <video src={playingVideo.video_url} controls autoPlay className="w-full max-h-[60vh] bg-black" />
                <div className="p-4">
                  <p className="text-foreground font-semibold">{playingVideo.title}</p>
                  <p className="text-xs text-muted-foreground">{getCatName(playingVideo.category_id)}</p>
                  {playingVideo.description && <p className="text-sm text-muted-foreground mt-1">{playingVideo.description}</p>}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;
