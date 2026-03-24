import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp, ChevronRight, UserPlus, Users, Search, Heart, User } from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/excel";
import { TEAM_COLOR_OPTIONS } from "./ManageOrgTeams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ManualMember {
  name: string;
  age: string;
}

interface FamilyGroupData {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  missionariesCount: number;
  manualCount: number;
  totalCount: number;
  missionaries: any[];
  manualMembers: ManualMember[];
  teamName: string | null;
  teamColor: string | null;
}

const ManageFamilies = () => {
  const { toast } = useToast();
  const [familiesList, setFamiliesList] = useState<FamilyGroupData[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unlinkedSearchQuery, setUnlinkedSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToLink, setUserToLink] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToCreateFamilyFor, setUserToCreateFamilyFor] = useState<any | null>(null);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedMissionariesToAdd, setSelectedMissionariesToAdd] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all profiles
    const { data: profilesData, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, family_name, family_names, family_ages, family_members_count")
      .order("full_name");

    // Fetch all family groups and their members
    const { data: groupsData, error: grpErr } = await supabase
      .from("family_groups")
      .select("id, name, created_by, members:family_group_members(user_id)");

    // Fetch team associations
    const { data: orgPositions } = await supabase
      .from("org_positions")
      .select("profile_id, function_name")
      .in("category", ["equipe", "responsavel_equipe"]);

    const { data: colorSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "org_team_colors")
      .maybeSingle();

    let teamColors: Record<string, string> = {};
    if (colorSettings?.setting_value) {
      try { teamColors = JSON.parse(colorSettings.setting_value); } catch { }
    }

    const teamMap = new Map<string, string>();
    orgPositions?.forEach(p => {
      if (p.profile_id && p.function_name) teamMap.set(p.profile_id, p.function_name);
    });

    if (profErr || grpErr) {
      toast({ title: "Erro ao carregar dados", variant: "destructive", description: "Verifique a sua conexão." });
      setLoading(false);
      return;
    }

    if (profilesData && groupsData) {
      const userToGroup = new Map<string, string>();
      groupsData.forEach((g: any) => {
        g.members.forEach((m: any) => userToGroup.set(m.user_id, g.id));
      });

      // Filter unlinked users (those who aren't in any family group)
      const unlinked = profilesData.filter(p => !userToGroup.has(p.id));
      setUnlinkedUsers(unlinked);

      // Build specific families objects
      const calculatedFamilies: FamilyGroupData[] = [];

      groupsData.forEach((g: any) => {
        const creator = profilesData.find((p: any) => p.id === g.created_by);

        // Find all linked profiles that belong to this group
        const linkedMissionaries = g.members
          .map((m: any) => profilesData.find((p: any) => p.id === m.user_id))
          .filter(Boolean);

        // Calculate all manual members attached to all these linked missionaries
        let manualCount = 0;
        const manualMembers: ManualMember[] = [];

        linkedMissionaries.forEach((lm: any) => {
          const names = lm.family_names || [];
          const ages = lm.family_ages || [];
          const ct = Math.max(names.length, ages.length, lm.family_members_count || 0);
          manualCount += ct;
          for (let i = 0; i < ct; i++) {
            manualMembers.push({
              name: names[i] || "Membro",
              age: ages[i] || ""
            });
          }
        });

        let familyTeamName: string | null = null;
        let familyTeamColor: string | null = null;
        for (const m of linkedMissionaries) {
          if (teamMap.has(m.id)) {
            familyTeamName = teamMap.get(m.id)!;
            familyTeamColor = teamColors[familyTeamName] || null;
            break;
          }
        }

        calculatedFamilies.push({
          id: g.id,
          name: g.name || creator?.family_name || "Família sem nome",
          creatorId: g.created_by,
          creatorName: creator?.full_name || "Desconhecido",
          missionariesCount: linkedMissionaries.length,
          manualCount: manualCount,
          totalCount: linkedMissionaries.length + manualCount,
          missionaries: linkedMissionaries,
          manualMembers: manualMembers,
          teamName: familyTeamName,
          teamColor: familyTeamColor
        });
      });

      // Optionally, treat unlinked profiles that explicitly have manual members as "solo families" if preferred?
      // No, user specifically requested those to be in "Missoinários sem família" so they can be merged.

      // Sort families by count descending
      calculatedFamilies.sort((a, b) => b.totalCount - a.totalCount);
      setFamiliesList(calculatedFamilies);
    }
    setLoading(false);
  };

  const handleOpenLinkModal = (user: any) => {
    setUserToLink(user);
    setIsModalOpen(true);
  };

  const handleForceAddToFamily = async (missionaryId: string, groupId: string, creatorId: string) => {
    if (linking) return;
    setLinking(true);

    // 1. Create a request on behalf of the missionary targeted at the group creator
    const { data: request, error: reqErr } = await supabase.from("family_requests").insert({
      requester_id: missionaryId,
      target_user_id: creatorId,
      status: "pending"
    }).select("id").single();

    if (reqErr) {
      toast({ title: "Erro na solicitação", description: reqErr.message, variant: "destructive" });
      setLinking(false);
      return;
    }

    // 2. Accept the request via RPC to perfectly handle merge behavior
    const { error: accErr } = await supabase.rpc("accept_family_request", { req_id: request.id });

    if (accErr) {
      toast({ title: "Erro ao mesclar", description: accErr.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Missionário adicionado à família com sucesso." });
      setIsModalOpen(false);
      setUserToLink(null);
      fetchData(); // reload
    }
    setLinking(false);
  };

  const handleOpenCreateModal = (user: any) => {
    setUserToCreateFamilyFor(user);
    setNewFamilyName(user.family_name || "Família " + user.full_name.split(" ")[0]);
    setSelectedMissionariesToAdd([]);
    setIsCreateModalOpen(true);
  };

  const toggleMissionarySelection = (id: string) => {
    if (selectedMissionariesToAdd.includes(id)) {
      setSelectedMissionariesToAdd(prev => prev.filter(mid => mid !== id));
    } else {
      setSelectedMissionariesToAdd(prev => [...prev, id]);
    }
  };

  const handleCreateNewFamily = async () => {
    if (!newFamilyName.trim() || !userToCreateFamilyFor) {
      toast({ title: "Atenção", description: "Defina o nome da família.", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: newGroup, error: groupErr } = await supabase
      .from("family_groups")
      .insert({ name: newFamilyName, created_by: userToCreateFamilyFor.id })
      .select("id")
      .single();

    if (groupErr || !newGroup) {
      toast({ title: "Erro", description: groupErr?.message || "Não foi possível criar a família.", variant: "destructive" });
      setCreating(false);
      return;
    }

    const { error: insertErr } = await supabase.from("family_group_members").insert({
      family_group_id: newGroup.id,
      user_id: userToCreateFamilyFor.id
    });

    if (insertErr) {
      toast({ title: "Erro ao vincular membro principal", description: insertErr.message, variant: "destructive" });
    } else {
      for (const missionaryId of selectedMissionariesToAdd) {
        await supabase.from("family_group_members").insert({
          family_group_id: newGroup.id,
          user_id: missionaryId
        });
      }
      toast({ title: "Sucesso!", description: "Nova família criada com sucesso." });
      setIsCreateModalOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const exportData = (format: "csv" | "xlsx") => {
    const rows: Record<string, string>[] = [];

    familiesList.forEach((f) => {
      // Base main row for the Family
      rows.push({
        "Nome da Família": f.name,
        "Responsável": f.creatorName,
        "Tipo": "Resumo",
        "Missionário": "",
        "Membro": "",
        "Idade": "",
        "Total de Membros": f.totalCount.toString()
      });

      f.missionaries.forEach((m: any) => {
        rows.push({
          "Nome da Família": f.name,
          "Responsável": f.creatorName,
          "Tipo": "Missionário Vinculado",
          "Missionário": m.full_name,
          "Membro": "",
          "Idade": "",
          "Total de Membros": ""
        });
      });

      f.manualMembers.forEach((mm: ManualMember) => {
        rows.push({
          "Nome da Família": f.name,
          "Responsável": f.creatorName,
          "Tipo": "Membro Manual",
          "Missionário": "",
          "Membro": mm.name,
          "Idade": mm.age,
          "Total de Membros": ""
        });
      });
    });

    if (format === "csv") {
      exportToCsv(rows, "familias.csv");
    } else {
      exportToExcel(rows, "Famílias", "familias.xlsx");
    }

    toast({ title: "Exportado!", description: `Arquivo ${format.toUpperCase()} baixado com sucesso.` });
  };

  const filteredFamilies = familiesList.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnlinked = unlinkedUsers.filter(u =>
    u.full_name.toLowerCase().includes(unlinkedSearchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(unlinkedSearchQuery.toLowerCase()))
  );

  if (loading) return <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Gerenciar Famílias</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportData("csv")} className="gap-1 h-8 text-xs">
            <Download size={14} /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData("xlsx")} className="gap-1 h-8 text-xs">
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="familias" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted p-1 rounded-xl">
          <TabsTrigger value="familias" className="rounded-lg text-xs py-2">
            Famílias ({familiesList.length})
          </TabsTrigger>
          <TabsTrigger value="semfamilia" className="rounded-lg text-xs py-2">
            Sem Família ({unlinkedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="familias" className="space-y-4 animate-fade-in mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Buscar por nome da família ou responsável..."
              className="pl-9 bg-card border-border h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredFamilies.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma família encontrada.</p>
            ) : (
              filteredFamilies.map((f) => (
                <div key={f.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:border-border transition-colors">
                  <div
                    className="flex flex-row items-center justify-between cursor-pointer gap-4 w-full"
                    onClick={() => setExpandedFamily(expandedFamily === f.id ? null : f.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground flex flex-wrap items-center gap-2">
                        <span className="truncate">{f.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase shrink-0">
                          {f.totalCount} membros
                        </span>
                      </h4>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground truncate">
                        <User size={12} className="shrink-0" /> <span className="shrink-0">Responsável:</span> <span className="font-medium text-foreground truncate">{f.creatorName}</span>
                      </div>
                      {f.teamName && (() => {
                        const colorObj = f.teamColor ? TEAM_COLOR_OPTIONS.find(c => c.value === f.teamColor) : null;
                        return (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground truncate">
                            {colorObj && (
                              <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: `hsl(${colorObj.hsl})` }} />
                            )}
                            <span className="shrink-0">Equipe:</span> <span className="font-medium text-foreground truncate">{f.teamName}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-center text-muted-foreground shrink-0 pl-2">
                      {expandedFamily === f.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {expandedFamily === f.id && (
                    <div className="mt-4 pt-3 border-t border-border/50 space-y-4 animate-fade-in">
                      {/* Missionários Vinculados */}
                      {f.missionaries.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Users size={12} /> Missionários Registrados ({f.missionaries.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {f.missionaries.map(m => (
                              <div key={m.id} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-primary">{m.full_name?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Membros Manuais */}
                      {f.manualMembers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Heart size={12} /> Membros Adicionados Manualmente ({f.manualMembers.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {f.manualMembers.map((mm, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                <p className="text-sm text-foreground truncate">{mm.name}</p>
                                {mm.age && <span className="text-xs font-medium text-muted-foreground shrink-0">{mm.age} anos</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="semfamilia" className="space-y-4 animate-fade-in mt-0">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary mb-4 flex items-center gap-2">
            <Users size={16} className="shrink-0" />
            <p>Missionários listados aqui podem ser adicionados forçosamente pelo Administrador a uma família existente.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 bg-card border-border h-10"
              value={unlinkedSearchQuery}
              onChange={(e) => setUnlinkedSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUnlinked.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8 col-span-full">Nenhum missionário sem família encontrado.</p>
            ) : (
              filteredUnlinked.map((u) => {
                const manualExtraCount = Math.max((u.family_names || []).length, (u.family_ages || []).length, u.family_members_count || 0);

                return (
                  <div key={u.id} className="bg-card border border-border/50 rounded-xl p-3 shadow-sm flex flex-col justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 mt-0.5">
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {manualExtraCount > 0 && (
                          <p className="text-[10px] text-primary mt-1 font-medium bg-primary/10 inline-block px-1.5 py-0.5 rounded">
                            Acompanha {manualExtraCount} familiar(es) não cadastrado(s)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenLinkModal(u)}
                        className="w-full gap-1"
                        variant="default"
                      >
                        <UserPlus size={14} /> Adicionar a uma família
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[400px] max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/50 pb-4">
            <DialogTitle className="text-lg font-bold">Vincular a uma família</DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Escolha a família onde deseja adicionar o(a) missionário(a) <strong className="text-foreground">{userToLink?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
            {familiesList.map(f => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl hover:border-primary/50 transition-colors shadow-sm cursor-pointer"
                onClick={() => handleForceAddToFamily(userToLink?.id, f.id, f.creatorId)}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <User size={10} /> {f.creatorName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{f.totalCount}</span> membros totais
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <AddIcon linking={linking} />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border/50 bg-card">
            <Button
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                handleOpenCreateModal(userToLink);
              }}
              className="w-full gap-2 border-none bg-primary/10 text-primary hover:bg-primary/20 font-bold"
              variant="outline"
            >
              <Heart size={16} /> Ou Crie uma Nova Família
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Nova Família */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-[400px] max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/50 pb-4">
            <DialogTitle className="text-lg font-bold">Criar Nova Família</DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Você está criando uma nova família tendo <strong className="text-foreground">{userToCreateFamilyFor?.full_name}</strong> como o responsável principal.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nome da Família</label>
              <Input
                placeholder="Ex: Família Silva"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Missionários Adicionais (Opcional)</label>
              <p className="text-[10px] text-muted-foreground pb-2">Selecione missionários dessa lista para adicioná-los também a esta nova família de uma vez só.</p>
              <div className="border border-border/50 rounded-lg max-h-[200px] overflow-y-auto p-1 bg-muted/20">
                {unlinkedUsers.filter(u => u.id !== userToCreateFamilyFor?.id).map(u => {
                  const selected = selectedMissionariesToAdd.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleMissionarySelection(u.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {selected && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  );
                })}
                {unlinkedUsers.filter(u => u.id !== userToCreateFamilyFor?.id).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Não há outros missionários sem família no momento.</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 bg-card">
            <Button onClick={handleCreateNewFamily} disabled={creating} className="w-full gap-2 font-bold gradient-mission text-primary-foreground">
              {creating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> : <Heart size={16} />}
              {creating ? "Criando..." : "Criar Família"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AddIcon = ({ linking }: { linking: boolean }) => (
  linking ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /> : <ChevronRight size={16} className="text-primary" />
);

export default ManageFamilies;
