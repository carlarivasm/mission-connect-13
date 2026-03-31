import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, BookPlus, Pencil, ExternalLink, Upload, FileText, Film, Music, File, Link2, X, ArrowUp, ArrowDown, ImageIcon, Bell, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
  material_type: string;
  storage_path: string | null;
  sort_order: number;
  created_at: string;
}

const MISSIONARY_CATEGORIES: Record<string, string> = {
  formacao_missionarios: "Formação dos Missionários",
  geral: "Geral",
  oração: "Oração",
  formação: "Formação",
  liturgia: "Liturgia",
  evangelização: "Evangelização",
  atividades: "Atividades",
};

const RESPONSAVEIS_CATEGORIES: Record<string, string> = {
  formacao_responsaveis: "Formação dos Responsáveis",
  outros_responsaveis: "Outros Materiais",
};

const MATERIAL_TYPES: Record<string, string> = {
  pdf: "PDF",
  document: "Documento",
  audio: "Áudio",
  video: "Vídeo",
  image: "Imagem",
  link: "Link Externo",
};

const materialTypeIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText size={16} />;
    case "video": return <Film size={16} />;
    case "audio": return <Music size={16} />;
    case "image": return <ImageIcon size={16} />;
    case "link": return <Link2 size={16} />;
    default: return <File size={16} />;
  }
};

const fileAcceptByType: Record<string, string> = {
  pdf: ".pdf",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
  audio: "audio/*",
  video: "video/*",
  image: "image/*",
};

const ManageMaterials = () => {
  return (
    <Tabs defaultValue="missionarios" className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="missionarios">Missionários</TabsTrigger>
        <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
      </TabsList>
      <TabsContent value="missionarios">
        <MaterialsSection area="missionarios" categories={MISSIONARY_CATEGORIES} />
      </TabsContent>
      <TabsContent value="responsaveis">
        <MaterialsSection area="responsaveis" categories={RESPONSAVEIS_CATEGORIES} />
      </TabsContent>
    </Tabs>
  );
};

interface MaterialsSectionProps {
  area: "missionarios" | "responsaveis";
  categories: Record<string, string>;
}

