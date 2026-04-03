import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Image as ImageIcon } from "lucide-react";

const ManageGallery = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useAppSettings();
  const { toast } = useToast();

  const [galleryLink, setGalleryLink] = useState(settings.gallery_link);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { 
          setting_key: "gallery_link", 
          setting_value: galleryLink.trim(), 
          updated_by: user.id, 
          updated_at: new Date().toISOString() 
        } as any,
        { onConflict: "setting_key" }
      );
      
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await refreshSettings();
      toast({ title: "Configurações salvas!", description: "O link da galeria foi atualizado." });
    }
    
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ImageIcon size={18} className="text-foreground" />
        <h3 className="font-bold text-foreground">Link da Galeria</h3>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-card space-y-3 animate-fade-in">
        <Label>URL da Galeria Externa</Label>
        <Input 
          type="url"
          value={galleryLink} 
          onChange={(e) => setGalleryLink(e.target.value)} 
          placeholder="Ex: https://photos.google.com/share/..." 
        />
        <p className="text-[10px] text-muted-foreground">
          Este link será aberto quando os usuários clicarem no banner da galeria.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gradient-mission text-primary-foreground gap-2">
        <Save size={16} />
        {saving ? "Salvando..." : "Salvar Configuração"}
      </Button>
    </div>
  );
};

export default ManageGallery;
