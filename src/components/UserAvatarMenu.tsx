import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, Moon, Sun, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2 cursor-pointer">
          <User size={16} /> Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/familia")} className="gap-2 cursor-pointer">
          <Users size={16} /> Minha Família
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDarkMode} className="gap-2 cursor-pointer">
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? "Modo Claro" : "Modo Escuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut size={16} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatarMenu;
