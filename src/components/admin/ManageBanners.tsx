import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  body_text: string | null;
  media_url: string;
  media_type: string;
  storage_path: string | null;
  publish_at: string;
  expire_at: string;
  active: boolean;
  created_at: string;
}

const ManageBanners = () => {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("Importante");
  const [publishAt, setPublishAt] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [carouselInterval, setCarouselInterval] = useState(5);
  const [savingInterval, setSavingInterval] = useState(false);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("dashboard_banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBanners(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
    // Fetch carousel interval setting
    supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "banner_carousel_interval")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const val = parseInt(data.setting_value, 10);
          if (val >= 2 && val <= 30) setCarouselInterval(val);
        }
      });
  }, []);

  const handleSaveInterval = async (val: number) => {
    setCarouselInterval(val);
    setSavingInterval(true);
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("setting_key", "banner_carousel_interval")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("app_settings")
        .update({ setting_value: String(val), updated_by: user?.id })
        .eq("setting_key", "banner_carousel_interval");
    } else {
      await supabase
        .from("app_settings")
        .insert({ setting_key: "banner_carousel_interval", setting_value: String(val), updated_by: user?.id });
    }
    setSavingInterval(false);
  };

  const getStatus = (b: Banner) => {
    const now = new Date();
    const pub = new Date(b.publish_at);
    const exp = new Date(b.expire_at);
    if (!b.active) return { label: "Inativo", variant: "secondary" as const };
    if (now < pub) return { label: "Agendado", variant: "outline" as const };
    if (now > exp) return { label: "Expirado", variant: "destructive" as const };
    return { label: "Ativo", variant: "default" as const };
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("Importante");
    setBodyText("");
    setPublishAt("");
    setExpireAt("");
    setFile(null);
  };

  const handleEdit = (b: Banner) => {
    setEditingId(b.id);
    setTitle(b.title);
    setBodyText(b.body_text || "");
    setPublishAt(b.publish_at.slice(0, 16));
    setExpireAt(b.expire_at.slice(0, 16));
    setFile(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!publishAt || !expireAt) { toast.error("Preencha as datas"); return; }
    if (!editingId && !file) { toast.error("Selecione um arquivo"); return; }

    setUploading(true);
    let media_url = "";
    let media_type = "image";
    let storage_path = "";

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      media_type = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
      storage_path = `banners/${Date.now()}_${file.name}`;

      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(storage_path, file, { upsert: true });

      if (upErr) { toast.error("Erro no upload"); setUploading(false); return; }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(storage_path);
      media_url = urlData.publicUrl;
    }

    if (editingId) {
      const updates: Record<string, unknown> = {
        title,
        publish_at: new Date(publishAt).toISOString(),
        expire_at: new Date(expireAt).toISOString(),
      };
      if (file) {
        updates.media_url = media_url;
        updates.media_type = media_type;
        updates.storage_path = storage_path;
      }
      const { error } = await supabase.from("dashboard_banners").update(updates).eq("id", editingId);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Banner atualizado!");
    } else {
      const { error } = await supabase.from("dashboard_banners").insert({
        title,
        media_url,
        media_type,
        storage_path,
        publish_at: new Date(publishAt).toISOString(),
        expire_at: new Date(expireAt).toISOString(),
        created_by: user?.id,
      });
      if (error) toast.error("Erro ao criar banner");
      else toast.success("Banner criado!");
    }

    setUploading(false);
    resetForm();
    fetchBanners();
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm("Excluir este banner?")) return;
    if (b.storage_path) {
      await supabase.storage.from("product-images").remove([b.storage_path]);
    }
    await supabase.from("dashboard_banners").delete().eq("id", b.id);
    toast.success("Banner excluído");
    fetchBanners();
  };

  const toggleActive = async (b: Banner) => {
    await supabase.from("dashboard_banners").update({ active: !b.active }).eq("id", b.id);
    fetchBanners();
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Banners da Página Inicial</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        )}
      </div>

      {/* Carousel interval setting */}
      <Card className="p-3 flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Intervalo do carrossel:</Label>
        <Input
          type="number"
          min={2}
          max={30}
          value={carouselInterval}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 2 && v <= 30) handleSaveInterval(v);
          }}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground">segundos {savingInterval && "(salvando...)"}</span>
      </Card>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">{editingId ? "Editar Banner" : "Novo Banner"}</h4>
            <Button variant="ghost" size="icon" onClick={resetForm}><X size={16} /></Button>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Importante" />
          </div>
          <div>
            <Label>Arquivo (imagem ou vídeo)</Label>
            <Input type="file" accept="image/*,video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Publicar em</Label>
              <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </div>
            <div>
              <Label>Expirar em</Label>
              <Input type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? "Enviando..." : editingId ? "Salvar" : "Criar Banner"}
          </Button>
        </Card>
      )}

      {banners.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground py-8">Nenhum banner cadastrado.</p>
      )}

      {banners.map((b) => {
        const status = getStatus(b);
        return (
          <Card key={b.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{b.title}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
                <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}><Pencil size={14} /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(b)}><Trash2 size={14} /></Button>
              </div>
            </div>
            {b.media_type === "video" ? (
              <video src={b.media_url} className="w-full max-h-32 rounded object-contain bg-black" muted />
            ) : b.media_type === "audio" ? (
              <audio src={b.media_url} controls className="w-full" />
            ) : (
              <img src={b.media_url} alt={b.title} className="w-full max-h-32 rounded object-contain" />
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(b.publish_at).toLocaleString("pt-BR")} → {new Date(b.expire_at).toLocaleString("pt-BR")}
            </p>
          </Card>
        );
      })}
    </div>
  );
};

export default ManageBanners;
