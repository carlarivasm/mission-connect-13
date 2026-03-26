import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Megaphone, Clock, Trash2, Check, CalendarClock, Users, UserCheck, UsersRound, X, ChevronDown, ChevronUp, Calendar, MessageSquare } from "lucide-react";

interface ScheduledNotif {
  id: string;
  title: string;
  body: string;
  scheduled_at: string;
  sent: boolean;
  source_type: string;
  target_info: {
    mode: string;
    user_names?: string[];
    team_names?: string[];
  } | null;
}

interface ProfileOption {
  id: string;
  full_name: string;
}

interface TeamInfo {
  name: string;
  memberIds: string[];
}

type TargetMode = "all" | "users" | "teams";

const AdminBroadcast = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduled, setScheduled] = useState<ScheduledNotif[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Target audience
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [allProfiles, setAllProfiles] = useState<ProfileOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const fetchScheduled = async () => {
    const { data } = await supabase
      .from("scheduled_notifications")
      .select("id, title, body, scheduled_at, sent, source_type, target_info")
      .order("scheduled_at", { ascending: false });
    if (data) setScheduled(data as any);
  };

  const fetchProfilesAndTeams = async () => {
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });
    if (profiles) setAllProfiles(profiles as ProfileOption[]);

    // Fetch teams from org_positions
    const { data: positions } = await supabase
      .from("org_positions")
      .select("function_name, profile_id")
      .in("category", ["equipe", "responsavel_equipe"])
      .not("profile_id", "is", null)
      .not("function_name", "is", null);

    if (positions) {
      const teamsMap = new Map<string, string[]>();
      for (const pos of positions) {
        const fn = (pos as any).function_name as string;
        const pid = (pos as any).profile_id as string;
        if (!teamsMap.has(fn)) teamsMap.set(fn, []);
        if (!teamsMap.get(fn)!.includes(pid)) {
          teamsMap.get(fn)!.push(pid);
        }
      }
      setAllTeams(
        Array.from(teamsMap.entries()).map(([name, memberIds]) => ({ name, memberIds }))
      );
    }
  };

  useEffect(() => {
    fetchScheduled();
    fetchProfilesAndTeams();
  }, []);

  // Compute resolved user IDs based on target mode
  const getTargetUserIds = (): string[] | null => {
    if (targetMode === "all") return null; // null means all users
    if (targetMode === "users") return Array.from(selectedUserIds);
    if (targetMode === "teams") {
      const ids = new Set<string>();
      for (const teamName of selectedTeams) {
        const team = allTeams.find(t => t.name === teamName);
        if (team) team.memberIds.forEach(id => ids.add(id));
      }
      return Array.from(ids);
    }
    return null;
  };

  const getTargetCount = (): number => {
    const ids = getTargetUserIds();
    return ids ? ids.length : allProfiles.length;
  };

  const buildTargetInfo = () => {
    if (targetMode === "all") return { mode: "all" };
    if (targetMode === "users") {
      const userNames = Array.from(selectedUserIds)
        .map(id => allProfiles.find(p => p.id === id)?.full_name || "Desconhecido")
        .sort();
      return { mode: "users", user_names: userNames };
    }
    if (targetMode === "teams") {
      return { mode: "teams", team_names: Array.from(selectedTeams).sort() };
    }
    return { mode: "all" };
  };

  const toggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const toggleTeam = (name: string) => {
    const next = new Set(selectedTeams);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedTeams(next);
  };

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const filteredProfiles = userSearchQuery.trim()
    ? allProfiles.filter(p => p.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()))
    : allProfiles;

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    const targetIds = getTargetUserIds();
    const targetCount = getTargetCount();

    if (targetMode !== "all" && targetCount === 0) {
      toast({ title: "Nenhum destinatário", description: "Selecione pelo menos um usuário ou equipe.", variant: "destructive" });
      return;
    }

    setSending(true);

    if (scheduleEnabled && scheduleDate && scheduleTime) {
      // Schedule for later
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00-03:00`).toISOString();
      const { error } = await supabase.from("scheduled_notifications").insert({
        title: title.trim(),
        body: message.trim(),
        link: "/dashboard",
        scheduled_at: scheduledAt,
        source_type: "broadcast",
        created_by: user.id,
        target_info: buildTargetInfo(),
      } as any);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Mensagem programada!", description: `Será enviada em ${new Date(scheduledAt).toLocaleString("pt-BR")}.` });
        setTitle(""); setMessage(""); setScheduleDate(""); setScheduleTime(""); setScheduleEnabled(false);
        setSelectedUserIds(new Set()); setSelectedTeams(new Set()); setTargetMode("all");
        fetchScheduled();
      }
    } else {
      // Send immediately
      // Determine target profiles
      const profilesToNotify = targetIds
        ? allProfiles.filter(p => targetIds.includes(p.id))
        : allProfiles;

      const notifications = profilesToNotify.map((p) => ({
        user_id: p.id,
        title: title.trim(),
        message: message.trim(),
        type: "admin_broadcast",
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Mensagem enviada!", description: `Enviada para ${profilesToNotify.length} usuário(s).` });

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const pushBody: any = { title: title.trim(), body: message.trim(), link: "/dashboard" };
          if (targetIds) pushBody.user_ids = targetIds;

          await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify(pushBody),
          }).catch(console.error);
        }

        setTitle(""); setMessage("");
        setSelectedUserIds(new Set());
        setSelectedTeams(new Set());
        setTargetMode("all");
      }
    }
    setSending(false);
  };

  const deleteScheduled = async (id: string) => {
    const { error } = await supabase.from("scheduled_notifications").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido" }); fetchScheduled(); }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case "event": return { label: "Evento", icon: <Calendar size={10} className="text-blue-500" /> };
      case "broadcast": return { label: "Mensagem", icon: <MessageSquare size={10} className="text-primary" /> };
      default: return { label: sourceType, icon: <MessageSquare size={10} className="text-muted-foreground" /> };
    }
  };

  const getTargetLabel = (targetInfo: ScheduledNotif["target_info"]): string => {
    if (!targetInfo || targetInfo.mode === "all") return "Todos os usuários";
    if (targetInfo.mode === "users") return `${targetInfo.user_names?.length || 0} usuário(s)`;
    if (targetInfo.mode === "teams") return `${targetInfo.team_names?.length || 0} equipe(s)`;
    return "Todos os usuários";
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Megaphone size={18} /> Enviar Mensagem
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aviso importante" />
          </div>
          <div className="space-y-1">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva a mensagem..." rows={3} />
          </div>

          {/* Target audience selector */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={14} /> Destinatários
            </h4>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTargetMode("all")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  targetMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Users size={12} /> Todos
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("users")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  targetMode === "users"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <UserCheck size={12} /> Usuários
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("teams")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  targetMode === "teams"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <UsersRound size={12} /> Equipes
              </button>
            </div>

            {targetMode === "all" && (
              <p className="text-xs text-muted-foreground">
                A mensagem será enviada para todos os {allProfiles.length} usuários.
              </p>
            )}

            {targetMode === "users" && (
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por nome..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />

                {selectedUserIds.size > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedUserIds).map(id => {
                        const profile = allProfiles.find(p => p.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
                          >
                            {profile?.full_name || "..."}
                            <button onClick={() => toggleUser(id)} className="hover:text-destructive transition-colors">
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds(new Set())}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Limpar todos
                    </button>
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredProfiles.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(p.id)}
                        onChange={() => toggleUser(p.id)}
                        className="rounded border-border accent-primary"
                      />
                      <span className="text-xs text-foreground truncate">{p.full_name}</span>
                    </label>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado.</p>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {selectedUserIds.size} usuário(s) selecionado(s)
                </p>
              </div>
            )}

            {targetMode === "teams" && (
              <div className="space-y-2">
                {allTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhuma equipe encontrada no organograma.
                  </p>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {allTeams.map(team => (
                      <label
                        key={team.name}
                        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeams.has(team.name)}
                          onChange={() => toggleTeam(team.name)}
                          className="rounded border-border accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground">{team.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ({team.memberIds.length} {team.memberIds.length === 1 ? "membro" : "membros"})
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedTeams.size > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedTeams).map(name => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
                        >
                          {name}
                          <button onClick={() => toggleTeam(name)} className="hover:text-destructive transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTeams(new Set())}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Limpar todas
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {selectedTeams.size} equipe(s) selecionada(s) • {getTargetCount()} usuário(s) total
                </p>
              </div>
            )}
          </div>

          {/* Schedule toggle */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Programar envio</p>
                  <p className="text-xs text-muted-foreground">Definir data e hora para enviar</p>
                </div>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim() || (scheduleEnabled && (!scheduleDate || !scheduleTime)) || (targetMode !== "all" && getTargetCount() === 0)}
          className="gradient-mission text-primary-foreground gap-2"
        >
          {scheduleEnabled ? <CalendarClock size={16} /> : <Send size={16} />}
          {sending ? "Processando..." : scheduleEnabled ? "Programar Envio" : `Enviar Agora (${getTargetCount()})`}
        </Button>
      </div>

      {/* Scheduled list */}
      {scheduled.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <CalendarClock size={16} /> Notificações Programadas
          </h4>
          {scheduled.map((s) => {
            const source = getSourceLabel(s.source_type);
            const isExpanded = expandedIds.has(s.id);
            const targetLabel = getTargetLabel(s.target_info);

            return (
              <div key={s.id} className="bg-muted/50 rounded-lg border border-border overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground uppercase">
                        {source.icon} {source.label}
                      </span>
                      {s.sent && (
                        <span className="text-green-600 font-semibold flex items-center gap-0.5 text-[10px]">
                          <Check size={10} /> Enviada
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.body}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(s.scheduled_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users size={10} />
                        {targetLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleExpanded(s.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {!s.sent && (
                      <button onClick={() => deleteScheduled(s.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2.5 space-y-2 bg-muted/30">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Conteúdo completo</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{s.body}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Destinatários</p>
                      {(!s.target_info || s.target_info.mode === "all") && (
                        <p className="text-xs text-foreground flex items-center gap-1">
                          <Users size={11} className="text-muted-foreground" /> Todos os usuários
                        </p>
                      )}
                      {s.target_info?.mode === "users" && s.target_info.user_names && (
                        <div className="space-y-1">
                          <p className="text-xs text-foreground flex items-center gap-1">
                            <UserCheck size={11} className="text-muted-foreground" />
                            {s.target_info.user_names.length} usuário(s) selecionado(s):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {s.target_info.user_names.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.target_info?.mode === "teams" && s.target_info.team_names && (
                        <div className="space-y-1">
                          <p className="text-xs text-foreground flex items-center gap-1">
                            <UsersRound size={11} className="text-muted-foreground" />
                            {s.target_info.team_names.length} equipe(s) selecionada(s):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {s.target_info.team_names.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

export default AdminBroadcast;
