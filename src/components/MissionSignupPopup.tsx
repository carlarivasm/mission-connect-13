import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayBrasilia } from "@/lib/dateBrasilia";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingBag, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  datas?: string[];
  datas_titulos?: string[];
  descricao: string | null;
  valor?: number | null;
}

interface Acompanhante {
  nome: string;
  idade: string;
}

interface ExistingInscricao {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  datas_escolhidas: string[];
  acompanhantes: number;
  acompanhantes_detalhes: Acompanhante[];
  observacoes: string | null;
}

interface MissionSignupPopupProps {
  externalMission?: Mission | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editOnOpen?: boolean;
}

const MissionSignupPopup = ({ externalMission, open: externalOpen, onOpenChange, editOnOpen }: MissionSignupPopupProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [datasEscolhidas, setDatasEscolhidas] = useState<string[]>([]);
  const [temAcompanhantes, setTemAcompanhantes] = useState(false);
  const [acompanhantesList, setAcompanhantesList] = useState<Acompanhante[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingInscricaoId, setEditingInscricaoId] = useState<string | null>(null);

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
        .select("id, titulo, data, datas, datas_titulos, descricao, valor")
        .eq("ativa", true)
        .gte("data", todayStr)
        .order("data", { ascending: true })
        .limit(1);
      if (!missions?.length) return;
      const m = missions[0] as unknown as Mission;
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
    setEmail(user.email || "");
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

  // Load existing inscription for editing
  useEffect(() => {
    if (editOnOpen && isOpen && user && mission) {
      loadExistingInscricao();
    }
  }, [editOnOpen, isOpen]);

  const markViewed = async () => {
    if (!user || !mission) return;
    await supabase.from("missao_visualizacoes").upsert(
      { user_id: user.id, missao_id: mission.id, visualizou_popup: true },
      { onConflict: "user_id,missao_id" }
    );
  };

  const handleClose = async () => {
    if (autoMode && !showSuccess) await markViewed();
    setShowSuccess(false);
    setEditingInscricaoId(null);
    setIsOpen(false);
  };

  const addAcompanhante = () => setAcompanhantesList(prev => [...prev, { nome: "", idade: "" }]);
  const removeAcompanhante = (index: number) => setAcompanhantesList(prev => prev.filter((_, i) => i !== index));
  const updateAcompanhante = (index: number, field: keyof Acompanhante, value: string) =>
    setAcompanhantesList(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));

  const toggleDateChoice = (d: string) => {
    setDatasEscolhidas(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const availableDates = (() => {
    if (!mission) return [];
    const todayStr = todayBrasilia();
    const all = mission.datas?.length ? mission.datas : [mission.data];
    return all.filter(d => d >= todayStr).sort();
  })();

  const getDateLabel = (d: string) => {
    if (!mission) return formatDateBR(d);
    const allDates = mission.datas?.length ? mission.datas : [mission.data];
    const idx = allDates.indexOf(d);
    const title = mission.datas_titulos?.[idx];
    return title ? `${formatDateBR(d)} — ${title}` : formatDateBR(d);
  };

  const loadExistingInscricao = async () => {
    if (!user || !mission) return;
    const { data } = await supabase
      .from("missao_inscricoes")
      .select("id, nome, email, telefone, datas_escolhidas, acompanhantes, acompanhantes_detalhes, observacoes")
      .eq("user_id", user.id)
      .eq("missao_id", mission.id)
      .maybeSingle();
    if (!data) {
      toast.error("Inscrição não encontrada.");
      return;
    }
    const insc = data as unknown as ExistingInscricao;
    setEditingInscricaoId(insc.id);
    setNome(insc.nome);
    setEmail(insc.email || "");
    setTelefone(insc.telefone || "");
    setDatasEscolhidas(Array.isArray(insc.datas_escolhidas) ? insc.datas_escolhidas : []);
    const det = Array.isArray(insc.acompanhantes_detalhes) ? insc.acompanhantes_detalhes : [];
    setAcompanhantesList(det);
    setTemAcompanhantes(det.length > 0);
    setObservacoes(insc.observacoes || "");
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !mission || !nome.trim()) return;
    if (availableDates.length > 1 && datasEscolhidas.length === 0) {
      toast.error("Selecione ao menos uma data.");
      return;
    }
    setSubmitting(true);

    const detalhes = temAcompanhantes ? acompanhantesList.filter(a => a.nome.trim()) : [];
    const chosenDates = availableDates.length === 1 ? availableDates : datasEscolhidas.sort();

    if (editingInscricaoId) {
      const { error } = await supabase.from("missao_inscricoes").update({
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        acompanhantes: detalhes.length,
        acompanhantes_detalhes: detalhes as unknown as import("@/integrations/supabase/types").Json,
        datas_escolhidas: chosenDates,
        observacoes: observacoes.trim() || null,
      } as any).eq("id", editingInscricaoId);

      if (error) {
        toast.error("Erro ao atualizar inscrição.");
      } else {
        toast.success("Inscrição atualizada! ✅");
        setShowSuccess(true);
      }
    } else {
      const { error } = await supabase.from("missao_inscricoes").insert({
        user_id: user.id,
        missao_id: mission.id,
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        acompanhantes: detalhes.length,
        acompanhantes_detalhes: detalhes as unknown as import("@/integrations/supabase/types").Json,
        datas_escolhidas: chosenDates,
        observacoes: observacoes.trim() || null,
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("Você já está inscrito nesta missão.");
        } else {
          toast.error("Erro ao inscrever. Tente novamente.");
        }
      } else {
        await markViewed();
        toast.success("Inscrição realizada com sucesso! 🎉");
        setShowSuccess(true);
      }
    }
    setSubmitting(false);
  };

  const activeMission = mission;
  if (!activeMission) return null;

  const formatDateBR = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); else setIsOpen(true); }}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="text-center space-y-4 py-4">
            <p className="text-4xl">{editingInscricaoId ? "✅" : "🎉"}</p>
            <h3 className="text-lg font-bold text-foreground">
              {editingInscricaoId ? "Inscrição atualizada!" : "Inscrição confirmada!"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {editingInscricaoId
                ? <>Sua inscrição em <strong>{activeMission.titulo}</strong> foi atualizada.</>
                : <>Você está inscrito em <strong>{activeMission.titulo}</strong>.</>
              }
            </p>
            <div className="space-y-2 pt-2">
              {!editingInscricaoId && (
                <Button className="w-full" variant="default" onClick={() => { navigate("/loja"); handleClose(); }}>
                  <ShoppingBag size={16} className="mr-2" /> Comprar Kit Missionário
                </Button>
              )}
              <Button className="w-full" variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingInscricaoId ? "✏️" : "📋"} {activeMission.titulo}
              </DialogTitle>
              <DialogDescription className="text-sm">
                <span className="font-semibold text-primary">
                  {availableDates.map(getDateLabel).join(" · ")}
                </span>
                {activeMission.valor != null && activeMission.valor > 0 && (
                  <span className="block mt-1 font-semibold text-primary">💰 Valor: R$ {Number(activeMission.valor).toFixed(2)}</span>
                )}
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
                <Label htmlFor="mission-email">E-mail</Label>
                <Input id="mission-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <Label htmlFor="mission-tel">Telefone</Label>
                <Input id="mission-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>

              {/* Date selection */}
              {availableDates.length > 1 && (
                <div className="space-y-2">
                  <Label>Datas que pretende participar *</Label>
                  {availableDates.map(d => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={datasEscolhidas.includes(d)}
                        onCheckedChange={() => toggleDateChoice(d)}
                      />
                      {getDateLabel(d)}
                    </label>
                  ))}
                </div>
              )}

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
                        <Input value={a.nome} onChange={(e) => updateAcompanhante(i, "nome", e.target.value)} placeholder="Nome do acompanhante" className="h-9 text-sm" />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs">Idade</Label>
                        <Input value={a.idade} onChange={(e) => updateAcompanhante(i, "idade", e.target.value)} placeholder="Ex: 8" className="h-9 text-sm" />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => removeAcompanhante(i)}>
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
                {submitting ? "Salvando..." : editingInscricaoId ? "Atualizar Inscrição" : "Confirmar Inscrição"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { MissionSignupPopup };
export default MissionSignupPopup;
