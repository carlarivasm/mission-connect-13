import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, BookPlus, Pencil, ExternalLink, Upload, FileText } from "lucide-react";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
}

const ManageMaterials = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("geral");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMaterials(data);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("geral"); setLinkUrl(""); setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const ext = file.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("material-documents").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Erro ao enviar arquivo", description: uploadError.message, variant: "destructive" });
      setUploadingFile(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("material-documents").getPublicUrl(filePath);
    setUploadingFile(false);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let fileUrl: string | null = null;
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      const url = await handleFileUpload({ target: fileInput } as any);
      if (url) fileUrl = url;
    }

    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      link_url: linkUrl.trim() || null,
      created_by: user?.id,
    };
    if (fileUrl) payload.file_url = fileUrl;

    if (editingId) {
      const { error } = await supabase.from("materials").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Material atualizado!" }); resetForm(); fetchMaterials(); }
    } else {
      const { error } = await supabase.from("materials").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Material adicionado!" }); resetForm(); fetchMaterials(); }
    }
    setSubmitting(false);
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description || "");
    setCategory(m.category);
    setLinkUrl(m.link_url || "");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchMaterials();
  };

  const categoryLabels: Record<string, string> = {
    geral: "Geral",
    oração: "Oração",
    formação: "Formação",
    liturgia: "Liturgia",
    evangelização: "Evangelização",
    atividades: "Atividades",
  };

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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o material" rows={2} />
          </div>
            <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="oração">Oração</SelectItem>
                  <SelectItem value="formação">Formação</SelectItem>
                  <SelectItem value="liturgia">Liturgia</SelectItem>
                  <SelectItem value="evangelização">Evangelização</SelectItem>
                  <SelectItem value="atividades">Atividades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link (vídeo, Google Drive, etc.)</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1"><Upload size={12} /> Documento (.pdf, .doc, .docx, etc.)</Label>
            <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
            {uploadingFile && <p className="text-xs text-muted-foreground">Enviando arquivo...</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
            {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
          </Button>
          {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : materials.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum material cadastrado.</p>
        ) : (
          materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground">{categoryLabels[m.category] || m.category}</p>
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <FileText size={10} /> Baixar documento
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
