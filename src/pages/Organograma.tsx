import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import OrgMemberCard from "@/components/org/OrgMemberCard";
import OrgCategorySection from "@/components/org/OrgCategorySection";
import { Church } from "lucide-react";

export interface OrgPosition {
  id: string;
  title: string;
  category: string;
  function_name: string | null;
  parent_id: string | null;
  profile_id: string | null;
  sort_order: number;
}

export interface OrgProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  show_phone_in_org: boolean;
}

interface CategoryOption {
  value: string;
  label: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { value: "coordenador_geral_nacional", label: "Coordenador Geral Nacional" },
  { value: "coordenador_local", label: "Coordenador Local" },
  { value: "coordenador_funcao", label: "Coordenador por Função" },
  { value: "responsavel", label: "Responsável" },
  { value: "responsavel_equipe", label: "Responsável de Equipe" },
  { value: "equipe", label: "Equipe" },
  { value: "padre", label: "Padre" },
  { value: "consagrada", label: "Consagrada" },
];

const SPECIAL_CATEGORIES = ["padre", "consagrada"];
const ACCORDION_CATEGORIES = ["coordenador_geral_nacional", "coordenador_funcao"];

const Organograma = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<Map<string, OrgProfile>>(new Map());
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [posRes, catRes] = await Promise.all([
        supabase.from("org_positions").select("*").order("sort_order", { ascending: true }),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "org_categories").maybeSingle(),
      ]);

      if (catRes.data?.setting_value) {
        try {
          const parsed = JSON.parse(catRes.data.setting_value);
          if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
        } catch { /* keep defaults */ }
      }

      if (posRes.data) {
        const typed = posRes.data as any[] as OrgPosition[];
        setPositions(typed);

        const profileIds = typed.filter(p => p.profile_id).map(p => p.profile_id!);
        if (profileIds.length > 0) {
          const { data: profData } = await supabase
            .from("profiles_org_public" as any)
            .select("id, full_name, avatar_url, phone, show_phone_in_org");
          if (profData) {
            const map = new Map<string, OrgProfile>();
            (profData as any[]).forEach(p => map.set(p.id, p));
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const catLabels: Record<string, string> = {};
  categories.forEach(c => { catLabels[c.value] = c.label; });

  const mainCategoryOrder = categories.filter(c => !SPECIAL_CATEGORIES.includes(c.value)).map(c => c.value);
  const mainPositions = positions.filter(p => !SPECIAL_CATEGORIES.includes(p.category));
  const padres = positions.filter(p => p.category === "padre");
  const consagradas = positions.filter(p => p.category === "consagrada");

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Organograma" onLogout={handleLogout} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : positions.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Organograma ainda não configurado.</p>
        ) : (
          <div className="space-y-6">
            {/* Main categories */}
            {mainCategoryOrder.map(cat => {
              const catPositions = mainPositions.filter(p => p.category === cat);
              if (catPositions.length === 0) return null;
              return (
                <OrgCategorySection
                  key={cat}
                  label={catLabels[cat] || cat}
                  positions={catPositions}
                  profiles={profiles}
                  isAccordion={ACCORDION_CATEGORIES.includes(cat)}
                  defaultOpen={!ACCORDION_CATEGORIES.includes(cat)}
                />
              );
            })}

            {/* Padres & Consagradas */}
            {(padres.length > 0 || consagradas.length > 0) && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Church size={18} className="text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Padres e Consagradas</h2>
                </div>

                {padres.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Padres</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {padres.map(p => (
                        <OrgMemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} />
                      ))}
                    </div>
                  </div>
                )}
                {consagradas.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consagradas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {consagradas.map(p => (
                        <OrgMemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Organograma;
