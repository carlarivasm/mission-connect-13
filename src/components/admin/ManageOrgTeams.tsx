import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, ChevronDown, UserPlus, Palette, GripVertical, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const TEAM_COLOR_OPTIONS = [
  { value: "blue", label: "Azul", hsl: "220 80% 50%" },
  { value: "yellow", label: "Amarelo", hsl: "45 90% 50%" },
  { value: "red", label: "Vermelho", hsl: "0 75% 50%" },
  { value: "green", label: "Verde", hsl: "140 60% 40%" },
  { value: "orange", label: "Laranja", hsl: "25 90% 50%" },
  { value: "purple", label: "Roxo", hsl: "270 60% 50%" },
] as const;

const TEAM_COLORS_SETTINGS_KEY = "org_team_colors";
const TEAM_ORDER_SETTINGS_KEY = "org_team_order";

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

interface FamilyGroup {
  id: string;
  name: string;
  members: { user_id: string; full_name: string }[];
}

interface ManageOrgTeamsProps {
  positions: OrgPosition[];
  profiles: ProfileOption[];
  onRefresh: () => Promise<void>;
  teamColors?: Record<string, string>;
  onTeamColorsChange?: (colors: Record<string, string>) => void;
}

const TEAM_CATEGORIES = ["responsavel_equipe", "equipe"];

