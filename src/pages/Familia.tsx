import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FamilyMember {
  name: string;
  age: string;
}

const Familia = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("family_members_count, family_ages, family_names")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const names: string[] = (data as any).family_names ?? [];
          const ages: string[] = data.family_ages ?? [];
          const count = Math.max(names.length, ages.length, data.family_members_count ?? 0);
          const merged: FamilyMember[] = [];
          for (let i = 0; i < count; i++) {
            merged.push({ name: names[i] ?? "", age: ages[i] ?? "" });
          }
          setMembers(merged);
        }
        setLoading(false);
      });
  }, [user]);

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
            <p className="text-sm text-muted-foreground">Informe o nome e idade de cada membro.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        ) : (
          <div className="space-y-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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
                      <Input
                        placeholder="Nome"
                        value={member.name}
                        onChange={(e) => handleChange(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Idade"
                        value={member.age}
                        onChange={(e) => handleChange(index, "age", e.target.value)}
                        className="w-20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
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
