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
  { value: "consagrado", label: "Consagrado" },
];

const CHURCH_CATEGORIES = ["padre", "consagrada", "consagrado"];
const CHURCH_SUBCATEGORY_LABELS: Record<string, string> = {
  padre: "Padres",
  consagrada: "Consagradas",
  consagrado: "Consagrados",
};

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

  const mainCategoryOrder = categories.filter(c => !CHURCH_CATEGORIES.includes(c.value)).map(c => c.value);
  const mainPositions = positions.filter(p => !CHURCH_CATEGORIES.includes(p.category));
  
  const churchPositions = positions.filter(p => CHURCH_CATEGORIES.includes(p.category));

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
          <div className="space-y-4">
            {/* Main categories - all expandable */}
            {mainCategoryOrder.map(cat => {
              const catPositions = mainPositions.filter(p => p.category === cat);
              if (catPositions.length === 0) return null;
              return (
                <OrgCategorySection
                  key={cat}
                  label={catLabels[cat] || cat}
                  positions={catPositions}
                  profiles={profiles}
                />
              );
            })}

            {/* Padres & Consagrados */}
            {churchPositions.length > 0 && (
              <OrgCategorySection
                label="Padres & Consagrados"
                positions={churchPositions}
                profiles={profiles}
                icon={<Church size={18} className="text-primary" />}
              />
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Organograma;
