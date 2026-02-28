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

const Familia = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membersCount, setMembersCount] = useState(0);
  const [ages, setAges] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("family_members_count, family_ages")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMembersCount(data.family_members_count ?? 0);
          setAges(data.family_ages ?? []);
        }
        setLoading(false);
      });
  }, [user]);

  const handleAddAge = () => {
    setAges([...ages, ""]);
    setMembersCount((prev) => prev + 1);
  };

  const handleRemoveAge = (index: number) => {
    setAges(ages.filter((_, i) => i !== index));
    setMembersCount((prev) => Math.max(0, prev - 1));
  };

  const handleAgeChange = (index: number, value: string) => {
    const updated = [...ages];
    updated[index] = value;
    setAges(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        family_members_count: membersCount,
        family_ages: ages.filter((a) => a.trim() !== ""),
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
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
            <p className="text-sm text-muted-foreground">Informe a quantidade e idades dos membros.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        ) : (
          <div className="space-y-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* Members count */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <Label htmlFor="members-count">Quantidade de membros da família</Label>
              <Input
                id="members-count"
                type="number"
                min={0}
                max={30}
                value={membersCount}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setMembersCount(val);
                }}
              />
            </div>

            {/* Ages */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <Label>Idades dos membros</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddAge} className="gap-1">
                  <Plus size={14} /> Adicionar
                </Button>
              </div>

              {ages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma idade adicionada. Clique em "Adicionar" acima.
                </p>
              ) : (
                <div className="space-y-2">
                  {ages.map((age, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6 text-right">{index + 1}.</span>
                      <Input
                        placeholder="Ex: 12 anos"
                        value={age}
                        onChange={(e) => handleAgeChange(index, e.target.value)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAge(index)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
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
