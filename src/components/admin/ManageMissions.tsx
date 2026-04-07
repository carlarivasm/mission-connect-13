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
import { Plus, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
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
  telefone: string | null;
  acompanhantes: number;
  acompanhantes_detalhes: unknown[] | null;
  observacoes: string | null;
  created_at: string;
}

const ManageMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);

  const fetchMissions = async () => {
    const { data: m } = await supabase
      .from("missoes")
      .select("*")
      .order("data", { ascending: false });
    if (m) setMissions(m);
  };

  useEffect(() => { fetchMissions(); }, []);

  const handleSave = async () => {
    if (!titulo.trim() || !data) return;

    if (editingId) {
      const { error } = await supabase.from("missoes").update({
        titulo: titulo.trim(),
        data,
        descricao: descricao.trim() || null,
      }).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Missão atualizada!");
    } else {
      const { error } = await supabase.from("missoes").insert({
        titulo: titulo.trim(),
        data,
        descricao: descricao.trim() || null,
        created_by: user?.id,
      });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Missão criada!");
    }

    setTitulo(""); setData(""); setDescricao(""); setEditingId(null);
    fetchMissions();
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
      .select("id, nome, telefone, acompanhantes, acompanhantes_detalhes, observacoes, created_at")
      .eq("missao_id", id)
      .order("created_at", { ascending: true });
    setInscricoes(insc || []);
    setLoadingInscritos(false);
  };

  const exportCSV = () => {
    if (!inscricoes.length) return;
    const mission = missions.find(m => m.id === expandedId);
    const header = "Nome,Telefone,Acompanhantes,Observações,Data Inscrição";
    const rows = inscricoes.map(i =>
      `"${i.nome}","${i.telefone || ""}",${i.acompanhantes},"${(i.observacoes || "").replace(/"/g, '""')}","${new Date(i.created_at).toLocaleDateString("pt-BR")}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscritos-${mission?.titulo || "missao"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (m: Mission) => {
    setEditingId(m.id);
    setTitulo(m.titulo);
    setData(m.data);
    setDescricao(m.descricao || "");
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
          <div>
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da missão..." rows={3} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!titulo.trim() || !data}>
              <Plus size={16} className="mr-1" /> {editingId ? "Salvar" : "Criar"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); setTitulo(""); setData(""); setDescricao(""); }}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {missions.map(m => {
          const isExpanded = expandedId === m.id;
          const formattedDate = new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR");
          return (
            <Card key={m.id} className={!m.ativa ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate cursor-pointer hover:underline" onClick={() => startEdit(m)}>
                      {m.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{formattedDate}</p>
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
                          <Button size="sm" variant="outline" onClick={exportCSV}>
                            <Download size={14} className="mr-1" /> CSV
                          </Button>
                        </div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {inscricoes.map(i => (
                            <div key={i.id} className="text-xs bg-muted/50 rounded-lg p-2">
                              <p className="font-medium">{i.nome}</p>
                              {i.telefone && <p className="text-muted-foreground">📞 {i.telefone}</p>}
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
