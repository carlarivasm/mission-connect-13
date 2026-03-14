import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, Moon, Sun, LogOut, Network, ClipboardList, Palette, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings, applyColors } from "@/contexts/AppSettingsContext";
import ColorPaletteSelector from "@/components/ColorPaletteSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserAvatarMenuProps {
  onLogout: () => void;
}

const UserAvatarMenu = ({ onLogout }: UserAvatarMenuProps) => {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showPalette, setShowPalette] = useState(false);

  // Current user palette (from localStorage or admin defaults)
  const [userPrimary, setUserPrimary] = useState(
    () => localStorage.getItem("user_primary_color") || ""
  );
  const [userSecondary, setUserSecondary] = useState(
    () => localStorage.getItem("user_secondary_color") || ""
  );

  const activePrimary = userPrimary || settings.primary_color;
  const activeSecondary = userSecondary || settings.secondary_color;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setAvatarUrl((data as any).avatar_url || null);
      });
  }, [user]);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const handlePaletteChange = (primary: string, secondary: string) => {
    setUserPrimary(primary);
    setUserSecondary(secondary);
    localStorage.setItem("user_primary_color", primary);
    localStorage.setItem("user_secondary_color", secondary);
    applyColors(primary, secondary);
  };

  const handleResetPalette = () => {
    setUserPrimary("");
    setUserSecondary("");
    localStorage.removeItem("user_primary_color");
    localStorage.removeItem("user_secondary_color");
    applyColors(settings.primary_color, settings.secondary_color);
  };

  const hasCustomPalette = !!userPrimary && !!userSecondary;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-foreground/30 hover:border-primary-foreground/60 transition-colors focus:outline-none">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-foreground/20">
              <User size={16} className="text-primary-foreground" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2.5 cursor-pointer text-sm py-2.5">
          <User size={18} /> Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/familia")} className="gap-2.5 cursor-pointer text-sm py-2.5">
          <Users size={18} /> Minha Família
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/organograma")} className="gap-2.5 cursor-pointer text-sm py-2.5">
          <Network size={18} /> Organograma
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/pesquisas")} className="gap-2.5 cursor-pointer text-sm py-2.5">
          <ClipboardList size={18} /> Pesquisas
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDarkMode} className="gap-2.5 cursor-pointer text-sm py-2.5">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? "Modo Claro" : "Modo Escuro"}
        </DropdownMenuItem>

        {/* Palette toggle */}
        <DropdownMenuItem
          onClick={(e) => { e.preventDefault(); setShowPalette(!showPalette); }}
          className="gap-2.5 cursor-pointer text-sm py-2.5"
        >
          <Palette size={18} />
          Paleta de Cores
          <span className="text-xs text-muted-foreground ml-auto">{showPalette ? "▲" : "▼"}</span>
        </DropdownMenuItem>

        {/* Palette selector (non-menu-item to allow interaction) */}
        {showPalette && (
          <div
            className="px-3 py-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ColorPaletteSelector
              compact
              primaryColor={activePrimary}
              secondaryColor={activeSecondary}
              onChangeColors={handlePaletteChange}
            />
            {hasCustomPalette && (
              <button
                onClick={handleResetPalette}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <RotateCcw size={12} /> Usar padrão
              </button>
            )}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="gap-2.5 cursor-pointer text-sm py-2.5 text-destructive focus:text-destructive">
          <LogOut size={18} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatarMenu;

