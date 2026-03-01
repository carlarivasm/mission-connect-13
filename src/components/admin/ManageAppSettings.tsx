import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Upload, X, Save, Palette } from "lucide-react";

const ManageAppSettings = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useAppSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState(settings.app_name);
  const [loginSubtitle, setLoginSubtitle] = useState(settings.login_subtitle);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondary_color);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const colorPresets = [
    { label: "Azul Missão", primary: "220 60% 25%", secondary: "38 80% 55%" },
    { label: "Verde Esperança", primary: "150 50% 25%", secondary: "45 90% 55%" },
    { label: "Roxo Fé", primary: "270 50% 30%", secondary: "38 80% 55%" },
    { label: "Vermelho Caridade", primary: "0 60% 35%", secondary: "38 80% 55%" },
    { label: "Marrom Terra", primary: "30 40% 25%", secondary: "45 80% 55%" },
    { label: "Laranja Missão", primary: "25 80% 45%", secondary: "38 80% 55%" },
    { label: "Amarelo Luz", primary: "45 85% 45%", secondary: "220 60% 25%" },
    { label: "Vermelho Fogo", primary: "0 75% 45%", secondary: "45 90% 55%" },
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `app-logo/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(publicUrl);
      setPreview(publicUrl);
      toast({ title: "Logo carregado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates = [
      { setting_key: "app_name", setting_value: appName.trim(), updated_by: user.id, updated_at: new Date().toISOString() },
      { setting_key: "login_subtitle", setting_value: loginSubtitle.trim(), updated_by: user.id, updated_at: new Date().toISOString() },
      { setting_key: "primary_color", setting_value: primaryColor, updated_by: user.id, updated_at: new Date().toISOString() },
      { setting_key: "secondary_color", setting_value: secondaryColor, updated_by: user.id, updated_at: new Date().toISOString() },
      { setting_key: "logo_url", setting_value: logoUrl, updated_by: user.id, updated_at: new Date().toISOString() },
    ];

    for (const u of updates) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { setting_key: u.setting_key, setting_value: u.setting_value, updated_by: u.updated_by, updated_at: u.updated_at } as any,
          { onConflict: "setting_key" }
        );
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    await refreshSettings();
    toast({ title: "Configurações salvas!", description: "As alterações foram aplicadas." });
    setSaving(false);
  };

  const currentLogo = preview || logoUrl;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-foreground" />
        <h3 className="font-bold text-foreground">Personalização do App</h3>
      </div>

      {/* App Name */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <Label>Nome do Aplicativo</Label>
        <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Nome do app" />
      </div>

      {/* Login Subtitle */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <Label>Subtítulo da Página de Login</Label>
        <Input value={loginSubtitle} onChange={(e) => setLoginSubtitle(e.target.value)} placeholder="Ex: Unidos na fé, servindo com amor" />
        <p className="text-[10px] text-muted-foreground">Aparece abaixo do nome na tela de login.</p>
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <Label>Logo do Aplicativo</Label>
        <div className="flex items-center gap-4">
          {currentLogo ? (
            <div className="relative">
              <img src={currentLogo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-muted p-1" />
              <button onClick={() => { setLogoUrl(""); setPreview(null); }} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground">
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <Upload size={20} className="text-muted-foreground" />
            </div>
          )}
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
              <Upload size={14} /> {uploading ? "Enviando..." : "Alterar Logo"}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-foreground" />
          <Label>Paleta de Cores</Label>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">Presets</p>
          <div className="flex flex-wrap gap-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => { setPrimaryColor(preset.primary); setSecondaryColor(preset.secondary); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  primaryColor === preset.primary ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <span className="w-4 h-4 rounded-full" style={{ background: `hsl(${preset.primary})` }} />
                <span className="w-4 h-4 rounded-full" style={{ background: `hsl(${preset.secondary})` }} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cor Primária (HSL)</Label>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md shrink-0" style={{ background: `hsl(${primaryColor})` }} />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="text-xs" placeholder="220 60% 25%" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cor Secundária (HSL)</Label>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md shrink-0" style={{ background: `hsl(${secondaryColor})` }} />
              <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="text-xs" placeholder="38 80% 55%" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-3 p-3 rounded-xl" style={{ background: `linear-gradient(135deg, hsl(${primaryColor}), hsl(${primaryColor.split(" ")[0]} ${primaryColor.split(" ")[1]} 35%))` }}>
          <p className="text-sm font-bold" style={{ color: `hsl(40 50% 95%)` }}>Preview do Header</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `hsl(${secondaryColor})`, color: `hsl(${primaryColor})` }}>
              Destaque
            </span>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gradient-mission text-primary-foreground gap-2">
        <Save size={16} />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default ManageAppSettings;
