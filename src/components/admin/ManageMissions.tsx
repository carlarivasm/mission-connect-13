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
import { Plus, Trash2, ChevronDown, ChevronUp, Download, FileSpreadsheet, Pencil, Bell } from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/excel";

interface Mission {
  id: string;
  titulo: string;
  data: string;
  datas: string[];
  datas_titulos: string[];
  descricao: string | null;
  valor: number | null;
  ativa: boolean;
  created_at: string;
  pix_key: string | null;
  pix_qr_url: string | null;
  idade_gratuito: number | null;
  idade_meia: number | null;
  whatsapp_responsavel: string | null;
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
  pago: boolean | null;
  valor_total: number | null;
  comprovante_url: string | null;
}

interface DateEntry {
  date: string;
  title: string;
}

const ManageMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [titulo, setTitulo] = useState("");
  const [dateEntries, setDateEntries] = useState<DateEntry[]>([{ date: "", title: "" }]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixQrUrl, setPixQrUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [idadeGratuito, setIdadeGratuito] = useState("");
  const [idadeMeia, setIdadeMeia] = useState("");
  const [whatsappResponsavel, setWhatsappResponsavel] = useState("");
  const [notifyPush, setNotifyPush] = useState(false);
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

  const addDateEntry = () => setDateEntries(prev => [...prev, { date: "", title: "" }]);
  const removeDateEntry = (idx: number) => setDateEntries(prev => prev.filter((_, i) => i !== idx));
  const updateDateEntry = (idx: number, field: keyof DateEntry, val: string) =>
    setDateEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const sendPushNotification = async (missionTitle: string, datesStr: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.functions.invoke("send-push-notification", {
        body: {
          title: "🚀 Nova Missão Disponível!",
          body: `${missionTitle} — ${datesStr}. Inscreva-se agora!`,
          link: "/dashboard",
        },
      });
      const { data: profiles } = await supabase.from("profiles").select("id");
      if (profiles?.length) {
        const notifications = profiles.map(p => ({
          user_id: p.id,
          title: "🚀 Nova Missão Disponível!",
          message: `${missionTitle} — ${datesStr}. Inscreva-se agora!`,
          type: "mission",
          data: {} as import("@/integrations/supabase/types").Json,
        }));
        await supabase.from("notifications").insert(notifications as any);
      }
    } catch (err) {
      console.error("Push error:", err);
    }
  };

  const handleSave = async () => {
    const validEntries = dateEntries.filter(e => e.date.trim());
    if (!titulo.trim() || validEntries.length === 0) return;

    const sorted = [...validEntries].sort((a, b) => a.date.localeCompare(b.date));
    const sortedDates = sorted.map(e => e.date);
    const sortedTitles = sorted.map(e => e.title.trim());
    const primaryDate = sortedDates[0];
    const valorNum = valor.trim() ? parseFloat(valor) : null;

    const formatDateBRShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
    const datesStr = sortedDates.map(formatDateBRShort).join(", ");

    const payload = {
      titulo: titulo.trim(),
      data: primaryDate,
      datas: sortedDates,
      datas_titulos: sortedTitles,
      descricao: descricao.trim() || null,
      valor: valorNum,
      pix_key: pixKey.trim() || null,
      pix_qr_url: pixQrUrl.trim() || null,
      idade_gratuito: idadeGratuito.trim() ? parseInt(idadeGratuito) : 0,
      idade_meia: idadeMeia.trim() ? parseInt(idadeMeia) : 0,
      whatsapp_responsavel: whatsappResponsavel.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("missoes").update(payload as any).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Missão atualizada!");
    } else {
      const { error } = await supabase.from("missoes").insert({
        ...payload,
        created_by: user?.id,
      } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Missão criada!");
      if (notifyPush) {
        toast.info("Enviando notificação push...");
        await sendPushNotification(titulo.trim(), datesStr);
        toast.success("Notificação enviada! 🔔");
      }
    }

    resetForm();
    fetchMissions();
  };

  const resetForm = () => {
    setTitulo("");
    setDateEntries([{ date: "", title: "" }]);
    setDescricao("");
    setValor("");
    setPixKey("");
    setPixQrUrl("");
    setIdadeGratuito("");
    setIdadeMeia("");
    setWhatsappResponsavel("");
    setNotifyPush(false);
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
      .select("id, nome, email, telefone, acompanhantes, acompanhantes_detalhes, datas_escolhidas, observacoes, created_at, pago, valor_total, comprovante_url")
      .eq("missao_id", id)
      .order("created_at", { ascending: true });
    setInscricoes((insc || []) as unknown as Inscricao[]);
    setLoadingInscritos(false);
  };

  const deleteInscricao = async (inscricaoId: string, missaoId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta inscrição?")) return;
    const { error } = await supabase.from("missao_inscricoes").delete().eq("id", inscricaoId);
    if (error) { toast.error("Erro ao excluir inscrição"); return; }
    toast.success("Inscrição excluída");
    setInscricoes(prev => prev.filter(i => i.id !== inscricaoId));
  };

  const formatDateBR = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

  const getDateLabel = (m: Mission, dateStr: string) => {
    const allDates = m.datas?.length ? m.datas : [m.data];
    const idx = allDates.indexOf(dateStr);
    const title = m.datas_titulos?.[idx];
    return title ? `${formatDateBR(dateStr)} — ${title}` : formatDateBR(dateStr);
  };

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
      row["Valor Total"] = i.valor_total != null ? `R$ ${Number(i.valor_total).toFixed(2)}` : "";
      row["Pago"] = i.pago ? "Sim" : "Não";
      row["Comprovante"] = i.comprovante_url || "";
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
    const allDates = m.datas?.length ? m.datas : [m.data];
    const titles = m.datas_titulos || [];
    setDateEntries(allDates.map((d, i) => ({ date: d, title: titles[i] || "" })));
    setDescricao(m.descricao || "");
    setValor(m.valor != null ? String(m.valor) : "");
    setPixKey(m.pix_key || "");
    setPixQrUrl(m.pix_qr_url || "");
    setIdadeGratuito(m.idade_gratuito ? String(m.idade_gratuito) : "");
    setIdadeMeia(m.idade_meia ? String(m.idade_meia) : "");
    setWhatsappResponsavel(m.whatsapp_responsavel || "");
    setNotifyPush(false);
  };

  const showPaymentFields = valor.trim() && parseFloat(valor) > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Editar Missão" : "Nova Missão"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Missão Jardim das Flores" />
          </div>

          <div className="space-y-2">
            <Label>Datas da Missão *</Label>
            {dateEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={entry.date}
                  onChange={e => updateDateEntry(i, "date", e.target.value)}
                  className="w-[160px]"
                />
                <Input
                  value={entry.title}
                  onChange={e => updateDateEntry(i, "title", e.target.value)}
                  placeholder="Título da data (opcional)"
                  className="flex-1"
                />
                {dateEntries.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeDateEntry(i)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDateEntry}>
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

          {/* Payment config - shown when valor > 0 */}
          {showPaymentFields && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">💳 Configuração de Pagamento</p>
              
              <div>
                <Label className="text-sm">Chave PIX</Label>
                <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
              <div>
                <Label className="text-sm">Imagem QR Code PIX</Label>
                {pixQrUrl && (
                  <img src={pixQrUrl} alt="QR Code" className="max-w-[120px] rounded border mb-2" />
                )}
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  disabled={uploadingQr}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 5MB)."); return; }
                    setUploadingQr(true);
                    const ext = file.name.split(".").pop();
                    const path = `qr-codes/${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from("payment_receipts").upload(path, file, { upsert: true });
                    if (error) { toast.error("Erro ao enviar imagem."); setUploadingQr(false); return; }
                    const { data: urlData } = supabase.storage.from("payment_receipts").getPublicUrl(path);
                    setPixQrUrl(urlData.publicUrl);
                    setUploadingQr(false);
                    toast.success("QR Code enviado!");
                  }}
                  className="text-sm"
                />
                {uploadingQr && <p className="text-xs text-muted-foreground">Enviando...</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Idade gratuito (até)</Label>
                  <Input type="number" min="0" value={idadeGratuito} onChange={e => setIdadeGratuito(e.target.value)} placeholder="Ex: 5" />
                </div>
                <div>
                  <Label className="text-sm">Idade meia (até)</Label>
                  <Input type="number" min="0" value={idadeMeia} onChange={e => setIdadeMeia(e.target.value)} placeholder="Ex: 12" />
                </div>
              </div>

              <div>
                <Label className="text-sm">WhatsApp do responsável</Label>
                <Input value={whatsappResponsavel} onChange={e => setWhatsappResponsavel(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da missão (suporta parágrafos e emojis)..." rows={3} />
          </div>

          {!editingId && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <div>
                  <Label className="text-sm font-medium">Notificar por push</Label>
                  <p className="text-xs text-muted-foreground">Enviar notificação para todos os missionários</p>
                </div>
              </div>
              <Switch checked={notifyPush} onCheckedChange={setNotifyPush} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!titulo.trim() || !dateEntries.some(e => e.date.trim())}>
              {editingId ? (
                <><Pencil size={16} className="mr-1" /> Salvar</>
              ) : (
                <><Plus size={16} className="mr-1" /> Criar</>
              )}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {missions.map(m => {
          const isExpanded = expandedId === m.id;
          const allDates = m.datas?.length ? m.datas : [m.data];
          const datesDisplay = allDates.map((d, i) => {
            const t = m.datas_titulos?.[i];
            return t ? `${formatDateBR(d)} — ${t}` : formatDateBR(d);
          }).join(", ");
          return (
            <Card key={m.id} className={!m.ativa ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">📅 {datesDisplay}</p>
                    {m.valor != null && m.valor > 0 && (
                      <p className="text-xs font-medium text-primary">💰 R$ {Number(m.valor).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(m)} title="Editar">
                      <Pencil size={14} />
                    </Button>
                    <Switch checked={m.ativa} onCheckedChange={() => toggleAtiva(m.id, m.ativa)} />
                    <Button size="icon" variant="ghost" onClick={() => deleteMission(m.id)}>
                      <Trash2 size={14} className="text-destructive" />
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
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium">{i.nome}</p>
                                <div className="flex items-center gap-1.5">
                                  {m.valor != null && m.valor > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${i.pago ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                                      {i.pago ? "✅ Pago" : "⏳ Pendente"}
                                    </span>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteInscricao(i.id, m.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              {i.email && <p className="text-muted-foreground">✉️ {i.email}</p>}
                              {i.telefone && <p className="text-muted-foreground">📞 {i.telefone}</p>}
                              {Array.isArray(i.datas_escolhidas) && i.datas_escolhidas.length > 0 && (
                                <p className="text-muted-foreground">📅 {i.datas_escolhidas.map(d => getDateLabel(m, d)).join(", ")}</p>
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
                              {i.valor_total != null && i.valor_total > 0 && (
                                <p className="text-muted-foreground">💰 R$ {Number(i.valor_total).toFixed(2)}</p>
                              )}
                              {i.comprovante_url && (
                                <a href={i.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">📎 Ver comprovante</a>
                              )}
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
