import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { ChevronDown, ChevronRight, Church } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface OrgPosition {
  id: string;
  title: string;
  category: string;
  function_name: string | null;
  parent_id: string | null;
  profile_id: string | null;
  sort_order: number;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
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

const MemberCard = ({ position, profile, catLabel }: { position: OrgPosition; profile?: Profile; catLabel: string }) => {
  const name = profile?.full_name || position.title;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
      <Avatar className="h-11 w-11 border-2 border-primary/20">
        {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={name} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {position.function_name && <p className="text-[10px] text-muted-foreground">{position.function_name}</p>}
        <p className="text-[10px] text-muted-foreground">{catLabel}</p>
      </div>
      {profile?.phone && (
        <a href={`tel:${profile.phone}`} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Phone size={14} />
        </a>
      )}
    </div>
  );
};

const CategorySection = ({ label, positions, profiles, catLabels, defaultOpen = true }: {
  label: string; positions: OrgPosition[]; profiles: Map<string, Profile>; catLabels: Record<string, string>; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (positions.length === 0) return null;

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        {open ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        <h3 className="text-sm font-bold text-foreground">{label}</h3>
        <span className="text-[10px] text-muted-foreground">({positions.length})</span>
      </button>
      {open && (
        <div className="space-y-2 ml-2">
          {positions.map(p => (
            <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} catLabel={catLabels[p.category] || p.category} />
          ))}
        </div>
      )}
    </div>
  );
};

const Organograma = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
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
            .from("profiles")
            .select("id, full_name, avatar_url, phone")
            .in("id", profileIds);
          if (profData) {
            const map = new Map<string, Profile>();
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

      <main className="px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : positions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Organograma ainda não configurado.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {mainCategoryOrder.map(cat => (
                <CategorySection
                  key={cat}
                  label={catLabels[cat] || cat}
                  positions={mainPositions.filter(p => p.category === cat)}
                  profiles={profiles}
                  catLabels={catLabels}
                />
              ))}
            </div>

            {(padres.length > 0 || consagradas.length > 0) && (
              <div className="space-y-5">
                <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
                  <div className="flex items-center gap-2">
                    <Church size={16} className="text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Padres e Consagradas</h3>
                  </div>
                  {padres.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Padres</p>
                      {padres.map(p => (
                        <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} catLabel={catLabels[p.category] || p.category} />
                      ))}
                    </div>
                  )}
                  {consagradas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Consagradas</p>
                      {consagradas.map(p => (
                        <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} catLabel={catLabels[p.category] || p.category} />
                      ))}
                    </div>
                  )}
                </div>
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
