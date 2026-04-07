import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayBrasilia } from "@/lib/dateBrasilia";
import { toast } from "sonner";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
}

interface MissionSignupPopupProps {
  externalMission?: Mission | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MissionSignupPopup = ({ externalMission, open: externalOpen, onOpenChange }: MissionSignupPopupProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [acompanhantes, setAcompanhantes] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  const isOpen = externalMission ? (externalOpen ?? false) : internalOpen;
  const setIsOpen = externalMission
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

  // Auto-detect active mission on mount (only if not externally controlled)
  useEffect(() => {
    if (externalMission || !user) return;

    const check = async () => {
      const todayStr = todayBrasilia();

      const { data: missions } = await supabase
        .from("missoes")
        .select("id, titulo, data, descricao")
        .eq("ativa", true)
        .gte("data", todayStr)
        .order("data", { ascending: true })
        .limit(1);

      if (!missions?.length) return;
      const m = missions[0];

      // Check if already signed up
      const { data: inscricao } = await supabase
        .from("missao_inscricoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("missao_id", m.id)
        .maybeSingle();

      if (inscricao) return;

      // Check if already viewed popup
      const { data: viz } = await supabase
        .from("missao_visualizacoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("missao_id", m.id)
        .maybeSingle();

      if (viz) return;

      setMission(m);
      setAutoMode(true);
      setInternalOpen(true);
    };

    check();
  }, [user, externalMission]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    setNome(user.user_metadata?.full_name || "");

    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) setTelefone(data.phone);
      });
  }, [user]);

  // Use external mission when provided
  useEffect(() => {
    if (externalMission) setMission(externalMission);
  }, [externalMission]);

  const markViewed = async () => {
    if (!user || !mission) return;
    await supabase.from("missao_visualizacoes").upsert(
      { user_id: user.id, missao_id: mission.id, visualizou_popup: true },
      { onConflict: "user_id,missao_id" }
    );
  };

  const handleClose = async () => {
    if (autoMode) await markViewed();
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!user || !mission || !nome.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("missao_inscricoes").insert({
      user_id: user.id,
      missao_id: mission.id,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      acompanhantes,
      observacoes: observacoes.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Você já está inscrito nesta missão.");
      } else {
        toast.error("Erro ao inscrever. Tente novamente.");
      }
    } else {
      await markViewed();
      toast.success("Inscrição realizada com sucesso! 🎉");
      setIsOpen(false);
    }

    setSubmitting(false);
  };

  const activeMission = mission;
  if (!activeMission) return null;

  const formattedDate = new Date(activeMission.data + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); else setIsOpen(true); }}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">📋 {activeMission.titulo}</DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-semibold text-primary">{formattedDate}</span>
            {activeMission.descricao && (
              <span className="block mt-1 text-muted-foreground">{activeMission.descricao}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="mission-nome">Nome *</Label>
            <Input id="mission-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
          </div>
          <div>
            <Label htmlFor="mission-tel">Telefone</Label>
            <Input id="mission-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label htmlFor="mission-acomp">Quantidade de acompanhantes</Label>
            <Input id="mission-acomp" type="number" min={0} value={acompanhantes} onChange={(e) => setAcompanhantes(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label htmlFor="mission-obs">Observações</Label>
            <Textarea id="mission-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Alguma informação adicional..." rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !nome.trim()} className="w-full">
            {submitting ? "Inscrevendo..." : "Confirmar Inscrição"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MissionSignupPopup;
