import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, CalendarPlus, Pencil, Link2, Bell, BellOff, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  location: string | null;
  meeting_link: string | null;
  notify_push: boolean;
  reminder_24h: boolean;
  reminder_30min: boolean;
  reminder_10min: boolean;
  reminder_5min: boolean;
}

const ManageEvents = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState("missão");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notification settings per event
  const [notifyPush, setNotifyPush] = useState(true);
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder30min, setReminder30min] = useState(true);
  const [reminder10min, setReminder10min] = useState(true);
  const [reminder5min, setReminder5min] = useState(true);

  // Scheduled push settings
  const [scheduledPush, setScheduledPush] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (data) setEvents(data as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setEventDate(""); setEventTime("");
    setEventType("missão"); setLocation(""); setMeetingLink(""); setEditingId(null);
    setNotifyPush(true); setReminder24h(true); setReminder30min(true);
    setReminder10min(true); setReminder5min(true);
    setScheduledPush(false); setScheduledDate(""); setScheduledTime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate scheduling
    if (notifyPush && scheduledPush) {
      if (!scheduledDate || !scheduledTime) {
        toast({ title: "Atenção", description: "Defina data e hora para o envio programado da notificação.", variant: "destructive" });
        return;
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast({ title: "Atenção", description: "A data e hora programada deve ser no futuro.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      event_time: eventTime || null,
      event_type: eventType,
      location: location.trim() || null,
      meeting_link: meetingLink.trim() || null,
      created_by: user?.id,
      notify_push: notifyPush,
      reminder_24h: reminder24h,
      reminder_30min: reminder30min,
      reminder_10min: reminder10min,
      reminder_5min: reminder5min,
    };

    if (editingId) {
      const { error } = await supabase.from("events").update(payload as any).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Evento atualizado!" }); resetForm(); fetchEvents(); }
    } else {
      const { error } = await supabase.from("events").insert(payload as any);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Evento criado!" });
        // Notify users with events enabled
        const { data: allProfiles } = await supabase.from("profiles").select("id, notify_events");
        if (allProfiles) {
          const dateStr = new Date(eventDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
          const timeStr = eventTime ? ` às ${eventTime.slice(0, 5)}` : "";
          const notifs = allProfiles
            .filter((p: any) => p.id !== user?.id && p.notify_events !== false)
            .map((p: any) => ({
              user_id: p.id,
              title: eventType === "reunião" ? "🤝 Nova reunião agendada" : "📅 Novo evento",
              message: `"${title.trim()}" em ${dateStr}${timeStr}.`,
              type: "new_event",
            }));
          if (notifs.length > 0) {
            await supabase.from("notifications").insert(notifs as any);
          }

          // Send push notification only if push is enabled for this event
          if (notifyPush) {
            const pushTitle = eventType === "reunião" ? "🤝 Nova reunião agendada" : "📅 Novo evento";
            const pushBody = `"${title.trim()}" em ${dateStr}${timeStr}.`;

            if (scheduledPush) {
              const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
              const { error: spError } = await (supabase.from as any)("scheduled_push").insert({
                title: pushTitle,
                body: pushBody,
                link: "/calendario",
                scheduled_at: scheduledDateTime.toISOString(),
                create_in_app: false, // In app is handled above immediately for events
              });
              if (spError) console.error("Error scheduling push:", spError);
            } else {
              const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
              await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: pushTitle, body: pushBody, link: "/calendario" }),
              }).catch(console.error);
            }
          }
        }
        resetForm();
        fetchEvents();
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (ev: Event) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setDescription(ev.description || "");
    setEventDate(ev.event_date);
    setEventTime(ev.event_time || "");
    setEventType(ev.event_type);
    setLocation(ev.location || "");
    setMeetingLink(ev.meeting_link || "");
    setNotifyPush(ev.notify_push ?? true);
    setReminder24h(ev.reminder_24h ?? true);
    setReminder30min(ev.reminder_30min ?? true);
    setReminder10min(ev.reminder_10min ?? true);
    setReminder5min(ev.reminder_5min ?? true);
    setScheduledPush(false);
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchEvents();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarPlus size={18} /> {editingId ? "Editar Evento" : "Novo Evento"}
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do evento" required />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do evento" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Horário</Label>
              <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="missão">Missão</SelectItem>
                  <SelectItem value="reunião">Reunião</SelectItem>
                  <SelectItem value="formação">Formação</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Local do evento" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Link da Reunião</Label>
            <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>

          {/* Notification Settings */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell size={14} /> Configurações de Notificação
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Push notification</p>
                <p className="text-xs text-muted-foreground">Enviar push para dispositivos</p>
              </div>
              <Switch checked={notifyPush} onCheckedChange={setNotifyPush} />
            </div>

            {notifyPush && (
              <div className="pl-2 border-l-2 border-border/50 ml-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Programar envio</p>
                      <p className="text-xs text-muted-foreground">Definir data e hora para enviar</p>
                    </div>
                  </div>
                  <Switch checked={scheduledPush} onCheckedChange={setScheduledPush} />
                </div>

                {scheduledPush && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data do envio</Label>
                      <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora do envio</Label>
                      <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Lembretes automáticos:</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">24 horas antes</p>
                <Switch checked={reminder24h} onCheckedChange={setReminder24h} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">30 minutos antes</p>
                <Switch checked={reminder30min} onCheckedChange={setReminder30min} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">10 minutos antes</p>
                <Switch checked={reminder10min} onCheckedChange={setReminder10min} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">5 minutos antes</p>
                <Switch checked={reminder5min} onCheckedChange={setReminder5min} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
            {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar Evento"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum evento cadastrado.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg gradient-mission text-primary-foreground shrink-0">
                <span className="text-xs font-bold leading-none">{new Date(ev.event_date + 'T00:00:00').getDate()}</span>
                <span className="text-[10px] leading-none mt-0.5">{new Date(ev.event_date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.event_time?.slice(0, 5) || ""} • {ev.event_type}
                  {ev.location ? ` • ${ev.location}` : ""}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {ev.notify_push ? (
                    <Bell size={10} className="text-primary" />
                  ) : (
                    <BellOff size={10} className="text-muted-foreground" />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {[
                      ev.reminder_24h && "24h",
                      ev.reminder_30min && "30m",
                      ev.reminder_10min && "10m",
                      ev.reminder_5min && "5m",
                    ].filter(Boolean).join(", ") || "sem lembretes"}
                  </span>
                </div>
                {ev.meeting_link && (
                  <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <Link2 size={10} /> Link da reunião
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(ev)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
