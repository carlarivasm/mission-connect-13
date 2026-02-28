import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Mail, Upload, FileSpreadsheet, ShieldCheck, ShieldOff } from "lucide-react";
import * as XLSX from "xlsx";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMissionaries = async () => {
    const { data, error } = await supabase
      .from("authorized_missionaries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMissionaries(data);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (allProfiles) {
      const adminIds = new Set(
        (adminRoles || []).filter((r) => r.role === "admin").map((r) => r.user_id)
      );
      setProfiles(
        allProfiles.map((p) => ({
          ...p,
          is_admin: adminIds.has(p.id),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      // Try to find name and email columns (flexible header matching)
      const findCol = (row: Record<string, string>, patterns: string[]) => {
        const key = Object.keys(row).find((k) =>
          patterns.some((p) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(p))
        );
        return key ? row[key] : undefined;
      };

      const entries: { full_name: string; email: string }[] = [];
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowName = findCol(row, ["nome", "name"]);
        const rowEmail = findCol(row, ["email", "e-mail", "mail"]);

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

      // Filter out already existing emails
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
    } catch (err) {
      toast({ title: "Erro ao ler arquivo", description: "Verifique se é um arquivo Excel (.xlsx ou .xls) válido.", variant: "destructive" });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
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
              accept=".xlsx,.xls,.csv"
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

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : missionaries.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum missionário autorizado ainda.</p>
        ) : (
          missionaries.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className={`w-2 h-2 rounded-full ${m.used ? "bg-green-500" : "bg-amber-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{m.full_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail size={12} /> {m.email}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${m.used ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {m.used ? "Cadastrado" : "Pendente"}
              </span>
              {!m.used && (
                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Gerenciar Papéis */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck size={18} /> Gerenciar Administradores
        </h3>
        <p className="text-xs text-muted-foreground">
          Promova ou remova o papel de administrador dos usuários cadastrados.
        </p>
        <div className="space-y-2">
          {profiles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum usuário cadastrado.</p>
          ) : (
            profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_admin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {p.is_admin ? "Admin" : "Missionário"}
                </span>
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
                          ? `${p.full_name} perderá acesso ao painel administrativo e voltará a ser missionário.`
                          : `${p.full_name} terá acesso total ao painel administrativo do aplicativo.`}
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageMissionaries;
