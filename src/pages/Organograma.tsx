import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import OrgMemberCard from "@/components/org/OrgMemberCard";
import OrgCategorySection from "@/components/org/OrgCategorySection";
import { Church, Users } from "lucide-react";
import { TEAM_COLOR_OPTIONS } from "@/components/admin/ManageOrgTeams";

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

// Fixed display order for the public organograma
const TOP_CATEGORIES = ["coordenador_geral_nacional", "coordenador_local", "coordenador_funcao"];
const TEAM_CATEGORIES = ["responsavel_equipe", "equipe"];

const Organograma = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<Map<string, OrgProfile>>(new Map());
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [teamColors, setTeamColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const [posRes, catRes, colorsRes] = await Promise.all([
        supabase.from("org_positions").select("*").order("sort_order", { ascending: true }),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "org_categories").maybeSingle(),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "org_team_colors").maybeSingle(),
      ]);

      if (catRes.data?.setting_value) {
        try {
          const parsed = JSON.parse(catRes.data.setting_value);
          if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
        } catch { /* keep defaults */ }
      }

      if (colorsRes.data?.setting_value) {
        try { setTeamColors(JSON.parse(colorsRes.data.setting_value)); } catch {}
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

  // 1) Top leadership categories
  const topPositions = TOP_CATEGORIES.map(cat => ({
    cat,
    items: positions.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  // 2) Church positions
  const churchPositions = positions.filter(p => CHURCH_CATEGORIES.includes(p.category));

  // 3) Responsável dos Responsáveis de Equipe
  const responsavelPositions = positions.filter(p => p.category === "responsavel" || p.category === "responsavel_dos_responsaveis_de_equipe");

  // 4) Team positions grouped by function_name
  const teamPositions = positions.filter(p => TEAM_CATEGORIES.includes(p.category));
  const teamsByFunction = new Map<string, { responsaveis: OrgPosition[]; membros: OrgPosition[] }>();
  teamPositions.forEach(p => {
    const fn = p.function_name?.trim() || "Sem equipe";
    if (!teamsByFunction.has(fn)) teamsByFunction.set(fn, { responsaveis: [], membros: [] });
    const team = teamsByFunction.get(fn)!;
    if (p.category === "responsavel_equipe") team.responsaveis.push(p);
    else team.membros.push(p);
  });

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
            {/* 1) Top leadership */}
            {topPositions.map(({ cat, items }) => (
              <OrgCategorySection
                key={cat}
                label={catLabels[cat] || cat}
                positions={items}
                profiles={profiles}
              />
            ))}

            {/* 2) Padres & Consagrados */}
            {churchPositions.length > 0 && (
              <OrgCategorySection
                label="Padres & Consagrados"
                positions={churchPositions}
                profiles={profiles}
                icon={<Church size={18} className="text-primary" />}
                subcategoryLabels={CHURCH_SUBCATEGORY_LABELS}
              />
            )}

            {/* 3) Responsável pelos Responsáveis de Equipe */}
            {responsavelPositions.length > 0 && (
              <OrgCategorySection
                label="Responsável pelos Responsáveis de Equipe"
                positions={responsavelPositions}
                profiles={profiles}
              />
            )}

            {/* 4) Equipes ordenadas numericamente */}
            {Array.from(teamsByFunction.entries())
              .sort((a, b) => {
                const numA = parseInt(a[0].replace(/\D/g, "")) || 999;
                const numB = parseInt(b[0].replace(/\D/g, "")) || 999;
                return numA - numB;
              })
              .map(([teamName, team]) => (
              <OrgCategorySection
                key={teamName}
                label={teamName}
                positions={[...team.responsaveis, ...team.membros]}
                profiles={profiles}
                subcategoryLabels={{
                  responsavel_equipe: "Responsáveis",
                  equipe: "Membros",
                }}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Organograma;