const MaterialsSection = ({ area, categories }: MaterialsSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(Object.keys(categories)[0]);
  const [materialType, setMaterialType] = useState("document");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  // Notification states
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [scheduleNotify, setScheduleNotify] = useState(false);
  const [notifyDate, setNotifyDate] = useState<Date | undefined>(undefined);
  const [notifyTime, setNotifyTime] = useState("12:00");

  const categoryKeys = Object.keys(categories);
  const respKeys = Object.keys(RESPONSAVEIS_CATEGORIES);

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) {
      const filtered = (data as Material[]).filter((m) =>
        area === "responsaveis" ? respKeys.includes(m.category) : !respKeys.includes(m.category)
      );
      setMaterials(filtered);
    }
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(categoryKeys[0]); setMaterialType("document");
    setLinkUrl(""); setEditingId(null); setSelectedFile(null);
    setNotifyEnabled(false); setScheduleNotify(false); setNotifyDate(undefined); setNotifyTime("12:00");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    let fileUrl: string | null = null;
    let storagePath: string | null = null;

    if (selectedFile) {
      setUploadingFile(true);
      const ext = selectedFile.name.split(".").pop();
      const bucket = materialType === "video" ? "formation-videos" : "material-documents";
      const filePath = `${area}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, selectedFile, { contentType: selectedFile.type });
      if (uploadError) {
        toast({ title: "Erro ao enviar arquivo", description: uploadError.message, variant: "destructive" });
        setUploadingFile(false);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
      storagePath = filePath;
      setUploadingFile(false);
    }

    // Calculate sort_order for new items (put at end)
    const maxOrder = materials.length > 0 ? Math.max(...materials.map(m => m.sort_order)) : -1;

    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      material_type: materialType,
      link_url: linkUrl.trim() || null,
      created_by: user?.id,
    };
    if (!editingId) {
      payload.sort_order = maxOrder + 1;
    }
    if (fileUrl) { payload.file_url = fileUrl; payload.storage_path = storagePath; }

    let saveSuccess = false;
    if (editingId) {
      const { error } = await supabase.from("materials").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Material atualizado!" }); saveSuccess = true; }
    } else {
      const { error } = await supabase.from("materials").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Material adicionado!" }); saveSuccess = true; }
    }

    // Send notification if enabled and save was successful
    if (saveSuccess && notifyEnabled && !editingId) {
      const notifTitle = `📚 Novo material: ${title.trim()}`;
      const notifBody = description.trim() ? description.trim().substring(0, 200) : `Um novo material foi adicionado: ${title.trim()}`;

      if (scheduleNotify && notifyDate) {
        const [h, m] = notifyTime.split(":").map(Number);
        const scheduledAt = new Date(notifyDate);
        scheduledAt.setHours(h, m, 0, 0);

        await supabase.from("scheduled_push").insert({
          title: notifTitle,
          body: notifBody,
          link: "/materiais",
          scheduled_at: scheduledAt.toISOString(),
          create_in_app: true,
        });
        toast({ title: "Notificação agendada!" });
      } else {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          await supabase.functions.invoke("send-push-notification", {
            body: { title: notifTitle, body: notifBody, link: "/materiais" },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          toast({ title: "Notificação enviada!" });
        } catch (err) {
          console.error("Push error:", err);
        }
      }
    }

    if (saveSuccess) { resetForm(); fetchMaterials(); }
    setSubmitting(false);
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description || "");
    setCategory(m.category);
    setMaterialType(m.material_type || "document");
    setLinkUrl(m.link_url || "");
    setSelectedFile(null);
  };

  const handleDelete = async (id: string) => {
    const mat = materials.find((m) => m.id === id);
    if (mat?.storage_path) {
      const bucket = mat.material_type === "video" ? "formation-videos" : "material-documents";
      await supabase.storage.from(bucket).remove([mat.storage_path]);
    }
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchMaterials();
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const current = filteredMaterials[index];
    const above = filteredMaterials[index - 1];
    await Promise.all([
      supabase.from("materials").update({ sort_order: above.sort_order }).eq("id", current.id),
      supabase.from("materials").update({ sort_order: current.sort_order }).eq("id", above.id),
    ]);
    fetchMaterials();
  };

  const handleMoveDown = async (index: number) => {
    if (index >= filteredMaterials.length - 1) return;
    const current = filteredMaterials[index];
    const below = filteredMaterials[index + 1];
    await Promise.all([
      supabase.from("materials").update({ sort_order: below.sort_order }).eq("id", current.id),
      supabase.from("materials").update({ sort_order: current.sort_order }).eq("id", below.id),
    ]);
    fetchMaterials();
  };

  const filteredMaterials = filterCat ? materials.filter((m) => m.category === filterCat) : materials;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BookPlus size={18} /> {editingId ? "Editar Material" : "Novo Material"}
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do material" required />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o material (pode ser texto longo)" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Material</Label>
              <Select value={materialType} onValueChange={(v) => { setMaterialType(v); setSelectedFile(null); setLinkUrl(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIAL_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {materialType === "link" ? (
            <div className="space-y-1">
              <Label>Link externo</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Upload size={12} /> Arquivo</Label>
                {selectedFile ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    {materialTypeIcon(materialType)}
                    <span className="text-sm text-foreground truncate flex-1">{selectedFile.name}</span>
                    <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    {materialTypeIcon(materialType)}
                    <span className="text-sm text-muted-foreground">Selecionar arquivo</span>
                    <input ref={fileInputRef} type="file" accept={fileAcceptByType[materialType] || "*"} onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} className="hidden" />
                  </label>
                )}
                {uploadingFile && <p className="text-xs text-muted-foreground">Enviando arquivo...</p>}
              </div>
              <div className="space-y-1">
                <Label>Link externo (opcional)</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://youtube.com/... ou outro link" />
              </div>
            </>
          )}
        </div>

        {/* Notification option (only for new materials) */}
        {!editingId && (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Bell size={14} /> Enviar notificação push</Label>
              <Switch checked={notifyEnabled} onCheckedChange={setNotifyEnabled} />
            </div>
            {notifyEnabled && (
              <div className="space-y-3 pl-1">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!scheduleNotify} onChange={() => setScheduleNotify(false)} className="accent-primary" />
                    Enviar agora
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={scheduleNotify} onChange={() => setScheduleNotify(true)} className="accent-primary" />
                    Agendar
                  </label>
                </div>
                {scheduleNotify && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal flex-1", !notifyDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {notifyDate ? format(notifyDate, "dd/MM/yyyy") : "Data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={notifyDate} onSelect={setNotifyDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={notifyTime} onChange={(e) => setNotifyTime(e.target.value)} className="w-28" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
            {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
          </Button>
          {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
        </div>
      </form>

      {/* Category Filter */}
      {categoryKeys.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setFilterCat(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!filterCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            Todos
          </button>
          {categoryKeys.map((key) => (
            <button key={key} onClick={() => setFilterCat(key)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterCat === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {categories[key]}
            </button>
          ))}
        </div>
      )}

      {/* Materials List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : filteredMaterials.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum material cadastrado.</p>
        ) : (
          filteredMaterials.map((m, idx) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 rounded text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === filteredMaterials.length - 1}
                  className="p-1 rounded text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                {materialTypeIcon(m.material_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{m.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{categories[m.category] || m.category}</span>
                  <span className="text-[10px] text-primary font-semibold">• {MATERIAL_TYPES[m.material_type] || m.material_type}</span>
                </div>
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <FileText size={10} /> Abrir arquivo
                  </a>
                )}
                {m.link_url && (
                  <a href={m.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <ExternalLink size={10} /> Acessar link
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(m)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageMaterials;
