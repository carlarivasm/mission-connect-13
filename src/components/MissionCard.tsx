import { useState, useEffect } from "react";
import { Flag, CheckCircle2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayBrasilia } from "@/lib/dateBrasilia";
import MissionSignupPopup from "@/components/MissionSignupPopup";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  datas?: string[];
  datas_titulos?: string[];
  descricao: string | null;
  valor?: number | null;
  pix_key?: string | null;
  pix_qr_url?: string | null;
  idade_gratuito?: number | null;
  idade_meia?: number | null;
  whatsapp_responsavel?: string | null;
}

const formatDateBR = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

const MissionItem = ({
  mission,
  isSignedUp,
  onSignup,
  onEdit,
  expanded,
  onToggleExpand,
}: {
  mission: Mission;
  isSignedUp: boolean;
  onSignup: () => void;
  onEdit: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) => {
  const allDates = mission.datas?.length ? mission.datas : [mission.data];
  const datesStr = allDates
    .map((d, i) => {
      const t = mission.datas_titulos?.[i];
      return t ? `${formatDateBR(d)} — ${t}` : formatDateBR(d);
    })
    .join(" · ");

  return (
    <div className="animate-fade-in rounded-xl border bg-card p-4 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Flag size={18} className="text-primary shrink-0" />
        <h3 className="font-bold text-foreground text-sm">{mission.titulo}</h3>
      </div>
      <p className="text-xs text-muted-foreground">📅 {datesStr}</p>
      {mission.valor != null && Number(mission.valor) > 0 && (
        <p className="text-xs font-medium text-primary">💰 R$ {Number(mission.valor).toFixed(2)}</p>
      )}

      {mission.descricao && (
        <>
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? "Ocultar detalhes" : "Ver detalhes"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <p className="text-xs text-muted-foreground whitespace-pre-line animate-fade-in">
              {mission.descricao}
            </p>
          )}
        </>
      )}

      {isSignedUp ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 size={16} /> Inscrito ✓
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil size={14} className="mr-1" /> Editar
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="w-full mt-1 animate-pulse hover:animate-none"
          onClick={onSignup}
        >
          🙋 Inscreva-se agora!
        </Button>
      )}
    </div>
  );
};

const MissionCard = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set());
  const [popupOpen, setPopupOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMissions = async () => {
    if (!user) return;
    const todayStr = todayBrasilia();

    const { data: missionsData } = await supabase
      .from("missoes")
      .select(
        "id, titulo, data, datas, datas_titulos, descricao, valor, pix_key, pix_qr_url, idade_gratuito, idade_meia, whatsapp_responsavel"
      )
      .eq("ativa", true)
      .order("data", { ascending: true });

    if (!missionsData?.length) {
      setMissions([]);
      setSignedUpIds(new Set());
      return;
    }

    // Filter: keep mission if `data` >= today OR any date in `datas[]` >= today
    const futureMissions = (missionsData as unknown as Mission[]).filter((m) => {
      if (m.data >= todayStr) return true;
      if (m.datas?.some((d) => d >= todayStr)) return true;
      return false;
    });

    setMissions(futureMissions);

    const { data: inscricoes } = await supabase
      .from("missao_inscricoes")
      .select("missao_id")
      .eq("user_id", user.id)
      .in(
        "missao_id",
        futureMissions.map((m) => m.id)
      );

    setSignedUpIds(new Set((inscricoes ?? []).map((i) => i.missao_id)));
  };

  useEffect(() => {
    fetchMissions();
  }, [user]);

  if (!missions.length) return null;

  const inscritas = missions.filter((m) => signedUpIds.has(m.id));
  const disponiveis = missions.filter((m) => !signedUpIds.has(m.id));

  const openSignup = (mission: Mission) => {
    setSelectedMission(mission);
    setEditMode(false);
    setPopupOpen(true);
  };

  const openEdit = (mission: Mission) => {
    setSelectedMission(mission);
    setEditMode(true);
    setPopupOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {inscritas.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            Minhas Inscrições
          </h3>
          <div className="space-y-3">
            {inscritas.map((m) => (
              <MissionItem
                key={m.id}
                mission={m}
                isSignedUp
                onSignup={() => openSignup(m)}
                onEdit={() => openEdit(m)}
                expanded={expandedId === m.id}
                onToggleExpand={() => toggleExpand(m.id)}
              />
            ))}
          </div>
        </section>
      )}

      {disponiveis.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            Missões Disponíveis
          </h3>
          <div className="space-y-3">
            {disponiveis.map((m) => (
              <MissionItem
                key={m.id}
                mission={m}
                isSignedUp={false}
                onSignup={() => openSignup(m)}
                onEdit={() => openEdit(m)}
                expanded={expandedId === m.id}
                onToggleExpand={() => toggleExpand(m.id)}
              />
            ))}
          </div>
        </section>
      )}

      {selectedMission && (
        <MissionSignupPopup
          externalMission={selectedMission}
          open={popupOpen}
          onOpenChange={(v) => {
            setPopupOpen(v);
            if (!v) {
              setEditMode(false);
              setSelectedMission(null);
              fetchMissions();
            }
          }}
          editOnOpen={editMode}
        />
      )}
    </>
  );
};

export default MissionCard;
