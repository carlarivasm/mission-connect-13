import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, ChevronDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ManageOrgTeamsProps {
  positions: OrgPosition[];
  profiles: ProfileOption[];
  onRefresh: () => Promise<void>;
}

const TEAM_CATEGORIES = ["responsavel_equipe", "equipe"];

const ManageOrgTeams = ({ positions, profiles, onRefresh }: ManageOrgTeamsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Add member form per team
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [memberTitle, setMemberTitle] = useState("");
  const [memberRole, setMemberRole] = useState<"equipe" | "responsavel_equipe">("equipe");
  const [memberProfileId, setMemberProfileId] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Group team positions by function_name
  const teamPositions = positions.filter(p => TEAM_CATEGORIES.includes(p.category) && p.function_name?.trim());
  const teamNames = Array.from(new Set(teamPositions.map(p => p.function_name!.trim())))
    .sort((a, b) => {
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
    // Create a placeholder position so the team exists
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
              <div key={teamName} className="border border-border rounded-xl overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-2 p-3 bg-background">
                  <button onClick={() => toggleTeam(teamName)} className="flex items-center gap-2 flex-1 text-left">
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
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
                          <MemberRow key={m.id} member={m} profileName={getProfileName(m.profile_id)} onDelete={handleDeleteMember} />
                        ))}
                      </div>
                    )}

                    {/* Add member form */}
                    {addingTo === teamName ? (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
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
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingTo(null); setMemberTitle(""); setMemberProfileId(""); }}>
                            Cancelar
                          </Button>
                          <Button size="sm" className="h-7 text-xs gap-1" disabled={savingMember} onClick={() => handleAddMember(teamName)}>
                            <Plus size={12} /> {savingMember ? "Salvando..." : "Adicionar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => { setAddingTo(teamName); setMemberTitle(""); setMemberProfileId(""); setMemberRole("equipe"); }}>
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

const MemberRow = ({ member, profileName, onDelete }: { member: OrgPosition; profileName: string | null; onDelete: (id: string) => Promise<void> }) => (
  <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground truncate">{member.title}</p>
      {profileName && <p className="text-[10px] text-muted-foreground truncate">Perfil: {profileName}</p>}
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
