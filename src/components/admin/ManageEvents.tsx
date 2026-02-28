import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, CalendarPlus, Pencil, Link2 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  location: string | null;
  meeting_link: string | null;
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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (data) setEvents(data);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setEventDate(""); setEventTime("");
    setEventType("missão"); setLocation(""); setMeetingLink(""); setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    };

    if (editingId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Evento atualizado!" }); resetForm(); fetchEvents(); }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Evento criado!" }); resetForm(); fetchEvents(); }
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
