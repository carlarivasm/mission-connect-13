import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Save, Search, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FamilyMember {
  name: string;
  age: string;
}

interface LinkedUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface SearchResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const Familia = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Linked users state
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    // Load profile data
    const { data } = await supabase
      .from("profiles")
      .select("family_members_count, family_ages, family_names, family_name")
      .eq("id", user.id)
      .single();

    if (data) {
      setFamilyName((data as any).family_name ?? "");
      const names: string[] = (data as any).family_names ?? [];
      const ages: string[] = data.family_ages ?? [];
      const count = Math.max(names.length, ages.length, data.family_members_count ?? 0);
      const merged: FamilyMember[] = [];
      for (let i = 0; i < count; i++) {
        merged.push({ name: names[i] ?? "", age: ages[i] ?? "" });
      }
      setMembers(merged);
    }

    // Load family group
    const { data: memberData } = await supabase
      .from("family_group_members")
      .select("family_group_id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberData && memberData.length > 0) {
      const groupId = memberData[0].family_group_id;
      setFamilyGroupId(groupId);
      await loadLinkedUsers(groupId);
    }

    setLoading(false);
  };

  const loadLinkedUsers = async (groupId: string) => {
    if (!user) return;
    const { data: membersData } = await supabase
      .from("family_group_members")
      .select("user_id")
      .eq("family_group_id", groupId);

    if (membersData) {
      const userIds = membersData.map((m) => m.user_id).filter((id) => id !== user.id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);
        if (profiles) {
          setLinkedUsers(profiles.map((p: any) => ({ user_id: p.id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url })));
        }
      } else {
        setLinkedUsers([]);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .neq("id", user.id)
      .or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`)
      .limit(10);

    if (data) {
      const alreadyLinked = new Set(linkedUsers.map((u) => u.user_id));
      setSearchResults(data.filter((p: any) => !alreadyLinked.has(p.id)).map((p: any) => ({
        id: p.id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url,
      })));
    }
    setSearching(false);
  };

  const handleAddLinkedUser = async (targetUser: SearchResult) => {
    if (!user) return;
    let groupId = familyGroupId;

    // Create family group if doesn't exist
    if (!groupId) {
      const { data: newGroup, error: groupErr } = await supabase
        .from("family_groups")
        .insert({ name: familyName || "Minha Família", created_by: user.id })
        .select("id")
        .single();

      if (groupErr || !newGroup) {
        toast({ title: "Erro", description: groupErr?.message || "Não foi possível criar o grupo familiar.", variant: "destructive" });
        return;
      }
      groupId = newGroup.id;
      setFamilyGroupId(groupId);

      // Add current user as member
      await supabase.from("family_group_members").insert({ family_group_id: groupId, user_id: user.id });
    }

    // Add target user
    const { error } = await supabase
      .from("family_group_members" as any)
      .insert({ family_group_id: groupId, user_id: targetUser.id } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro vinculado!", description: `${targetUser.full_name} foi adicionado à família.` });
      setLinkedUsers([...linkedUsers, { user_id: targetUser.id, full_name: targetUser.full_name, email: targetUser.email, avatar_url: targetUser.avatar_url }]);
      setSearchResults(searchResults.filter((r) => r.id !== targetUser.id));
    }
  };

  const handleRemoveLinkedUser = async (userId: string) => {
    if (!familyGroupId) return;
    const { error } = await supabase
      .from("family_group_members" as any)
      .delete()
      .eq("family_group_id", familyGroupId)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setLinkedUsers(linkedUsers.filter((u) => u.user_id !== userId));
      toast({ title: "Membro removido da família." });
    }
  };

  const handleAdd = () => setMembers([...members, { name: "", age: "" }]);
  const handleRemove = (index: number) => setMembers(members.filter((_, i) => i !== index));
  const handleChange = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const valid = members.filter((m) => m.name.trim() || m.age.trim());

    const { error } = await supabase
      .from("profiles")
      .update({
        family_members_count: valid.length,
        family_ages: valid.map((m) => m.age.trim()),
        family_names: valid.map((m) => m.name.trim()),
        family_name: familyName.trim() || null,
      } as any)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setMembers(valid);
      toast({ title: "Salvo!", description: "Dados da família atualizados com sucesso." });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Minha Família" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-xl gradient-mission flex items-center justify-center">
            <Users size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Dados da Família</h2>
            <p className="text-sm text-muted-foreground">Informe os dados da sua família.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        ) : (
          <div className="space-y-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="space-y-1">
                <Label>Nome da Família</Label>
                <Input
                  placeholder="Ex: Família Silva"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <Label>Membros da família ({members.length})</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAdd} className="gap-1">
                  <Plus size={14} /> Adicionar
                </Button>
              </div>

              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro adicionado. Clique em "Adicionar" acima.
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{index + 1}.</span>
                      <Input placeholder="Nome" value={member.name} onChange={(e) => handleChange(index, "name", e.target.value)} className="flex-1" />
                      <Input placeholder="Idade" value={member.age} onChange={(e) => handleChange(index, "age", e.target.value)} className="w-20" />
                      <button type="button" onClick={() => handleRemove(index)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Users Section */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <Label className="flex items-center gap-2">
                <UserPlus size={16} /> Vincular missionários à família
              </Label>
              <p className="text-xs text-muted-foreground">
                Busque por nome ou e-mail para vincular outro missionário à sua família.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleSearch} disabled={searching} className="gap-1">
                  <Search size={14} /> {searching ? "..." : "Buscar"}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 border-t border-muted pt-2">
                  <p className="text-xs text-muted-foreground">Resultados:</p>
                  {searchResults.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleAddLinkedUser(r)} className="gap-1 shrink-0">
                        <UserPlus size={14} /> Vincular
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {linkedUsers.length > 0 && (
                <div className="space-y-2 border-t border-muted pt-2">
                  <p className="text-xs text-muted-foreground font-semibold">Membros vinculados:</p>
                  {linkedUsers.map((lu) => (
                    <div key={lu.user_id} className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                        {lu.avatar_url ? (
                          <img src={lu.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {lu.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lu.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lu.email}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveLinkedUser(lu.user_id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gradient-mission text-primary-foreground gap-2">
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Dados da Família"}
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Familia;
