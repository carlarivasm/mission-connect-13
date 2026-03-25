import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShoppingCart, DownloadCloud } from "lucide-react";
import logo from "@/assets/logo-jfm.png";
import NotificationBell from "@/components/NotificationBell";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useCart } from "@/contexts/CartContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface AppHeaderProps {
  title?: string;
  onLogout?: () => void;
}

const AppHeader = ({ title, onLogout }: AppHeaderProps) => {
  const handleLogout = onLogout || (() => { });
  const { totalItems } = useCart();
  const navigate2 = useNavigate();
  const { settings } = useAppSettings();
  const displayTitle = title || settings.app_name || "JFM";
  const logoSrc = settings.logo_url || logo;
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/dashboard";
  const { installPWA, isInstalled, isInstallable } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 gradient-mission safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {!isHome && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-primary-foreground/80 hover:text-primary-foreground">
              <ArrowLeft size={22} />
            </button>
          )}
          <img src={logoSrc} alt="Logo" className="h-9 w-9 rounded-full bg-primary-foreground/20 p-0.5 object-contain" />
          <h1 className="text-sm font-bold text-primary-foreground font-display">{displayTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <button
              onClick={() => navigate2("/checkout")}
              className="relative p-1.5 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <ShoppingCart size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center text-secondary-foreground">
                {totalItems}
              </span>
            </button>
          )}
          {!isInstalled && isInstallable && (
            <button
              onClick={installPWA}
              className="bg-white hover:bg-white/90 text-primary p-1.5 rounded-full shadow-sm transition-all"
              title="Instalar Aplicativo"
            >
              <DownloadCloud size={20} />
            </button>
          )}
          <NotificationBell />
          <UserAvatarMenu onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
