import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ClipboardList, ChevronDown, ChevronUp, Eye, Download, Pencil } from "lucide-react";
import { exportToExcel } from "@/lib/excel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

interface QuestionDraft {
  text: string;
  type: "multiple_choice" | "open_ended" | "scale";
  options: string[];
}

interface ResponseRow {
  question_text: string;
  question_type: string;
  option_text: string;
  response_text: string | null;
  user_id: string;
  user_email: string;
}

const ManageSurveys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit form
  const [showCreate, setShowCreate] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ text: "", type: "multiple_choice", options: ["", ""] }]);
  const [submitting, setSubmitting] = useState(false);

  // Confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Results
  const [resultsFor, setResultsFor] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchSurveys = async () => {
    const { data } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSurveys(data as Survey[]);
    setLoading(false);
  };

  useEffect(() => { fetchSurveys(); }, []);

  const addQuestion = () => setQuestions([...questions, { text: "", type: "multiple_choice", options: ["", ""] }]);

  const removeQuestion = (qi: number) => setQuestions(questions.filter((_, i) => i !== qi));

  const updateQuestionText = (qi: number, text: string) => {
    const updated = [...questions];
    updated[qi].text = text;
    setQuestions(updated);
  };

  const addOption = (qi: number) => {
    const updated = [...questions];
    updated[qi].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qi: number, oi: number) => {
    const updated = [...questions];
    updated[qi].options = updated[qi].options.filter((_, i) => i !== oi);
    setQuestions(updated);
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    const updated = [...questions];
    updated[qi].options[oi] = value;
    setQuestions(updated);
  };

  const startEdit = async (survey: Survey) => {
    setEditingSurveyId(survey.id);
    setTitle(survey.title);
    setDescription(survey.description || "");

    const { data: qs } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type, sort_order")
      .eq("survey_id", survey.id)
      .order("sort_order");

    if (qs && qs.length > 0) {
      const drafts: QuestionDraft[] = [];
      for (const q of qs) {
        let options: string[] = ["", ""];
        if (q.question_type === "multiple_choice") {
          const { data: opts } = await supabase
            .from("survey_options")
            .select("option_text")
            .eq("question_id", q.id)
            .order("sort_order");
          if (opts && opts.length > 0) options = opts.map((o: any) => o.option_text);
        }
        drafts.push({ text: q.question_text, type: q.question_type as QuestionDraft["type"], options });
      }
      setQuestions(drafts);
    } else {
      setQuestions([{ text: "", type: "multiple_choice", options: ["", ""] }]);
    }

    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const validQuestions = questions.filter(
      (q) => q.text.trim() && (q.type === "open_ended" || q.type === "scale" || q.options.filter((o) => o.trim()).length >= 2)
    );
    if (validQuestions.length === 0) {
      toast({ title: "Erro", description: "Adicione ao menos uma pergunta com 2 opções.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let surveyId = editingSurveyId;

      if (editingSurveyId) {
        // Update survey metadata
        const { error: surveyErr } = await supabase
          .from("surveys")
          .update({ title: title.trim(), description: description.trim() || null } as any)
          .eq("id", editingSurveyId);
        if (surveyErr) throw surveyErr;

        // Delete old questions (cascade deletes options via FK)
        await supabase.from("survey_questions").delete().eq("survey_id", editingSurveyId);
      } else {
        // Create new survey
        const { data: survey, error: surveyErr } = await supabase
          .from("surveys")
          .insert({ title: title.trim(), description: description.trim() || null, created_by: user?.id } as any)
          .select("id")
          .single();
        if (surveyErr || !survey) throw surveyErr;
        surveyId = survey.id;
      }

      // Insert questions
      for (let qi = 0; qi < validQuestions.length; qi++) {
        const q = validQuestions[qi];
        const { data: question, error: qErr } = await supabase
          .from("survey_questions")
          .insert({ survey_id: surveyId, question_text: q.text.trim(), sort_order: qi, question_type: q.type } as any)
          .select("id")
          .single();

        if (qErr || !question) throw qErr;

        if (q.type === "multiple_choice") {
          const optionsToInsert = q.options
            .filter((o) => o.trim())
            .map((o, oi) => ({ question_id: question.id, option_text: o.trim(), sort_order: oi }));

          const { error: oErr } = await supabase.from("survey_options").insert(optionsToInsert as any);
          if (oErr) throw oErr;
        }
      }

      toast({
        title: editingSurveyId ? "Pesquisa atualizada!" : "Pesquisa criada!",
        description: `"${title}" ${editingSurveyId ? "foi atualizada" : "está disponível para os missionários"}.`,
      });
      resetForm();
      fetchSurveys();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Erro ao salvar pesquisa.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingSurveyId(null);
    setTitle("");
    setDescription("");
    setQuestions([{ text: "", type: "multiple_choice", options: ["", ""] }]);
  };

  const toggleActive = async (survey: Survey) => {
    await supabase.from("surveys").update({ active: !survey.active } as any).eq("id", survey.id);
    fetchSurveys();
  };

  const deleteSurvey = async (id: string) => {
    await supabase.from("surveys").delete().eq("id", id);
    setDeleteConfirm(null);
    fetchSurveys();
  };

  const viewResults = async (survey: Survey) => {
    setResultsFor(survey);
    setLoadingResults(true);

    const { data: qs } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type")
      .eq("survey_id", survey.id)
      .order("sort_order");

    const { data: opts } = await supabase
      .from("survey_options")
      .select("id, question_id, option_text");

    const { data: resps } = await supabase
      .from("survey_responses")
      .select("question_id, option_id, user_id, response_text")
      .eq("survey_id", survey.id);

    if (qs && opts && resps) {
      const rows: ResponseRow[] = resps.map((r: any) => {
        const q = qs.find((q: any) => q.id === r.question_id);
        const o = opts.find((o: any) => o.id === r.option_id);
        return {
          question_text: q?.question_text || "",
          question_type: (q as any)?.question_type || "multiple_choice",
          option_text: o?.option_text || "",
          response_text: r.response_text || null,
          user_id: r.user_id,
          user_email: r.user_id,
        };
      });
      setResponses(rows);
    }
    setLoadingResults(false);
  };

  // Group responses by question for display
  const groupedResponses = () => {
    const mcMap: Record<string, { option: string; count: number }[]> = {};
    const openMap: Record<string, string[]> = {};
    responses.forEach((r) => {
      if (r.question_type === "open_ended") {
        if (!openMap[r.question_text]) openMap[r.question_text] = [];
        if (r.response_text) openMap[r.question_text].push(r.response_text);
      } else if (r.question_type === "scale") {
        if (!mcMap[r.question_text]) mcMap[r.question_text] = [];
        const label = r.response_text || "?";
        const existing = mcMap[r.question_text].find((x) => x.option === label);
        if (existing) existing.count++;
        else mcMap[r.question_text].push({ option: label, count: 1 });
      } else {
        if (!mcMap[r.question_text]) mcMap[r.question_text] = [];
        const existing = mcMap[r.question_text].find((x) => x.option === r.option_text);
        if (existing) existing.count++;
        else mcMap[r.question_text].push({ option: r.option_text, count: 1 });
      }
    });
    return { mcMap, openMap };
  };

  const totalRespondents = new Set(responses.map((r) => r.user_id)).size;

  const exportResults = () => {
    if (!resultsFor || responses.length === 0) return;
    const { mcMap, openMap } = groupedResponses();
    const rows: Record<string, string | number>[] = [];

    Object.entries(mcMap).forEach(([question, options]) => {
      options.forEach((opt) => {
        rows.push({ Pergunta: question, Tipo: "Escolha/Escala", Resposta: opt.option, Quantidade: opt.count });
      });
    });

    Object.entries(openMap).forEach(([question, texts]) => {
      texts.forEach((t) => {
        rows.push({ Pergunta: question, Tipo: "Aberta", Resposta: t, Quantidade: 1 });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, `${resultsFor.title.replace(/[^a-zA-Z0-9]/g, "_")}_resultados.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ClipboardList size={18} /> Pesquisas
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gradient-mission text-primary-foreground gap-1">
          <Plus size={14} /> Nova Pesquisa
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurveyId ? "Editar Pesquisa" : "Criar Pesquisa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Avaliação da última missão" />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." rows={2} />
            </div>

            <div className="space-y-4">
              <Label>Perguntas</Label>
              {questions.map((q, qi) => (
                <div key={qi} className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-bold">{qi + 1}.</span>
                    <Input
                      value={q.text}
                      onChange={(e) => updateQuestionText(qi, e.target.value)}
                      placeholder="Texto da pergunta"
                      className="flex-1"
                    />
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="pl-5">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { const u = [...questions]; u[qi].type = "multiple_choice"; setQuestions(u); }}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${q.type === "multiple_choice" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        Múltipla escolha
                      </button>
                      <button
                        type="button"
                        onClick={() => { const u = [...questions]; u[qi].type = "open_ended"; setQuestions(u); }}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${q.type === "open_ended" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        Aberta
                      </button>
                      <button
                        type="button"
                        onClick={() => { const u = [...questions]; u[qi].type = "scale"; setQuestions(u); }}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${q.type === "scale" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        Escala 1-5
                      </button>
                    </div>
                    {q.type === "multiple_choice" ? (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Opção ${oi + 1}`}
                              className="flex-1 h-8 text-sm"
                            />
                            {q.options.length > 2 && (
                              <button onClick={() => removeOption(qi, oi)} className="p-0.5 text-destructive/70 hover:text-destructive">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addOption(qi)} className="text-xs text-primary hover:underline ml-5">
                          + Adicionar opção
                        </button>
                      </div>
                    ) : q.type === "scale" ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">{n}</div>
                        ))}
                        <span className="text-xs text-muted-foreground ml-2 italic">Pré-visualização</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">O missionário poderá escrever uma resposta livre.</p>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                <Plus size={14} /> Adicionar Pergunta
              </Button>
            </div>

            <Button
              onClick={() => editingSurveyId ? setShowSaveConfirm(true) : handleSave()}
              disabled={submitting}
              className="w-full gradient-mission text-primary-foreground"
            >
              {submitting ? "Salvando..." : editingSurveyId ? "Salvar Alterações" : "Criar Pesquisa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results dialog */}
      <Dialog open={!!resultsFor} onOpenChange={(open) => { if (!open) setResultsFor(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados: {resultsFor?.title}</DialogTitle>
          </DialogHeader>
          {loadingResults ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : responses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta ainda.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{totalRespondents} respondente(s)</p>
                <Button size="sm" variant="outline" onClick={exportResults} className="gap-1">
                  <Download size={14} /> Exportar Excel
                </Button>
              </div>
              {(() => {
                const { mcMap, openMap } = groupedResponses();
                return (
                  <>
                    {Object.entries(mcMap).map(([question, options]) => (
                      <div key={question} className="space-y-2">
                        <p className="font-medium text-sm text-foreground">{question}</p>
                        {options.map((opt) => (
                          <div key={opt.option} className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                              <div
                                className="h-full gradient-mission rounded-full flex items-center px-2"
                                style={{ width: `${Math.max(10, (opt.count / totalRespondents) * 100)}%` }}
                              >
                                <span className="text-[10px] text-primary-foreground font-bold whitespace-nowrap">{opt.count}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-28 truncate">{opt.option}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {Object.entries(openMap).map(([question, texts]) => (
                      <div key={question} className="space-y-2">
                        <p className="font-medium text-sm text-foreground">{question} <span className="text-xs text-muted-foreground">(aberta)</span></p>
                        {texts.map((t, i) => (
                          <p key={i} className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">"{t}"</p>
                        ))}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Survey list */}
      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
      ) : surveys.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">Nenhuma pesquisa criada.</p>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div key={s.id} className="p-3 bg-card rounded-xl shadow-card flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("pt-BR")} • {s.active ? "Ativa" : "Inativa"}
                </p>
              </div>
              <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors" title="Editar">
                <Pencil size={16} />
              </button>
              <button onClick={() => viewResults(s)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Ver resultados">
                <Eye size={16} />
              </button>
              <button onClick={() => toggleActive(s)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors" title={s.active ? "Desativar" : "Ativar"}>
                {s.active ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as perguntas e respostas serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && deleteSurvey(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save edit confirmation */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As perguntas anteriores serão substituídas pelas novas. Respostas já registradas serão mantidas, mas podem ficar desvinculadas das novas perguntas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowSaveConfirm(false); handleSave(); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageSurveys;
