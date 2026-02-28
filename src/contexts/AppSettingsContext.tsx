import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  app_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

const defaults: AppSettings = {
  app_name: "Juventude e Família Missionária",
  primary_color: "220 60% 25%",
  secondary_color: "38 80% 55%",
  logo_url: "",
};

interface AppSettingsContextType {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: defaults,
  refreshSettings: async () => {},
});

export const useAppSettings = () => useContext(AppSettingsContext);

const applyColors = (primary: string, secondary: string) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-background", primary.replace(/25%$/, "20%"));
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--accent", secondary);
  root.style.setProperty("--sidebar-primary", secondary);
  root.style.setProperty("--sidebar-ring", secondary);
  // Update gradient
  const [h, s] = primary.split(" ");
  root.style.setProperty("--gradient-mission", `linear-gradient(135deg, hsl(${primary}), hsl(${h} ${s} 35%))`);
  const [h2, s2] = secondary.split(" ");
  root.style.setProperty("--gradient-gold", `linear-gradient(135deg, hsl(${secondary}), hsl(${h2} ${s2} 65%))`);
};

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaults);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((r) => { map[r.setting_key] = r.setting_value; });
      const s: AppSettings = {
        app_name: map.app_name || defaults.app_name,
        primary_color: map.primary_color || defaults.primary_color,
        secondary_color: map.secondary_color || defaults.secondary_color,
        logo_url: map.logo_url || defaults.logo_url,
      };
      setSettings(s);
      applyColors(s.primary_color, s.secondary_color);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
