import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, Pencil, X, Check, Tag, ArrowUp, ArrowDown } from "lucide-react";

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

interface CategoryOption {
  value: string;
  label: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { value: "coordenador_geral_nacional", label: "Coordenador Geral Nacional" },
  { value: "coordenador_local", label: "Coordenador Local" },
  { value: "coordenador_funcao", label: "Coordenador por Função" },
  { value: "responsavel", label: "Responsável" },
  { value: "responsavel_equipe", label: "Responsável de Equipe" },
  { value: "equipe", label: "Equipe" },
  { value: "padre", label: "Padre" },
  { value: "consagrada", label: "Consagrada" },
];

const SETTINGS_KEY = "org_categories";

const ManageOrgChart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // New position form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("equipe");
  const [functionName, setFunctionName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Category management
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatValue, setNewCatValue] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");

  const fetchData = async () => {
    const [posRes, profRes, catRes] = await Promise.all([
      supabase.from("org_positions").select("*").order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.from("app_settings").select("setting_value").eq("setting_key", SETTINGS_KEY).maybeSingle(),
    ]);
    if (posRes.data) setPositions(posRes.data as any[]);
    if (profRes.data) setProfiles(profRes.data as any[]);
    if (catRes.data?.setting_value) {
      try {
        const parsed = JSON.parse(catRes.data.setting_value);
        if (Array.isArray(parsed) && parsed.length > 0) setCategoryOptions(parsed);
      } catch { /* keep defaults */ }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveCategories = async (cats: CategoryOption[]) => {
    setCategoryOptions(cats);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { setting_key: SETTINGS_KEY, setting_value: JSON.stringify(cats), updated_by: user?.id } as any,
        { onConflict: "setting_key" }
      );
    if (error) {
      toast({ title: "Erro ao salvar categorias", description: error.message, variant: "destructive" });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) return;
    const value = newCatValue.trim() || newCatLabel.trim().toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (categoryOptions.some(c => c.value === value)) {
      toast({ title: "Categoria já existe", variant: "destructive" });
      return;
    }
    const updated = [...categoryOptions, { value, label: newCatLabel.trim() }];
    await saveCategories(updated);
    setNewCatValue("");
    setNewCatLabel("");
    toast({ title: "Categoria adicionada!" });
  };

  const handleDeleteCategory = async (value: string) => {
    const inUse = positions.some(p => p.category === value);
    if (inUse) {
      toast({ title: "Categoria em uso", description: "Remova as posições desta categoria antes.", variant: "destructive" });
      return;
    }
    await saveCategories(categoryOptions.filter(c => c.value !== value));
    toast({ title: "Categoria removida!" });
  };

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const newArr = [...categoryOptions];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newArr.length) return;
    [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];
    await saveCategories(newArr);
  };

  const TEAM_CATEGORIES = ["responsavel_equipe", "equipe"];

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({ title: "Preencha o título", variant: "destructive" });
      return;
    }
    if (TEAM_CATEGORIES.includes(category) && !functionName.trim()) {
      toast({ title: "Preencha o campo 'Função'", description: "Para categorias de equipe, informe o nome da equipe (ex: Equipe 1).", variant: "destructive" });
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

  const handleInlineUpdate = async (pos: OrgPosition, field: string, value: any) => {
    const updateData: any = { [field]: value, updated_at: new Date().toISOString() };
    if (field === "profile_id" && value === "none") updateData.profile_id = null;

    const { error } = await supabase.from("org_positions").update(updateData).eq("id", pos.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, ...updateData } : p));
      toast({ title: "Atualizado!" });
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

      {/* Category Manager */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowCatManager(!showCatManager)} className="flex items-center gap-2 w-full text-left">
          <Tag size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Gerenciar Categorias</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showCatManager ? "▲" : "▼"}</span>
        </button>
        {showCatManager && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {categoryOptions.map((c, index) => (
                <div key={c.value} className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border">
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={() => handleMoveCategory(index, "up")}>
                      <ArrowUp size={10} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === categoryOptions.length - 1} onClick={() => handleMoveCategory(index, "down")}>
                      <ArrowDown size={10} />
                    </Button>
                  </div>
                  <span className="flex-1 text-xs font-medium text-foreground">{c.label}</span>
                  <span className="text-[10px] text-muted-foreground">{index + 1}º</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                        <Trash2 size={12} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A categoria "{c.label}" será removida. Posições que usam esta categoria devem ser alteradas antes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(c.value)}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px]">Nome da Categoria</Label>
                <Input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Ex: Coordenador de Louvor" className="h-8 text-xs" />
              </div>
              <Button size="sm" onClick={handleAddCategory} className="h-8 text-xs gap-1">
                <Plus size={12} /> Adicionar
              </Button>
            </div>
          </div>
        )}
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
            <Label className="text-xs">
              Função {TEAM_CATEGORIES.includes(category) ? "(obrigatório)" : "(opcional)"}
            </Label>
            <Input
              value={functionName}
              onChange={e => setFunctionName(e.target.value)}
              placeholder={TEAM_CATEGORIES.includes(category) ? "Ex: Equipe 1" : "Ex: Formação"}
            />
            {TEAM_CATEGORIES.includes(category) && (
              <p className="text-[10px] text-amber-600">Informe o nome da equipe (ex: Equipe 1) para agrupar corretamente no organograma.</p>
            )}
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
            <InlineEditRow
              key={pos.id}
              pos={pos}
              profiles={profiles}
              categoryOptions={categoryOptions}
              getCategoryLabel={getCategoryLabel}
              getProfileName={getProfileName}
              onUpdate={handleInlineUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

const InlineEditRow = ({
  pos, profiles, categoryOptions, getCategoryLabel, getProfileName, onUpdate, onDelete,
}: {
  pos: OrgPosition;
  profiles: ProfileOption[];
  categoryOptions: CategoryOption[];
  getCategoryLabel: (cat: string) => string;
  getProfileName: (pid: string | null) => string;
  onUpdate: (pos: OrgPosition, field: string, value: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(pos.title);
  const [editCategory, setEditCategory] = useState(pos.category);
  const [editFunction, setEditFunction] = useState(pos.function_name || "");
  const [editProfile, setEditProfile] = useState(pos.profile_id || "none");
  const [editOrder, setEditOrder] = useState(pos.sort_order);

  const TEAM_CATS = ["responsavel_equipe", "equipe"];

  const handleSave = async () => {
    if (TEAM_CATS.includes(editCategory) && !editFunction.trim()) {
      return;
    }
    if (editTitle !== pos.title) await onUpdate(pos, "title", editTitle.trim());
    if (editCategory !== pos.category) await onUpdate(pos, "category", editCategory);
    if ((editFunction || null) !== pos.function_name) await onUpdate(pos, "function_name", editFunction.trim() || null);
    const newProfileId = editProfile === "none" ? null : editProfile;
    if (newProfileId !== pos.profile_id) await onUpdate(pos, "profile_id", newProfileId);
    if (editOrder !== pos.sort_order) await onUpdate(pos, "sort_order", editOrder);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(pos.title);
    setEditCategory(pos.category);
    setEditFunction(pos.function_name || "");
    setEditProfile(pos.profile_id || "none");
    setEditOrder(pos.sort_order);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{pos.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {getCategoryLabel(pos.category)}
            {pos.function_name ? ` • ${pos.function_name}` : ""}
            {pos.profile_id ? ` • Perfil: ${getProfileName(pos.profile_id)}` : ""}
            {` • Ordem: ${pos.sort_order}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="text-primary h-8 w-8">
          <Pencil size={14} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
              <Trash2 size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover posição?</AlertDialogTitle>
              <AlertDialogDescription>"{pos.title}" será removido do organograma.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(pos.id)}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 shadow-card space-y-2 border-2 border-primary/30">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Título</Label>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Categoria</Label>
          <Select value={editCategory} onValueChange={setEditCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Função</Label>
          <Input value={editFunction} onChange={e => setEditFunction(e.target.value)} className="h-8 text-xs" placeholder="Opcional" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Perfil</Label>
          <Select value={editProfile} onValueChange={setEditProfile}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Ordem</Label>
          <Input type="number" value={editOrder} onChange={e => setEditOrder(Number(e.target.value))} className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 text-xs gap-1">
          <X size={12} /> Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} className="h-7 text-xs gap-1 gradient-mission text-primary-foreground">
          <Check size={12} /> Salvar
        </Button>
      </div>
    </div>
  );
};

export default ManageOrgChart;
