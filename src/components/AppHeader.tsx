import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import logo from "@/assets/logo-jfm.png";
import NotificationBell from "@/components/NotificationBell";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useCart } from "@/contexts/CartContext";

interface AppHeaderProps {
  title?: string;
  onLogout?: () => void;
}

const AppHeader = ({ title, onLogout }: AppHeaderProps) => {
  const handleLogout = onLogout || (() => {});
  const { settings } = useAppSettings();
  const displayTitle = title || settings.app_name || "JFM";
  const logoSrc = settings.logo_url || logo;
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/dashboard";

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
          <h1 className="text-lg font-bold text-primary-foreground font-display">{displayTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <CartButton />
          <NotificationBell />
          <UserAvatarMenu onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
