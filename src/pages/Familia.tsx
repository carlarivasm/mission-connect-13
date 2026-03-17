import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Save, Search, UserPlus, X, UserCheck, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface FamilyGroupInfo {
  id: string;
  name: string;
  created_by: string;
  creator_name?: string;
}

interface SearchResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  hasFamily?: boolean;
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
  const [familyGroupInfo, setFamilyGroupInfo] = useState<FamilyGroupInfo | null>(null);
  const [isGroupCreator, setIsGroupCreator] = useState(true);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // New states for Join Family feature
  const [joinSearchQuery, setJoinSearchQuery] = useState("");
  const [joinSearchResults, setJoinSearchResults] = useState<SearchResult[]>([]);
  const [searchingJoin, setSearchingJoin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [outboundRequests, setOutboundRequests] = useState<Set<string>>(new Set());

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

      // Load group info to determine if user is creator
      const { data: groupData } = await supabase
        .from("family_groups")
        .select("id, name, created_by")
        .eq("id", groupId)
        .single();

      if (groupData) {
        const creatorIsUser = groupData.created_by === user.id;
        setIsGroupCreator(creatorIsUser);

        // If user is NOT the creator, load creator's name and use group name
        if (!creatorIsUser) {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", groupData.created_by)
            .single();

          setFamilyGroupInfo({
            id: groupData.id,
            name: groupData.name,
            created_by: groupData.created_by,
            creator_name: creatorProfile?.full_name || "Membro da família",
          });

          // Use group name as family name if user doesn't have their own
          if (!familyName) {
            setFamilyName(groupData.name);
          }
        } else {
          setFamilyGroupInfo({
            id: groupData.id,
            name: groupData.name,
            created_by: groupData.created_by,
          });
        }
      }

      await loadLinkedUsers(groupId);
    }

    await loadRequests();

    setLoading(false);
  };

  const loadRequests = async () => {
    if (!user) return;

    // Load incoming requests
    const { data: incomingData } = await supabase
      .from("family_requests")
      .select("id, requester_id, created_at")
      .eq("target_user_id", user.id)
      .eq("status", "pending");

    if (incomingData && incomingData.length > 0) {
      const requesterIds = incomingData.map((r) => r.requester_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", requesterIds);

      const enrichedRequests = incomingData.map((r) => ({
        ...r,
        requesterProfile: profilesData?.find((p: any) => p.id === r.requester_id),
      }));
      setPendingRequests(enrichedRequests);
    } else {
      setPendingRequests([]);
    }

    // Load outbound requests
    const { data: outboundData } = await supabase
      .from("family_requests")
      .select("target_user_id")
      .eq("requester_id", user.id)
      .eq("status", "pending");
      
    if (outboundData) {
      setOutboundRequests(new Set(outboundData.map((r) => r.target_user_id)));
    }
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
      .from("family_group_members")
      .insert({ family_group_id: groupId!, user_id: targetUser.id });

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
      .from("family_group_members")
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

  const handleJoinSearch = async () => {
    if (!joinSearchQuery.trim() || !user) return;
    setSearchingJoin(true);
    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .neq("id", user.id)
      .or(`full_name.ilike.%${joinSearchQuery.trim()}%,email.ilike.%${joinSearchQuery.trim()}%`)
      .limit(10);

    if (usersData && usersData.length > 0) {
      const userIds = usersData.map((u: any) => u.id);
      const { data: grps } = await supabase
        .from("family_group_members")
        .select("user_id")
        .in("user_id", userIds);
      
      const hasGrpSet = new Set(grps?.map((g) => g.user_id) || []);
      const alreadyLinked = new Set(linkedUsers.map((u) => u.user_id));
      
      setJoinSearchResults(
        usersData
        .filter((p: any) => !alreadyLinked.has(p.id))    
        .map((u: any) => ({
          ...u,
          hasFamily: hasGrpSet.has(u.id),
        }))
      );
    } else {
        setJoinSearchResults([]);
    }
    setSearchingJoin(false);
  };

  const handleSendJoinRequest = async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from("family_requests").insert({
      requester_id: user.id,
      target_user_id: targetUserId,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada!", description: "Aguarde a pessoa aceitar sua solicitação." });
      setOutboundRequests(new Set([...outboundRequests, targetUserId]));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ 
              title: "Nova solicitação de família", 
              body: "Alguém deseja entrar na sua família. Acesse a tela de Família para verificar.", 
              link: "/familia",
              user_ids: [targetUserId]
          }),
        }).catch(console.error);
      }
    }
  };

  const handleAcceptRequest = async (reqId: string, req: any) => {
    const { error } = await supabase.rpc("accept_family_request", { req_id: reqId });
    if (error) {
       toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Sucesso", description: "Solicitação aceita. Famílias foram mescladas!" });
       
       const { data: { session } } = await supabase.auth.getSession();
       if (session?.access_token) {
           const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
           await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
             method: "POST",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
             body: JSON.stringify({ 
                 title: "Solicitação Aceita", 
                 body: `${user.email} aceitou seu pedido para entrar na família.`, 
                 link: "/familia",
                 user_ids: [req.requester_id]
             }),
           }).catch(console.error);
       }
       setPendingRequests(pendingRequests.filter(r => r.id !== reqId));
       loadData();
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    const { error } = await supabase.rpc("reject_family_request", { req_id: reqId });
    if (error) {
       toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Recusada", description: "A solicitação foi recusada." });
       setPendingRequests(pendingRequests.filter(r => r.id !== reqId));
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
            
            {/* Show pending requests at the top, below "Nome da família" section technically, but this makes sense here */}
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                        {req.requesterProfile?.avatar_url ? (
                          <img src={req.requesterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {req.requesterProfile?.full_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Novo Pedido</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{req.requesterProfile?.full_name || "Alguém"}</span> quer entrar na sua família.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Button onClick={() => handleAcceptRequest(req.id, req)} size="sm" className="flex-1 gap-1" variant="default">
                        <UserCheck size={14} /> Aceitar
                      </Button>
                      <Button onClick={() => handleRejectRequest(req.id)} size="sm" className="flex-1 gap-1" variant="outline">
                        <UserX size={14} /> Negar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show info banner when user was linked by someone else */}
            {!isGroupCreator && familyGroupInfo && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <UserPlus size={20} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Você faz parte da família "{familyGroupInfo.name}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vinculado(a) por {familyGroupInfo.creator_name}. Os dados da família são compartilhados entre os membros.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="space-y-1">
                <Label>Nome da Família</Label>
                <Input
                  placeholder="Ex: Família Silva"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  disabled={!isGroupCreator && !!familyGroupInfo}
                />
                {!isGroupCreator && familyGroupInfo && (
                  <p className="text-xs text-muted-foreground">
                    Apenas {familyGroupInfo.creator_name} pode editar o nome do grupo.
                  </p>
                )}
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

            {/* TABS for Linked Users vs Join requests */}
            <Tabs defaultValue="vincular" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2 bg-muted rounded-xl p-1">
                <TabsTrigger value="vincular" className="rounded-lg text-xs py-2">Vincular à família</TabsTrigger>
                <TabsTrigger value="entrar" className="rounded-lg text-xs py-2">Entrar em uma família</TabsTrigger>
              </TabsList>

              <TabsContent value="vincular" className="bg-card rounded-xl p-4 shadow-card space-y-3 mt-0">
                <Label className="flex items-center gap-2">
                  <UserPlus size={16} /> {isGroupCreator ? "Vincular missionários à família" : "Membros da família"}
                </Label>
                
                {isGroupCreator && (
                  <>
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
                  </>
                )}

                {/* Show creator for non-creators */}
                {!isGroupCreator && familyGroupInfo && (
                  <div className="space-y-2 border-b border-muted pb-2">
                    <p className="text-xs text-muted-foreground font-semibold">Responsável:</p>
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{familyGroupInfo.creator_name}</p>
                        <p className="text-xs text-muted-foreground">Criador do grupo</p>
                      </div>
                    </div>
                  </div>
                )}

                {linkedUsers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {isGroupCreator ? "Membros vinculados:" : "Outros membros:"}
                    </p>
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
                        {isGroupCreator && (
                          <button type="button" onClick={() => handleRemoveLinkedUser(lu.user_id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isGroupCreator && linkedUsers.length === 0 && !familyGroupInfo && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Você ainda não foi vinculado a nenhum grupo familiar.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="entrar" className="bg-card rounded-xl p-4 shadow-card space-y-3 mt-0">
                <Label className="flex items-center gap-2">
                  <UserPlus size={16} /> Entrar em uma Família
                </Label>
                <p className="text-xs text-muted-foreground">
                  Busque por um missionário para solicitar a entrada na família dele. Ele deve possuir uma família criada.
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={joinSearchQuery}
                    onChange={(e) => setJoinSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinSearch()}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleJoinSearch} disabled={searchingJoin} className="gap-1">
                    <Search size={14} /> {searchingJoin ? "..." : "Buscar"}
                  </Button>
                </div>

                {joinSearchResults.length > 0 && (
                  <div className="space-y-2 border-t border-muted pt-2">
                    <p className="text-xs text-muted-foreground">Resultados:</p>
                    {joinSearchResults.map((r) => {
                      const alreadyRequested = outboundRequests.has(r.id);
                      return (
                        <div key={r.id} className="flex flex-col gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                              {r.avatar_url ? (
                                <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                  {r.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{r.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                            </div>
                            
                            <Button 
                              type="button" 
                              size="sm" 
                              variant={alreadyRequested ? "secondary" : "default"} 
                              onClick={() => handleSendJoinRequest(r.id)} 
                              disabled={alreadyRequested || !r.hasFamily}
                              className="gap-1 shrink-0"
                            >
                              {alreadyRequested ? "Solicitado" : "Entrar"}
                            </Button>
                          </div>
                          {!r.hasFamily && (
                             <p className="text-[10px] text-destructive italic text-right">
                               * Este usuário ainda não possui família para você entrar.
                             </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

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
