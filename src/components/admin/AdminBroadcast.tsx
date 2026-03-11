import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Megaphone, Clock, Trash2, Check, CalendarClock } from "lucide-react";

interface ScheduledNotif {
  id: string;
  title: string;
  body: string;
  scheduled_at: string;
  sent: boolean;
  source_type: string;
}

const AdminBroadcast = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduled, setScheduled] = useState<ScheduledNotif[]>([]);

  const fetchScheduled = async () => {
    const { data } = await supabase
      .from("scheduled_notifications")
      .select("id, title, body, scheduled_at, sent, source_type")
      .eq("source_type", "broadcast")
      .order("scheduled_at", { ascending: true });
    if (data) setScheduled(data as any);
  };

  useEffect(() => { fetchScheduled(); }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    setSending(true);

    if (scheduleEnabled && scheduleDate && scheduleTime) {
      // Schedule for later
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const { error } = await supabase.from("scheduled_notifications").insert({
        title: title.trim(),
        body: message.trim(),
        link: "/dashboard",
        scheduled_at: scheduledAt,
        source_type: "broadcast",
        created_by: user.id,
      } as any);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Mensagem programada!", description: `Será enviada em ${new Date(scheduledAt).toLocaleString("pt-BR")}.` });
        setTitle(""); setMessage(""); setScheduleDate(""); setScheduleTime(""); setScheduleEnabled(false);
        fetchScheduled();
      }
    } else {
      // Send immediately
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id");
      if (profilesError || !profiles) {
        toast({ title: "Erro", description: "Não foi possível buscar usuários.", variant: "destructive" });
        setSending(false);
        return;
      }

      const notifications = profiles.map((p) => ({
        user_id: p.id,
        title: title.trim(),
        message: message.trim(),
        type: "admin_broadcast",
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Mensagem enviada!", description: `Enviada para ${profiles.length} usuários.` });

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({ title: title.trim(), body: message.trim(), link: "/dashboard" }),
          }).catch(console.error);
        }

        setTitle(""); setMessage("");
      }
    }
    setSending(false);
  };

  const deleteScheduled = async (id: string) => {
    const { error } = await supabase.from("scheduled_notifications").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido" }); fetchScheduled(); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Megaphone size={18} /> Enviar Mensagem para Todos
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aviso importante" />
          </div>
          <div className="space-y-1">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva a mensagem..." rows={3} />
          </div>

          {/* Schedule toggle */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Programar envio</p>
                  <p className="text-xs text-muted-foreground">Definir data e hora para enviar</p>
                </div>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim() || (scheduleEnabled && (!scheduleDate || !scheduleTime))}
          className="gradient-mission text-primary-foreground gap-2"
        >
          {scheduleEnabled ? <CalendarClock size={16} /> : <Send size={16} />}
          {sending ? "Processando..." : scheduleEnabled ? "Programar Envio" : "Enviar Agora"}
        </Button>
      </div>

      {/* Scheduled list */}
      {scheduled.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <CalendarClock size={16} /> Mensagens Programadas
          </h4>
          {scheduled.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">{s.body}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(s.scheduled_at).toLocaleString("pt-BR")}
                  {s.sent && <span className="text-green-600 font-semibold flex items-center gap-0.5 ml-2"><Check size={10} /> Enviada</span>}
                </p>
              </div>
              {!s.sent && (
                <button onClick={() => deleteScheduled(s.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBroadcast;
