import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Mail, Upload, FileSpreadsheet, ShieldCheck, ShieldOff, RefreshCw, UserX, UserCheck, Send } from "lucide-react";
import { readExcelFile } from "@/lib/excel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthorizedMissionary {
  id: string;
  full_name: string;
  email: string;
  used: boolean;
  created_at: string;
}

interface ProfileWithRole {
  id: string;
  full_name: string;
  email: string;
  is_admin: boolean;
  approved: boolean;
  family_name?: string;
  last_sign_in_at?: string | null;
}

const ManageMissionaries = () => {
  const { toast } = useToast();
  const [missionaries, setMissionaries] = useState<AuthorizedMissionary[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [groupByFamily, setGroupByFamily] = useState(false);

  const fetchMissionaries = async () => {
    // Fetch ALL authorized missionaries (including used=true)
    const { data, error } = await supabase
      .from("authorized_missionaries")
      .select("*")
      .order("full_name");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });

    // Fetch all profile emails to cross-reference
    const { data: profileEmails } = await supabase
      .from("profiles")
      .select("email");

    const registeredEmails = new Set((profileEmails || []).map((p: any) => p.email?.toLowerCase()));

    // Find missionaries who don't have a profile (truly pending)
    const pending = (data || []).filter(m => !registeredEmails.has(m.email?.toLowerCase()));

    // Auto-fix: if used=true but no profile exists, reset to used=false
    const toFix = pending.filter(m => m.used === true);
    if (toFix.length > 0) {
      await Promise.all(
        toFix.map(m =>
          supabase.from("authorized_missionaries").update({ used: false }).eq("id", m.id)
        )
      );
    }

    setMissionaries(pending);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, approved, family_name")
      .order("full_name");

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Fetch user login status from our secure view
    const { data: userStatuses } = await supabase
      .from("user_status" as any)
      .select("id, last_sign_in_at");

    if (allProfiles) {
      const adminIds = new Set(
        (adminRoles || []).filter((r) => r.role === "admin").map((r) => r.user_id)
      );
      
      const statusMap = new Map(
        (userStatuses || []).map((s: any) => [s.id, s.last_sign_in_at])
      );

      setProfiles(
        allProfiles.map((p: any) => ({
          ...p,
          is_admin: adminIds.has(p.id),
          approved: p.approved ?? true,
          family_name: p.family_name || undefined,
          last_sign_in_at: statusMap.get(p.id) || null,
        }))
      );
    }
  };

  useEffect(() => { fetchMissionaries(); fetchProfiles(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("authorized_missionaries")
      .insert({ full_name: name.trim(), email: email.trim().toLowerCase() });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Missionário autorizado!", description: `${name} pode agora criar uma conta.` });
      setName("");
      setEmail("");
      fetchMissionaries();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("authorized_missionaries").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchMissionaries();
    }
  };

  const handleSendInviteEmail = async (missionary: AuthorizedMissionary) => {
    setSendingInvite(missionary.id);
    try {
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: { email: missionary.email, full_name: missionary.full_name },
      });
      if (error) throw error;
      toast({ title: "Convite enviado!", description: `E-mail de convite enviado para ${missionary.email}.` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar convite", description: err?.message || "Tente novamente.", variant: "destructive" });
    }
    setSendingInvite(null);
  };

  const handleDeleteUser = async (profileId: string, profileEmail: string) => {
    setActionLoading(profileId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", userId: profileId, email: profileEmail },
      });
      if (error) throw error;
      toast({ title: "Usuário excluído!", description: "O usuário foi removido e pode ser reincluído." });
      fetchProfiles();
      fetchMissionaries();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleResendConfirmation = async (profileEmail: string) => {
    setActionLoading(profileEmail);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "resend_confirmation", email: profileEmail },
      });
      if (error) throw error;
      toast({ title: "E-mail reenviado!", description: `Confirmação reenviada para ${profileEmail}.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleToggleAdmin = async (profileId: string, currentlyAdmin: boolean) => {
    setTogglingRole(profileId);
    try {
      if (currentlyAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", profileId)
          .eq("role", "admin");
        if (error) throw error;
        await supabase
          .from("user_roles")
          .upsert({ user_id: profileId, role: "missionary" as any }, { onConflict: "user_id,role" });
        toast({ title: "Papel alterado", description: "Usuário agora é missionário." });
      } else {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", profileId)
          .eq("role", "missionary");
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: profileId, role: "admin" as any }, { onConflict: "user_id,role" });
        if (error) throw error;
        toast({ title: "Papel alterado", description: "Usuário agora é administrador." });
      }
      fetchProfiles();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setTogglingRole(null);
  };

  const handleToggleApproval = async (profileId: string, currentlyApproved: boolean) => {
    setActionLoading(profileId + "_approve");
    const { error } = await supabase
      .from("profiles")
      .update({ approved: !currentlyApproved } as any)
      .eq("id", profileId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: currentlyApproved ? "Acesso restrito" : "Acesso aprovado!",
        description: currentlyApproved
          ? "O usuário terá acesso limitado."
          : "O usuário agora tem acesso completo ao app.",
      });
      fetchProfiles();
    }
    setActionLoading(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const rows = await readExcelFile(file);

      const findCol = (row: Record<string, string>, patterns: string[]) => {
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[:\-_]/g, " ").trim();
        const key = Object.keys(row).find((k) => {
          const nk = normalize(k);
          return patterns.some((p) => nk.includes(p));
        });
        return key ? row[key] : undefined;
      };

      const entries: { full_name: string; email: string }[] = [];
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowName = findCol(row, ["nome completo", "nome", "name", "completo"]);
        const rowEmail = findCol(row, ["endereco de e", "endereco de email", "e-mail", "email", "mail"]);

        if (!rowName || !rowEmail) {
          errors.push(`Linha ${i + 2}: nome ou e-mail não encontrado`);
          continue;
        }

        const emailClean = String(rowEmail).trim().toLowerCase();
        if (!emailClean.includes("@")) {
          errors.push(`Linha ${i + 2}: e-mail inválido (${emailClean})`);
          continue;
        }

        entries.push({ full_name: String(rowName).trim(), email: emailClean });
      }

      if (entries.length === 0) {
        toast({
          title: "Nenhum registro válido",
          description: errors.length > 0 ? errors.slice(0, 3).join("; ") : "A planilha precisa ter colunas 'Nome' e 'E-mail'.",
          variant: "destructive",
        });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const existingEmails = missionaries.map((m) => m.email);
      const newEntries = entries.filter((e) => !existingEmails.includes(e.email));
      const skipped = entries.length - newEntries.length;

      if (newEntries.length > 0) {
        const { error } = await supabase
          .from("authorized_missionaries")
          .insert(newEntries);

        if (error) {
          toast({ title: "Erro ao importar", description: error.message, variant: "destructive" });
        } else {
          const msg = skipped > 0
            ? `${newEntries.length} importados, ${skipped} já existiam.`
            : `${newEntries.length} missionários autorizados com sucesso!`;
          toast({ title: "Importação concluída!", description: msg });
          fetchMissionaries();
        }
      } else {
        toast({ title: "Todos já cadastrados", description: "Todos os e-mails da planilha já estão autorizados." });
      }

      if (errors.length > 0) {
        toast({
          title: `${errors.length} linha(s) com problema`,
          description: errors.slice(0, 3).join("; "),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("File import error:", err);
      toast({ title: "Erro ao ler arquivo", description: "Verifique se é um arquivo Excel (.xlsx), CSV ou planilha do Google Sheets válida.", variant: "destructive" });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Categorize profiles into 3 groups ──
  // Admins
  const adminProfiles = profiles.filter(p => p.is_admin).sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  
  // Missionários: Aprovados, não admin, E que já fizeram login (têm last_sign_in_at)
  const missionaryProfiles = profiles
    .filter(p => !p.is_admin && p.approved && p.last_sign_in_at !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  
  // Pendentes: Não admin, e (não aprovados OU aprovados mas que nunca fizeram login)
  const pendingProfiles = profiles
    .filter(p => !p.is_admin && (!p.approved || p.last_sign_in_at === null))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));

  const groupedMissionaries = groupByFamily
    ? missionaryProfiles.reduce((acc, p) => {
        const key = p.family_name || "Sem Família";
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {} as Record<string, ProfileWithRole[]>)
    : null;

  const renderProfileCard = (p: ProfileWithRole) => (
    <div key={p.id} className="flex flex-col gap-2 p-3 bg-background rounded-xl border border-border">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{p.full_name}</p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_admin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {p.is_admin ? "Admin" : "Missionário"}
        </span>
        {!p.approved && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Pendente
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {!p.is_admin && (
          <Button
            size="sm"
            variant={p.approved ? "outline" : "default"}
            className={`text-xs gap-1 ${!p.approved ? "gradient-mission text-primary-foreground" : ""}`}
            disabled={actionLoading === p.id + "_approve"}
            onClick={() => handleToggleApproval(p.id, p.approved)}
          >
            {p.approved ? <ShieldOff size={14} /> : <UserCheck size={14} />}
            {p.approved ? "Restringir" : "Aprovar Acesso"}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant={p.is_admin ? "outline" : "default"}
              disabled={togglingRole === p.id}
              className="text-xs gap-1"
            >
              {p.is_admin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
              {p.is_admin ? "Remover Admin" : "Tornar Admin"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {p.is_admin ? "Remover administrador?" : "Tornar administrador?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {p.is_admin
                  ? `${p.full_name} perderá acesso ao painel administrativo.`
                  : `${p.full_name} terá acesso total ao painel administrativo.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleToggleAdmin(p.id, p.is_admin)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          disabled={actionLoading === p.email}
          onClick={() => handleResendConfirmation(p.email)}
        >
          <RefreshCw size={14} /> Reenviar E-mail
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs gap-1"
              disabled={actionLoading === p.id}
            >
              <UserX size={14} /> Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
              <AlertDialogDescription>
                {p.full_name} será removido do sistema. Ele poderá ser reincluído depois se o e-mail estiver na lista de autorizados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteUser(p.id, p.email)}>
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold font-display text-foreground">Gestão de Missionários</h2>
      </div>

      <Tabs defaultValue="missionaries" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-2">
          <TabsTrigger value="admins">Admin ({adminProfiles.length})</TabsTrigger>
          <TabsTrigger value="missionaries">Missionários ({missionaryProfiles.length})</TabsTrigger>
          <TabsTrigger value="invited">Convidados ({missionaries.length + pendingProfiles.length})</TabsTrigger>
        </TabsList>

        <div className="flex justify-end mb-4 px-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroupByFamily(!groupByFamily)}
            className={`text-xs ${groupByFamily ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground"}`}
          >
            {groupByFamily ? "Desagrupar" : "Agrupar por família"}
          </Button>
        </div>

        {/* ── Administradores ── */}
        <TabsContent value="admins" className="space-y-3 mt-0">
          {adminProfiles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum administrador cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {adminProfiles.map(renderProfileCard)}
            </div>
          )}
        </TabsContent>

        {/* ── Missionários (aprovados, não-admin) ── */}
        <TabsContent value="missionaries" className="space-y-3 mt-0">
          {missionaryProfiles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum missionário aprovado.</p>
          ) : groupByFamily && groupedMissionaries ? (
            <div className="space-y-6">
              {Object.entries(groupedMissionaries)
                .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                .map(([family, members]) => (
                  <div key={family} className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border inline-block shadow-sm">
                      {family} <span className="text-muted-foreground text-xs font-normal">({members.length})</span>
                    </h3>
                    <div className="space-y-2 pl-1">
                      {members.map(renderProfileCard)}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-2">
              {missionaryProfiles.map(renderProfileCard)}
            </div>
          )}
        </TabsContent>

        {/* ── Convidados e Pendentes ── */}
        <TabsContent value="invited" className="space-y-6 mt-0">
          {/* Add/import new missionary form */}
          <form onSubmit={handleAdd} className="bg-card rounded-xl p-4 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <UserPlus size={18} /> Autorizar Novo Missionário
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="m-name">Nome Completo</Label>
                <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do missionário" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-email">E-mail</Label>
                <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
                {submitting ? "Adicionando..." : "Autorizar"}
              </Button>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                <FileSpreadsheet size={16} />
                {uploading ? "Importando..." : "Importar Planilha"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              📄 A planilha deve ter colunas <strong>Nome</strong> e <strong>E-mail</strong>.
            </p>
          </form>

          {/* Convidados (authorized_missionaries not used, no profile) */}
          {missionaries.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">Convidados — Aguardando Cadastro ({missionaries.length})</h3>
              {missionaries.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={12} /> {m.email}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Aguardando cadastro
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    disabled={sendingInvite === m.id}
                    onClick={() => handleSendInviteEmail(m)}
                  >
                    <Send size={14} />
                    {sendingInvite === m.id ? "Enviando..." : "Convidar"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover missionário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {m.full_name} será removido da lista de autorizados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(m.id)}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}

          {/* Pendentes (profiles not approved, non-admin) */}
          {pendingProfiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">Pendentes — Aguardando Aprovação ({pendingProfiles.length})</h3>
              {pendingProfiles.map(renderProfileCard)}
            </div>
          )}

          {missionaries.length === 0 && pendingProfiles.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum convidado ou pendente.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageMissionaries;
