import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, Save, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  end_message?: string | null;
  is_anonymous?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  sort_order: number;
  next_question_id: string | null;
  ends_survey: boolean;
}

interface DraftData {
  answers: Record<string, string>;
  textAnswers: Record<string, string>;
  currentStep: number;
  questionPath: number[];
}

const Pesquisas = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [draftSurveyIds, setDraftSurveyIds] = useState<Set<string>>(new Set());
  usePageTracking("pesquisas");

  // Active survey
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Step-by-step navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [questionPath, setQuestionPath] = useState<number[]>([0]);
  const [surveyEnded, setSurveyEnded] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: surveyData } = await supabase
        .from("surveys")
        .select("id, title, description, end_message, is_anonymous")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (surveyData) setSurveys(surveyData as Survey[]);

      if (user) {
        const [{ data: respData }, { data: draftData }] = await Promise.all([
          supabase.from("survey_responses").select("survey_id").eq("user_id", user.id),
          supabase.from("survey_drafts").select("survey_id").eq("user_id", user.id),
        ]);
        if (respData) {
          setAnsweredIds(new Set(respData.map((r: any) => r.survey_id)));
        }
        if (draftData) {
          setDraftSurveyIds(new Set(draftData.map((d: any) => d.survey_id)));
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const openSurvey = async (survey: Survey) => {
    setActiveSurvey(survey);
    setAnswers({});
    setTextAnswers({});
    setCurrentStep(0);
    setQuestionPath([0]);
    setSurveyEnded(false);

    const { data: qs } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", survey.id)
      .order("sort_order");

    let loadedOptions: Option[] = [];
    if (qs) {
      setQuestions(qs as Question[]);
      const qIds = qs.map((q: any) => q.id);
      if (qIds.length > 0) {
        const { data: opts } = await supabase
          .from("survey_options")
          .select("*")
          .in("question_id", qIds)
          .order("sort_order");
        if (opts) {
          loadedOptions = opts as Option[];
          setOptions(loadedOptions);
        }
      }
    }

    // Try to load draft
    if (user) {
      const { data: draft } = await supabase
        .from("survey_drafts")
        .select("answers, current_step, question_path")
        .eq("survey_id", survey.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (draft) {
        const draftAnswers = (draft.answers as any) || {};
        setAnswers(draftAnswers.answers || {});
        setTextAnswers(draftAnswers.textAnswers || {});
        setCurrentStep(draft.current_step || 0);
        setQuestionPath((draft.question_path as number[]) || [0]);
        toast({ title: "Rascunho recuperado", description: "Continuando de onde você parou." });
      }
    }
  };

  const currentQuestionIndex = questionPath[currentStep] ?? 0;
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  const isCurrentAnswered = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.question_type === "open_ended") return !!textAnswers[currentQuestion.id]?.trim();
    return !!answers[currentQuestion.id];
  };

  const getNextQuestionIndex = (): { nextIndex: number; endsNow: boolean } => {
    if (!currentQuestion) return { nextIndex: -1, endsNow: true };

    if (currentQuestion.question_type === "multiple_choice") {
      const selectedOptionId = answers[currentQuestion.id];
      const selectedOption = options.find(o => o.id === selectedOptionId);
      if (selectedOption) {
        if (selectedOption.ends_survey) return { nextIndex: -1, endsNow: true };
        if (selectedOption.next_question_id) {
          const targetIdx = questions.findIndex(q => q.id === selectedOption.next_question_id);
          if (targetIdx !== -1) return { nextIndex: targetIdx, endsNow: false };
        }
      }
    }

    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx >= questions.length) return { nextIndex: -1, endsNow: true };
    return { nextIndex: nextIdx, endsNow: false };
  };

  const goNext = () => {
    if (!isCurrentAnswered()) {
      toast({ title: "Responda", description: "Preencha a pergunta antes de continuar.", variant: "destructive" });
      return;
    }

    const { nextIndex, endsNow } = getNextQuestionIndex();

    if (endsNow) {
      if (currentQuestion?.question_type === "multiple_choice") {
        const selectedOption = options.find(o => o.id === answers[currentQuestion.id]);
        if (selectedOption?.ends_survey) {
          setSurveyEnded(true);
          handleSubmit();
          return;
        }
      }
      handleSubmit();
      return;
    }

    const newPath = [...questionPath.slice(0, currentStep + 1), nextIndex];
    setQuestionPath(newPath);
    setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveDraft = async () => {
    if (!user || !activeSurvey) return;
    setSavingDraft(true);
    const draftPayload = {
      survey_id: activeSurvey.id,
      user_id: user.id,
      answers: { answers, textAnswers } as any,
      current_step: currentStep,
      question_path: questionPath as any,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("survey_drafts")
      .upsert(draftPayload as any, { onConflict: "survey_id,user_id" });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Progresso salvo!", description: "Você pode continuar depois." });
      setDraftSurveyIds(new Set([...draftSurveyIds, activeSurvey.id]));
    }
    setSavingDraft(false);
  };

  const handleSubmit = async () => {
    if (!user || !activeSurvey) return;

    setSubmitting(true);
    const answeredQuestionIds = new Set(questionPath.slice(0, currentStep + 1).map(idx => questions[idx]?.id).filter(Boolean));

    const rows = Array.from(answeredQuestionIds).map((qId) => {
      const q = questions.find(q => q.id === qId)!;
      return {
        survey_id: activeSurvey.id,
        question_id: q.id,
        option_id: q.question_type === "open_ended" || q.question_type === "scale" ? null : answers[q.id] || null,
        response_text: q.question_type === "open_ended" ? (textAnswers[q.id]?.trim() || null) : q.question_type === "scale" ? (answers[q.id] || null) : null,
        user_id: user.id,
      };
    }).filter(r => r.option_id || r.response_text);

    if (rows.length === 0) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("survey_responses").insert(rows as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSurveyEnded(true);
      setAnsweredIds(new Set([...answeredIds, activeSurvey.id]));
      // Delete draft if exists
      await supabase.from("survey_drafts").delete().eq("survey_id", activeSurvey.id).eq("user_id", user.id);
      setDraftSurveyIds(prev => { const n = new Set(prev); n.delete(activeSurvey.id); return n; });
    }
    setSubmitting(false);
  };

  const closeSurvey = () => {
    setActiveSurvey(null);
    setSurveyEnded(false);
    setCurrentStep(0);
    setQuestionPath([0]);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Pesquisas" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {!activeSurvey ? (
          <>
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-xl gradient-mission flex items-center justify-center">
                <ClipboardList size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Pesquisas</h2>
                <p className="text-sm text-muted-foreground">Responda as pesquisas disponíveis</p>
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
            ) : surveys.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma pesquisa disponível no momento.</p>
            ) : (
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                {surveys.map((s) => {
                  const answered = answeredIds.has(s.id);
                  const hasDraft = draftSurveyIds.has(s.id);
                  return (
                    <div key={s.id} className="p-4 bg-card rounded-xl shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{s.title}</p>
                            {s.is_anonymous && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                                <EyeOff size={10} /> Anônima
                              </span>
                            )}
                          </div>
                          {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                        </div>
                        {answered && <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />}
                      </div>
                      {answered ? (
                        <p className="text-xs text-green-600 mt-2 font-medium">✓ Respondida</p>
                      ) : (
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" onClick={() => openSurvey(s)} className="gradient-mission text-primary-foreground">
                            {hasDraft ? "Continuar" : "Responder"}
                          </Button>
                          {hasDraft && (
                            <span className="text-xs text-muted-foreground">Rascunho salvo</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : surveyEnded ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-display font-bold text-foreground">Resposta enviada!</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                {activeSurvey.end_message || "Obrigado pela sua participação!"}
              </p>
              {activeSurvey.is_anonymous && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <EyeOff size={12} /> Sua resposta foi registrada anonimamente
                </p>
              )}
            </div>
            <Button onClick={closeSurvey} className="gradient-mission text-primary-foreground">
              Voltar às pesquisas
            </Button>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div>
              <button onClick={closeSurvey} className="text-sm text-primary hover:underline mb-2">
                ← Voltar
              </button>
              <h2 className="text-xl font-display font-bold text-foreground">{activeSurvey.title}</h2>
              {activeSurvey.description && <p className="text-sm text-muted-foreground mt-0.5">{activeSurvey.description}</p>}
              {activeSurvey.is_anonymous && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <EyeOff size={12} /> Pesquisa anônima — suas respostas não serão identificadas
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pergunta {currentStep + 1} de {questions.length}</span>
                <span className="text-xs font-medium text-primary">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {currentQuestion && (
              <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
                <p className="font-medium text-foreground">
                  {currentStep + 1}. {currentQuestion.question_text}
                </p>

                {currentQuestion.question_type === "open_ended" ? (
                  <Textarea
                    value={textAnswers[currentQuestion.id] || ""}
                    onChange={(e) => setTextAnswers({ ...textAnswers, [currentQuestion.id]: e.target.value })}
                    placeholder="Escreva sua resposta..."
                    rows={4}
                    className="text-sm"
                  />
                ) : currentQuestion.question_type === "scale" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [currentQuestion.id]: String(n) })}
                          className={`flex-1 h-14 rounded-xl border-2 font-bold text-lg transition-all ${
                            answers[currentQuestion.id] === String(n)
                              ? "border-primary bg-primary text-primary-foreground scale-110"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">Muito ruim</span>
                      <span className="text-[10px] text-muted-foreground">Excelente</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {options
                      .filter((o) => o.question_id === currentQuestion.id)
                      .map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                            answers[currentQuestion.id] === opt.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              answers[currentQuestion.id] === opt.id ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {answers[currentQuestion.id] === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-sm text-foreground">{opt.option_text}</span>
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={opt.id}
                            checked={answers[currentQuestion.id] === opt.id}
                            onChange={() => setAnswers({ ...answers, [currentQuestion.id]: opt.id })}
                            className="hidden"
                          />
                        </label>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex-1 gap-1"
              >
                <ChevronLeft size={16} /> Anterior
              </Button>
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={savingDraft}
                className="gap-1"
                title="Salvar progresso"
              >
                <Save size={16} />
              </Button>
              <Button
                onClick={goNext}
                disabled={submitting || !isCurrentAnswered()}
                className="flex-1 gradient-mission text-primary-foreground gap-1"
              >
                {submitting ? "Enviando..." : (() => {
                  const { endsNow } = getNextQuestionIndex();
                  return endsNow ? "Enviar" : "Próxima";
                })()}
                {!submitting && <ChevronRight size={16} />}
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Pesquisas;
