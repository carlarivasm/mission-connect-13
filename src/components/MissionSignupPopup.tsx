import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayBrasilia } from "@/lib/dateBrasilia";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
}

interface Acompanhante {
  nome: string;
  idade: string;
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
  const [temAcompanhantes, setTemAcompanhantes] = useState(false);
  const [acompanhantesList, setAcompanhantesList] = useState<Acompanhante[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  const isOpen = externalMission ? (externalOpen ?? false) : internalOpen;
  const setIsOpen = externalMission
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

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
      const { data: inscricao } = await supabase
        .from("missao_inscricoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("missao_id", m.id)
        .maybeSingle();
      if (inscricao) return;
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

  const addAcompanhante = () => {
    setAcompanhantesList(prev => [...prev, { nome: "", idade: "" }]);
  };

  const removeAcompanhante = (index: number) => {
    setAcompanhantesList(prev => prev.filter((_, i) => i !== index));
  };

  const updateAcompanhante = (index: number, field: keyof Acompanhante, value: string) => {
    setAcompanhantesList(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async () => {
    if (!user || !mission || !nome.trim()) return;
    setSubmitting(true);

    const detalhes = temAcompanhantes ? acompanhantesList.filter(a => a.nome.trim()) : [];

    const { error } = await supabase.from("missao_inscricoes").insert({
      user_id: user.id,
      missao_id: mission.id,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      acompanhantes: detalhes.length,
      acompanhantes_detalhes: detalhes as unknown as import("@/integrations/supabase/types").Json,
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
              <span className="block mt-1 text-muted-foreground whitespace-pre-line">{activeMission.descricao}</span>
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

          {/* Acompanhantes toggle */}
          <div className="flex items-center justify-between">
            <Label>Levará acompanhantes?</Label>
            <Switch
              checked={temAcompanhantes}
              onCheckedChange={(v) => {
                setTemAcompanhantes(v);
                if (v && acompanhantesList.length === 0) addAcompanhante();
              }}
            />
          </div>

          {temAcompanhantes && (
            <div className="space-y-3 pl-1">
              {acompanhantesList.map((a, i) => (
                <div key={i} className="flex items-end gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={a.nome}
                      onChange={(e) => updateAcompanhante(i, "nome", e.target.value)}
                      placeholder="Nome do acompanhante"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Idade</Label>
                    <Input
                      value={a.idade}
                      onChange={(e) => updateAcompanhante(i, "idade", e.target.value)}
                      placeholder="Ex: 8"
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeAcompanhante(i)}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addAcompanhante} className="w-full">
                <Plus size={14} className="mr-1" /> Adicionar acompanhante
              </Button>
            </div>
          )}

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
