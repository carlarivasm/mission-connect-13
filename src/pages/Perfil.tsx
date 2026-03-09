import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PushDiagnostics from "@/components/PushDiagnostics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Save, User, Bell, Phone, Mail } from "lucide-react";

const Perfil = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Notification preferences
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyLocations, setNotifyLocations] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyReminder24h, setNotifyReminder24h] = useState(true);
  const [notifyReminder30min, setNotifyReminder30min] = useState(true);
  const [notifyReminder10min, setNotifyReminder10min] = useState(true);
  const [notifyReminder5min, setNotifyReminder5min] = useState(true);
  const [showPhoneInOrg, setShowPhoneInOrg] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url, notify_events, notify_locations, notify_reminders, notify_reminder_24h, notify_reminder_30min, notify_reminder_10min, notify_reminder_5min, show_phone_in_org")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setFullName(d.full_name || "");
          setEmail(d.email || "");
          setPhone(d.phone || "");
          setAvatarUrl(d.avatar_url || null);
          setNotifyEvents(d.notify_events ?? true);
          setNotifyLocations(d.notify_locations ?? true);
          setNotifyReminders(d.notify_reminders ?? true);
          setNotifyReminder24h(d.notify_reminder_24h ?? true);
          setNotifyReminder30min(d.notify_reminder_30min ?? true);
          setNotifyReminder10min(d.notify_reminder_10min ?? true);
          setNotifyReminder5min(d.notify_reminder_5min ?? true);
        }
        setLoading(false);
      });
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro", description: uploadError.message, variant: "destructive" });
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl } as any)
      .eq("id", user.id);

    setAvatarUrl(publicUrl);
    toast({ title: "Foto atualizada!" });
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        notify_events: notifyEvents,
        notify_locations: notifyLocations,
        notify_reminders: notifyReminders,
        notify_reminder_24h: notifyReminder24h,
        notify_reminder_30min: notifyReminder30min,
        notify_reminder_10min: notifyReminder10min,
        notify_reminder_5min: notifyReminder5min,
      } as any)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil salvo!", description: "Suas configurações foram atualizadas." });
    }
    setSaving(false);
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Meu Perfil" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-4 border-card shadow-card">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center gradient-mission">
                      <User size={36} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              {uploadingPhoto && <p className="text-xs text-muted-foreground">Enviando foto...</p>}
              <h2 className="text-xl font-display font-bold text-foreground">{fullName || "Missionário"}</h2>
            </div>

            {/* Personal Data */}
            <section className="bg-card rounded-xl p-4 shadow-card space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <User size={16} /> Dados Pessoais
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome completo</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Mail size={12} /> E-mail</Label>
                  <Input value={email} disabled className="opacity-60" />
                  <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Phone size={12} /> Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </section>

            {/* Notification Preferences */}
            <section className="bg-card rounded-xl p-4 shadow-card space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Bell size={16} /> Preferências de Notificação
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Novos eventos e reuniões</p>
                    <p className="text-xs text-muted-foreground">Receber quando atividades forem criadas</p>
                  </div>
                  <Switch checked={notifyEvents} onCheckedChange={setNotifyEvents} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Novos locais de missão</p>
                    <p className="text-xs text-muted-foreground">Receber quando locais forem adicionados</p>
                  </div>
                  <Switch checked={notifyLocations} onCheckedChange={setNotifyLocations} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Lembretes de eventos</p>
                    <p className="text-xs text-muted-foreground">Ative/desative cada intervalo abaixo</p>
                  </div>
                  <Switch checked={notifyReminders} onCheckedChange={setNotifyReminders} />
                </div>
                {notifyReminders && (
                  <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">24 horas antes</p>
                      <Switch checked={notifyReminder24h} onCheckedChange={setNotifyReminder24h} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">30 minutos antes</p>
                      <Switch checked={notifyReminder30min} onCheckedChange={setNotifyReminder30min} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">10 minutos antes</p>
                      <Switch checked={notifyReminder10min} onCheckedChange={setNotifyReminder10min} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">5 minutos antes</p>
                      <Switch checked={notifyReminder5min} onCheckedChange={setNotifyReminder5min} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Push Diagnostics */}
            <PushDiagnostics />

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-mission text-primary-foreground gap-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Perfil;
