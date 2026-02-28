import { useState, useEffect } from "react";
import { Film, Play } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Video {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  video_url: string;
  created_at: string;
}

const Formacao = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("formation_categories").select("*").order("sort_order"),
      supabase.from("formation_videos").select("*").order("created_at", { ascending: false }),
    ]).then(([catRes, vidRes]) => {
      if (catRes.data) setCategories(catRes.data as Category[]);
      if (vidRes.data) setVideos(vidRes.data as Video[]);
      setLoading(false);
    });
  }, []);

  const filtered = selectedCat === "all" ? videos : videos.filter((v) => v.category_id === selectedCat);
  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name || "";

  const handleLogout = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Formação" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h2 className="text-xl font-display font-bold text-foreground">Formação</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Vídeos de formação missionária</p>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <button onClick={() => setSelectedCat("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedCat === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              Todos
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedCat === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Videos */}
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Film size={40} className="mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhum vídeo de formação disponível.</p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {filtered.map((video) => (
              <button
                key={video.id}
                onClick={() => setPlayingVideo(video)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl shadow-card text-left"
              >
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

export default Formacao;
