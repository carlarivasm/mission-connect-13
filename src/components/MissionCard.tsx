import { useState, useEffect } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayBrasilia } from "@/lib/dateBrasilia";
import MissionSignupPopup from "@/components/MissionSignupPopup";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
}

const MissionCard = () => {
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const fetchMission = async () => {
    if (!user) return;
    const todayStr = todayBrasilia();

    const { data: missions } = await supabase
      .from("missoes")
      .select("id, titulo, data, descricao")
      .eq("ativa", true)
      .gte("data", todayStr)
      .order("data", { ascending: true })
      .limit(1);

    if (!missions?.length) { setMission(null); return; }
    const m = missions[0];
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

  const formattedDate = new Date(mission.data + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <>
      <div className="animate-fade-in rounded-xl border bg-card p-4 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-primary shrink-0" />
          <h3 className="font-bold text-foreground text-sm">Próxima Missão</h3>
        </div>
        <p className="font-semibold text-foreground">{mission.titulo}</p>
        <p className="text-xs text-muted-foreground">📅 {formattedDate}</p>
        {mission.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{mission.descricao}</p>
        )}
        {isSignedUp ? (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium pt-1">
            <CheckCircle2 size={16} /> Inscrito ✓
          </div>
        ) : (
          <Button size="sm" className="w-full mt-1" onClick={() => setPopupOpen(true)}>
            Inscrever-se
          </Button>
        )}
      </div>

      <MissionSignupPopup
        externalMission={mission}
        open={popupOpen}
        onOpenChange={(v) => {
          setPopupOpen(v);
          if (!v) fetchMission();
        }}
      />
    </>
  );
};

export default MissionCard;
