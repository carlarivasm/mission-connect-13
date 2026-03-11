import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Megaphone, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const AdminBroadcast = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;

    // Validate scheduling
    if (scheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast({ title: "Atenção", description: "Defina data e hora para o envio programado.", variant: "destructive" });
        return;
      }

      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast({ title: "Atenção", description: "A data e hora programada deve ser no futuro.", variant: "destructive" });
        return;
      }
    }

    setSending(true);

    if (scheduled) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      const { error: spError } = await (supabase.from as any)("scheduled_push").insert({
        title: title.trim(),
        body: message.trim(),
        link: "/dashboard",
        scheduled_at: scheduledDateTime.toISOString(),
        create_in_app: true,
      });

      if (spError) {
        toast({ title: "Erro", description: spError.message, variant: "destructive" });
      } else {
        toast({ title: "Mensagem programada!", description: `Programada para ${scheduledDateTime.toLocaleString('pt-BR')}` });
        setTitle("");
        setMessage("");
        setScheduled(false);
        setScheduledDate("");
        setScheduledTime("");
      }
    } else {
      // Get all user IDs
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id");

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

        // Send push notification
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ title: title.trim(), body: message.trim(), link: "/dashboard" }),
          }).catch(console.error);
        }

        setTitle("");
        setMessage("");
      }
    }
    setSending(false);
  };

  return (
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

        {/* Scheduling Toggle */}
        <div className="border border-border rounded-lg p-3 space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Programar push</p>
                <p className="text-xs text-muted-foreground">Definir data e hora para enviar o push</p>
              </div>
            </div>
            <Switch checked={scheduled} onCheckedChange={setScheduled} />
          </div>

          {scheduled && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <Label className="text-xs">Data do push</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora do push</Label>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
      <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="gradient-mission text-primary-foreground gap-2 w-full">
        <Send size={16} /> {sending ? "Processando..." : scheduled ? "Programar Mensagem" : "Enviar para Todos"}
      </Button>
    </div>
  );
};

export default AdminBroadcast;
