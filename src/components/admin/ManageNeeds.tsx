import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react";

export interface NeedCategory {
    id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}

export const ManageNeeds = () => {
    const { toast } = useToast();
    const [categories, setCategories] = useState<NeedCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newParentName, setNewParentName] = useState("");
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

    // State for adding child
    const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
    const [newChildName, setNewChildName] = useState("");

    // State for editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("needs_categories")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            toast({ title: "Erro", description: "Falha ao carregar necessidades.", variant: "destructive" });
        } else {
            setCategories(data || []);
            // Auto expand all by default for better UX
            const parents = data?.filter(c => !c.parent_id) || [];
            const expanded: Record<string, boolean> = {};
            parents.forEach(p => expanded[p.id] = true);
            setExpandedParents(expanded);
        }
        setLoading(false);
    };

    const handleAddParent = async () => {
        if (!newParentName.trim()) return;
        const { data, error } = await supabase
            .from("needs_categories")
            .insert({ name: newParentName.trim(), parent_id: null })
            .select()
            .single();

        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else if (data) {
            setCategories([...categories, data]);
            setNewParentName("");
            setExpandedParents(prev => ({ ...prev, [data.id]: true }));
            toast({ title: "Sucesso", description: "Categoria criada." });
        }
    };

    const handleAddChild = async (parentId: string) => {
        if (!newChildName.trim()) return;
        const { data, error } = await supabase
            .from("needs_categories")
            .insert({ name: newChildName.trim(), parent_id: parentId })
            .select()
            .single();

        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else if (data) {
            setCategories([...categories, data]);
            setNewChildName("");
            setAddingChildTo(null);
            toast({ title: "Sucesso", description: "Subcategoria criada." });
        }
    };

    const handleDelete = async (id: string, isParent: boolean) => {
        if (!confirm(isParent ? "Apagar esta categoria removerá todas as suas subcategorias. Deseja continuar?" : "Remover esta subcategoria?")) return;

        const { error } = await supabase.from("needs_categories").delete().eq("id", id);
        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
            setCategories(categories.filter(c => c.id !== id && c.parent_id !== id));
            toast({ title: "Sucesso", description: "Item removido." });
        }
    };

    const startEditing = (category: NeedCategory) => {
        setEditingId(category.id);
        setEditName(category.name);
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        const { error } = await supabase
            .from("needs_categories")
            .update({ name: editName.trim() })
            .eq("id", editingId);

        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
            setCategories(categories.map(c => c.id === editingId ? { ...c, name: editName.trim() } : c));
            setEditingId(null);
            toast({ title: "Sucesso", description: "Item atualizado." });
        }
    };

    const toggleParent = (id: string) => {
        setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto" /></div>;

    const parents = categories.filter(c => !c.parent_id);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-card p-5 rounded-2xl shadow-card">
                <h3 className="text-lg font-bold text-foreground mb-4">Gerenciar Necessidades (2 Níveis)</h3>

                <div className="flex gap-2 mb-6">
                    <Input
                        placeholder="Nova Categoria Principal (ex: Doações, Serviços...)"
                        value={newParentName}
                        onChange={(e) => setNewParentName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddParent()}
                    />
                    <Button onClick={handleAddParent} className="gap-2">
                        <Plus size={16} /> Adicionar
                    </Button>
                </div>

                <div className="space-y-4">
                    {parents.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">Nenhuma categoria cadastrada.</p>
                    ) : (
                        parents.map(parent => {
                            const children = categories.filter(c => c.parent_id === parent.id);
                            const isExpanded = expandedParents[parent.id];

                            return (
                                <div key={parent.id} className="border border-border rounded-xl overflow-hidden bg-background">
                                    {/* Parent Row */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30">
                                        <div className="flex items-center gap-2 flex-1">
                                            <button onClick={() => toggleParent(parent.id)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </button>

                                            {editingId === parent.id ? (
                                                <div className="flex items-center gap-2 flex-1 max-w-sm">
                                                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="h-8" />
                                                    <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8 text-green-600"><Check size={16} /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-destructive"><X size={16} /></Button>
                                                </div>
                                            ) : (
                                                <span className="font-semibold">{parent.name}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => { setAddingChildTo(parent.id); if (!isExpanded) toggleParent(parent.id); }} className="h-8 text-xs gap-1">
                                                <Plus size={14} /> Subcategoria
                                            </Button>
                                            {!editingId && (
                                                <>
                                                    <Button size="icon" variant="ghost" onClick={() => startEditing(parent)} className="h-8 w-8 text-muted-foreground"><Edit2 size={14} /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(parent.id, true)} className="h-8 w-8 text-destructive"><Trash2 size={14} /></Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Children List */}
                                    {isExpanded && (
                                        <div className="p-3 pl-11 space-y-2 border-t border-border bg-background">
                                            {children.map(child => (
                                                <div key={child.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/50 group">
                                                    {editingId === child.id ? (
                                                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                                                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="h-7 text-sm" />
                                                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7 text-green-600"><Check size={14} /></Button>
                                                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 text-destructive"><X size={14} /></Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-foreground/80 flex-[1]">{child.name}</span>
                                                    )}

                                                    {!editingId && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button size="icon" variant="ghost" onClick={() => startEditing(child)} className="h-7 w-7 text-muted-foreground"><Edit2 size={12} /></Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(child.id, false)} className="h-7 w-7 text-destructive"><Trash2 size={12} /></Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add Child Form */}
                                            {addingChildTo === parent.id && (
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                                    <Input
                                                        placeholder="Nome da subcategoria (ex: Alimentos, Roupas...)"
                                                        value={newChildName}
                                                        onChange={(e) => setNewChildName(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleAddChild(parent.id)}
                                                        autoFocus
                                                        className="h-8 text-sm max-w-sm"
                                                    />
                                                    <Button size="sm" onClick={() => handleAddChild(parent.id)} className="h-8 px-3">Salvar</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setAddingChildTo(null)} className="h-8 px-3 text-destructive">Cancelar</Button>
                                                </div>
                                            )}

                                            {children.length === 0 && addingChildTo !== parent.id && (
                                                <p className="text-xs text-muted-foreground py-1 italic">Sem subcategorias.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
