import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PendingSurveyAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const [surveysRes, responsesRes] = await Promise.all([
        supabase.from("surveys").select("id").eq("active", true),
        supabase.from("survey_responses").select("survey_id").eq("user_id", user.id),
      ]);

      const activeSurveyIds = (surveysRes.data || []).map((s: any) => s.id);
      const answeredIds = new Set((responsesRes.data || []).map((r: any) => r.survey_id));
      const pending = activeSurveyIds.filter((id: string) => !answeredIds.has(id));
      setPendingCount(pending.length);
    };

    check();
  }, [user]);

  if (pendingCount === 0 || dismissed) return null;

  return (
    <div className="mx-4 p-4 bg-card rounded-xl shadow-elevated border border-primary/20 animate-fade-in flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg gradient-mission flex items-center justify-center shrink-0">
        <ClipboardList size={20} className="text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">
          {pendingCount === 1 ? "Você tem 1 pesquisa pendente" : `Você tem ${pendingCount} pesquisas pendentes`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Sua opinião é muito importante para nós!</p>
        <Button
          size="sm"
          onClick={() => navigate("/pesquisas")}
          className="mt-2 gradient-mission text-primary-foreground text-xs h-8"
        >
          Responder agora
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PendingSurveyAlert;
