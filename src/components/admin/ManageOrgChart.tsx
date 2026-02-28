import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, Save } from "lucide-react";

interface OrgPosition {
  id: string;
  title: string;
  category: string;
  function_name: string | null;
  parent_id: string | null;
  profile_id: string | null;
  sort_order: number;
}

interface ProfileOption {
  id: string;
  full_name: string;
}

const categoryOptions = [
  { value: "coordenador_geral_nacional", label: "Coordenador Geral Nacional" },
  { value: "coordenador_local", label: "Coordenador Local" },
  { value: "coordenador_funcao", label: "Coordenador por Função" },
  { value: "responsavel", label: "Responsável" },
  { value: "responsavel_equipe", label: "Responsável de Equipe" },
  { value: "equipe", label: "Equipe" },
  { value: "padre", label: "Padre" },
  { value: "consagrada", label: "Consagrada" },
];

const ManageOrgChart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New position form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("equipe");
  const [functionName, setFunctionName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [posRes, profRes] = await Promise.all([
      supabase.from("org_positions").select("*").order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    if (posRes.data) setPositions(posRes.data as any[]);
    if (profRes.data) setProfiles(profRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({ title: "Preencha o título", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("org_positions").insert({
      title: title.trim(),
      category,
      function_name: functionName.trim() || null,
      profile_id: profileId || null,
      sort_order: sortOrder,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posição adicionada!" });
      setTitle("");
      setFunctionName("");
      setProfileId("");
      setSortOrder(0);
      await fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("org_positions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setPositions(prev => prev.filter(p => p.id !== id));
      toast({ title: "Removido!" });
    }
  };

  const getProfileName = (pid: string | null) => {
    if (!pid) return "—";
    return profiles.find(p => p.id === pid)?.full_name || "—";
  };

  const getCategoryLabel = (cat: string) => categoryOptions.find(c => c.value === cat)?.label || cat;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-foreground" />
        <h3 className="font-bold text-foreground">Organograma das Missões</h3>
      </div>

      {/* Add form */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Nova Posição</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Título / Nome</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Função (opcional)</Label>
            <Input value={functionName} onChange={e => setFunctionName(e.target.value)} placeholder="Ex: Formação" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vincular ao Perfil</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ordem</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={saving} className="gap-2 gradient-mission text-primary-foreground">
          <Plus size={14} /> {saving ? "Salvando..." : "Adicionar"}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {positions.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Nenhuma posição cadastrada.</p>
        ) : (
          positions.map(pos => (
            <div key={pos.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{pos.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {getCategoryLabel(pos.category)}
                  {pos.function_name ? ` • ${pos.function_name}` : ""}
                  {pos.profile_id ? ` • Perfil: ${getProfileName(pos.profile_id)}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(pos.id)} className="text-destructive h-8 w-8">
                <Trash2 size={14} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageOrgChart;
