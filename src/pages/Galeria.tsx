import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import GoogleDriveGallery from "@/components/GoogleDriveGallery";

const Galeria = () => {
  const { signOut, role } = useAuth();
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  usePageTracking("galeria");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Galeria" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Galeria</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fotos e vídeos das missões</p>
          </div>
        </div>

        {/* Gallery Link Section */}
        {settings.gallery_link && (
          <div className="animate-fade-in space-y-4 mb-6">
            <a
              href={settings.gallery_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl gradient-mission text-primary-foreground shadow-card hover:scale-[1.02] transition-transform"
            >
              <div className="flex-1">
                <h4 className="font-bold text-lg leading-tight">Acesso Rápido</h4>
                <p className="text-sm text-primary-foreground/80 mt-1">Acesse a pasta completa no Drive e adicione seus arquivos.</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Camera size={20} className="text-white" />
              </div>
            </a>
          </div>
        )}

        {/* Local Google Drive Gallery */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <GoogleDriveGallery folderId="1pqMZkAOO9mTBMhRUtxO6zML2tlqSmYYh" />
        </div>

      </main>
      <BottomNav />
    </div>
  );
};

export default Galeria;
