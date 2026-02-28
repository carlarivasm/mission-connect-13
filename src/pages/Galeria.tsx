import { useState, useEffect, useRef } from "react";
import { Plus, Image as ImageIcon, Trash2, X, Upload, MapPin } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface GalleryPhoto {
  id: string;
  caption: string | null;
  image_url: string;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_by_name: string;
  mission_location: string | null;
  created_at: string;
}

const Galeria = () => {
  const { user, role, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  // Upload form state
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPhotos(data as GalleryPhoto[]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchPhotos(); }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem (JPG, PNG, etc).", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 10MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);

    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("mission-photos")
        .upload(path, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("mission-photos")
        .getPublicUrl(path);

      const userName = user.user_metadata?.full_name || user.email || "";

      const { error: insertError } = await supabase
        .from("gallery_photos")
        .insert({
          image_url: publicUrl,
          storage_path: path,
          uploaded_by: user.id,
          uploaded_by_name: userName,
          caption: caption.trim() || null,
          mission_location: location.trim() || null,
        } as any);

      if (insertError) throw insertError;

      toast({ title: "Foto enviada!", description: "A foto foi adicionada à galeria." });
      resetUploadForm();
      fetchPhotos();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    }

    setUploading(false);
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    const { error: storageErr } = await supabase.storage
      .from("mission-photos")
      .remove([photo.storage_path]);

    const { error: dbErr } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", photo.id);

    if (storageErr || dbErr) {
      toast({ title: "Erro ao excluir", description: (storageErr || dbErr)?.message, variant: "destructive" });
    } else {
      toast({ title: "Foto excluída" });
      setSelectedPhoto(null);
      fetchPhotos();
    }
  };

  const resetUploadForm = () => {
    setShowUpload(false);
    setCaption("");
    setLocation("");
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canDelete = (photo: GalleryPhoto) =>
    photo.uploaded_by === user?.id || role === "admin";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Galeria de Fotos" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Galeria</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fotos das nossas missões</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-mission text-primary-foreground text-sm font-semibold shadow-card"
          >
            <Plus size={16} />
            Upload
          </button>
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUpload} onOpenChange={(open) => { if (!open) resetUploadForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload size={18} /> Enviar Foto
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full rounded-xl max-h-56 object-cover" />
                  <button
                    onClick={() => { setSelectedFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <ImageIcon size={32} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar uma foto</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}

              <div className="space-y-1">
                <Label>Legenda (opcional)</Label>
                <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Descreva a foto..." />
              </div>

              <div className="space-y-1">
                <Label>Local da missão (opcional)</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Comunidade São José" />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full gradient-mission text-primary-foreground"
              >
                {uploading ? "Enviando..." : "Enviar Foto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo Grid */}
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <ImageIcon size={40} className="mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhuma foto ainda. Seja o primeiro a compartilhar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-square rounded-xl overflow-hidden shadow-card focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={photo.image_url}
                  alt={photo.caption || "Foto de missão"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Photo Detail Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {selectedPhoto && (
              <>
                <img
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.caption || "Foto de missão"}
                  className="w-full max-h-[60vh] object-contain bg-black"
                />
                <div className="p-4 space-y-2">
                  {selectedPhoto.caption && (
                    <p className="text-foreground font-medium">{selectedPhoto.caption}</p>
                  )}
                  {selectedPhoto.mission_location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin size={14} /> {selectedPhoto.mission_location}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Por {selectedPhoto.uploaded_by_name} • {new Date(selectedPhoto.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {canDelete(selectedPhoto) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedPhoto)}
                      className="gap-1 mt-2"
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  )}
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

export default Galeria;
