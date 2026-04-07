import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/excel";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  datas: string[];
  descricao: string | null;
  valor: number | null;
  ativa: boolean;
  created_at: string;
}

interface AcompanhanteDetalhe {
  nome: string;
  idade: string;
}

interface Inscricao {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  acompanhantes: number;
  acompanhantes_detalhes: unknown[] | null;
  datas_escolhidas: string[];
  observacoes: string | null;
  created_at: string;
}

const ManageMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [titulo, setTitulo] = useState("");
  const [datas, setDatas] = useState<string[]>([""]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);

  const fetchMissions = async () => {
    const { data: m } = await supabase
      .from("missoes")
      .select("*")
      .order("data", { ascending: false });
    if (m) setMissions(m as unknown as Mission[]);
  };

  useEffect(() => { fetchMissions(); }, []);

  const addDateField = () => setDatas(prev => [...prev, ""]);
  const removeDateField = (idx: number) => setDatas(prev => prev.filter((_, i) => i !== idx));
  const updateDate = (idx: number, val: string) => setDatas(prev => prev.map((d, i) => i === idx ? val : d));

  const handleSave = async () => {
    const validDates = datas.filter(d => d.trim());
    if (!titulo.trim() || validDates.length === 0) return;

    const sortedDates = [...validDates].sort();
    const primaryDate = sortedDates[0];
    const valorNum = valor.trim() ? parseFloat(valor) : null;

    if (editingId) {
      const { error } = await supabase.from("missoes").update({
        titulo: titulo.trim(),
        data: primaryDate,
        datas: sortedDates,
        descricao: descricao.trim() || null,
        valor: valorNum,
      } as any).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Missão atualizada!");
    } else {
      const { error } = await supabase.from("missoes").insert({
        titulo: titulo.trim(),
        data: primaryDate,
        datas: sortedDates,
        descricao: descricao.trim() || null,
        valor: valorNum,
        created_by: user?.id,
      } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Missão criada!");
    }

    resetForm();
    fetchMissions();
  };

  const resetForm = () => {
    setTitulo("");
    setDatas([""]);
    setDescricao("");
    setValor("");
    setEditingId(null);
  };

  const toggleAtiva = async (id: string, ativa: boolean) => {
    await supabase.from("missoes").update({ ativa: !ativa }).eq("id", id);
    fetchMissions();
  };

  const deleteMission = async (id: string) => {
    if (!confirm("Excluir esta missão e todas as inscrições?")) return;
    await supabase.from("missoes").delete().eq("id", id);
    fetchMissions();
    toast.success("Missão excluída");
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingInscritos(true);
    const { data: insc } = await supabase
      .from("missao_inscricoes")
      .select("id, nome, email, telefone, acompanhantes, acompanhantes_detalhes, datas_escolhidas, observacoes, created_at")
      .eq("missao_id", id)
      .order("created_at", { ascending: true });
    setInscricoes((insc || []) as unknown as Inscricao[]);
    setLoadingInscritos(false);
  };

  const formatDateBR = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

  const buildExportData = () => {
    if (!inscricoes.length) return [];
    const maxAcomp = inscricoes.reduce((max, i) => {
      const det = Array.isArray(i.acompanhantes_detalhes) ? i.acompanhantes_detalhes.length : 0;
      return Math.max(max, det);
    }, 0);

    return inscricoes.map(i => {
      const row: Record<string, string | number> = {
        "Nome": i.nome,
        "E-mail": i.email || "",
        "Telefone": i.telefone || "",
        "Datas Escolhidas": Array.isArray(i.datas_escolhidas) ? i.datas_escolhidas.map(formatDateBR).join(", ") : "",
      };
      const detalhes = Array.isArray(i.acompanhantes_detalhes) ? i.acompanhantes_detalhes as AcompanhanteDetalhe[] : [];
      for (let idx = 0; idx < maxAcomp; idx++) {
        const a = detalhes[idx];
        row[`Acompanhante ${idx + 1} - Nome`] = a?.nome || "";
        row[`Acompanhante ${idx + 1} - Idade`] = a?.idade || "";
      }
      row["Observações"] = i.observacoes || "";
      row["Data Inscrição"] = new Date(i.created_at).toLocaleDateString("pt-BR");
      return row;
    });
  };

  const missionFileName = () => {
    const mission = missions.find(m => m.id === expandedId);
    return `inscritos-${mission?.titulo || "missao"}`;
  };

  const handleExportCSV = () => {
    const data = buildExportData();
    if (!data.length) return;
    exportToCsv(data, `${missionFileName()}.csv`);
  };

  const handleExportExcel = async () => {
    const data = buildExportData();
    if (!data.length) return;
    await exportToExcel(data, "Inscritos", `${missionFileName()}.xlsx`);
  };

  const startEdit = (m: Mission) => {
    setEditingId(m.id);
    setTitulo(m.titulo);
    setDatas(m.datas?.length ? [...m.datas] : [m.data]);
    setDescricao(m.descricao || "");
    setValor(m.valor != null ? String(m.valor) : "");
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Editar Missão" : "Nova Missão"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Missão Jardim das Flores" />
          </div>

          {/* Multiple dates */}
          <div className="space-y-2">
            <Label>Datas da Missão *</Label>
            {datas.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="date" value={d} onChange={e => updateDate(i, e.target.value)} className="flex-1" />
                {datas.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeDateField(i)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDateField}>
              <Plus size={14} className="mr-1" /> Adicionar data
            </Button>
          </div>

          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 50.00 (deixe vazio se gratuito)"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da missão (suporta parágrafos e emojis)..." rows={3} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!titulo.trim() || !datas.some(d => d.trim())}>
              <Plus size={16} className="mr-1" /> {editingId ? "Salvar" : "Criar"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {missions.map(m => {
          const isExpanded = expandedId === m.id;
          const allDates = m.datas?.length ? m.datas : [m.data];
          const datesStr = allDates.map(formatDateBR).join(", ");
          return (
            <Card key={m.id} className={!m.ativa ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate cursor-pointer hover:underline" onClick={() => startEdit(m)}>
                      {m.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">📅 {datesStr}</p>
                    {m.valor != null && m.valor > 0 && (
                      <p className="text-xs font-medium text-primary">💰 R$ {Number(m.valor).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={m.ativa} onCheckedChange={() => toggleAtiva(m.id, m.ativa)} />
                    <Button size="icon" variant="ghost" onClick={() => deleteMission(m.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="w-full justify-between text-xs" onClick={() => toggleExpand(m.id)}>
                  Ver inscritos
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>

                {isExpanded && (
                  <div className="pt-2 border-t space-y-2">
                    {loadingInscritos ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
                    ) : inscricoes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhuma inscrição ainda.</p>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-semibold">{inscricoes.length} inscrito(s) · {inscricoes.reduce((s, i) => s + i.acompanhantes, 0)} acompanhante(s)</p>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={handleExportCSV}>
                              <Download size={14} className="mr-1" /> CSV
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleExportExcel}>
                              <FileSpreadsheet size={14} className="mr-1" /> Excel
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {inscricoes.map(i => (
                            <div key={i.id} className="text-xs bg-muted/50 rounded-lg p-2">
                              <p className="font-medium">{i.nome}</p>
                              {i.email && <p className="text-muted-foreground">✉️ {i.email}</p>}
                              {i.telefone && <p className="text-muted-foreground">📞 {i.telefone}</p>}
                              {Array.isArray(i.datas_escolhidas) && i.datas_escolhidas.length > 0 && (
                                <p className="text-muted-foreground">📅 {i.datas_escolhidas.map(formatDateBR).join(", ")}</p>
                              )}
                              {i.acompanhantes > 0 && Array.isArray(i.acompanhantes_detalhes) && i.acompanhantes_detalhes.length > 0 ? (
                                <div className="mt-1">
                                  <p className="text-muted-foreground font-medium">👥 {i.acompanhantes} acompanhante(s):</p>
                                  <ul className="ml-4 list-disc">
                                    {(i.acompanhantes_detalhes as AcompanhanteDetalhe[]).map((a, idx) => (
                                      <li key={idx} className="text-muted-foreground">{a.nome}{a.idade ? ` (${a.idade} anos)` : ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : i.acompanhantes > 0 ? (
                                <p className="text-muted-foreground">👥 {i.acompanhantes} acompanhante(s)</p>
                              ) : null}
                              {i.observacoes && <p className="text-muted-foreground italic">"{i.observacoes}"</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ManageMissions;
