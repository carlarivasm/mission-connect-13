import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Survey {
  id: string;
  title: string;
  description: string | null;
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
}

const Pesquisas = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  // Active survey being answered
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // question_id -> option_id or text
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({}); // question_id -> text
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: surveyData } = await supabase
        .from("surveys")
        .select("id, title, description")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (surveyData) setSurveys(surveyData as Survey[]);

      if (user) {
        const { data: respData } = await supabase
          .from("survey_responses")
          .select("survey_id")
          .eq("user_id", user.id);
        if (respData) {
          setAnsweredIds(new Set(respData.map((r: any) => r.survey_id)));
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const openSurvey = async (survey: Survey) => {
    setAnswers({});
    setTextAnswers({});

    const { data: qs } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", survey.id)
      .order("sort_order");

    if (qs) {
      setQuestions(qs as Question[]);
      const qIds = qs.map((q: any) => q.id);
      const { data: opts } = await supabase
        .from("survey_options")
        .select("*")
        .in("question_id", qIds)
        .order("sort_order");
      if (opts) setOptions(opts as Option[]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !activeSurvey) return;

    const unanswered = questions.filter((q) => {
      if ((q as any).question_type === "open_ended") return !textAnswers[q.id]?.trim();
      return !answers[q.id];
    });
    if (unanswered.length > 0) {
      toast({ title: "Responda todas", description: "Preencha todas as perguntas.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const rows = questions.map((q) => ({
      survey_id: activeSurvey.id,
      question_id: q.id,
      option_id: (q as any).question_type === "open_ended" ? null : answers[q.id],
      response_text: (q as any).question_type === "open_ended" ? textAnswers[q.id].trim() : null,
      user_id: user.id,
    }));

    const { error } = await supabase.from("survey_responses").insert(rows as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resposta enviada!", description: "Obrigado por participar." });
      setAnsweredIds(new Set([...answeredIds, activeSurvey.id]));
      setActiveSurvey(null);
    }
    setSubmitting(false);
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
                  return (
                    <div key={s.id} className="p-4 bg-card rounded-xl shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{s.title}</p>
                          {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                        </div>
                        {answered && <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />}
                      </div>
                      {answered ? (
                        <p className="text-xs text-green-600 mt-2 font-medium">✓ Respondida</p>
                      ) : (
                        <Button size="sm" onClick={() => openSurvey(s)} className="mt-3 gradient-mission text-primary-foreground">
                          Responder
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Survey answering view */
          <div className="space-y-5 animate-fade-in">
            <div>
              <button onClick={() => setActiveSurvey(null)} className="text-sm text-primary hover:underline mb-2">
                ← Voltar
              </button>
              <h2 className="text-xl font-display font-bold text-foreground">{activeSurvey.title}</h2>
              {activeSurvey.description && <p className="text-sm text-muted-foreground mt-0.5">{activeSurvey.description}</p>}
            </div>

            {questions.map((q, qi) => {
              const qOptions = options.filter((o) => o.question_id === q.id);
              const isOpen = (q as any).question_type === "open_ended";
              return (
                <div key={q.id} className="bg-card rounded-xl shadow-card p-4 space-y-3">
                  <p className="font-medium text-foreground text-sm">
                    {qi + 1}. {q.question_text}
                  </p>
                  {isOpen ? (
                    <Textarea
                      value={textAnswers[q.id] || ""}
                      onChange={(e) => setTextAnswers({ ...textAnswers, [q.id]: e.target.value })}
                      placeholder="Escreva sua resposta..."
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    <div className="space-y-2">
                      {qOptions.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            answers[q.id] === opt.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              answers[q.id] === opt.id ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {answers[q.id] === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className="text-sm text-foreground">{opt.option_text}</span>
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.id}
                            checked={answers[q.id] === opt.id}
                            onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                            className="hidden"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-mission text-primary-foreground"
            >
              {submitting ? "Enviando..." : "Enviar Respostas"}
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Pesquisas;
