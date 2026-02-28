import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { User, Phone, ChevronDown, ChevronRight, Church } from "lucide-react";
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
  phone: string | null;
}

const categoryLabels: Record<string, string> = {
  coordenador_geral_nacional: "Coordenadores Gerais Nacionais",
  coordenador_local: "Coordenadores Locais",
  coordenador_funcao: "Coordenadores por Função",
  responsavel: "Responsáveis",
  responsavel_equipe: "Responsáveis de Equipe",
  equipe: "Equipe",
  padre: "Padres",
  consagrada: "Consagradas",
};

const categoryOrder = [
  "coordenador_geral_nacional",
  "coordenador_local",
  "coordenador_funcao",
  "responsavel",
  "responsavel_equipe",
  "equipe",
];

const MemberCard = ({ position, profile }: { position: OrgPosition; profile?: Profile }) => {
  const name = profile?.full_name || position.title;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
      <Avatar className="h-11 w-11 border-2 border-primary/20">
        {profile?.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {position.function_name && (
          <p className="text-[10px] text-muted-foreground">{position.function_name}</p>
        )}
        <p className="text-[10px] text-muted-foreground">{categoryLabels[position.category] || position.category}</p>
      </div>
      {profile?.phone && (
        <a href={`tel:${profile.phone}`} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Phone size={14} />
        </a>
      )}
    </div>
  );
};

const CategorySection = ({
  label,
  positions,
  profiles,
  defaultOpen = true,
}: {
  label: string;
  positions: OrgPosition[];
  profiles: Map<string, Profile>;
  defaultOpen?: boolean;
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
            <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: posData } = await supabase
        .from("org_positions")
        .select("*")
        .order("sort_order", { ascending: true });

      if (posData) {
        const typed = posData as any[] as OrgPosition[];
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
    fetch();
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const mainPositions = positions.filter(p => !["padre", "consagrada"].includes(p.category));
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
            {/* Main hierarchy */}
            <div className="lg:col-span-2 space-y-5">
              {categoryOrder.map(cat => (
                <CategorySection
                  key={cat}
                  label={categoryLabels[cat]}
                  positions={mainPositions.filter(p => p.category === cat)}
                  profiles={profiles}
                />
              ))}
            </div>

            {/* Padres & Consagradas sidebar */}
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
                        <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} />
                      ))}
                    </div>
                  )}
                  {consagradas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Consagradas</p>
                      {consagradas.map(p => (
                        <MemberCard key={p.id} position={p} profile={p.profile_id ? profiles.get(p.profile_id) : undefined} />
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
