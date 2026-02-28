import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, FolderPlus, Film, Upload, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface Video {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  video_url: string;
  storage_path: string;
  created_at: string;
}

const ManageFormations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Category form
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Video form
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoCategoryId, setVideoCategoryId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");

  const fetchData = async () => {
    const [catRes, vidRes] = await Promise.all([
      supabase.from("formation_categories").select("*").order("sort_order"),
      supabase.from("formation_videos").select("*").order("created_at", { ascending: false }),
    ]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    if (vidRes.data) setVideos(vidRes.data as Video[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    const { error } = await supabase.from("formation_categories").insert({
      name: catName.trim(),
      description: catDesc.trim() || null,
      sort_order: categories.length,
      created_by: user?.id,
    } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Categoria criada!" });
      setCatName("");
      setCatDesc("");
      setShowCatDialog(false);
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("formation_categories").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Categoria excluída" }); fetchData(); }
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !videoCategoryId || !videoTitle.trim() || !user) return;
    setUploading(true);
    try {
      const ext = videoFile.name.split(".").pop();
      const path = `${videoCategoryId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("formation-videos").upload(path, videoFile);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("formation-videos").getPublicUrl(path);

      const { error: insErr } = await supabase.from("formation_videos").insert({
        category_id: videoCategoryId,
        title: videoTitle.trim(),
        description: videoDesc.trim() || null,
        video_url: publicUrl,
        storage_path: path,
        created_by: user.id,
      } as any);
      if (insErr) throw insErr;

      toast({ title: "Vídeo adicionado!" });
      resetVideoForm();
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDeleteVideo = async (video: Video) => {
    await supabase.storage.from("formation-videos").remove([video.storage_path]);
    const { error } = await supabase.from("formation_videos").delete().eq("id", video.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Vídeo excluído" }); fetchData(); }
  };

  const resetVideoForm = () => {
    setShowVideoDialog(false);
    setVideoTitle("");
    setVideoDesc("");
    setVideoCategoryId("");
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredVideos = selectedCatFilter === "all"
    ? videos
    : videos.filter((v) => v.category_id === selectedCatFilter);

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name || "";

  if (loading) return <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-5">
      {/* Categories */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Categorias de Formação</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCatDialog(true)} className="gap-1">
          <FolderPlus size={14} /> Nova Categoria
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-lg shadow-card text-sm">
            <span className="text-foreground font-medium">{cat.name}</span>
            <button onClick={() => handleDeleteCategory(cat.id)} className="text-destructive hover:bg-destructive/10 rounded p-0.5">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria criada.</p>}
      </div>

      {/* Videos */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Vídeos</h3>
        <Button size="sm" onClick={() => setShowVideoDialog(true)} className="gap-1 gradient-mission text-primary-foreground" disabled={categories.length === 0}>
          <Upload size={14} /> Adicionar Vídeo
        </Button>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCatFilter("all")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedCatFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            Todos
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCatFilter(cat.id)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedCatFilter === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum vídeo adicionado.</p>
        ) : (
          filteredVideos.map((video) => (
            <div key={video.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Film size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{video.title}</p>
                <p className="text-xs text-muted-foreground">{getCatName(video.category_id)}</p>
              </div>
              <button onClick={() => handleDeleteVideo(video)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex: Formação Espiritual" />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Descrição da categoria" />
            </div>
            <Button onClick={handleAddCategory} disabled={!catName.trim()} className="w-full gradient-mission text-primary-foreground">
              Criar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={(open) => { if (!open) resetVideoForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload size={18} /> Adicionar Vídeo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={videoCategoryId} onValueChange={setVideoCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Título do vídeo" />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Textarea value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} placeholder="Descrição do vídeo" />
            </div>
            <div className="space-y-1">
              <Label>Arquivo de vídeo</Label>
              {videoFile ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Film size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground truncate flex-1">{videoFile.name}</span>
                  <button onClick={() => { setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Film size={20} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Selecionar vídeo</span>
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} className="hidden" />
                </label>
              )}
            </div>
            <Button onClick={handleUploadVideo} disabled={!videoFile || !videoCategoryId || !videoTitle.trim() || uploading} className="w-full gradient-mission text-primary-foreground">
              {uploading ? "Enviando..." : "Adicionar Vídeo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageFormations;
