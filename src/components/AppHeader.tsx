import { LogOut } from "lucide-react";
import logo from "@/assets/logo-jfm.png";
import NotificationBell from "@/components/NotificationBell";

interface AppHeaderProps {
  title?: string;
  onLogout?: () => void;
}

const AppHeader = ({ title = "JFM", onLogout }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 gradient-mission safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="JFM Logo" className="h-9 w-9 rounded-full bg-primary-foreground/20 p-0.5 object-contain" />
          <h1 className="text-lg font-bold text-primary-foreground font-display">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
