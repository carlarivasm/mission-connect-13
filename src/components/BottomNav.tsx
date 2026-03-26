import { Home, Calendar, BookOpen, ShoppingBag, Camera, MapPin } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Calendar, label: "Calendário", path: "/calendario" },
    { icon: MapPin, label: "Mapa", path: "/mapa" },
    { icon: Home, label: "Início", path: "/dashboard", isCenter: true },
    //{ icon: Camera, label: "Fotos", path: "/galeria" },
    { icon: ShoppingBag, label: "Loja", path: "/loja" },
    { icon: BookOpen, label: "Materiais", path: "/materiais" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map(({ icon: Icon, label, path, isCenter }) => {
          const isActive = location.pathname === path;
          if (isCenter) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all duration-200"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center -mt-5 shadow-elevated transition-all duration-200 ${isActive
                  ? "gradient-gold text-white scale-110"
                  : "bg-secondary text-white hover:scale-105"
                  }`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] leading-tight ${isActive ? "text-secondary font-bold" : "text-muted-foreground"}`}>{label}</span>
              </button>
            );
          }
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${isActive
                ? "text-secondary font-bold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
