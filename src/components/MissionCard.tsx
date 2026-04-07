import { useState, useEffect, useRef } from "react";
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

const MissionCard = () => {
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const signupRef = useRef<{ loadExisting: () => void }>(null);
  const [editMode, setEditMode] = useState(false);

  const fetchMission = async () => {
    if (!user) return;
    const todayStr = todayBrasilia();

    const { data: missions } = await supabase
      .from("missoes")
      .select("id, titulo, data, datas, datas_titulos, descricao, valor, pix_key, pix_qr_url, idade_gratuito, idade_meia, whatsapp_responsavel")
      .eq("ativa", true)
      .gte("data", todayStr)
      .order("data", { ascending: true })
      .limit(1);

    if (!missions?.length) { setMission(null); return; }
    const m = missions[0] as unknown as Mission;
    setMission(m);

    const { data: inscricao } = await supabase
      .from("missao_inscricoes")
      .select("id")
      .eq("user_id", user.id)
      .eq("missao_id", m.id)
      .maybeSingle();

    setIsSignedUp(!!inscricao);
  };

  useEffect(() => { fetchMission(); }, [user]);

  if (!mission) return null;

  const formatDateBR = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  const allDates = mission.datas?.length ? mission.datas : [mission.data];
  const datesStr = allDates.map((d, i) => {
    const t = mission.datas_titulos?.[i];
    return t ? `${formatDateBR(d)} — ${t}` : formatDateBR(d);
  }).join(" · ");

  const handleEdit = () => {
    setEditMode(true);
    setPopupOpen(true);
  };

  return (
    <>
      <div className="animate-fade-in rounded-xl border bg-card p-4 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-primary shrink-0" />
          <h3 className="font-bold text-foreground text-sm">Próxima Missão</h3>
        </div>
        <p className="font-semibold text-foreground">{mission.titulo}</p>
        <p className="text-xs text-muted-foreground">📅 {datesStr}</p>
        {mission.valor != null && Number(mission.valor) > 0 && (
          <p className="text-xs font-medium text-primary">💰 R$ {Number(mission.valor).toFixed(2)}</p>
        )}

        {/* Expandable description */}
        {mission.descricao && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {expanded ? "Ocultar detalhes" : "Ver detalhes"}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <p className="text-xs text-muted-foreground whitespace-pre-line animate-fade-in">{mission.descricao}</p>
            )}
          </>
        )}

        {isSignedUp ? (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 size={16} /> Inscrito ✓
            </div>
            <Button size="sm" variant="outline" onClick={handleEdit}>
              <Pencil size={14} className="mr-1" /> Editar
            </Button>
          </div>
        ) : (
          <Button size="sm" className="w-full mt-1" onClick={() => { setEditMode(false); setPopupOpen(true); }}>
            Inscrever-se
          </Button>
        )}
      </div>

      <MissionSignupPopup
        externalMission={mission}
        open={popupOpen}
        onOpenChange={(v) => {
          setPopupOpen(v);
          if (!v) {
            setEditMode(false);
            fetchMission();
          }
        }}
        editOnOpen={editMode}
      />
    </>
  );
};

export default MissionCard;
