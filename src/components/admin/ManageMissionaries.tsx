import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Mail } from "lucide-react";

interface AuthorizedMissionary {
  id: string;
  full_name: string;
  email: string;
  used: boolean;
  created_at: string;
}

const ManageMissionaries = () => {
  const { toast } = useToast();
  const [missionaries, setMissionaries] = useState<AuthorizedMissionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMissionaries = async () => {
    const { data, error } = await supabase
      .from("authorized_missionaries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMissionaries(data);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchMissionaries(); }, []);

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
        <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
          {submitting ? "Adicionando..." : "Autorizar"}
        </Button>
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
    </div>
  );
};

export default ManageMissionaries;
