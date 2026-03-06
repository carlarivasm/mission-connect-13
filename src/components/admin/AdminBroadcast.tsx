import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Megaphone } from "lucide-react";

const AdminBroadcast = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    setSending(true);

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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: message.trim(), link: "/dashboard" }),
      }).catch(console.error);

      setTitle("");
      setMessage("");
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
      </div>
      <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="gradient-mission text-primary-foreground gap-2">
        <Send size={16} /> {sending ? "Enviando..." : "Enviar para Todos"}
      </Button>
    </div>
  );
};

export default AdminBroadcast;