const ManageOrgTeams = ({ positions, profiles, onRefresh, teamColors: externalColors, onTeamColorsChange }: ManageOrgTeamsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamColors, setTeamColors] = useState<Record<string, string>>(externalColors || {});
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [families, setFamilies] = useState<FamilyGroup[]>([]);

  // Add member form per team
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [memberTitle, setMemberTitle] = useState("");
  const [memberRole, setMemberRole] = useState<"equipe" | "responsavel_equipe">("equipe");
  const [memberProfileId, setMemberProfileId] = useState("");
  const [savingMember, setSavingMember] = useState(false);
  const [addMode, setAddMode] = useState<"individual" | "family">("individual");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");

  // Drag state
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [dragOverTeam, setDragOverTeam] = useState<string | null>(null);

  useEffect(() => {
    if (externalColors) setTeamColors(externalColors);
  }, [externalColors]);

  useEffect(() => {
    fetchFamilies();
    fetchTeamOrder();
  }, []);

  const fetchFamilies = async () => {
    const { data: groups } = await supabase.from("family_groups").select("id, name");
    if (!groups) return;

    const { data: members } = await supabase.from("family_group_members").select("family_group_id, user_id");
    const { data: profs } = await supabase.from("profiles").select("id, full_name");

    const profMap = new Map<string, string>();
    (profs || []).forEach((p: any) => profMap.set(p.id, p.full_name));

    const result: FamilyGroup[] = (groups as any[]).map(g => ({
      id: g.id,
      name: g.name || "Família",
      members: (members || [])
        .filter((m: any) => m.family_group_id === g.id)
        .map((m: any) => ({ user_id: m.user_id, full_name: profMap.get(m.user_id) || "Sem nome" })),
    }));
    setFamilies(result);
  };

  const fetchTeamOrder = async () => {
    const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", TEAM_ORDER_SETTINGS_KEY).maybeSingle();
    if (data?.setting_value) {
      try { setTeamOrder(JSON.parse(data.setting_value)); } catch {}
    }
  };

  const saveTeamOrder = async (order: string[]) => {
    setTeamOrder(order);
    await supabase.from("app_settings").upsert({
      setting_key: TEAM_ORDER_SETTINGS_KEY,
      setting_value: JSON.stringify(order),
      updated_by: user?.id,
    } as any, { onConflict: "setting_key" });
  };

  const saveTeamColor = async (teamName: string, colorValue: string) => {
    const updated = { ...teamColors, [teamName]: colorValue };
    setTeamColors(updated);
    onTeamColorsChange?.(updated);

    await supabase.from("app_settings").upsert({
      setting_key: TEAM_COLORS_SETTINGS_KEY,
      setting_value: JSON.stringify(updated),
      updated_by: user?.id,
    } as any, { onConflict: "setting_key" });
  };

  const getTeamColor = (teamName: string) => {
    const val = teamColors[teamName];
    return TEAM_COLOR_OPTIONS.find(c => c.value === val);
  };

  // Group team positions by function_name
  const teamPositions = positions.filter(p => TEAM_CATEGORIES.includes(p.category) && p.function_name?.trim());
  const rawTeamNames = Array.from(new Set(teamPositions.map(p => p.function_name!.trim())));

  // Sort by custom order, then numerically for unordered ones
  const teamNames = [...rawTeamNames].sort((a, b) => {
    const idxA = teamOrder.indexOf(a);
    const idxB = teamOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    const numA = parseInt(a.replace(/\D/g, "")) || 999;
    const numB = parseInt(b.replace(/\D/g, "")) || 999;
    return numA - numB;
  });

  const getTeamMembers = (teamName: string) => {
    const members = teamPositions.filter(p => p.function_name?.trim() === teamName);
    return {
      responsaveis: members.filter(p => p.category === "responsavel_equipe").sort((a, b) => a.sort_order - b.sort_order),
      membros: members.filter(p => p.category === "equipe").sort((a, b) => a.sort_order - b.sort_order),
    };
  };

  const toggleTeam = (name: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name) {
      toast({ title: "Informe o nome da equipe", variant: "destructive" });
      return;
    }
    if (teamNames.includes(name)) {
      toast({ title: "Equipe já existe", variant: "destructive" });
      return;
    }
    setCreatingTeam(true);
    const { error } = await supabase.from("org_positions").insert({
      title: `Membro - ${name}`,
      category: "equipe",
      function_name: name,
      sort_order: 0,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Equipe "${name}" criada!` });
      setNewTeamName("");
      setExpandedTeams(prev => new Set(prev).add(name));
      // Add to order
      const newOrder = [...teamOrder, name];
      await saveTeamOrder(newOrder);
      await onRefresh();
    }
    setCreatingTeam(false);
  };

  const handleAddMember = async (teamName: string) => {
    if (!memberTitle.trim()) {
      toast({ title: "Informe o nome do membro", variant: "destructive" });
      return;
    }
    setSavingMember(true);
    const maxOrder = teamPositions
      .filter(p => p.function_name?.trim() === teamName)
      .reduce((max, p) => Math.max(max, p.sort_order), -1);

    const { error } = await supabase.from("org_positions").insert({
      title: memberTitle.trim(),
      category: memberRole,
      function_name: teamName,
      profile_id: memberProfileId || null,
      sort_order: maxOrder + 1,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro adicionado!" });
      setMemberTitle("");
      setMemberProfileId("");
      setMemberRole("equipe");
      await onRefresh();
    }
    setSavingMember(false);
  };

  const handleAddFamily = async (teamName: string) => {
    if (!selectedFamilyId) {
      toast({ title: "Selecione uma família", variant: "destructive" });
      return;
    }
    const family = families.find(f => f.id === selectedFamilyId);
    if (!family || family.members.length === 0) {
      toast({ title: "Família sem membros", variant: "destructive" });
      return;
    }
    setSavingMember(true);
    const maxOrder = teamPositions
      .filter(p => p.function_name?.trim() === teamName)
      .reduce((max, p) => Math.max(max, p.sort_order), -1);

    const inserts = family.members.map((m, i) => ({
      title: m.full_name,
      category: memberRole,
      function_name: teamName,
      profile_id: m.user_id,
      sort_order: maxOrder + 1 + i,
      created_by: user?.id,
    }));

    const { error } = await supabase.from("org_positions").insert(inserts as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${family.members.length} membros da família "${family.name}" adicionados!` });
      setSelectedFamilyId("");
      setMemberRole("equipe");
      await onRefresh();
    }
    setSavingMember(false);
  };

  const handleDeleteMember = async (id: string) => {
    const { error } = await supabase.from("org_positions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removido!" });
      await onRefresh();
    }
  };

  const handleDeleteTeam = async (teamName: string) => {
    const ids = teamPositions.filter(p => p.function_name?.trim() === teamName).map(p => p.id);
    const { error } = await supabase.from("org_positions").delete().in("id", ids);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Equipe "${teamName}" removida!` });
      await onRefresh();
    }
  };

  const getProfileName = (pid: string | null) => {
    if (!pid) return null;
    return profiles.find(p => p.id === pid)?.full_name || null;
  };

  const getFamilyName = (pid: string | null) => {
    if (!pid) return null;
    const fam = families.find(f => f.members.some(m => m.user_id === pid));
    return fam ? fam.name : null;
  };

  // Drag and drop handlers
  const handleDragStart = (teamName: string) => {
    setDraggedTeam(teamName);
  };

  const handleDragOver = (e: React.DragEvent, teamName: string) => {
    e.preventDefault();
    if (draggedTeam && draggedTeam !== teamName) {
      setDragOverTeam(teamName);
    }
  };

  const handleDragLeave = () => {
    setDragOverTeam(null);
  };

  const handleDrop = async (targetTeam: string) => {
    if (!draggedTeam || draggedTeam === targetTeam) {
      setDraggedTeam(null);
      setDragOverTeam(null);
      return;
    }

    const currentOrder = [...teamNames];
    const fromIdx = currentOrder.indexOf(draggedTeam);
    const toIdx = currentOrder.indexOf(targetTeam);
    if (fromIdx === -1 || toIdx === -1) return;

    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, draggedTeam);

    await saveTeamOrder(currentOrder);
    setDraggedTeam(null);
    setDragOverTeam(null);
    toast({ title: "Ordem atualizada!" });
  };

  const handleDragEnd = () => {
    setDraggedTeam(null);
    setDragOverTeam(null);
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-primary" />
        <h4 className="text-sm font-bold text-foreground">Gerenciar Equipes</h4>
      </div>

      {/* Create new team */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Nova Equipe</Label>
          <Input
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Ex: Equipe 1"
            className="h-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={handleCreateTeam} disabled={creatingTeam} className="h-9 gap-1 text-xs">
          <Plus size={14} /> Criar
        </Button>
      </div>

      {/* Team list */}
      {teamNames.length === 0 ? (
        <p className="text-center text-muted-foreground text-xs py-4">Nenhuma equipe cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {teamNames.map(teamName => {
            const { responsaveis, membros } = getTeamMembers(teamName);
            const isExpanded = expandedTeams.has(teamName);
            const total = responsaveis.length + membros.length;

            return (
              <div
                key={teamName}
                className={cn(
                  "border border-border rounded-xl overflow-hidden transition-all",
                  draggedTeam === teamName && "opacity-50",
                  dragOverTeam === teamName && "border-primary border-2"
                )}
                draggable
                onDragStart={() => handleDragStart(teamName)}
                onDragOver={(e) => handleDragOver(e, teamName)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(teamName)}
                onDragEnd={handleDragEnd}
              >
                {/* Team header */}
                <div className="flex items-center gap-2 p-3 bg-background">
                  <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />
                  <button onClick={() => toggleTeam(teamName)} className="flex items-center gap-2 flex-1 text-left">
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: getTeamColor(teamName) ? `hsl(${getTeamColor(teamName)!.hsl})` : undefined }}
                    >
                      <Users size={10} className={getTeamColor(teamName) ? "text-white" : "text-muted-foreground"} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{teamName}</span>
                    <span className="text-[10px] text-muted-foreground">({total} {total === 1 ? "membro" : "membros"})</span>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 size={12} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover equipe?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todos os {total} membros da "{teamName}" serão removidos do organograma.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTeam(teamName)}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-3 space-y-3 border-t border-border">
                    {/* Color picker */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Palette size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cor do ícone</span>
                      </div>
                      <div className="flex gap-1.5">
                        {TEAM_COLOR_OPTIONS.map(color => (
                          <button
                            key={color.value}
                            onClick={() => saveTeamColor(teamName, color.value)}
                            className={cn(
                              "w-7 h-7 rounded-full border-2 transition-all",
                              teamColors[teamName] === color.value
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ background: `hsl(${color.hsl})` }}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Responsáveis */}
                    {responsaveis.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Responsáveis</p>
                        {responsaveis.map(m => (
                          <MemberRow key={m.id} member={m} profileName={getProfileName(m.profile_id)} onDelete={handleDeleteMember} />
                        ))}
                      </div>
                    )}

                    {/* Membros */}
                    {membros.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Membros</p>
                        {membros.map(m => (
                          <MemberRow key={m.id} member={m} profileName={getProfileName(m.profile_id)} familyName={getFamilyName(m.profile_id)} onDelete={handleDeleteMember} />
                        ))}
                      </div>
                    )}

                    {/* Add member form */}
                    {addingTo === teamName ? (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {/* Mode toggle */}
                        <div className="flex gap-1">
                          <Button
                            variant={addMode === "individual" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => setAddMode("individual")}
                          >
                            <UserPlus size={10} /> Individual
                          </Button>
                          <Button
                            variant={addMode === "family" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => setAddMode("family")}
                          >
                            <Home size={10} /> Família
                          </Button>
                        </div>

                        {addMode === "individual" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Nome</Label>
                              <Input value={memberTitle} onChange={e => setMemberTitle(e.target.value)} className="h-8 text-xs" placeholder="Ex: João Silva" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Papel</Label>
                              <Select value={memberRole} onValueChange={v => setMemberRole(v as any)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equipe">Membro</SelectItem>
                                  <SelectItem value="responsavel_equipe">Responsável</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-[10px]">Vincular ao Perfil (opcional)</Label>
                              <Select value={memberProfileId} onValueChange={setMemberProfileId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {profiles.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Selecionar Família</Label>
                              <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolha uma família" /></SelectTrigger>
                                <SelectContent>
                                  {families.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.name} ({f.members.length} {f.members.length === 1 ? "membro" : "membros"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {selectedFamilyId && (
                              <div className="text-[10px] text-muted-foreground space-y-0.5">
                                <p className="font-semibold">Membros que serão adicionados:</p>
                                {families.find(f => f.id === selectedFamilyId)?.members.map(m => (
                                  <p key={m.user_id}>• {m.full_name}</p>
                                ))}
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label className="text-[10px]">Papel para todos</Label>
                              <Select value={memberRole} onValueChange={v => setMemberRole(v as any)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equipe">Membro</SelectItem>
                                  <SelectItem value="responsavel_equipe">Responsável</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingTo(null); setMemberTitle(""); setMemberProfileId(""); setSelectedFamilyId(""); }}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={savingMember}
                            onClick={() => addMode === "individual" ? handleAddMember(teamName) : handleAddFamily(teamName)}
                          >
                            <Plus size={12} /> {savingMember ? "Salvando..." : "Adicionar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => { setAddingTo(teamName); setMemberTitle(""); setMemberProfileId(""); setMemberRole("equipe"); setAddMode("individual"); setSelectedFamilyId(""); }}>
                        <UserPlus size={12} /> Adicionar Membro
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MemberRow = ({ member, profileName, familyName, onDelete }: { member: OrgPosition; profileName: string | null; familyName?: string | null; onDelete: (id: string) => Promise<void> }) => (
  <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground truncate">{member.title}</p>
      {familyName ? (
        <p className="text-[10px] text-muted-foreground truncate">Família: {familyName}</p>
      ) : profileName ? (
        <p className="text-[10px] text-muted-foreground truncate">Perfil: {profileName}</p>
      ) : null}
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0">
          <Trash2 size={11} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
          <AlertDialogDescription>"{member.title}" será removido da equipe.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(member.id)}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

export default ManageOrgTeams;
